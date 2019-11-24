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

We can use npm's [npx tool](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) to run a locally installed `run-headless` package.

```sh
npx run-headless [<options>] <file>

# without npx
node ./node_modules/.bin/run-headless [<options>] <file>
```

*To keep this documentation consistent, we will refer to `run-headless` invocations as `run-headless ...` from here on, without `npx`.*

#### Print help

Run `run-headless --help` to print some general usage description.

```
Usage
  $ run-headless <./entrypoint> [...more entrypoints] [-- <...script arguments>]
  $ run-headless <./entrypoint>:</serve/here> [...more entrypoints] [-- <...script args>]
  $ run-headless --plugin=<plugin> [<...entrypoints>] [-- <...script arguments>]

Options
  --help                            Show this help.
  --inspect                         Run in actual Chrome window and keep it open.
  --bundle <./file>[:</serve/here>] Bundle and serve additional files, but don't inject them.
  --p <port>, --port <port>         Serve on this port. Defaults to random port.
  --plugin <plugin>                 Load and apply plugin <plugin>.
  --serve <./file>[:</serve/here>]  Serve additional files next to bundle.

Example
  $ run-headless ./sample/cowsays.js
  $ run-headless ./sample/greet.ts newbie
  $ run-headless --plugin=mocha ./sample/mocha-test.ts
```

#### Set an alias

You can also define an alias in your `~/.bash_profile` file to always run the locally installed `run-headless` using `npx`.

```sh
ALIAS run-headless="npx run-headless"
run-headless [<options>] <file>
```


## Scripts

### Basics

The entrypoint script has to follow a simple convention: It is expected to export a function returning a promise. Once it resolves, the headless browser will be closed.

```js
// es-module-sample.js

async function main() {
  const response = await fetch("https://google.com/")
  const text = await response.text()

  // This should be logged to your terminal
  console.log("Could fetch the Google page from within a browser:\n" + text)
}

export default main
```

To write a CommonJS module, just replace the last line containing the `export default` with:

```js
module.exports = main
```

Running the script is as simple as:

```sh
run-headless ./es-module-sample.js
```

### Errors

In case the exported function throws an error, `run-headless` will print the error and stack trace, close the headless Chromium browser and exit with a non-zero exit code.


## Plugins

Plugins can be used to provide convenience functionality or tweak the runner's behavior. They make it easy to integrate your script with testing frameworks.

Check out the 👉 [plugins repository](https://github.com/andywer/run-headless-plugins) to see what's on offer.


## Scripting API

### Entrypoint function

This is the signature of the function that your entrypoint is supposed to export.

```ts
function main(args: string[]): Promise<any>
```

#### args: string[]

The arguments that were passed to `run-headless`. If you run `run-headless ./my-file foo bar`, then `args` will be `["foo", "bar"]`.

### window.headless

The script runner will inject a `headless` object into the browser window's global scope. It contains some useful methods.

#### `headless.exit(exitCode?: number = 0)`

Causes the script to end. The `run-headless` process will exit with the exit code you pass here.

The exit code defaults to zero.

#### `headless.setOfflineMode(takeOffline: boolean = true)`

Puts the browser in offline mode and closes all active connections if called with `true` or no arguments. Call it with `false` to bring the browser back online.


## More features

<details>
<summary>
  <b>Environment variables</b>
</summary>

<br>

You can access all environment variables of the host shell in your scripts as `process.env.VARIABLENAME`.
</details>

<details>
<summary>
  <b>Source Maps</b>
</summary>

<br>

If an error is thrown, you will see the error and stack trace in your host shell. The stack trace will reference your source file lines, not the line in the bundle file that is actually served to the browser under the hood.
</details>

## Samples

Have a look at the samples in the [`sample`](./sample) directory:

- [Simple Testing](./sample/basic)
- [Simple Mocha Test](./sample/mocha)
- [React / Enzyme Test](./sample/mocha-enzyme)
- [Tape Test](./sample/tape)


## Test framework support

If you want to run tests in the browser using run-headless, check out this list first:

<details>
<summary>
  <b>✅ Mocha</b>
</summary>

<br>

Works great when used with the [Mocha Plugin](https://github.com/andywer/run-headless-plugins/tree/master/packages/run-headless-mocha). See [`sample/mocha`](./sample/mocha) or [`sample/mocha-enzyme`](./sample/mocha-enzyme).
</details>

<details>
<summary>
  <b>✅ Tape</b>
</summary>

<br>

Works like a charm, see [`sample/tape`](./sample/tape).
</details>

<details>
<summary>
  <b>❌ AVA</b>
</summary>

<br>

Currently not possible, since it's testing library and test runner code are too tightly coupled.
</details>

<details>
<summary>
  <b>❔ Jest</b>
</summary>

<br>

Didn't try yet.
</details>

## License

MIT
