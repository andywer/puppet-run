declare module "@goto-bus-stop/envify" {
  import stream from "stream"

  function applyEnvify(file: string, argv: any[]): stream.Duplex

  export = applyEnvify
}

declare module "@goto-bus-stop/envify/custom" {
  import stream from "stream"

  function envify(customVars?: { [name: string]: string }): (file: string, argv: any[]) => stream.Duplex

  export = envify
}
