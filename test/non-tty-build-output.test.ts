import { describe, expect, it, vi } from 'vitest'
import type { WriteStream } from 'node:tty'
import { supportNonTtyBuildOutput } from '../scripts/non-tty-build-output.js'

describe('non-TTY build output', () => {
  it('supports cursor calls without swallowing output or replacing existing methods', () => {
    const write = vi.fn()
    const clearLine = vi.fn(() => true)
    const pipe = { write, clearLine, isTTY: false } as unknown as WriteStream
    supportNonTtyBuildOutput(pipe)
    expect(pipe.clearLine).toBe(clearLine)
    expect(pipe.cursorTo(0)).toBe(true)
    expect(pipe.moveCursor(0, -1)).toBe(true)
    pipe.write('build error')
    expect(write).toHaveBeenCalledWith('build error')
  })

  it('leaves real terminal streams unchanged', () => {
    const terminal = { isTTY: true } as WriteStream
    supportNonTtyBuildOutput(terminal)
    expect(Object.keys(terminal)).toEqual(['isTTY'])
  })
})
