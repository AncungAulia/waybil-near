precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Used (0-1)
 * @default 0.75
 * @range 0, 1
 */
uniform float u_progress;

/**
 * @label Highlight ends at (0-1)
 * @default 0.8
 * @range 0, 1
 */
uniform float u_mark;

/**
 * @label Cell size (px)
 * @default 12
 * @range 4, 32
 */
uniform float u_cell;

/**
 * @label Dot radius (px)
 * @default 3.6
 * @range 1, 12
 */
uniform float u_dot;

/**
 * @label Used colour
 * @color
 * @default #111111
 */
uniform vec3 u_used;

/**
 * @label Highlight colour
 * @color
 * @default #FFD60A
 */
uniform vec3 u_hi;

/**
 * @label Empty colour
 * @color
 * @default #E2E2E2
 */
uniform vec3 u_empty;

void main() {
  float cols = max(floor(u_resolution.x / u_cell), 1.0);
  float rows = max(floor(u_resolution.y / u_cell), 1.0);
  vec2 offset = (u_resolution - vec2(cols, rows) * u_cell) * 0.5;
  vec2 p = gl_FragCoord.xy - offset;
  vec2 cell = floor(p / u_cell);
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= cols || cell.y >= rows) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 center = (cell + 0.5) * u_cell;
  float d = length(p - center);
  float mask = 1.0 - smoothstep(u_dot - 0.6, u_dot + 0.6, d);
  float t = (cell.x + 0.5) / cols;
  vec3 col = t < u_progress ? u_used : (t < u_mark ? u_hi : u_empty);
  gl_FragColor = vec4(col * mask, mask);
}
