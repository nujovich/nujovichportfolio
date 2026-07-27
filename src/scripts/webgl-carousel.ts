import { Renderer, Camera, Transform, Program, Mesh, Plane, Texture, Vec2 } from 'ogl';

interface CardData {
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  iconChar?: string;
  href: string;
  target: string;
  featured: boolean;
  badge?: string; // e.g. "Destacado" or "En curso"
}

const TEX_W = 512;
const TEX_H = 672;
const TEX_ASPECT = TEX_H / TEX_W;

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uActive;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(tMap, vUv);
    // Fade cards behind the ring so they still peek through
    float a = tex.a * mix(0.28, 1.0, clamp(uActive, 0.0, 1.0));
    vec3 col = tex.rgb * mix(0.55, 1.0, clamp(uActive, 0.0, 1.0));
    col += vec3(0.06, 0.09, 0.16) * uHover * uActive;
    gl_FragColor = vec4(col, a);
  }
`;

/* Canvas helpers ------------------------------------------------------------ */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxW: number, lineH: number, maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let lineY = y;
  let n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, lineY);
      lineY += lineH;
      n++;
      if (n >= maxLines) return lineY;
      line = w;
    } else {
      line = test;
    }
  }
  if (line && n < maxLines) {
    ctx.fillText(line, x, lineY);
    lineY += lineH;
  }
  return lineY;
}

const imageCache = new Map<string, HTMLImageElement | 'error'>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached === 'error') return Promise.resolve(null);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageCache.set(url, img); resolve(img); };
    img.onerror = () => { imageCache.set(url, 'error'); resolve(null); };
    img.src = url;
  });
}

function drawCardTexture(canvas: HTMLCanvasElement, data: CardData) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width  / 2; // logical size (DPR=2)
  const H = canvas.height / 2;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Background (glass style)
  ctx.fillStyle = data.featured ? 'rgba(11, 28, 77, 0.55)' : 'rgba(255, 255, 255, 0.06)';
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  if (data.featured) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(59, 114, 245, 0.20)');
    g.addColorStop(1, 'rgba(124, 58, 237, 0.05)');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, W, H, 24);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 24);
  ctx.stroke();

  const PAD = 32;

  // Logo or icon top-left
  if (data.imageUrl) {
    const img = imageCache.get(data.imageUrl);
    if (img && img !== 'error') {
      const maxH = 56;
      const s = maxH / img.height;
      const w = img.width * s;
      ctx.drawImage(img as HTMLImageElement, PAD, PAD, w, maxH);
    }
  } else if (data.iconChar) {
    ctx.font = '48px system-ui, -apple-system, "Segoe UI"';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.fillText(data.iconChar, PAD, PAD - 2);
  }

  // Badge top-right
  if (data.badge) {
    const isProgress = data.badge.toLowerCase().includes('curso');
    const label = data.badge;
    ctx.font = '600 11px system-ui';
    const tw = ctx.measureText(label).width;
    const bw = tw + 20;
    const bh = 22;
    const bx = W - PAD - bw;
    const by = PAD + 4;
    ctx.fillStyle    = isProgress ? 'rgba(52, 211, 153, 0.12)' : 'rgba(107, 156, 255, 0.15)';
    ctx.strokeStyle  = isProgress ? 'rgba(52, 211, 153, 0.30)' : 'rgba(107, 156, 255, 0.30)';
    roundRect(ctx, bx, by, bw, bh, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isProgress ? '#34d399' : '#6b9cff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 10, by + 12);
  }

  // Title
  ctx.textBaseline = 'top';
  ctx.font = '700 28px system-ui, -apple-system';
  ctx.fillStyle = '#ffffff';
  let cursorY = PAD + 96;
  cursorY = wrap(ctx, data.title, PAD, cursorY, W - PAD * 2, 34, 2);

  // Description
  cursorY += 12;
  ctx.font = '400 15px system-ui, -apple-system';
  ctx.fillStyle = 'rgba(203, 213, 225, 0.88)';
  wrap(ctx, data.description, PAD, cursorY, W - PAD * 2, 22, 6);

  // Tags at bottom
  ctx.font = '600 10px system-ui';
  ctx.textBaseline = 'middle';
  let tagX = PAD;
  const tagY = H - PAD - 24;
  for (const tag of data.tags) {
    const label = tag.toUpperCase();
    const tw = ctx.measureText(label).width;
    const tagW = tw + 18;
    if (tagX + tagW > W - PAD) break;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    roundRect(ctx, tagX, tagY, tagW, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.95)';
    ctx.fillText(label, tagX + 9, tagY + 12);
    tagX += tagW + 6;
  }
}

/* Video card: image thumbnail + title/tag ---------------------------------- */

function drawVideoTexture(canvas: HTMLCanvasElement, data: CardData) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width  / 2;
  const H = canvas.height / 2;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // Clip image to a rounded rect on top
  const IMG_H = Math.round(H * 0.55);
  ctx.save();
  roundRect(ctx, 0, 0, W, IMG_H, 24);
  ctx.clip();
  const img = data.imageUrl ? imageCache.get(data.imageUrl) : null;
  if (img && img !== 'error') {
    const imgAspect = img.width / img.height;
    const dstAspect = W / IMG_H;
    let dw, dh, dx, dy;
    if (imgAspect > dstAspect) {
      dh = IMG_H;
      dw = imgAspect * dh;
      dx = (W - dw) / 2;
      dy = 0;
    } else {
      dw = W;
      dh = dw / imgAspect;
      dx = 0;
      dy = (IMG_H - dh) / 2;
    }
    ctx.drawImage(img as HTMLImageElement, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, W, IMG_H);
  }
  // Play button overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, W, IMG_H);
  const px = W / 2, py = IMG_H / 2;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(px, py, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px - 8, py - 12);
  ctx.lineTo(px - 8, py + 12);
  ctx.lineTo(px + 14, py);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Text block
  const tx = 24;
  let ty = IMG_H + 20;
  if (data.badge) {
    ctx.font = '600 11px system-ui';
    ctx.fillStyle = 'rgba(148, 163, 184, 1)';
    ctx.textBaseline = 'top';
    ctx.fillText(data.badge, tx, ty);
    ty += 18;
  }
  ctx.font = '700 20px system-ui';
  ctx.fillStyle = '#ffffff';
  ty = wrap(ctx, data.title, tx, ty, W - tx * 2, 24, 2);
  if (data.description) {
    ty += 8;
    ctx.font = '400 13px system-ui';
    ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
    wrap(ctx, data.description, tx, ty, W - tx * 2, 18, 3);
  }
}

/* Read DOM card into CardData ---------------------------------------------- */

function readCard(el: HTMLElement, kind: 'project' | 'video'): CardData {
  const anchor = el.tagName === 'A' ? (el as HTMLAnchorElement) : el.querySelector<HTMLAnchorElement>('a');
  const title = el.querySelector('h3')?.textContent?.trim() ?? '';
  const description = el.querySelector('p')?.textContent?.trim() ?? '';
  const tags = Array.from(el.querySelectorAll('.bg-white\\/5')).map(t => t.textContent?.trim() ?? '').filter(Boolean).slice(0, 6);
  const img = el.querySelector('img');
  const imageUrl = img?.src;
  const iconEl = el.querySelector<HTMLElement>('[aria-hidden="true"].text-4xl, [aria-hidden="true"].text-5xl');
  const iconChar = iconEl?.textContent?.trim();
  const href = anchor?.href ?? '#';
  const target = anchor?.target ?? '';
  const featured = el.classList.contains('is-featured') ||
    !!el.querySelector('.bg-brand-400\\/10');
  let badge: string | undefined;
  const featSpan = el.querySelector('.bg-brand-400\\/10');
  if (featSpan) badge = featSpan.textContent?.trim();
  const progSpan = el.querySelector('.bg-emerald-400\\/10');
  if (progSpan) badge = progSpan.textContent?.trim().replace(/\s+/g, ' ');
  return { title, description, tags, imageUrl, iconChar, href, target, featured, badge };
}

/* Init one section --------------------------------------------------------- */

function initSection(section: HTMLElement) {
  const kind: 'project' | 'video' = section.id === 'videos' ? 'video' : 'project';
  const domCards = Array.from(section.querySelectorAll<HTMLElement>('[data-circular-card]'));
  if (!domCards.length) return;

  // Insert canvas overlay inside the pin
  const pin = section.querySelector<HTMLElement>('[data-circular-pin]');
  if (!pin) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'wcg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  pin.appendChild(canvas);
  section.classList.add('has-webgl-carousel');

  const cards = domCards.map((el) => readCard(el, kind));

  // Preload thumbnails/logos
  const loadTasks = cards
    .map(c => c.imageUrl)
    .filter(Boolean)
    .map(u => loadImage(u!));

  Promise.all(loadTasks).then(() => start());

  function start() {
    let renderer: Renderer;
    try {
      renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2), antialias: true });
    } catch (e) {
      // No WebGL — bail; DOM cards will show
      section.classList.remove('has-webgl-carousel');
      canvas.remove();
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 42, near: 0.1, far: 100 });
    camera.position.set(0, 0, 5);
    const scene = new Transform();

    const CARD_W = 1.4;
    const CARD_H = CARD_W * TEX_ASPECT;
    const RADIUS = 2.6;

    const items = cards.map((data, i) => {
      const tex = document.createElement('canvas');
      tex.width  = TEX_W * 2;
      tex.height = TEX_H * 2;
      if (kind === 'video') drawVideoTexture(tex, data);
      else                  drawCardTexture(tex, data);
      const texture = new Texture(gl, {
        image: tex,
        generateMipmaps: false,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
      });
      const geometry = new Plane(gl, { width: CARD_W, height: CARD_H });
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          tMap:    { value: texture },
          uActive: { value: 0 },
          uHover:  { value: 0 },
        },
        transparent: true,
        depthTest: false,
        cullFace: null,
      });
      const mesh = new Mesh(gl, { geometry, program });
      const baseAngle = (i / cards.length) * Math.PI * 2 - Math.PI;
      mesh.position.set(Math.sin(baseAngle) * RADIUS, 0, Math.cos(baseAngle) * RADIUS);
      mesh.rotation.y = baseAngle;
      mesh.setParent(scene);
      return { mesh, baseAngle, data, hover: 0, hoverTarget: 0 };
    });

    function resize() {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.perspective({ aspect: rect.width / rect.height });
    }
    resize();
    window.addEventListener('resize', resize);

    const sweep = (Number(section.dataset.arcSweep ?? '540')) * Math.PI / 180;

    let running = true;
    let hoveredIdx = -1;

    function pickIdx(): number {
      let bestI = -1;
      let bestA = 0.6;
      items.forEach((it, i) => {
        const a = (it.mesh.program.uniforms.uActive as any).value as number;
        if (a > bestA) { bestA = a; bestI = i; }
      });
      return bestI;
    }

    canvas.addEventListener('pointermove', () => {
      const i = pickIdx();
      hoveredIdx = i;
      items.forEach((it, j) => { it.hoverTarget = j === i ? 1 : 0; });
    });
    canvas.addEventListener('pointerleave', () => {
      items.forEach((it) => { it.hoverTarget = 0; });
      hoveredIdx = -1;
    });
    canvas.addEventListener('click', (e) => {
      e.preventDefault();
      const i = hoveredIdx >= 0 ? hoveredIdx : pickIdx();
      if (i < 0) return;
      const d = items[i].data;
      if (!d.href || d.href === '#') return;
      if (d.target === '_blank') window.open(d.href, '_blank', 'noopener,noreferrer');
      else                        window.location.href = d.href;
    });

    function frame() {
      if (!running) return;
      const rect = section.getBoundingClientRect();
      const runway = rect.height - window.innerHeight;
      let progress = 0;
      if (rect.top < 0 && runway > 0) progress = -rect.top / runway;
      if (rect.top < -runway) progress = 1;
      progress = Math.max(0, Math.min(1, progress));
      const rot = -sweep / 2 + progress * sweep;
      scene.rotation.y = rot;

      let anyHover = false;
      items.forEach((it) => {
        const eff = it.baseAngle + rot;
        const norm = Math.atan2(Math.sin(eff), Math.cos(eff));
        const active = Math.max(0, Math.cos(norm));
        (it.mesh.program.uniforms.uActive as any).value = active;
        it.hover += (it.hoverTarget - it.hover) * 0.15;
        (it.mesh.program.uniforms.uHover as any).value = it.hover;
        const scale = 1 + it.hover * 0.06;
        it.mesh.scale.set(scale, scale, scale);
        if (it.hover > 0.5) anyHover = true;
      });

      // Sort back-to-front for proper alpha compositing
      scene.children.sort((a: any, b: any) => a.position.z - b.position.z);

      canvas.style.cursor = anyHover ? 'pointer' : '';

      renderer.render({ scene, camera });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        requestAnimationFrame(frame);
      } else if (!entry.isIntersecting && running) {
        running = false;
      }
    });
    io.observe(section);
  }
}

export function initWebGLCarousels() {
  document.querySelectorAll<HTMLElement>('[data-circular-scroll]').forEach((section) => {
    if (section.classList.contains('has-webgl-carousel')) return;
    initSection(section);
  });
}
