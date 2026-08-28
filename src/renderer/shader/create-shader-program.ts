const vertexSource = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`

/** @implements SPEC-ORBIS-UIRICH-SHADER Compiles one owned shader and releases it on failure. */
function compileShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = context.createShader(type)
  if (!shader) return null
  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (context.getShaderParameter(shader, context.COMPILE_STATUS)) return shader
  context.deleteShader(shader)
  return null
}

/** @implements SPEC-ORBIS-UIRICH-SHADER */
export function createShaderProgram(context: WebGL2RenderingContext, fragmentSource: string): WebGLProgram | null {
  const vertex = compileShader(context, context.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(context, context.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) {
    if (vertex) context.deleteShader(vertex)
    if (fragment) context.deleteShader(fragment)
    return null
  }
  const program = context.createProgram()
  if (!program) {
    context.deleteShader(vertex)
    context.deleteShader(fragment)
    return null
  }
  context.attachShader(program, vertex)
  context.attachShader(program, fragment)
  context.linkProgram(program)
  context.deleteShader(vertex)
  context.deleteShader(fragment)
  if (context.getProgramParameter(program, context.LINK_STATUS)) return program
  context.deleteProgram(program)
  return null
}
