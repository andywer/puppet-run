// tslint:disable:no-console
import chalk from "chalk"
import { ConsoleMessage, Page } from "puppeteer-core"

export interface PuppetContextConfig<PluginsConfig extends {} = any> {
  args: string[],
  plugins: PluginsConfig
}

const magicLogMessageMarker = "$$$PUPPET_MAGIC_LOG$$$"

async function consoleMessageToLogArgs (message: ConsoleMessage) {
  const args = message.args()
  const jsonArgs = await Promise.all(args.map(
    arg => arg.jsonValue()
  ))

  // Clean-up to enable garbage collection
  args.forEach(arg => arg.dispose())

  return jsonArgs
}

export function capturePuppetConsole (page: Page) {
  page.on("console", async message => {
    const type = message.type()

    // Ignore magic messages, since they are control messages
    if (message.text().startsWith(magicLogMessageMarker)) return

    const consoleArgs = await consoleMessageToLogArgs(message)

    if (type === "clear") {
      return console.clear()
    } else if (type === "startGroupCollapsed") {
      return console.groupCollapsed()
    } else if (type === "endGroup") {
      return console.groupEnd()
    }

    if (type === "error") {
      console.error(...consoleArgs)
    } else if (type === "warning") {
      console.warn(...consoleArgs)
    } else if (type === "debug") {
      console.debug(...consoleArgs)
    } else if (type === "startGroup") {
      console.group(...consoleArgs)
    } else {
      console.log(...consoleArgs)
    }
  })
}

export function captureFailedRequests(page: Page) {
  page.on("requestfailed", request => {
    const failure = request.failure()
    console.error(chalk.redBright(`Request failed: ${request.method()} ${request.url()}`))
    console.error(chalk.gray(`  ${failure ? failure.errorText : "Unknown error"}`))
  })
  page.on("requestfinished", request => {
    const response = request.response()
    if (response && response.status() >= 400) {
      console.error(chalk.redBright(`HTTP ${response.status()} ${request.method()} ${request.url()}`))
    }
  })
}

export async function injectPuppetContext (page: Page, contextConfig: PuppetContextConfig) {
  await page.addScriptTag({
    content: `
      window.headless = {
        args: ${JSON.stringify(contextConfig.args)},
        plugins: ${JSON.stringify(contextConfig.plugins)},
        exit (exitCode = 0) {
          console.log(${JSON.stringify(magicLogMessageMarker)}, "exit", exitCode)
        },
        setOfflineMode (offline = true) {
          return window.setPuppetOfflineMode(offline)
        }
      };
    `
  })
  await page.exposeFunction("setPuppetOfflineMode", (offlineMode: boolean) => page.setOfflineMode(offlineMode))
}

export function subscribeToMagicLogs (page: Page, subscriber: (type: string, args: any[]) => void) {
  const handler = async (message: ConsoleMessage) => {
    const args = message.args()
    if (args.length < 2) return

    const firstArgument = await args[0].jsonValue()
    if (firstArgument !== magicLogMessageMarker) return

    const [type, ...otherArgs] = await Promise.all(
      args.slice(1).map(arg => arg.jsonValue())
    )

    // Don't forget to dispose eventually, to enable garbage collection of log message args
    args.forEach(arg => arg.dispose())

    subscriber(type, otherArgs)
  }

  page.on("console", handler)
  const unsubscribe = () => page.off("console", handler)

  return unsubscribe
}
