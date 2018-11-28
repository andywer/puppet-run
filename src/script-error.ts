interface ScriptError extends Error {}

const ScriptError = function ScriptError (this: ScriptError, error: Error) {
  Error.call(this, error)
  Object.defineProperty(this, "message", {
    enumerable: false,
    value: error.message
  })
  Object.defineProperty(this, "stack", {
    enumerable: false,
    value: error.stack
  })
} as any as { new (error: Error): ScriptError }

ScriptError.prototype = new Error()
ScriptError.prototype.name = "ScriptError"

export default ScriptError
