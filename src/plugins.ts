import dedent from "dedent"
import * as path from "path"
import { Entrypoint, MessageBus, Plugin, PluginSet } from "./types"

export { Plugin, PluginSet }

function validatePlugin (plugin: Plugin, packageName: string) {
  if (!plugin.packageName || typeof plugin.packageName !== "string") {
    throw new Error(`Bad plugin package: ${packageName}\nShould export a string "packageName".`)
  }
  if (!plugin.extensions || typeof plugin.extensions !== "object") {
    throw new Error(`Bad plugin package: ${packageName}\nShould export an object "extensions".`)
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

  const packageName = pluginName.startsWith("headlessly-")
    ? pluginName
    : `headlessly-${pluginName}`

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

function createPluginContext(plugins: Plugin[], scriptArgs: string[]) {
  let context: any = {}

  for (const plugin of plugins) {
    if (plugin.extensions.extendContext) {
      context = plugin.extensions.extendContext(context, scriptArgs)
    }
  }

  return context
}

export function createPluginSet(plugins: Plugin[], scriptArgs: string[]): PluginSet {
  const context = createPluginContext(plugins, scriptArgs)

  return {
    context,

    extendMessageBus(messageBus: MessageBus) {
      for (const plugin of plugins) {
        if (plugin.extensions.extendMessageBus) {
          plugin.extensions.extendMessageBus(messageBus)
        }
      }
      return messageBus
    },

    async resolveEntrypoints(initialEntrypoints: Entrypoint[]): Promise<Entrypoint[]> {
      let entrypoints: Entrypoint[] = initialEntrypoints

      for (const plugin of plugins) {
        if (plugin.extensions.extendEntrypoints) {
          entrypoints = await plugin.extensions.extendEntrypoints(entrypoints, scriptArgs)
        }
      }

      return entrypoints
    }
  }
}
