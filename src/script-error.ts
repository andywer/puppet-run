// tslint:disable-next-line
interface ScriptError extends Error { }

// tslint:disable-next-line:no-shadowed-variable
const ScriptError = function ScriptError(this: ScriptError, error: Error, stack?: string) {
  Error.call(this, error as any)
  Object.defineProperty(this, "message", {
    enumerable: false,
    value: error.message
  })
  Object.defineProperty(this, "stack", {
    enumerable: false,
    value: stack || error.stack
  })
} as any as { new(error: Error, stack?: string): ScriptError }

ScriptError.prototype = new Error()
ScriptError.prototype.name = "ScriptError"

export default ScriptError
