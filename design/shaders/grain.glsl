precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Grain amount
 * @default 0.08
 * @range 0, 0.4
 */
uniform float u_amount;

/**
 * @label Grain size
 * @default 1.0
 * @range 0.5, 4
 */
uniform float u_size;

/**
 * @label Tint
 * @color
 * @default #ffffff
 */
uniform vec3 u_tint;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_size);
  float n = hash(cell);
  float a = u_amount * n;
  gl_FragColor = vec4(u_tint * a, a);
}
