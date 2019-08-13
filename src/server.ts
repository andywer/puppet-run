import * as http from "http"
import serve from "serve-handler"

export async function serveDirectory(dirPath: string, port: number) {
  const server = http.createServer((req, res) => {
    serve(req, res, {
      cleanUrls: false,
      directoryListing: true,
      public: dirPath
    })
  })
  await new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve())
  })
  const closeServer = () => server.close()
  return closeServer
}
