#!/usr/bin/env node

import { Console } from "console"
import getPort from "get-port"
import path from "path"
import { createBundle } from "./core/bundle"
import { copyFiles, dedupeSourceFiles, resolveDirectoryEntrypoints } from "./util/fs"
import { createPluginSet, Plugin } from "./core/plugins"
import { spawnPuppet } from "./core/puppeteer"
import { serveDirectory } from "./core/server"
import { clearTemporaryFileCache, createTemporaryFileCache, writeBlankHtmlPage } from "./core/temporary"
import { Entrypoint } from "./types"

export * from "./types"

const doNothing = () => undefined

export interface RunnerOptions {
  /**
   * Additional source files to bundle and serve, but not auto-run as entrypoints.
   * Useful for web workers, for instance.
   */
  bundle?: Entrypoint[]
  /**
   * Use a custom console instance instead of the default node.js global console.
   */
  console?: Console
  /**
   * Whether to run the browser is headless mode. Set to `false` for easier debugging.
   * Defaults to `true`.
   */
  headless?: boolean
  /**
   * Halt the execution and keep the browser opened (when run with `headless` set to `false`)
   * after scripts finish or fail. Useful for debugging.
   */
  inspect?: boolean
  /**
   * Preserve the temporary caching directory instead of removing it after everything has run.
   */
  keepTemporaryCache?: boolean
  onBundlingError?: (error: Error) => void
  onBundlingStart?: () => void
  onBundlingSuccess?: () => void
  /** Plugins to use. */
  plugins?: Plugin[]
  /** Manually set a port on which to serve the bundles. */
  port?: number
  /**
   * Additional files or directories to serve statically, like stylesheets, images, …
   */
  serve?: Entrypoint[]
  /** Whether to throw if the script exits with a non-zero exit code. Defaults to `true`. */
  throwOnNonZeroExitCodes?: boolean
}

export interface RunnerResult {
  exitCode: number
  temporaryCache: string
}

export async function run(
  entrypointFilePaths: Array<string | Entrypoint>,
  scriptArgs: string[] = [],
  options: RunnerOptions = {}
): Promise<RunnerResult> {
  let exitCode = 0

  const reportBundlingError = options.onBundlingError || doNothing
  const reportBundlingStart = options.onBundlingStart || doNothing
  const reportBundlingSuccess = options.onBundlingSuccess || doNothing

  const port = options.port || await getPort()
  const serverURL = `http://localhost:${port}/`
  const throwOnNonZeroExitCodes = options.throwOnNonZeroExitCodes === false ? false : true

  const additionalBundleEntries = await resolveDirectoryEntrypoints(
    (options.bundle || []),
    filenames => dedupeSourceFiles(filenames, true)
  )
  const inputEntrypoints = entrypointFilePaths.map((input): Entrypoint => {
    return typeof input === "string"
      ? { sourcePath: input }
      : input
  })

  const pluginSet = createPluginSet(options.plugins || [], scriptArgs)
  const temporaryCache = createTemporaryFileCache()

  const additionalFilesToServe = await resolveDirectoryEntrypoints(options.serve || [])
  const entrypoints = await pluginSet.resolveEntrypoints(inputEntrypoints)

  try {
    let allBundles: Entrypoint[]

    writeBlankHtmlPage(path.join(temporaryCache, "index.html"))

    try {
      reportBundlingStart()
      allBundles = await Promise.all([...entrypoints, ...additionalBundleEntries].map((entrypoint, index) => {
        return createBundle(entrypoint, temporaryCache, index === 0)
      }))
      reportBundlingSuccess()
    } catch (error) {
      reportBundlingError(error)
      throw error
    }

    const startupBundles = allBundles.slice(0, entrypoints.length)
    const lazyBundles = allBundles.slice(entrypoints.length)

    await copyFiles([...additionalFilesToServe, ...lazyBundles], temporaryCache)
    const closeServer = await serveDirectory(temporaryCache, port)

    const puppet = await spawnPuppet(startupBundles.map(entry => entry.servePath!), serverURL, {
      console: options.console,
      devtools: !options.headless,
      headless: options.headless
    })
    await puppet.run(scriptArgs, pluginSet)

    exitCode = await puppet.waitForExit()

    if (options.inspect) {
      await new Promise(() => undefined)
    } else {
      await puppet.close()
    }
    closeServer()
  } finally {
    if (!options.keepTemporaryCache) {
      clearTemporaryFileCache(temporaryCache)
    }
  }

  if (exitCode !== 0 && throwOnNonZeroExitCodes) {
    throw Error(`Script exited with code ${exitCode}`)
  }

  return {
    exitCode,
    temporaryCache
  }
}
