#!/usr/bin/env node

import meow from "meow"
import createBundle from "./bundle"
import { isPluginArgument, loadPlugin, printPluginHelp } from "./plugins"
import { spawnPuppet } from "./puppeteer"
import { clearTemporaryFileCache, createTemporaryFileCache } from "./temporary"

const cli = meow(`
  Usage
    $ puppet-run <./path/to/index.js> [...script arguments]
    $ puppet-run plugin:<plugin> <...plugin arguments>

  Options
    --help      Show this help.
    --inspect   Run in actual Chrome window and keep it open.

  Example
    $ puppet-run ./sample/cowsays.js
    $ puppet-run ./sample/greet.ts newbie
    $ puppet-run plugin:mocha ./sample/mocha-test.ts
`, {
  autoHelp: false
})

const firstArgumentIndex = process.argv.findIndex((arg, index) => index >= 2 && !arg.startsWith("-"))
const runnerOptionArgs = firstArgumentIndex > -1 ? process.argv.slice(2, firstArgumentIndex) : process.argv.slice(2)
const scriptArgs = firstArgumentIndex > -1 ? process.argv.slice(firstArgumentIndex + 1) : []

const headless = runnerOptionArgs.indexOf("--inspect") > -1 ? false : true

if (firstArgumentIndex === -1 || runnerOptionArgs.indexOf("--help") > -1) {
  cli.showHelp()
  process.exit(0)
}

async function run () {
  let exitCode = 0
  const entrypoint = process.argv[firstArgumentIndex]

  const plugin = isPluginArgument(entrypoint) ? loadPlugin(entrypoint) : null
  const temporaryCache = createTemporaryFileCache()

  if (plugin && scriptArgs.indexOf("--help") > -1) {
    return printPluginHelp(plugin, scriptArgs)
  }

  const scriptPaths = plugin && plugin.resolveBundleEntrypoints
    ? await plugin.resolveBundleEntrypoints(scriptArgs)
    : [ entrypoint ]

  try {
    const bundle = await createBundle(scriptPaths, temporaryCache)
    const puppet = await spawnPuppet(bundle, { headless })
    await puppet.run(scriptArgs, plugin)

    exitCode = await puppet.waitForExit()
    await puppet.close()
  } finally {
    if (process.env.KEEP_TEMP_CACHE) {
      console.log(`Temporary cache written to: ${temporaryCache}`)
    } else {
      clearTemporaryFileCache(temporaryCache)
    }
  }

  if (exitCode > 0) console.log(`Script exited with exit code ${exitCode}.`)
  process.exit(exitCode)
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
