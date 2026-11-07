precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Dot strength
 * @default 0.12
 * @range 0, 0.6
 */
uniform float u_amount;

/**
 * @label Cell size (spacing)
 * @default 16
 * @range 4, 40
 */
uniform float u_cell;

/**
 * @label Max dot size
 * @default 0.28
 * @range 0.05, 0.5
 */
uniform float u_dot;

/**
 * @label Tint
 * @color
 * @default #000000
 */
uniform vec3 u_tint;

void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_cell);
  vec2 center = (cell + 0.5) * u_cell;
  vec2 uv = center / u_resolution;
  // Dots only near the top-right bloom; they vanish toward the text.
  float k = 1.0 - smoothstep(0.15, 0.85, length(uv - vec2(1.0, 1.0)));
  float r = u_cell * u_dot * k;
  float d = length(gl_FragCoord.xy - center);
  float dotMask = 1.0 - smoothstep(r - 0.6, r + 0.6, d);
  float a = u_amount * dotMask * step(0.5, r);
  gl_FragColor = vec4(u_tint * a, a);
}
