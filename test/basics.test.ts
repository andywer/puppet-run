import test from "ava"
import { Console } from "console"
import * as stream from "stream"
import * as Headless from "../src/index"

function createCapturingConsole() {
  let stderrBuffered = Buffer.alloc(0)
  let stdoutBuffered = Buffer.alloc(0)

  const stderr = new class extends stream.Writable {
    _write(chunk: any, encoding: string) {
      stderrBuffered = Buffer.concat([stderrBuffered, Buffer.from(chunk, encoding)])
    }
  }
  const stdout = new class extends stream.Writable {
    _write(chunk: any, encoding: string) {
      stdoutBuffered = Buffer.concat([stdoutBuffered, Buffer.from(chunk, encoding)])
    }
  }

  const console = new Console(stdout, stderr)

  return {
    ...console,
    getStdOut: () => stdoutBuffered.toString("utf8"),
    getStdErr: () => stderrBuffered.toString("utf8")
  }
}

test("can run a minimal script", async t => {
  const console = createCapturingConsole()
  const result = await Headless.run([require.resolve("./_fixtures/hello-world.js")], [], { console })
  t.is(result.exitCode, 0)

  t.is(console.getStdErr().trim(), "")
  t.is(console.getStdOut().trim(), "Hello, world!")
})

test("captures a script error", async t => {
  const console = createCapturingConsole()
  const error = await t.throwsAsync(
    () => Headless.run([require.resolve("./_fixtures/throws.js")], [], { console })
  )
  t.is(error.message, "Script exited with code 1")
  t.regex(console.getStdErr().trim(), /^Error: I am supposed to fail./)
  t.is(console.getStdOut().trim(), "")
})

test.todo("can run a TypeScript module")
test.todo("can run two entrypoints")
test.todo("can serve additional files")
test.todo("can work with web workers")
test.todo("can use plugins")
