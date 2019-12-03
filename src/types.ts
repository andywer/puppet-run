export interface Entrypoint {
  servePath?: string
  sourcePath: string
}

export interface Plugin {
  packageName: string
  extensions: {
    extendContext?<InputConfig extends {}, OutputConfig extends InputConfig>(
      prevContext: InputConfig,
      scriptArgs: string[]
    ): Promise<OutputConfig>
    extendEntrypoints?(entrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]>
  }
  help?(scriptArgs: string[]): string
}
