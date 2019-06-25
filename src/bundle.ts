import * as fs from "fs"
import * as path from "path"
import babelify from "babelify"
import browserify from "browserify"
import { TemporaryFileCache } from "./temporary"

export async function createBundle (entryPaths: string[], cache: TemporaryFileCache) {
  // TODO: Use persistent cache

  const bundleFilePath = path.join(cache, "main.js")
  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".json"]

  await new Promise(resolve => {
    const stream = browserify({
      debug: true,    // enables inline sourcemaps
      entries: entryPaths,
      extensions
    }).transform(babelify.configure({
      extensions,
      presets: [
        "@babel/preset-typescript",
        "@babel/preset-react",
        "@babel/preset-env"
      ]
    }))
    .bundle()
    .pipe(fs.createWriteStream(bundleFilePath))

    stream.on("finish", resolve)
  })

  return "main.js"
}
