export interface HologramRenderer {
  render(time: number, intensity: number): void
  dispose(): void
}

/** @implements SPEC-ORBIS-UIRICH-SHADER Owns the geometry buffer and linked program. */
export function createHologramRenderer(context: WebGL2RenderingContext, program: WebGLProgram): HologramRenderer | null {
  const position = context.getAttribLocation(program, 'a_position')
  const resolution = context.getUniformLocation(program, 'u_resolution')
  const time = context.getUniformLocation(program, 'u_time')
  const intensity = context.getUniformLocation(program, 'u_intensity')
  const buffer = context.createBuffer()
  if (position < 0 || !resolution || !time || !intensity || !buffer) {
    if (buffer) context.deleteBuffer(buffer)
    return null
  }
  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW)
  return {
    /** @implements SPEC-ORBIS-UIRICH-SHADER */
    render(now, amount) {
      context.viewport(0, 0, context.canvas.width, context.canvas.height)
      context.clearColor(0, 0, 0, 0)
      context.clear(context.COLOR_BUFFER_BIT)
      context.useProgram(program)
      context.bindBuffer(context.ARRAY_BUFFER, buffer)
      context.enableVertexAttribArray(position)
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
      context.uniform2f(resolution, context.canvas.width, context.canvas.height)
      context.uniform1f(time, now / 1000)
      context.uniform1f(intensity, amount)
      context.enable(context.BLEND)
      context.blendFunc(context.SRC_ALPHA, context.ONE)
      context.drawArrays(context.TRIANGLES, 0, 3)
    },
    /** @implements SPEC-ORBIS-UIRICH-SHADER */
    dispose() { context.deleteBuffer(buffer); context.deleteProgram(program) }
  }
}
