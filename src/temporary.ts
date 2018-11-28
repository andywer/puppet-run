import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import rimraf from "rimraf"

export type TemporaryFileCache = string

export function createTemporaryFileCache (): TemporaryFileCache {
  return fs.mkdtempSync(path.join(os.tmpdir(), "puppet-run-cache"))
}

export function clearTemporaryFileCache (cache: TemporaryFileCache) {
  rimraf.sync(cache)
}
