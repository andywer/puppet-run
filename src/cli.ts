import getPort from "get-port"
import meow from "meow"
import minimist from "minimist"
import ora from "ora"
import * as runner from "./index"
import { loadPlugin, printPluginHelp } from "./plugins"
import { Entrypoint } from "./types"

type OraSpinner = ReturnType<typeof ora>

const cli = meow(`
  Usage
    $ headlessly <./entrypoint> [...more entrypoints] [-- <...script arguments>]
    $ headlessly <./entrypoint>:</serve/here> [...more entrypoints] [-- <...script args>]
    $ headlessly --plugin=<plugin> [<...entrypoints>] [-- <...script arguments>]

  Options
    --help                            Show this help.
    --inspect                         Run in actual Chrome window and keep it open.
    --bundle <./file>[:</serve/here>] Bundle and serve additional files, but don't inject them.
    --p <port>, --port <port>         Serve on this port. Defaults to random port.
    --plugin <plugin>                 Load and apply plugin <plugin>.
    --serve <./file>[:</serve/here>]  Serve additional files next to bundle.

  Example
    $ headlessly ./sample/cowsays.js
    $ headlessly ./sample/greet.ts newbie
    $ headlessly --plugin=mocha ./sample/mocha-test.ts
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

function parseEntrypointArg(arg: string): Entrypoint {
  const [sourcePath, servePath] = arg.split(":")
  return {
    servePath,
    sourcePath
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
  let result: runner.RunnerResult | undefined
  let spinner: OraSpinner | undefined

  const port = runnerOptions.p || runnerOptions.port
    ? parseInt(runnerOptions.p || runnerOptions.port, 10)
    : await getPort()

  const entrypoints = runnerOptionArgs.filter(arg => arg.charAt(0) !== "-")
  const headless = runnerOptionArgs.indexOf("--inspect") === -1
  const keepTemporaryCache = Boolean(process.env.KEEP_TEMP_CACHE)

  const onBundlingStart = () => {
    spinner = ora("Bundling code").start()
  }
  const onBundlingError = () => spinner && spinner.fail("Bundling failed.")
  const onBundlingSuccess = () => spinner && spinner.succeed("Bundling done.")

  try {
    result = await runner.run(entrypoints, scriptArgs, {
      bundle: ensureArray(runnerOptions.bundle).map(parseEntrypointArg),
      headless,
      keepTemporaryCache,
      onBundlingError,
      onBundlingStart,
      onBundlingSuccess,
      port,
      serve: ensureArray(runnerOptions.serve).map(parseEntrypointArg),
      throwOnNonZeroExitCodes: false
    })
  } catch (error) {
    if (headless) {
      throw error
    } else {
      // tslint:disable-next-line:no-console
      console.error(error)
      await new Promise(resolve => process.on("SIGINT", resolve))
    }
  } finally {
    if (keepTemporaryCache) {
      // tslint:disable-next-line:no-console
      console.log(`Temporary cache written to: ${result!.temporaryCache}`)
    }
  }

  if (result!.exitCode > 0) {
    // tslint:disable-next-line:no-console
    console.log(`Script exited with exit code ${result!.exitCode}.`)
  }
  process.exit(result!.exitCode)
}

run().catch(error => {
  // tslint:disable-next-line:no-console
  console.error(error)
  process.exit(1)
})
