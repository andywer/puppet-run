import { EventEmitter } from "events"
import * as fs from "fs"
import * as http from "http"
import * as path from "path"
import ora from "ora"
import Bundler, { ParcelBundle } from "parcel-bundler"
import { TemporaryFileCache } from "./temporary"

interface ServingBundler extends Bundler, EventEmitter {
  serve (port?: number, https?: boolean, host?: string): Promise<http.Server>
}

function copyFile (from: string, to: string) {
  return new Promise(resolve => {
    const input = fs.createReadStream(from)
    const output = fs.createWriteStream(to)

    input.once("end", resolve)
    input.pipe(output)
  })
}

export function getSourceBundles (bundle: ParcelBundle) {
  const childBundles = (bundle as any).childBundles as Set<ParcelBundle>

  if (!bundle.entryAsset && childBundles.size > 0) {
    return Array.from<ParcelBundle>(childBundles.values())
  } else {
    return [bundle]
  }
}

/**
 * Source maps are currently broken if we have multiple entry points and the source files
 * do not reside directly in the CWD. The source map reference URL in the code bundle will
 * always point to `/${path.basename(mapFilePath)}`.
 */
async function hackySourceMapsFix (bundle: ParcelBundle, cache: TemporaryFileCache) {
  const sourceBundles = getSourceBundles(bundle)

  for (const sourceBundle of sourceBundles) {
    const mapBundles = Array.from<ParcelBundle>(sourceBundle.siblingBundles).filter(siblingBundle => siblingBundle.type === "map")

    for (const mapBundle of mapBundles) {
      const pathToFileInServerRoot = path.resolve(cache, path.basename(mapBundle.name))
      if (path.resolve(mapBundle.name) !== pathToFileInServerRoot) {
        await copyFile(mapBundle.name, pathToFileInServerRoot)
      }
    }
  }
}

type ServeBundleArgs = [string[], TemporaryFileCache, number]

async function serveBundle (entryPaths: string[], cache: TemporaryFileCache, port: number) {
  const bundler = new Bundler(entryPaths, {
    cache: true,
    hmr: false,
    logLevel: 2,
    minify: false,
    outDir: cache,
    production: false,
    target: "browser",
    watch: true
  } as Bundler.ParcelOptions) as ServingBundler

  const bundled = new Promise<ParcelBundle>((resolve, reject) => {
    bundler.on("bundled", (createdBundle: ParcelBundle) => resolve(createdBundle))
    bundler.on("buildError", (error: Error) => reject(error))
  })

  const [ bundle, server ] = await Promise.all([
    bundled,
    bundler.serve(port)
  ])

  await hackySourceMapsFix(bundle, cache)

  return {
    bundle,
    server
  }
}

async function withSpinner<T> (promise: Promise<T>) {
  const spinner = ora("Bundling code").start()

  try {
    const result = await promise
    spinner.succeed("Bundling done.")
    return result
  } catch (error) {
    spinner.fail("Bundling failed.")
    throw error // re-throw
  }
}

export default (...args: ServeBundleArgs) => withSpinner(serveBundle(...args))
