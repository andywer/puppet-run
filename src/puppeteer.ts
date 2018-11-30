import * as fs from "fs"
import { ParcelBundle } from "parcel-bundler"
import { launch, Page } from "puppeteer-core"
import { getChromeLocation } from "./chrome-location"
import {
  capturePuppetConsole,
  createPuppetContextConfig,
  injectPuppetContext,
  subscribeToMagicLogs
} from "./host-bindings"
import { Plugin } from "./plugins"
import ScriptError from "./script-error"

export interface Puppet {
  close (): Promise<void>,
  run (argv: string[], plugin?: Plugin | null): Promise<void>,
  waitForExit (): Promise<number>,
  on: Page["on"],
  once: Page["once"],
  off: Page["off"]
}

async function loadBundle (page: Page, bundle: ParcelBundle): Promise<void> {
  const childBundles = (bundle as any).childBundles as Set<ParcelBundle>
  if (!bundle.entryAsset && childBundles.size > 0) {
    for (const childBundle of childBundles.values()) {
      await loadBundle(page, childBundle)
    }
    return
  }

  if (bundle.type !== "js") {
    throw new Error(`Only JS bundles supported for now. Got "${bundle.type}" bundle: ${bundle.name}`)
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

export async function spawnPuppet (bundle: ParcelBundle, options: { headless?: boolean }): Promise<Puppet> {
  const { headless = true } = options

  const browser = await launch({
    executablePath: getChromeLocation() || undefined,
    headless
  })

  const page = await browser.newPage()
  let puppetExit: Promise<number>

  capturePuppetConsole(page)

  return {
    async close () {
      if (headless) {
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
