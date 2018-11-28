import * as fs from "fs"
import { ParcelBundle } from "parcel-bundler"
import { launch, Page } from "puppeteer-core"
import { getChromeLocation } from "./chrome-location"
import { capturePuppetConsole, injectPuppetContext, subscribeToMagicLogs } from "./host-bindings"
import ScriptError from "./script-error"

export interface Puppet {
  close (): Promise<void>,
  run (argv: string[]): Promise<void>,
  waitForExit (): Promise<number>,
  on: Page["on"],
  once: Page["once"],
  off: Page["off"]
}

async function loadBundle (page: Page, bundle: ParcelBundle) {
  if (bundle.type !== "js") {
    throw new Error(`Only JS bundles supported for now.`)
  }
  await page.addScriptTag({
    content: fs.readFileSync(bundle.name, "utf8")
  })
}

function createExitPromise (page: Page) {
  return new Promise<number>((resolve, reject) => {
    subscribeToMagicLogs(page, (type, args) => {
      if (type === "exit") {
        resolve(args[0] as number)
      }
    })
    const handleScriptError = (error: Error) => {
      reject(new ScriptError(error))
    }
    page.once("error", handleScriptError)
    page.once("pageerror", handleScriptError)
  })
}

export async function spawnPuppet (bundle: ParcelBundle): Promise<Puppet> {
  const browser = await launch({
    executablePath: getChromeLocation() || undefined
  })

  const page = await browser.newPage()
  let puppetExit: Promise<number>

  capturePuppetConsole(page)

  return {
    async close () {
      await browser.close()
    },
    async run (argv: string[]) {
      puppetExit = createExitPromise(page)
      await injectPuppetContext(page, argv)
      return loadBundle(page, bundle)
    },
    async waitForExit () {
      return puppetExit
    },
    off: page.removeListener.bind(page),
    on: page.on.bind(page),
    once: page.once.bind(page),
  }
}
