import Bundler from "parcel-bundler"
import { TemporaryFileCache } from "./temporary"

async function createBundle (entryPaths: string[], cache: TemporaryFileCache) {
  const bundler = new Bundler(entryPaths, {
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
