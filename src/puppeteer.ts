import { Console } from "console"
import * as fs from "fs"
import * as path from "path"
import { launch, Page } from "puppeteer-core"
import { URL } from "url"
import { getChromeLocation } from "./chrome-location"
import {
  captureFailedRequests,
  capturePuppetConsole,
  injectPuppetContext,
  subscribeToMagicLogs
} from "./host-bindings"
import { createPluginContext, Plugin } from "./plugins"
import ScriptError from "./script-error"

declare const window: any;

export interface Puppet {
  on: Page["on"],
  once: Page["once"],
  off: Page["off"],
  close (): Promise<void>,
  run (argv: string[], plugins?: Plugin[]): Promise<void>,
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

interface SpawnOptions {
  console?: Console
  devtools?: boolean,
  headless?: boolean
}

export async function spawnPuppet(bundleFilePaths: string[], serverURL: string, options: SpawnOptions): Promise<Puppet> {
  let puppetExit: Promise<number>

  const { console = global.console, headless = true } = options

  const browser = await launch({
    executablePath: getChromeLocation() || undefined,
    devtools: options.devtools,
    headless
  })

  const [ page ] = await browser.pages()

  // Navigate to a secure origin first. See <https://github.com/GoogleChrome/puppeteer/issues/2301>
  await page.goto(serverURL + "index.html")

  capturePuppetConsole(page, console)
  captureFailedRequests(page, console)

  return {
    async close () {
      await Promise.all(pendingPagePromises)
      await browser.close()
    },
    async run (args: string[], plugins: Plugin[] = []) {
      const pluginContext = await createPluginContext(plugins, args)
      puppetExit = createExitPromise(page)

      await injectPuppetContext(page, { args, plugins: pluginContext })

      // Load bundles sequentially
      for (const bundlePath of bundleFilePaths) {
        await loadBundle(page, bundlePath, serverURL)
      }
    },
    async waitForExit () {
      return puppetExit
    },
    off: page.removeListener.bind(page),
    on: page.on.bind(page),
    once: page.once.bind(page),
  }
}
