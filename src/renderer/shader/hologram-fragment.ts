export const hologramFragmentSource = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float scan = sin((uv.y - u_time * 0.12) * 180.0);
  float bands = 1.0 - 0.22 * smoothstep(0.1, 1.0, max(0.0, -scan));
  float edge = 1.0 - smoothstep(0.18, 0.7, length(uv - 0.5));
  vec3 glow = vec3(0.19, 0.63, 1.0) * (0.16 + edge * 0.34);
  outColor = vec4(glow * bands * u_intensity, edge * 0.34 * u_intensity);
}`
