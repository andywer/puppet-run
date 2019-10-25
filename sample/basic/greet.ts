import print from "./print"

export default async function (args: string[]) {
  if (args.length === 0) {
    print("Hello World")
  } else {
    print(`Hello, ${args[0]}!`)
  }
}
