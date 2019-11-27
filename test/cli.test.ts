import test from "ava"
import execa from "execa"

const cliEntrypoint = require.resolve("../cli.js")

test("can run 'run-headless --help'", async t => {
  const result = await execa(cliEntrypoint, ["--help"], { reject: false })
  t.is(result.exitCode, 2)
  t.true(result.stdout.includes("Usage"))
  t.true(result.stdout.includes("$ run-headless <./entrypoint>"))
  t.is(result.stderr, "")
})

test.todo("can make run-headless run a script")
