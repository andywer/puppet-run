import * as fs from "fs"
import * as path from "path"
import { launch, Page } from "puppeteer-core"
import { URL } from "url"
import { getChromeLocation } from "./chrome-location"
import {
  captureFailedRequests,
  capturePuppetConsole,
  createPuppetContextConfig,
  injectPuppetContext,
  subscribeToMagicLogs
} from "./host-bindings"
import { Plugin } from "./plugins"
import ScriptError from "./script-error"

declare const window: any;

export interface Puppet {
  on: Page["on"],
  once: Page["once"],
  off: Page["off"],
  close (): Promise<void>,
  run (argv: string[], plugin?: Plugin | null): Promise<void>,
  waitForExit (): Promise<number>
}

const pendingPagePromises: Array<Promise<any>> = []

function trackPendingPagePromise (promise: Promise<any>) {
  pendingPagePromises.push(promise)
  return promise
}

async function loadBundle (page: Page, bundleFilePath: string, serverURL: string): Promise<void> {
  await page.addScriptTag({
    content: fs.readFileSync(require.resolve("sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js"), "utf8")
  })

  await page.addScriptTag({
    url: new URL(bundleFilePath, serverURL).toString()
  })
}

async function resolveStackTrace (page: Page, stackTrace: string) {
  const resolvedStackTrace = await page.evaluate(stack => new Promise(resolve =>
    window.sourceMappedStackTrace.mapStackTrace(stack, (newStack: string[]) => {
      resolve(newStack.join("\n"))
    })
  ), stackTrace)
  const replacePathInStackTrace = (matched: string, matchedPath: string) => {
    return matched.replace(matchedPath, path.relative(process.cwd(), matchedPath))
  }
  return resolvedStackTrace.replace(/    at [^\(]+\((\.\.[^:]+):[0-9]/gm, replacePathInStackTrace)
}

async function resolveToScriptError (page: Page, error: Error) {
  if (!error.stack) {
    const endOfActualMessageIndex = error.message ? error.message.indexOf("\n    at ") : -1
    if (endOfActualMessageIndex === -1) {
      return new ScriptError(error)
    } else {
      const messageWithStack = error.message
      const messageWithResolvedStack = [
        error.message.substr(0, endOfActualMessageIndex),
        await resolveStackTrace(page, messageWithStack)
      ].join("\n")
      error.message = error.message.substr(0, endOfActualMessageIndex)
      return new ScriptError(error, messageWithResolvedStack)
    }
  }
  if (Array.isArray(error.stack)) {
    return new ScriptError(error, await resolveStackTrace(page, error.stack.join("\n")))
  } else {
    return new ScriptError(error, await resolveStackTrace(page, error.stack))
  }
}

function createExitPromise (page: Page) {
  let exited = false
  return new Promise<number>((resolve, reject) => {
    subscribeToMagicLogs(page, (type, args) => {
      if (type === "exit") {
        exited = true
        resolve(args[0] as number)
      }
    })
    // tslint:disable-next-line:no-console
    const fail = (error: Error) => exited ? console.error(error) : reject(error)
    const handleScriptError = (error: Error) => {
      trackPendingPagePromise(resolveToScriptError(page, error))
        .then(scriptError => fail(scriptError))
        .catch(internalError => {
          // tslint:disable:no-console
          console.error("Internal error while resolving script error:")
          console.error(internalError)
          // tslint:enable:no-console
          fail(error)
        })
    }
    page.once("error", handleScriptError)
    page.once("pageerror", handleScriptError)
  })
}

export async function spawnPuppet(bundleFilePath: string, serverURL: string, options: { headless?: boolean }): Promise<Puppet> {
  let puppetExit: Promise<number>
  const { headless = true } = options

  const browser = await launch({
    executablePath: getChromeLocation() || undefined,
    headless
  })

  const [ page ] = await browser.pages()

  // Navigate to a secure origin first. See <https://github.com/GoogleChrome/puppeteer/issues/2301>
  await page.goto(serverURL + "index.html")

  capturePuppetConsole(page)
  captureFailedRequests(page)

  return {
    async close () {
      if (headless) {
        await Promise.all(pendingPagePromises)
        await browser.close()
      } else {
        return new Promise<void>(resolve => undefined)
      }
    },
    async run (argv: string[], plugin: Plugin | null = null) {
      const pluginsConfig = plugin && plugin.extendPuppetDotPlugins
        ? await plugin.extendPuppetDotPlugins({}, argv)
        : {}
      const contextConfig = createPuppetContextConfig(argv, pluginsConfig)
      puppetExit = createExitPromise(page)

      await injectPuppetContext(page, contextConfig)
      return loadBundle(page, bundleFilePath, serverURL)
    },
    async waitForExit () {
      return puppetExit
    },
    off: page.removeListener.bind(page),
    on: page.on.bind(page),
    once: page.once.bind(page),
  }
}
