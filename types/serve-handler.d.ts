declare module "serve-handler" {
  import * as Http from "http"

  interface Options {
    cleanUrls?: boolean
    directoryListing?: boolean | string[]
    public?: string
    // incomplete
  }

  function serve(req: Http.IncomingMessage, res: Http.ServerResponse, options?: Options): Promise<void>

  export = serve
}
