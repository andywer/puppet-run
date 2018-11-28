import test from "tape"

declare const puppet: {
  exit (exitCode?: number): void
}

test.onFinish(() => puppet.exit(0))

const onFailure = ((test as any).onFailure as typeof test["onFinish"])
onFailure(() => puppet.exit(1))

test("1 + 2 = 3", t => {
  t.plan(1)
  t.is(1 + 2, 3)
})

test("1 + 2 = 4", t => {
  t.plan(1)
  t.is(1 + 2, 4)
})
