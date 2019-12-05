import * as fs from "fs"
import * as path from "path"
import mkdirp from "mkdirp"
import * as util from "util"
import { Entrypoint } from "../types"

const passthrough = <T>(thing: T) => thing

const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)

function flatten<T>(nested: T[][]): T[] {
  return nested.reduce<T[]>(
    (flattened, subarray) => [...flattened, ...subarray],
    []
  )
}

export function copyFile (from: string, to: string) {
  if (path.resolve(from) === path.resolve(to)) return

  return new Promise(resolve => {
    const input = fs.createReadStream(from)
    const output = fs.createWriteStream(to)

    input.once("end", resolve)
    input.pipe(output)
  })
}

export async function copyFiles(filesToServe: Entrypoint[], destinationDirectory: string) {
  return Promise.all(filesToServe.map(
    async ({ servePath, sourcePath }) => {
      const servingPath = servePath || path.basename(sourcePath)
      const destinationFilePath = path.resolve(destinationDirectory, servingPath.replace(/^\//, ""))

      if (destinationFilePath.substr(0, destinationDirectory.length) !== destinationDirectory) {
        throw new Error(`File would be served outside of destination directory: ${sourcePath} => ${servingPath}`)
      }

      mkdirp.sync(path.dirname(destinationFilePath))
      await copyFile(sourcePath, destinationFilePath)
    }
  ))
}

export function dedupeSourceFiles(basenames: string[], dropNonSourceFiles?: boolean): string[] {
  // We don't want to include a source file and its already transpiled version as input

  const sourceExtensionsRegex = /\.(jsx?|tsx?)$/i
  const sourceFileNames = basenames.filter(basename => basename.match(sourceExtensionsRegex))
  const nonSourceFileNames = basenames.filter(basename => sourceFileNames.indexOf(basename) === -1)

  const collidingSourceFileNames = sourceFileNames.reduce<{ [name: string]: string[] }>(
    (destructured, filename) => {
      const ext = path.extname(filename)
      const name = filename.substr(0, filename.length - ext.length)
      return {
        ...destructured,
        [name]: (destructured[name] || []).concat([ext])
      }
    },
    {}
  )

  const dedupedSourceFileNames = Object.keys(collidingSourceFileNames).map(name => {
    const ext = collidingSourceFileNames[name].sort()[0]
    return `${name}${ext}`
  })

  return [
    ...(dropNonSourceFiles ? [] : nonSourceFileNames),
    ...dedupedSourceFileNames
  ]
}

export async function resolveDirectoryEntrypoints(
  entrypoints: Entrypoint[],
  filterFiles: (basenames: string[]) => string[] = passthrough
): Promise<Entrypoint[]> {
  const nested = await Promise.all(
    entrypoints.map(async entry => {
      if ((await stat(entry.sourcePath)).isDirectory()) {
        const files = filterFiles(await readdir(entry.sourcePath))
        const subentries = files.map(filename => ({
          servePath: entry.servePath ? path.join(entry.servePath, filename) : undefined,
          sourcePath: path.join(entry.sourcePath, filename)
        }))
        return resolveDirectoryEntrypoints(subentries)
      } else {
        return [entry]
      }
    })
  )
  return flatten(nested)
}
