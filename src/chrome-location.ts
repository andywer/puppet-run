// Original source: <https://raw.githubusercontent.com/hughsk/chrome-location/master/index.js>

import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import which from "which"

const osx   = process.platform === 'darwin'
const win   = process.platform === 'win32'
const other = !osx && !win

export function getChromeLocation () {
  if (other) {
    try {
      return which.sync('google-chrome')
    } catch(e) {
      return null
    }
  } else if (osx) {
    const regPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    const altPath = path.join(os.homedir(), regPath.slice(1))

    return fs.existsSync(regPath)
      ? regPath
      : altPath
  } else {
    const suffix = '\\Google\\Chrome\\Application\\chrome.exe';
    const prefixes = [
        process.env.LOCALAPPDATA
      , process.env.PROGRAMFILES
      , process.env['PROGRAMFILES(X86)']
    ]

    for (let i = 0; i < prefixes.length; i++) {
      const exe = prefixes[i] + suffix
      if (fs.existsSync(exe)) {
        return exe
      }
    }
  }
  return null
}
