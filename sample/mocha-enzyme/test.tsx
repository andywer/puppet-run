import { expect } from "chai"
import Enzyme, { mount } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import React from "react"

Enzyme.configure({ adapter: new Adapter() })
Object.assign(window as any, { React })

const Button = (props: { children: React.ReactNode }) => (
  <button>
    {props.children}
  </button>
)

describe("Button", function () {
  it("renders", function () {
    const rendered = mount(<Button>Click me</Button>)
    expect(rendered.type()).to.equal(Button)
    expect(rendered.text()).to.equal("Click me")
  })
})
