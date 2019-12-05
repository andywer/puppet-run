import { Page } from "puppeteer-core"

export interface Entrypoint {
  servePath?: string
  sourcePath: string
}

type UnsubscribeFn = () => void

export interface MessageBus {
  subscribeToMessages(subscriber: (type: string, args: any[]) => void): UnsubscribeFn
}

export interface Plugin {
  /** Name of the package. Example: "headlessly-plugin-XYZ" */
  packageName: string
  /** Defines the extension points that allow your plugin to integrate with the script run in the browser. */
  extensions: {
    /**
     * Takes some context object (defaults to `{}`) and returns a modified context that is passed on to the next plugin and finally exposed to the browser script as `headless.plugins`.
     */
    extendContext?<InputConfig extends {}, OutputConfig extends InputConfig>(
      prevContext: InputConfig,
      scriptArgs: string[]
    ): OutputConfig
    /** Allows modifying the entrypoints that will be bundled and run in the browser. */
    extendEntrypoints?(entrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]>
    /** Allows the plugin to subscribe to messages sent via `headless.postMessage()`. */
    extendMessageBus?(messageBus: MessageBus): void
    /** Allows subscribing to page events or to execute commands on the page. */
    extendPage?(page: Page): Promise<void>
  }
  /** Return a usage help message. Can be multi-line. Optional. */
  help?(scriptArgs: string[]): string
}

export interface PluginSet<Context = any> {
  context: Context
  extendMessageBus(messageBus: MessageBus): MessageBus
  extendPage(page: Page): Promise<void>
  resolveEntrypoints(initialEntrypoints: Entrypoint[]): Promise<Entrypoint[]>
}
