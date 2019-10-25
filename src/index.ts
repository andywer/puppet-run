#!/usr/bin/env node

import getPort from "get-port"
import ora from "ora"
import path from "path"
import { createBundle } from "./bundle"
import { copyFiles, dedupeSourceFiles, resolveDirectoryEntrypoints } from "./fs"
import { resolveEntrypoints, Plugin } from "./plugins"
import { spawnPuppet } from "./puppeteer"
import { serveDirectory } from "./server"
import { clearTemporaryFileCache, createTemporaryFileCache, writeBlankHtmlPage } from "./temporary"
import { Entrypoint } from "./types"

const doNothing = () => undefined

function parseEntrypointArg(arg: string): Entrypoint {
  const [sourcePath, servePath] = arg.split(":")
  return {
    servePath,
    sourcePath
  }
}

async function withSpinner<T>(promise: Promise<T>): Promise<T> {
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

export interface RunnerOptions {
  bundle?: string[]
  headless?: boolean
  inspect?: boolean
  keepTemporaryCache?: boolean
  onBundlingError?: () => void
  onBundlingStart?: () => void
  onBundlingSuccess?: () => void
  plugins?: Plugin[]
  port?: number
  serve?: string[]
}

export interface RunnerResult {
  exitCode: number
  temporaryCache: string
}

export async function run(
  entrypointFilePaths: string[],
  scriptArgs: string[] = [],
  options: RunnerOptions = {}
): Promise<RunnerResult> {
  let exitCode = 0

  const reportBundlingError = options.onBundlingError || doNothing
  const reportBundlingStart = options.onBundlingStart || doNothing
  const reportBundlingSuccess = options.onBundlingSuccess || doNothing

  const port = options.port || await getPort()
  const serverURL = `http://localhost:${port}/`

  const additionalBundleEntries = await resolveDirectoryEntrypoints(
    (options.bundle || []).map(parseEntrypointArg),
    filenames => dedupeSourceFiles(filenames, true)
  )
  const additionalFilesToServe = await resolveDirectoryEntrypoints((options.serve || []).map(parseEntrypointArg))
  const entrypoints = await resolveEntrypoints(options.plugins || [], entrypointFilePaths.map(parseEntrypointArg), scriptArgs)

  const temporaryCache = createTemporaryFileCache()

  try {
    let allBundles: Entrypoint[]

    writeBlankHtmlPage(path.join(temporaryCache, "index.html"))

    try {
      reportBundlingStart()
      allBundles = await Promise.all([...entrypoints, ...additionalBundleEntries].map(entrypoint => {
        return createBundle(entrypoint, temporaryCache)
      }))
      reportBundlingSuccess()
    } catch (error) {
      reportBundlingError()
      throw error
    }

    const startupBundles = allBundles.slice(0, entrypoints.length)
    const lazyBundles = allBundles.slice(entrypoints.length)

    await copyFiles([...additionalFilesToServe, ...lazyBundles], temporaryCache)

    const closeServer = await serveDirectory(temporaryCache, port)
    const puppet = await spawnPuppet(startupBundles.map(entry => entry.servePath!), serverURL, { headless: options.headless })
    await puppet.run(scriptArgs, options.plugins)

    exitCode = await puppet.waitForExit()
    await puppet.close()
    closeServer()
  } finally {
    if (!options.keepTemporaryCache) {
      clearTemporaryFileCache(temporaryCache)
    }
  }

  return {
    exitCode,
    temporaryCache
  }
}
