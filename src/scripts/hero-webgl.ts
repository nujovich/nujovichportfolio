import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';

const vertex = /* glsl */ `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uMouse;
  uniform vec2  uResolution;

  // Simplex-ish noise (Ashima)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 p = (uv - 0.5) * aspect;

    float t = uTime * 0.05;
    vec2 mouse = (uMouse - 0.5) * aspect;
    float m = smoothstep(0.9, 0.0, length(p - mouse));

    float n1 = fbm(p * 1.2 + vec2(t, -t * 0.7));
    float n2 = fbm(p * 2.0 + vec2(-t * 0.5, t * 0.9) + n1);

    // Marca Tinta — near-flat Tinta with the faintest ink-wash motion.
    // No highlight blobs, no accent colour: just Tinta breathing into Grafito
    // at ~10% strength, plus a mild grain to keep it from banding.
    vec3 c1 = vec3(0.078, 0.075, 0.059); // Tinta   #14130F
    vec3 c2 = vec3(0.180, 0.170, 0.145); // between Tinta and Grafito

    float n = smoothstep(-0.5, 0.8, n1 * 0.6 + n2 * 0.4);
    vec3 col = mix(c1, c2, n * 0.55);

    // Cursor: subtle warming, never bright
    col += vec3(0.05, 0.045, 0.035) * m * 0.4;

    // Strong vignette so corners stay clean Tinta
    float vig = smoothstep(1.05, 0.15, length((uv - 0.5) * vec2(1.5, 1.0)));
    col *= 0.72 + vig * 0.28;

    // Paper grain
    float grain = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.022;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initHeroWebGL(canvas: HTMLCanvasElement) {
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: false,
    antialias: false,
  });
  const gl = renderer.gl;
  gl.clearColor(0.078, 0.075, 0.059, 1); // Tinta

  const geometry = new Triangle(gl);

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime:       { value: 0 },
      uMouse:      { value: new Vec2(0.5, 0.5) },
      uResolution: { value: new Vec2(1, 1) },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });

  const mouseTarget = { x: 0.5, y: 0.5 };
  const mouse       = { x: 0.5, y: 0.5 };

  // Inline styles as a safety net — the same CSS-race that hit the carousel
  // canvas can leave this one stuck at its 300x150 attribute default before
  // .hero-canvas resolves.
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  } satisfies Partial<CSSStyleDeclaration>);

  function resize() {
    // Measure the parent section, not the canvas — the canvas can still be
    // reporting the attribute default at first-paint even after CSS applies.
    const host = canvas.parentElement ?? canvas;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h);
    program.uniforms.uResolution.value.set(w, h);
  }
  resize();
  // Re-run after layout has definitely settled
  requestAnimationFrame(resize);
  window.addEventListener('resize', resize);
  // Observe the parent so it re-sizes if the hero grows/shrinks
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);
  }

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseTarget.x = (e.clientX - rect.left) / rect.width;
    mouseTarget.y = 1.0 - (e.clientY - rect.top) / rect.height;
  };
  window.addEventListener('pointermove', onPointer);

  let raf = 0;
  let running = true;
  const start = performance.now();

  const render = (now: number) => {
    if (!running) return;
    mouse.x += (mouseTarget.x - mouse.x) * 0.05;
    mouse.y += (mouseTarget.y - mouse.y) * 0.05;
    program.uniforms.uMouse.value.set(mouse.x, mouse.y);
    program.uniforms.uTime.value = prefersReduce ? 0 : (now - start) * 0.001;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);

  // Pause when out of viewport to save GPU
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(render);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    { threshold: 0 },
  );
  io.observe(canvas);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
  };
}
