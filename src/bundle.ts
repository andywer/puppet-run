import * as fs from "fs"
import * as path from "path"
import babelify from "babelify"
import browserify from "browserify"
import envify from "@goto-bus-stop/envify"
import mkdirp from "mkdirp"
import nanoid from "nanoid"
import { TemporaryFileCache } from "./temporary"
import { Entrypoint } from "./types"

export async function createBundle (entry: Entrypoint, cache: TemporaryFileCache): Promise<Entrypoint> {
  // TODO: Use persistent cache

  const servePath = (entry.servePath || `${path.basename(entry.sourcePath)}-${nanoid(6)}`).replace(/\.(jsx?|tsx?)/i, ".js")
  const bundleFilePath = path.join(cache, servePath)
  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".json"]

  mkdirp.sync(path.dirname(bundleFilePath))

  await new Promise(resolve => {
    const stream = browserify({
      debug: true,    // enables inline sourcemaps
      entries: [entry.sourcePath],
      extensions
    })
    .transform(babelify.configure({
      cwd: __dirname,
      extensions,
      presets: [
        "@babel/preset-typescript",
        "@babel/preset-react",
        "@babel/preset-env"
      ],
      root: process.cwd()
    } as any))
    .transform(envify)
    .bundle()
    .pipe(fs.createWriteStream(bundleFilePath))

    stream.on("finish", resolve)
  })

  return {
    servePath,
    sourcePath: bundleFilePath
  }
}
