import test from "ava"
import * as Headless from "../src/index"

// TODO: Capture console

test("can run a minimal script", async t => {
  const result = await Headless.run([require.resolve("./_fixtures/hello-world.js")])
  t.is(result.exitCode, 0)
})

test("captures a script error", async t => {
  const error = await t.throwsAsync(
    () => Headless.run([require.resolve("./_fixtures/throws.js")])
  )
  t.is(error.message, "Script exited with code 1")
})

test.todo("can run a TypeScript module")
test.todo("can run two entrypoints")
test.todo("can serve additional files")
test.todo("can work with web workers")
