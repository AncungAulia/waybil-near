precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Used (0-1)
 * @default 0.8
 * @range 0, 1
 */
uniform float u_progress;

/**
 * @label Tick count
 * @default 60
 * @range 10, 120
 */
uniform float u_ticks;

/**
 * @label Ticks per major
 * @default 20
 * @range 2, 60
 */
uniform float u_major;

/**
 * @label Ticks per mid
 * @default 10
 * @range 1, 30
 */
uniform float u_mid;

/**
 * @label Used colour
 * @color
 * @default #111111
 */
uniform vec3 u_used;

/**
 * @label Empty colour
 * @color
 * @default #CFCFCF
 */
uniform vec3 u_empty;

/**
 * @label Marker colour
 * @color
 * @default #FFD60A
 */
uniform vec3 u_hi;

void main() {
  vec2 p = gl_FragCoord.xy;
  float W = u_resolution.x;
  float H = u_resolution.y;
  float gap = (W - 2.0) / u_ticks;
  // Marker line at the current value (drawn on top).
  float mx = 1.0 + u_progress * (W - 2.0);
  if (u_progress > 0.0 && abs(p.x - mx) <= 1.5) {
    gl_FragColor = vec4(u_hi, 1.0);
    return;
  }
  float i = floor((p.x - 1.0) / gap + 0.5);
  float tx = 1.0 + i * gap;
  float onTick = 1.0 - smoothstep(0.5, 1.1, abs(p.x - tx));
  float major = mod(i, u_major) < 0.5 ? 1.0 : 0.0;
  float mid = mod(i, u_mid) < 0.5 ? 1.0 : 0.0;
  float h = major > 0.5 ? 1.0 : (mid > 0.5 ? 0.78 : 0.57);
  // Ticks grow up from the bottom.
  float inHeight = p.y <= h * H ? 1.0 : 0.0;
  float a = onTick * inHeight;
  vec3 col = (i / u_ticks) <= u_progress ? u_used : u_empty;
  gl_FragColor = vec4(col * a, a);
}
