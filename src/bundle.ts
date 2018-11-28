import Bundler from "parcel-bundler"
import { TemporaryFileCache } from "./temporary"

async function createBundle (filePath: string, cache: TemporaryFileCache) {
  const bundler = new Bundler(filePath, {
    cache: true,
    logLevel: 2,
    minify: false,
    outDir: cache,
    target: "browser",
    watch: false
  })
  return bundler.bundle()
}

export default createBundle
