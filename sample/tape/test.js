import test from "tape"

export default function () {
  return new Promise((resolve, reject) => {
    test.onFinish(() => resolve())
    test.onFailure(() => reject(Error("Tape test run failed")))
  })
}

test("1 + 2 = 3", t => {
  t.plan(1)
  t.is(1 + 2, 3)
})
