export const ORB_VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const ORB_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
uniform vec2 uMouse;
varying vec2 vUv;

vec3 rgb2yiq(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float i = dot(c, vec3(0.596, -0.274, -0.322));
  float q = dot(c, vec3(0.211, -0.523, 0.312));
  return vec3(y, i, q);
}

vec3 yiq2rgb(vec3 c) {
  float r = c.x + 0.956 * c.y + 0.621 * c.z;
  float g = c.x - 0.272 * c.y - 0.647 * c.z;
  float b = c.x - 1.107 * c.y + 1.704 * c.z;
  return vec3(r, g, b);
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * 3.14159265 / 180.0;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  float i = yiq.y * cosA - yiq.z * sinA;
  float q = yiq.y * sinA + yiq.z * cosA;
  yiq.y = i;
  yiq.z = q;
  return clamp(yiq2rgb(yiq), 0.0, 1.0);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    p3.x + p3.y,
    p3.x + p3.z,
    p3.y + p3.z
  ) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  vec3 col1 = adjustHue(vec3(0.086, 0.639, 0.290), hue);
  vec3 col2 = adjustHue(vec3(0.110, 0.780, 0.650), hue);
  vec3 col3 = adjustHue(vec3(0.745, 0.949, 0.392), hue);
  vec3 colCore = adjustHue(vec3(0.600, 0.955, 0.800), hue);

  float len = length(uv);
  float ang = len > 1e-4 ? atan(uv.y, uv.x) : 0.0;
  float radialWeight = smoothstep(0.08, 0.45, len);
  float v0, v1, v1b, v2, v3;
  float r0, d0, n0;
  float cl;

  n0 = snoise3(vec3(uv * 0.72, iTime * 0.5)) * 0.5 + 0.5;
  r0 = mix(mix(0.56, 1.0, 0.30), mix(0.56, 1.0, 0.52), n0);
  d0 = distance(uv, (r0 / max(len, 1e-4)) * uv);
  v0 = light1(1.0, 10.5, d0);
  v0 *= smoothstep(r0 * 1.12, r0, len);
  cl = cos(ang + iTime * 1.8) * 0.5 + 0.5;

  float a = iTime * -1.05;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  v1 = light2(1.45, 5.0, d) * light1(1.0, 46.0, d0);

  float a2 = iTime * 0.7 + 2.2;
  vec2 pos2 = vec2(cos(a2), sin(a2)) * r0;
  float d2 = distance(uv, pos2);
  v1b = light2(0.95, 6.5, d2) * light1(0.9, 40.0, d0);

  v2 = smoothstep(0.96, mix(0.56, 1.0, n0 * 0.42), len);
  v3 = smoothstep(0.24, mix(0.56, 1.0, 0.32), len);

  float edgeFade = 1.0 - smoothstep(0.84, 0.98, len);

  vec2 specOffset = uv - vec2(-0.24, 0.24);
  float spec = exp(-dot(specOffset, specOffset) * 14.0) * 0.52;
  float warmMask = smoothstep(-0.35, 0.65, uv.x - uv.y * 0.6);
  vec3 coreTint = mix(mix(colCore, col2, 0.28 + 0.16 * cl * radialWeight), col3, 0.34 * warmMask + 0.16 * n0);
  vec3 coreRgb = clamp(coreTint + vec3(spec), 0.0, 1.0);
  float coreMask = 1.0 - smoothstep(0.36, r0 * 1.04, len);
  float coreAlpha = coreMask * (0.58 + 0.22 * (1.0 - n0)) * edgeFade;

  vec3 ringRgb = mix(col1, col2, cl);
  ringRgb = mix(ringRgb, col3, clamp(v1 * 0.55 + v1b * 0.35, 0.0, 0.78));
  ringRgb = clamp(ringRgb + vec3(0.09 * v1), 0.0, 1.0);
  float ringAlpha = clamp((v0 * 0.92 + v1 * 0.65 + v1b * 0.42) * v2 * v3, 0.0, 1.0) * edgeFade;

  float outAlpha = clamp(ringAlpha + coreAlpha * (1.0 - ringAlpha), 0.0, 1.0);
  vec3 outRgb = (ringRgb * ringAlpha + coreRgb * coreAlpha * (1.0 - ringAlpha)) / max(outAlpha, 1e-4);
  return vec4(outRgb * outAlpha, outAlpha);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - center) / max(size, 1.0) * 2.0;

  float s = sin(rot);
  float c = cos(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  uv -= uMouse * (hover * hoverIntensity * 0.12);
  uv.x += hover * hoverIntensity * 0.045 * sin(uv.y * 7.5 + iTime);
  uv.y += hover * hoverIntensity * 0.045 * sin(uv.x * 7.5 + iTime);

  gl_FragColor = draw(uv);
}
`;

export interface OrbRenderParams {
  time: number;
  width: number;
  height: number;
  hue: number;
  hover: number;
  rot: number;
  hoverIntensity: number;
  mouseX: number;
  mouseY: number;
}

export interface OrbWebglController {
  render: (params: OrbRenderParams) => void;
  resize: (width: number, height: number, dpr: number) => void;
  dispose: () => void;
}

export function normalizeOrbHue(hue: number): number {
  if (!Number.isFinite(hue)) return 0;
  return ((hue % 360) + 360) % 360;
}

export function clampOrbIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(2, Math.max(0, value));
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function initOrbWebgl(canvas: HTMLCanvasElement): OrbWebglController | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
  } catch {
    return null;
  }
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, ORB_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, ORB_FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  const positionLoc = gl.getAttribLocation(program, 'position');
  const uvLoc = gl.getAttribLocation(program, 'uv');

  // Полноэкранный треугольник с перекрытием области [-1, 1] x [-1, 1] без шва диагонали.
  const quadData = new Float32Array([-1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2]);
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

  const uTimeLoc = gl.getUniformLocation(program, 'iTime');
  const uResLoc = gl.getUniformLocation(program, 'iResolution');
  const uHueLoc = gl.getUniformLocation(program, 'hue');
  const uHoverLoc = gl.getUniformLocation(program, 'hover');
  const uRotLoc = gl.getUniformLocation(program, 'rot');
  const uIntensityLoc = gl.getUniformLocation(program, 'hoverIntensity');
  const uMouseLoc = gl.getUniformLocation(program, 'uMouse');

  gl.clearColor(0, 0, 0, 0);

  let disposed = false;

  function resize(width: number, height: number, dpr: number) {
    if (disposed || !gl) return;
    const scale = Math.min(Math.max(dpr, 1), 2);
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    gl.viewport(0, 0, pixelWidth, pixelHeight);
  }

  function render(params: OrbRenderParams) {
    if (disposed || !gl) return;
    const pixelWidth = Math.max(1, canvas.width);
    const pixelHeight = Math.max(1, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    if (positionLoc >= 0) {
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
    }
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);
    }

    gl.uniform1f(uTimeLoc, params.time);
    gl.uniform3f(uResLoc, pixelWidth, pixelHeight, pixelWidth / pixelHeight);
    gl.uniform1f(uHueLoc, normalizeOrbHue(params.hue));
    gl.uniform1f(uHoverLoc, params.hover);
    gl.uniform1f(uRotLoc, params.rot);
    gl.uniform1f(uIntensityLoc, clampOrbIntensity(params.hoverIntensity));
    gl.uniform2f(uMouseLoc, params.mouseX, params.mouseY);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose() {
    if (disposed || !gl) return;
    disposed = true;
    gl.deleteBuffer(vertexBuffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  return { render, resize, dispose };
}
