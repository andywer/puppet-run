interface Headless {
  /** The arguments passed to `run-headless`. */
  args: string[]

  /**
   * Stop execution of the script and report exit code. Exit code defaults to zero.
   *
   * Be aware that the script exits asynchronously, so it will not stop immediately,
   * but with a short delay.
   */
  exit(exitCode?: number): void

  /**
   * Run a function or track an existing promise. The script will be considered to have
   * finished once all runnables have completed execution.
   *
   * Primarily used internally, but you can also dynamically track custom execution
   * paths.
   */
  run(runnable: Function | Promise<any>): Promise<any>

  /**
   * Tell the runner to turn on offline mode (reject any network connections).
   * If `takeOffline` is `true` offline mode will be enabled. If it's `false`
   * an existing offline mode will be disabled. Defaults to `true`.
   */
  setOfflineMode(takeOffline?: boolean): void
}

interface Window {
  headless: Headless
}

declare const headless: Headless
