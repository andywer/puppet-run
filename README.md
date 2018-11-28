# puppet-run

Run anything JavaScript in a headless Chrome from your command line 🔥

Transparently bundles your input files using the [Parcel bundler](https://parceljs.org). Why? Because [Karma](https://karma-runner.github.io) sucks.

- Runs any script in a headless browser
- Zero-config transparent bundling
- Supports TypeScript, React, Vue out of the box
- Pipes console output and errors to host shell


## Installation

```sh
npm install puppet-run
```

## Usage

```sh
npx puppet-run ./path/to/script.js [arguments and options here will be passed to the script]
```

The script can basically be any JavaScript or TypeScript file. It will be bundled transparently using the [parcel bundler](https://parceljs.org). It usually works out-of-the-box with zero configuration. If you need to configure the build process, read up on how to configure `parcel`.

Let's see how a simple script looks like:

```js
// cowsays.js
import * as cowsay from "cowsay"

const text = window.atob("SSBydW4gaW4gYSBicm93c2Vy")

// Everything logged here will be piped to your host terminal
console.log(cowsay.say({ text }))

puppet.exit()
```

Recognize the final `puppet.exit()`? You have to explicitly tell puppet-run when the script is done doing its thing.

Have a look at the section "Scripting API" below to learn more about that globally available `puppet` object.

Let's have some fun and see our sample script run in all its glory!

```sh
npx puppet-run ./cowsays.js
```

```
 _________________________
< I live in a browser now >
 -------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

Have fun!


## Scripting API

The script runner will inject a `puppet` object into the browser window's global scope. It contains a couple of useful functions.

#### `puppet.argv: string[]`

Contains all the command line arguments and options passed to `puppet-run` after the script file path.

#### `puppet.exit(exitCode: number = 0)`

Causes the script to end. The `puppet-run` process will exit with the exit code you pass here.

The exit code defaults to zero.


## Test framework support

If you want to run tests in the browser using puppet-run, check out this list first:

#### ✅ Mocha

Works like a charm. See [`sample/mocha-test.ts`](./sample/mocha-test.ts) and don't forget to `npm install mocha chai @types/mocha @types/chai`.

#### ✅ Tape

Works like a charm. See [`sample/tape-test.ts`](./sample/tape-test.ts) and don't forget to `npm install tape @types/tape`.

#### ❌ AVA

Currently not possible, since it's testing library and test runner code are too tightly coupled.

#### ❔ Jest

Didn't try yet.


## Samples

Have a look at the [`sample`](./sample) directory.


## License

MIT
