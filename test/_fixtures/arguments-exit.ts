import "../../headless.d.ts"
import minimist from "minimist"

export default function main(args: string[]) {
  const exitCode = Number.parseInt(minimist(args).exit || "0", 10)

  if (args.join(" ") !== headless.args.join(" ")) {
    throw Error(
      `Arguments passed to main() do not match headless.args.\n` +
      `  args:          ${args.join(" ")}\n` +
      `  headless.args: ${headless.args.join(" ")}`
    )
  }

  console.log(`Arguments: ${args.join(" ")}`)
  window.headless.exit(exitCode)
}
