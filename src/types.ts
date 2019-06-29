export interface Entrypoint {
  servePath?: string
  sourcePath: string
}

export interface Plugin {
  packageName: string,
  extendPuppetDotPlugins?<InputConfig extends {}, OutputConfig extends InputConfig>(
    puppetDotPlugins: InputConfig,
    scriptArgs: string[]
  ): Promise<OutputConfig>,
  help?(scriptArgs: string[]): string,
  resolveBundleEntrypoints?(entrypoints: Entrypoint[], scriptArgs: string[]): Promise<Entrypoint[]>
}
