import test from "tape"

test.onFinish(() => puppet.exit(0))
test.onFailure(() => puppet.exit(1))

test("1 + 2 = 3", t => {
  t.plan(1)
  t.is(1 + 2, 3)
})
