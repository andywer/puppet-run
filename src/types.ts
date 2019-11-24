export interface Entrypoint {
  servePath?: string
  sourcePath: string
}

export interface Plugin {
  packageName: string,
  extendContext?<InputConfig extends {}, OutputConfig extends InputConfig>(
    prevContext: InputConfig,
    scriptArgs: string[]
  ): Promise<OutputConfig>,
  help?(scriptArgs: string[]): string,
  resolveBundleEntrypoints?(entrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]>
}
