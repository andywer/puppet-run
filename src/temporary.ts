import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import del from "del"

export type TemporaryFileCache = string

export function createTemporaryFileCache (): TemporaryFileCache {
  return fs.mkdtempSync(path.join(os.tmpdir(), "puppet-run-cache"))
}

export function clearTemporaryFileCache (cache: TemporaryFileCache) {
  del.sync([cache], { force: true })
}

export function writeBlankHtmlPage (filePath: string) {
  const content = `
    <!doctype html>
    <html>
      <head></head>
      <body><!-- Blank page as a launch pad to inject JS scripts into --></body>
    </html>
  `.trim()
  fs.writeFileSync(filePath, content, "utf8")
}
