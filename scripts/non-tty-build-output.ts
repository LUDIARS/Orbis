import type { WriteStream } from 'node:tty'

/** electron-vite 5.0 isolated-build reporting assumes cursor methods on piped stdout. */
export function supportNonTtyBuildOutput(output: WriteStream): void {
  if (output.isTTY) return
  // A pipe has no cursor. Preserve all writes and errors; only cursor movement is inert.
  output.clearLine ??= () => true
  output.cursorTo ??= () => true
  output.moveCursor ??= () => true
}
