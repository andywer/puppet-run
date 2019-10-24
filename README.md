<h1 align="center">🤖&nbsp;&nbsp;run-headless</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/run-headless" target="_blank"><img alt="npm (tag)" src="https://img.shields.io/npm/v/run-headless.svg?style=flat-square"></a>
</p>

Run any JavaScript / TypeScript code in a headless browser using [Puppeteer](https://github.com/GoogleChrome/puppeteer) from your terminal 🔥

Transparently bundles input files, so you can use `require()` and ES module `import`. You can serve static files and even simulate connectivity issues. Great for testing client-side code in an actual browser!

How does it relate to [Karma](https://karma-runner.github.io)? It's everything that Karma is not: It's small, it's fast and trivial to set up.

🚀&nbsp;&nbsp;Runs any script in a headless Chrome browser<br />
📦&nbsp;&nbsp;Zero-config transparent bundling<br />
💡&nbsp;&nbsp;Supports TypeScript, ES modules &amp; JSX out of the box<br />
🖥&nbsp;&nbsp;Pipes console output and errors to host shell<br />
⚙️&nbsp;&nbsp;Uses custom Babel, TypeScript, ... config if present<br />


## Installation

```sh
npm install run-headless
```

## Usage

### Basics

Running `run-headless` from the command line is simple. We can use npm's [npx tool](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) for convenience.

```sh
npx run-headless [<arguments>]

# without npx
node ./node_modules/.bin/run-headless [<arguments>]
```

Pass any JavaScript or TypeScript file to `run-headless` as an entrypoint. It will be transpiled by Babel and bundled using `browserify`. It normally works out-of-the-box with zero configuration.

```sh
npx run-headless [...run-headless options] ./path/to/script.js [...script options]
```

### Run mocha tests

```sh
npm install run-headless-plugin-mocha
npx run-headless --plugin=mocha [...mocha options] ./path/to/*.test.js
```

### Print help texts

```sh
npx run-headless --help
```

To print a plugin's help text:

```sh
npx run-headless --plugin=mocha --help
```


## Example

```js
// sample.js

// Everything logged here will be piped to your host terminal
console.log(`I am being run in a browser: ${navigator.userAgent}`)

// Explicitly terminate the script when you are done
puppet.exit()
```

Don't forget to call `puppet.exit()` when the script is done, so `run-headless` knows that the script has finished. You can also exit with a non-zero exit code using `puppet.exit(statusCode: number)`.

Check out the  "Scripting API" section below if you want to learn more about the globally available `puppet` object.

Let's run the sample script!

```sh
npx run-headless ./sample.js
```

You should now see the output of the script on your terminal:

```
I am being run in a browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36
```

Have fun!


## Plugins

Plugins make it easy to integrate your script with testing frameworks.

Check out the 👉 [plugins repository](https://github.com/andywer/run-headless-plugins) to see what's on offer.


## Scripting API

The script runner will inject a `puppet` object into the browser window's global scope. It contains a couple of useful functions.

#### `puppet.argv: string[]`

Contains all the command line arguments and options passed to `run-headless` after the script file path.

#### `puppet.exit(exitCode?: number = 0)`

Causes the script to end. The `run-headless` process will exit with the exit code you pass here.

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
