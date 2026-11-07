precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Solid until (0-1)
 * @default 0.62
 * @range 0, 1
 */
uniform float u_solid;

/**
 * @label Dots end at (0-1)
 * @default 0.8
 * @range 0, 1
 */
uniform float u_end;

/**
 * @label Cell size (px)
 * @default 6
 * @range 2, 20
 */
uniform float u_cell;

/**
 * @label Colour
 * @color
 * @default #111111
 */
uniform vec3 u_color;

void main() {
  float x = gl_FragCoord.x / u_resolution.x;
  if (x < u_solid) { gl_FragColor = vec4(u_color, 1.0); return; }
  vec2 cell = floor(gl_FragCoord.xy / u_cell);
  vec2 center = (cell + 0.5) * u_cell;
  float t = clamp((center.x / u_resolution.x - u_solid) / max(u_end - u_solid, 0.001), 0.0, 1.0);
  float r = u_cell * 0.72 * (1.0 - t);
  float d = length(gl_FragCoord.xy - center);
  float m = 1.0 - smoothstep(r - 0.5, r + 0.5, d);
  gl_FragColor = vec4(u_color * m, m);
}
