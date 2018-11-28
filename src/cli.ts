#!/usr/bin/env node

import meow from "meow"
import createBundle from "./bundle"
import { spawnPuppet } from "./puppeteer"
import { clearTemporaryFileCache, createTemporaryFileCache } from "./temporary"

const cli = meow(`
  Usage
    $ puppet-run <./path/to/index.js> [...script arguments]

  Options
    --help    Show this help.
`)

const firstArgumentIndex = process.argv.findIndex((arg, index) => index >= 2 && !arg.startsWith("-"))
const runnerOptionArgs = firstArgumentIndex > -1 ? process.argv.slice(2, firstArgumentIndex) : process.argv.slice(2)
const scriptArgs = firstArgumentIndex > -1 ? process.argv.slice(firstArgumentIndex + 1) : []

if (firstArgumentIndex === -1 || runnerOptionArgs.indexOf("--help") > -1) {
  cli.showHelp()
  process.exit(0)
}

async function run () {
  let exitCode = 0
  const temporaryCache = createTemporaryFileCache()

  try {
    const bundle = await createBundle(cli.input[0], temporaryCache)
    const puppet = await spawnPuppet(bundle)
    await puppet.run(scriptArgs)

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
