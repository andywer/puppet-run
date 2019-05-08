import * as fs from "fs"
import * as path from "path"
import mkdirp from "mkdirp"

interface FileToServe {
  servingPath: string,
  sourcePath: string
}

export function copyFile (from: string, to: string) {
  return new Promise(resolve => {
    const input = fs.createReadStream(from)
    const output = fs.createWriteStream(to)

    input.once("end", resolve)
    input.pipe(output)
  })
}

export async function copyFiles (filesToServe: FileToServe[], destinationDirectory: string) {
  return Promise.all(filesToServe.map(
    async ({ servingPath, sourcePath }) => {
      const destinationFilePath = path.resolve(destinationDirectory, servingPath.replace(/^\//, ""))
      if (destinationFilePath.substr(0, destinationDirectory.length) !== destinationDirectory) {
        throw new Error(`File would be served outside of destination directory: ${sourcePath} => ${servingPath}`)
      }
      mkdirp.sync(path.dirname(destinationFilePath))
      return copyFile(sourcePath, destinationFilePath)
    }
  ))
}
