import "mocha/browser-entry"
import { expect } from "chai"

declare const puppet: {
  exit (exitCode?: number): void
}

mocha.checkLeaks()
mocha.reporter("spec")
mocha.setup("bdd")

describe("1 + 2", function () {
  it("= 3", function () {
    expect(1 + 2).to.equal(3)
  })
  it("= 4", function () {
    expect(1 + 2).to.equal(4)
  })
})

mocha.run((failures) => {
  puppet.exit(failures > 0 ? 1 : 0)
})
