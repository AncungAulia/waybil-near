precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Line strength
 * @default 0.06
 * @range 0, 0.5
 */
uniform float u_amount;

/**
 * @label Line count
 * @default 14
 * @range 4, 60
 */
uniform float u_lines;

/**
 * @label Wave length
 * @default 4.5
 * @range 1, 20
 */
uniform float u_freq;

/**
 * @label Tint
 * @color
 * @default #000000
 */
uniform vec3 u_tint;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = 0.06 * sin(uv.x * u_freq) + 0.02 * sin(uv.x * u_freq * 2.3 + uv.y * 3.0);
  float f = fract((uv.y + wave) * u_lines);
  // Thin, soft line.
  float line = 1.0 - smoothstep(0.0, 0.035, abs(f - 0.5) - 0.465);
  // Only on the right side, away from the numbers.
  float fade = smoothstep(0.35, 1.0, uv.x);
  float a = u_amount * line * fade;
  gl_FragColor = vec4(u_tint * a, a);
}
