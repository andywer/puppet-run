# 🤖 puppet-run

Run anything JavaScript in Chrome with puppeteer and pipe it's output back to your terminal 🔥

Transparently bundles your input files and runs them in a headless Chromium browser.  Great for running tests in an actual browser!

How does it relate to [Karma](https://karma-runner.github.io)? It's everything that Karma is not: It's small, it's fast and trivial to set up.

🚀&nbsp;&nbsp;Runs any script in a headless Chrome<br />
📦&nbsp;&nbsp;Zero-config transparent bundling<br />
⚙️&nbsp;&nbsp;Uses existing Babel, TypeScript, ... config if present<br />
💡&nbsp;&nbsp;Supports TypeScript, ES modules &amp; JSX out of the box<br />
🖥&nbsp;&nbsp;Pipes console output and errors to host shell<br />


## Installation

```sh
npm install puppet-run
```

We can use npm's [npx tool](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) to run the locally installed puppet-run program:

```sh
npx puppet-run [<arguments>]

# equal to:
# node ./node_modules/.bin/puppet-run [<arguments>]
```


## Usage

### Basics

```sh
npx puppet-run ./path/to/script.js [arguments and options here will be passed to the script]
```

The script can be any JavaScript or TypeScript file. It will be transparently transpiled via Babel using `@babel/preset-env`, `@babel/preset-react` & `@babel/preset-typescript` and bundled using `browserify`. It usually works out-of-the-box with zero configuration.

You just need to call `puppet.exit()` or optionally `puppet.exit(statusCode: number)` when the script is done, so `puppet-run` knows that the script is finished. The `puppet` object is a global, injected by `puppet-run`.

### Run mocha tests

```sh
npm install puppet-run-plugin-mocha
npx puppet-run --plugin=mocha [...mocha options] ./path/to/*.test.js
```

### Print help texts

```sh
npx puppet-run --help
```

Print help text how to use this plugin:

```sh
npx puppet-run --plugin=mocha --help
```


## Example

This is how a simple script might look like:

```js
import { detect } from "detect-browser"

const browser = detect()

// You can use window.*, since this will be run in Chrome
const text = window.atob("SSBydW4gaW4gYSBicm93c2Vy")

// Everything logged here will be piped to your host terminal
console.log(text)
console.log(`I am being run in a ${browser.name} ${browser.version}`)

// Explicitly terminate the script when you are done
puppet.exit()
```

Recognize the final `puppet.exit()`? You need to tell `puppet-run` when the script has finished.

Have a look at the section "Scripting API" below to learn more about that globally available `puppet` object.

Let's run the sample script!

```sh
npm install detect-browser puppet-run
npx puppet-run ./sample.js
```

```
I live in a browser now
I am being run in a chrome 75.0
```

Have fun!


## Plugins

Plugins make it easy to integrate your script with testing frameworks or other extra functionality.

Check out the 👉 [plugins repository](https://github.com/andywer/puppet-run-plugins).

## Scripting API

The script runner will inject a `puppet` object into the browser window's global scope. It contains a couple of useful functions.

#### `puppet.argv: string[]`

Contains all the command line arguments and options passed to `puppet-run` after the script file path.

#### `puppet.exit(exitCode: number = 0)`

Causes the script to end. The `puppet-run` process will exit with the exit code you pass here.

The exit code defaults to zero.

#### `puppet.setOfflineMode(takeOffline: boolean = true)`

Puts the browser in offline mode and closes all active connections if called with `true` or no arguments. Call it with `false` to bring the browser back online.


## More features

### Environment variables

You can access all environment variables of the host shell in your scripts as `process.env.*`.

### Source Maps

If an error is thrown, you will see the error and stack trace in your host shell. The stack trace will reference your source file lines, not the line in the bundle file that is actually served to the browser under the hood.


## Samples

Have a look at the samples in the [`sample`](./sample) directory:

- [Simple Testing](./sample/basic)
- [Simple Mocha Test](./sample/mocha)
- [React / Enzyme Test](./sample/mocha-enzyme)
- [Tape Test](./sample/tape)


## Test framework support

If you want to run tests in the browser using puppet-run, check out this list first:

#### ✅ Mocha

Works like a charm, see [`sample/mocha`](./sample/mocha) or [`sample/mocha-enzyme`](./sample/mocha-enzyme). They use the [Mocha Plugin](https://github.com/andywer/puppet-run-plugins/tree/master/packages/puppet-run-plugin-mocha).

#### ✅ Tape

Works like a charm, see [`sample/tape`](./sample/tape).

#### ❌ AVA

Currently not possible, since it's testing library and test runner code are too tightly coupled.

#### ❔ Jest

Didn't try yet.


## License

MIT
