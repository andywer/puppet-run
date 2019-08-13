import dedent from "dedent"
import * as path from "path"
import { Entrypoint, Plugin } from "./types"

export { Plugin }

function validatePlugin (plugin: Plugin, packageName: string) {
  if (typeof plugin.resolveBundleEntrypoints !== "function") {
    throw new Error(`Bad plugin package: ${packageName}\nShould export a function "resolveBundleEntrypoints".`)
  }
}

function loadPluginModule (packageName: string, pluginName: string): any {
  const searchPaths = [
    path.join(process.cwd(), "node_modules")
  ]
  try {
    const modulePath = require.resolve(packageName, { paths: searchPaths })
    return require(modulePath)
  } catch (error) {
    throw new Error(
      `Cannot load plugin ${pluginName}. Module could not be loaded: ${packageName}\n\n` +
      `Try installing the module:\n\n` +
      `    npm install --save-dev ${packageName}\n\n` +
      `Caught error: ${error.message}\n`
    )
  }
}

export function loadPlugin (entrypointArgument: string): Plugin {
  const pluginName = entrypointArgument.replace(/^plugin:/, "")

  const packageName = pluginName.startsWith("puppet-run-plugin-")
    ? pluginName
    : `puppet-run-plugin-${pluginName}`

  const loadedModule = loadPluginModule(packageName, pluginName)
  validatePlugin(loadedModule, packageName)

  return {
    ...loadedModule,
    packageName
  }
}

export function printPluginHelp (plugin: Plugin, scriptArgs: string[]) {
  if (plugin.help) {
    // tslint:disable-next-line:no-console
    console.log(dedent(
      plugin.help(scriptArgs)
    ))
  } else {
    // tslint:disable-next-line:no-console
    console.log(dedent(`
      ${plugin.packageName}

      No plugin help available.
    `))
  }
}

export async function resolveEntrypoints(plugins: Plugin[], initialEntrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]> {
  let entrypoints: Entrypoint[] = initialEntrypoints

  for (const plugin of plugins) {
    entrypoints = plugin.resolveBundleEntrypoints
      ? await plugin.resolveBundleEntrypoints(entrypoints, scriptArgs)
      : entrypoints
  }

  return entrypoints
}

export async function createRuntimeConfig(plugins: Plugin[], scriptArgs: string[]) {
  let config: any = {}

  for (const plugin of plugins) {
    config = plugin.extendPuppetDotPlugins
      ? await plugin.extendPuppetDotPlugins(config, scriptArgs)
      : config
  }

  return config
}
