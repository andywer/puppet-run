export interface Entrypoint {
  servePath?: string
  sourcePath: string
}

type UnsubscribeFn = () => void

export interface MessageBus {
  subscribeToMessages(subscriber: (type: string, args: any[]) => void): UnsubscribeFn
}

export interface Plugin {
  packageName: string
  extensions: {
    extendContext?<InputConfig extends {}, OutputConfig extends InputConfig>(
      prevContext: InputConfig,
      scriptArgs: string[]
    ): OutputConfig
    extendEntrypoints?(entrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]>
    extendMessageBus?(messageBus: MessageBus): void
  }
  help?(scriptArgs: string[]): string
}

export interface PluginSet<Context = any> {
  context: Context
  extendMessageBus(messageBus: MessageBus): MessageBus
  resolveEntrypoints(initialEntrypoints: Entrypoint[]): Promise<Entrypoint[]>
}
