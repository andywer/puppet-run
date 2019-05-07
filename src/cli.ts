#!/usr/bin/env node

import getPort from "get-port"
import meow from "meow"
import minimist from "minimist"
import path from "path"
import serveBundle from "./bundle"
import { copyFiles } from "./fs"
import { isPluginArgument, loadPlugin, printPluginHelp } from "./plugins"
import { spawnPuppet } from "./puppeteer"
import { clearTemporaryFileCache, createTemporaryFileCache } from "./temporary"

const cli = meow(`
  Usage
    $ puppet-run <./path/to/index.js> [...script arguments]
    $ puppet-run plugin:<plugin> <...plugin arguments>

  Options
    --help                            Show this help.
    --inspect                         Run in actual Chrome window and keep it open.
    --p <port>, --port <port>         Serve on this port. Defaults to random port.
    --serve <./file>[:</serve/here>]  Serve additional files next to bundle.

  Example
    $ puppet-run ./sample/cowsays.js
    $ puppet-run ./sample/greet.ts newbie
    $ puppet-run plugin:mocha ./sample/mocha-test.ts
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

const isParameterizedOption = (arg: string) => ["-p", "--port", "--serve"].indexOf(arg) > -1
const firstArgumentIndex = process.argv.findIndex(
  (arg, index) => index >= 2 && !arg.startsWith("-") && !isParameterizedOption(process.argv[index - 1])
)

const runnerOptionArgs = firstArgumentIndex > -1 ? process.argv.slice(2, firstArgumentIndex) : process.argv.slice(2)
const scriptArgs = firstArgumentIndex > -1 ? process.argv.slice(firstArgumentIndex + 1) : []

const runnerOptions = minimist(runnerOptionArgs)

const additionalFilesToServe = ensureArray(runnerOptions.serve).map(arg => {
  const [sourcePath, servingPath] = arg.split(":")
  return { sourcePath, servingPath: servingPath || path.basename(arg) }
})

if (firstArgumentIndex === -1 || runnerOptionArgs.indexOf("--help") > -1) {
  cli.showHelp()
  process.exit(0)
}

async function run () {
  let exitCode = 0
  const entrypoint = process.argv[firstArgumentIndex]

  const headless = runnerOptionArgs.indexOf("--inspect") > -1 ? false : true
  const port = runnerOptions.p || runnerOptions.port
    ? parseInt(runnerOptions.p || runnerOptions.port, 10)
    : await getPort()

  const plugin = isPluginArgument(entrypoint) ? loadPlugin(entrypoint) : null
  const temporaryCache = createTemporaryFileCache()

  if (plugin && scriptArgs.indexOf("--help") > -1) {
    return printPluginHelp(plugin, scriptArgs)
  }

  const scriptPaths = plugin && plugin.resolveBundleEntrypoints
    ? await plugin.resolveBundleEntrypoints(scriptArgs)
    : [ entrypoint ]

  try {
    const serverURL = `http://localhost:${port}/`

    const { bundle, server } = await serveBundle(scriptPaths, temporaryCache, port)
    await copyFiles(additionalFilesToServe, temporaryCache)
    const puppet = await spawnPuppet(bundle, serverURL, { headless })
    await puppet.run(scriptArgs, plugin)

    exitCode = await puppet.waitForExit()
    await puppet.close()
    server.close()
  } catch (error) {
    if (headless) {
      throw error
    } else {
      // tslint:disable-next-line:no-console
      console.error(error)
      await new Promise(resolve => undefined)
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
