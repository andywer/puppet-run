import * as fs from "fs"
import * as path from "path"
import babelify from "babelify"
import browserify from "browserify"
import envify from "envify"
import mkdirp from "mkdirp"
import nanoid from "nanoid"
import { TemporaryFileCache } from "./temporary"
import { Entrypoint } from "./types"

export async function createBundle (entry: Entrypoint, cache: TemporaryFileCache): Promise<Entrypoint> {
  // TODO: Use persistent cache

  const generatedEntrypointPath = path.join(cache, nanoid(8) + ".js")
  const servePath = (entry.servePath || `${path.basename(entry.sourcePath)}-${nanoid(6)}`).replace(/\.(jsx?|tsx?)/i, ".js")
  const bundleFilePath = path.join(cache, servePath)
  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".json"]

  mkdirp.sync(path.dirname(bundleFilePath))

  const generatedEntrypointContent = `
    const mod = require(${JSON.stringify(path.resolve(entry.sourcePath))})
    const entryFn = mod.default || mod

    if (typeof entryFn !== "function") {
      throw Error(
        "Expected entry point module to export a function." +
        "  Actual: " + entryFn + "\\n" +
        "  File: " + ${JSON.stringify(path.resolve(entry.sourcePath))}
      )
    }
    window.headless.run(entryFn)
  `

  fs.writeFileSync(generatedEntrypointPath, generatedEntrypointContent, "utf8")

  await new Promise(resolve => {
    const stream = browserify({
      debug: true,    // enables inline sourcemaps
      entries: [
        require.resolve("@babel/register"),
        require.resolve("@babel/polyfill"),
        generatedEntrypointPath
      ],
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
