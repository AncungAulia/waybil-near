precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Line strength
 * @default 0.10
 * @range 0, 0.5
 */
uniform float u_amount;

/**
 * @label Levels
 * @default 10
 * @range 2, 30
 */
uniform float u_levels;

/**
 * @label Scale (bigger = more hills)
 * @default 2.0
 * @range 0.3, 6
 */
uniform float u_scale;

/**
 * @label Line width (px)
 * @default 1.0
 * @range 0.3, 4
 */
uniform float u_px;

/**
 * @label Tint
 * @color
 * @default #000000
 */
uniform vec3 u_tint;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float field(vec2 px) {
  vec2 p = px / u_resolution.y * u_scale + vec2(3.1, 1.7);
  return 0.65 * noise(p) + 0.35 * noise(p * 1.9 + 7.3);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float h = field(px) * u_levels;
  // Screen-space gradient, so every line has the same pixel width.
  float hx = field(px + vec2(1.0, 0.0)) * u_levels - field(px - vec2(1.0, 0.0)) * u_levels;
  float hy = field(px + vec2(0.0, 1.0)) * u_levels - field(px - vec2(0.0, 1.0)) * u_levels;
  float g = max(length(vec2(hx, hy)) * 0.5, 1e-4);
  float f = fract(h);
  float distPx = min(f, 1.0 - f) / g;
  float line = 1.0 - smoothstep(u_px * 0.5, u_px * 0.5 + 0.9, distPx);
  float a = u_amount * line;
  gl_FragColor = vec4(u_tint * a, a);
}
