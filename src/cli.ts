#!/usr/bin/env node

import getPort from "get-port"
import meow from "meow"
import minimist from "minimist"
import ora from "ora"
import path from "path"
import { createBundle } from "./bundle"
import { copyFiles, dedupeSourceFiles, resolveDirectoryEntrypoints } from "./fs"
import { loadPlugin, printPluginHelp, resolveEntrypoints } from "./plugins"
import { spawnPuppet } from "./puppeteer"
import { serveDirectory } from "./server"
import { clearTemporaryFileCache, createTemporaryFileCache, writeBlankHtmlPage } from "./temporary"
import { Entrypoint } from "./types"

const cli = meow(`
  Usage
    $ puppet-run <./entrypoint> [...more entrypoints] [-- <...script arguments>]
    $ puppet-run <./entrypoint>:</serve/here> [...more entrypoints] [-- <...script args>]
    $ puppet-run --plugin=<plugin> [<...entrypoints>] [-- <...script arguments>]

  Options
    --help                            Show this help.
    --inspect                         Run in actual Chrome window and keep it open.
    --bundle <./file>[:</serve/here>] Bundle and serve additional files, but don't inject them.
    --p <port>, --port <port>         Serve on this port. Defaults to random port.
    --plugin <plugin>                 Load and apply plugin <plugin>.
    --serve <./file>[:</serve/here>]  Serve additional files next to bundle.

  Example
    $ puppet-run ./sample/cowsays.js
    $ puppet-run ./sample/greet.ts newbie
    $ puppet-run --plugin=mocha ./sample/mocha-test.ts
`, {
  autoHelp: false
})

function ensureArray (arg: string | string[] | undefined): string[] {
  if (!arg) {
    return []
  } else if (Array.isArray(arg)) {
    return arg
  } else {
    return [arg]
  }
}

function parseEntrypointArg (arg: string): Entrypoint {
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

const argsSeparatorIndex = process.argv.indexOf("--")
const runnerOptionArgs = argsSeparatorIndex > -1 ? process.argv.slice(2, argsSeparatorIndex) : process.argv.slice(2)
const scriptArgs = argsSeparatorIndex > -1 ? process.argv.slice(argsSeparatorIndex + 1) : []

const runnerOptions = minimist(runnerOptionArgs)

const pluginNames = Array.isArray(runnerOptions.plugin || [])
  ? runnerOptions.plugin || []
  : [runnerOptions.plugin]

const plugins = pluginNames.map(loadPlugin)

if (runnerOptionArgs.indexOf("--help") > -1 && plugins.length > 0) {
  printPluginHelp(plugins[0], scriptArgs)
  process.exit(0)
} else if (process.argv.length === 2 || runnerOptionArgs.indexOf("--help") > -1) {
  cli.showHelp()
  process.exit(0)
}

async function run() {
  let exitCode = 0

  const headless = runnerOptionArgs.indexOf("--inspect") > -1 ? false : true
  const port = runnerOptions.p || runnerOptions.port
    ? parseInt(runnerOptions.p || runnerOptions.port, 10)
    : await getPort()

  const additionalBundleEntries = await resolveDirectoryEntrypoints(
    ensureArray(runnerOptions.bundle).map(parseEntrypointArg),
    filenames => dedupeSourceFiles(filenames, true)
  )
  const additionalFilesToServe = await resolveDirectoryEntrypoints(ensureArray(runnerOptions.serve).map(parseEntrypointArg))

  const entrypointArgs = runnerOptionArgs.filter(arg => arg.charAt(0) !== "-")
  const entrypoints = await resolveEntrypoints(plugins, entrypointArgs.map(parseEntrypointArg), scriptArgs)

  const temporaryCache = createTemporaryFileCache()

  try {
    const serverURL = `http://localhost:${port}/`
    writeBlankHtmlPage(path.join(temporaryCache, "index.html"))

    const allBundles = await withSpinner(
      Promise.all([...entrypoints, ...additionalBundleEntries].map(entrypoint => {
        return createBundle(entrypoint, temporaryCache)
      }))
    )

    const startupBundles = allBundles.slice(0, entrypoints.length)
    const lazyBundles = allBundles.slice(entrypoints.length)

    await copyFiles([...additionalFilesToServe, ...lazyBundles], temporaryCache)

    const closeServer = await serveDirectory(temporaryCache, port)
    const puppet = await spawnPuppet(startupBundles.map(entry => entry.servePath!), serverURL, { headless })
    await puppet.run(scriptArgs, plugins)

    exitCode = await puppet.waitForExit()
    await puppet.close()
    closeServer()
  } catch (error) {
    if (headless) {
      throw error
    } else {
      // tslint:disable-next-line:no-console
      console.error(error)
      await new Promise(resolve => process.on("SIGINT", resolve))
    }
  } finally {
    if (process.env.KEEP_TEMP_CACHE) {
      // tslint:disable-next-line:no-console
      console.log(`Temporary cache written to: ${temporaryCache}`)
    } else {
      clearTemporaryFileCache(temporaryCache)
    }
  }

  if (exitCode > 0) {
    // tslint:disable-next-line:no-console
    console.log(`Script exited with exit code ${exitCode}.`)
  }
  process.exit(exitCode)
}

run().catch(error => {
  // tslint:disable-next-line:no-console
  console.error(error)
  process.exit(1)
})
