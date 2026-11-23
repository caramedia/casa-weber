// Casa Weber - turul 3D (strada -> usa -> scara -> mansarda -> fereastra) si vizualizatorul 3D al camerelor.
// Fiecare poza are o harta de adancime (Depth Anything V2, facuta dinainte). Poza devine o suprafata 3D,
// iar camera virtuala "merge" prin ea cand derulezi. Trecerea dintre scene se deschide din punctul spre care mergi.
import * as THREE from './vendor/three.module.min.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const Q = new URLSearchParams(location.search);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));

// hfov = unghiul orizontal al obiectivului (grade); near/far = cat de "adanca" e scena;
// focus = centrul cadrului (0..1, de sus); to = punctul spre care mergem;
// walk = cat inaintam cu adevarat (din distanta pana la cel mai apropiat obiect - mai mult si poza se rupe);
// zin = cat ne mai apropiem prin zoom spre "to" (0.5 = de 1,5 ori); sway/par = leganare / reactie la mouse
export const TOUR = [
  { id: 'strada', img: 'scene/strada.jpg', depth: 'scene/strada-d.png', hfov: 72, near: 1, far: 26,
    focus: [0.46, 0.44], to: [0.47, 0.44], walk: 0.42, zin: 0.55, sway: 0.006, par: 0.012 },
  { id: 'usa', img: 'scene/usa.jpg', depth: 'scene/usa-d.png', hfov: 76, near: 1, far: 8,
    imgP: 'scene/usa-p.jpg', depthP: 'scene/usa-p-d.png', hfovP: 58,
    focus: [0.5, 0.5], to: [0.53, 0.5], focusP: [0.55, 0.45], toP: [0.565, 0.33], walk: 0.6, zin: 0.4, sway: 0.008, par: 0.012 },
  { id: 'scara', img: 'scene/scara.jpg', depth: 'scene/scara-d.png', hfov: 76, near: 1, far: 7,
    imgP: 'scene/scara-p.jpg', depthP: 'scene/scara-p-d.png', hfovP: 56,
    focus: [0.44, 0.5], to: [0.42, 0.42], focusP: [0.5, 0.42], toP: [0.5, 0.36], walk: 0.5, zin: 0.35, sway: -0.008, par: 0.012 },
  { id: 'mansarda', img: 'scene/mansarda.jpg', depth: 'scene/mansarda-d.png', hfov: 80, near: 1, far: 6,
    focus: [0.56, 0.52], to: [0.6, 0.47], focusP: [0.6, 0.5], walk: 0.45, zin: 0.3, sway: 0.008, par: 0.012 },
  { id: 'fereastra', img: 'scene/fereastra.jpg', depth: 'scene/fereastra-d.png', hfov: 64, near: 1, far: 16,
    focus: [0.5, 0.45], to: [0.6, 0.36], focusP: [0.62, 0.4], walk: 0.2, zin: 0.28, sway: 0.0, par: 0.012 },
];

const VS = /* glsl */`
uniform sampler2D uDepth;
uniform float uNear, uFar, uTanX, uTanY;
uniform vec2 uStep;
varying vec2 vUv;
varying float vEdge;
float dist(vec2 uv) {
  float d = texture2D(uDepth, uv).r;
  return 1.0 / (d * (1.0 / uNear - 1.0 / uFar) + 1.0 / uFar);
}
void main() {
  vUv = uv;
  float D = dist(uv);
  float a = dist(uv + vec2(uStep.x, 0.0)), b = dist(uv - vec2(uStep.x, 0.0));
  float c = dist(uv + vec2(0.0, uStep.y)), e = dist(uv - vec2(0.0, uStep.y));
  vEdge = smoothstep(0.05, 0.3, max(abs(a - b), abs(c - e)) / D);
  vec3 p = vec3((uv.x - 0.5) * 2.0 * uTanX * D, (uv.y - 0.5) * 2.0 * uTanY * D, -D);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FS = /* glsl */`
uniform sampler2D uMap;
uniform float uEdgeFade;
varying vec2 vUv;
varying float vEdge;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  c *= 1.0 - vEdge * 0.22;
  float a = 1.0;
  if (uEdgeFade > 0.0) {
    vec2 q = min(vUv, 1.0 - vUv);
    a = smoothstep(0.0, uEdgeFade, min(q.x, q.y));
  }
  gl_FragColor = vec4(c * a, 1.0);
}`;

const COMP_VS = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMP_FS = /* glsl */`
uniform sampler2D tA, tB;
uniform float uMix, uTime, uGrain, uVig, uSharp;
uniform vec2 uRes, uCA, uCB;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 zoomBlur(sampler2D t, vec2 uv, vec2 c, float s) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float k = 1.0 - s * float(i) / 11.0;
    acc += texture2D(t, c + (uv - c) * k).rgb;
  }
  return acc / 12.0;
}
void main() {
  vec3 col;
  float asp = uRes.x / uRes.y;
  if (uMix <= 0.0005) {
    vec2 px = 1.0 / uRes;
    col = texture2D(tA, vUv).rgb;
    vec3 bl = (texture2D(tA, vUv + vec2(px.x, 0.0)).rgb + texture2D(tA, vUv - vec2(px.x, 0.0)).rgb
             + texture2D(tA, vUv + vec2(0.0, px.y)).rgb + texture2D(tA, vUv - vec2(0.0, px.y)).rgb) * 0.25;
    col = max(col + (col - bl) * uSharp, 0.0);
  } else {
    float m = uMix;
    vec3 a = zoomBlur(tA, vUv, uCA, 0.09 * m);
    vec3 b = zoomBlur(tB, vUv, uCB, 0.06 * (1.0 - m));
    vec2 d = (vUv - uCA) * vec2(asp, 1.0);
    float r = length(d) + (noise(vUv * vec2(asp, 1.0) * 4.0 + uTime * 0.2) - 0.5) * 0.22;
    float R = m * 2.9 - 0.35;
    float mask = 1.0 - smoothstep(R - 0.45, R, r);
    col = mix(a, b, mask);
    float ring = smoothstep(R - 0.5, R - 0.1, r) * (1.0 - smoothstep(R - 0.1, R + 0.1, r));
    col += vec3(1.0, 0.80, 0.55) * (0.10 * sin(m * 3.14159) + 0.10 * ring * sin(m * 3.14159));
  }
  vec2 q = vUv - 0.5; q.x *= asp * 0.62;
  col *= mix(1.0 - uVig, 1.0, smoothstep(0.92, 0.18, length(q)));
  col += (hash(vUv * uRes + fract(uTime * 7.0) * 113.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

function loadImg(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('nu s-a putut incarca ' + src));
    im.src = src;
  });
}

class DepthScene {
  constructor(def, portrait) {
    this.def = def;
    const p = portrait && def.imgP;
    this.src = p ? def.imgP : def.img;
    this.dsrc = p ? def.depthP : def.depth;
    this.hfov = (p && def.hfovP) || def.hfov;
    this.focus = (portrait && def.focusP) || def.focus || [0.5, 0.5];
    this.to = (portrait && def.toP) || def.to || this.focus;
    this.ready = false;
    this.sx = 0.5; this.sy = 0.5;
  }

  load(renderer) {
    if (this.p) return this.p;
    this.p = Promise.all([loadImg(this.src), loadImg(this.dsrc)]).then(([im, dm]) => {
      const d = this.def;
      this.ai = im.naturalWidth / im.naturalHeight;
      this.tanX = Math.tan(this.hfov * Math.PI / 360);
      this.tanY = this.tanX / this.ai;
      const cv = document.createElement('canvas');
      cv.width = dm.naturalWidth; cv.height = dm.naturalHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(dm, 0, 0);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data;
      this.dw = cv.width; this.dh = cv.height;
      this.dd = new Uint8Array(this.dw * this.dh);
      for (let i = 0; i < this.dd.length; i++) this.dd[i] = px[i * 4];

      const map = new THREE.Texture(im);
      map.colorSpace = THREE.NoColorSpace;
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      map.needsUpdate = true;
      const dep = new THREE.Texture(dm);
      dep.colorSpace = THREE.NoColorSpace;
      dep.generateMipmaps = false;
      dep.minFilter = dep.magFilter = THREE.LinearFilter;
      dep.needsUpdate = true;

      const seg = innerWidth < 700 ? 220 : 360;
      const sx = this.ai >= 1 ? seg : Math.round(seg * this.ai);
      const sy = this.ai >= 1 ? Math.round(seg / this.ai) : seg;
      const geo = new THREE.PlaneGeometry(1, 1, sx, sy);
      this.mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: map }, uDepth: { value: dep },
          uNear: { value: d.near }, uFar: { value: d.far },
          uTanX: { value: this.tanX }, uTanY: { value: this.tanY },
          uStep: { value: new THREE.Vector2(1 / sx, 1 / sy) },
          uEdgeFade: { value: 0 },
        },
        vertexShader: VS, fragmentShader: FS, depthWrite: true, depthTest: true,
      });
      const mesh = new THREE.Mesh(geo, this.mat);
      mesh.frustumCulled = false;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0d0907);
      this.scene.add(mesh);
      this.cam = new THREE.PerspectiveCamera();
      this.Dt = this.distMin(this.to[0], this.to[1], 0.03);
      // cel mai apropiat obiect (al 4-lea procent): de el depinde cat putem inainta fara sa "rupem" poza
      const ds = [];
      for (let y = 0.08; y < 0.93; y += 0.03) for (let x = 0.08; x < 0.93; x += 0.03) ds.push(this.dist(x, y));
      ds.sort((p, q) => p - q);
      this.Dn = ds[Math.floor(ds.length * 0.04)];
      renderer.initTexture(map);
      renderer.initTexture(dep);
      this.ready = true;
      return this;
    });
    return this.p;
  }

  dist(u, v) {
    const x = clamp(Math.round(u * (this.dw - 1)), 0, this.dw - 1);
    const y = clamp(Math.round(v * (this.dh - 1)), 0, this.dh - 1);
    const d = this.dd[y * this.dw + x] / 255;
    const { near, far } = this.def;
    return 1 / (d * (1 / near - 1 / far) + 1 / far);
  }

  distMin(u, v, r) {
    let m = Infinity;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m = Math.min(m, this.dist(u + i * r / 2, v + j * r / 2));
    return m;
  }

  distMedian(r) {
    const a = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) a.push(this.dist(0.5 + i * r / 3, 0.5 + j * r / 3));
    a.sort((x, y) => x - y);
    return a[a.length >> 1];
  }

  // incadrare "cover" + deplasare de lentila spre focus; camera inainteaza pe raza spre "to"
  frame(aspect, opt) {
    const zoom = opt.zoom || 1.07;
    let tx, ty;
    if (aspect >= this.ai) { tx = this.tanX / zoom; ty = tx / aspect; } else { ty = this.tanY / zoom; tx = ty * aspect; }
    let lx = Math.max(0, this.tanX - tx), ly = Math.max(0, this.tanY - ty);
    let cx = (this.focus[0] - 0.5) * 2 * this.tanX + (opt.panX || 0) * lx;
    let cy = (0.5 - this.focus[1]) * 2 * this.tanY + (opt.panY || 0) * ly;
    cx = clamp(cx, -lx, lx); cy = clamp(cy, -ly, ly);
    const dx = (this.to[0] - 0.5) * 2 * this.tanX, dy = (0.5 - this.to[1]) * 2 * this.tanY;
    const f = opt.f || 1;
    if (f > 1) { // zoom ancorat pe punctul spre care mergem: el ramane pe loc pe ecran
      tx /= f; ty /= f;
      cx = dx + (cx - dx) / f; cy = dy + (cy - dy) / f;
      lx = Math.max(0, this.tanX - tx); ly = Math.max(0, this.tanY - ty);
    }
    const s = opt.s || 0;
    const ox = opt.ox || 0, oy = opt.oy || 0;
    if (opt.pivot) { cx += -ox / opt.pivot; cy += -oy / opt.pivot; }
    cx = clamp(cx, -lx, lx); cy = clamp(cy, -ly, ly);
    this.cam.position.set(dx * s + ox, dy * s + oy, -s);
    this.cam.updateMatrixWorld(true);
    const n = 0.02;
    this.cam.projectionMatrix.makePerspective((cx - tx) * n, (cx + tx) * n, (cy + ty) * n, (cy - ty) * n, n, 400);
    this.cam.projectionMatrixInverse.copy(this.cam.projectionMatrix).invert();
    this.sx = clamp(((dx - cx) / tx) * 0.5 + 0.5, 0.08, 0.92);
    this.sy = clamp(((dy - cy) / ty) * 0.5 + 0.5, 0.08, 0.92);
  }

  dispose() {
    if (!this.ready) return;
    this.mat.uniforms.uMap.value.dispose();
    this.mat.uniforms.uDepth.value.dispose();
    this.scene.children[0].geometry.dispose();
    this.mat.dispose();
  }
}

function makeRenderer(canvas) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') });
    if (!r.capabilities.isWebGL2) { r.dispose(); return null; }
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.setClearColor(0x0d0907, 1);
    return r;
  } catch (e) {
    return null;
  }
}

class Composer {
  constructor(renderer) {
    this.r = renderer;
    const o = { depthBuffer: true, stencilBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(4, 4, o);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, o);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture },
        uMix: { value: 0 }, uTime: { value: 0 }, uGrain: { value: 0.04 }, uVig: { value: 0.42 }, uSharp: { value: 0.45 },
        uRes: { value: new THREE.Vector2(4, 4) }, uCA: { value: new THREE.Vector2(0.5, 0.5) }, uCB: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: COMP_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false,
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(g, this.mat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) {
    this.rtA.setSize(w, h); this.rtB.setSize(w, h);
    this.mat.uniforms.uRes.value.set(w, h);
  }
  render(a, b, mix, t) {
    const r = this.r, u = this.mat.uniforms;
    r.setRenderTarget(this.rtA); r.render(a.scene, a.cam);
    if (b && mix > 0.0005) { r.setRenderTarget(this.rtB); r.render(b.scene, b.cam); }
    r.setRenderTarget(null);
    u.uMix.value = b ? mix : 0;
    u.uTime.value = t;
    u.uCA.value.set(a.sx, a.sy);
    if (b) u.uCB.value.set(b.sx, b.sy);
    r.render(this.scene, this.cam);
  }
}

// ---------------------------------------------------------------- turul din prima sectiune
export function initTour(root, onReady) {
  const stage = root.querySelector('.tur-stage');
  const canvas = root.querySelector('canvas');
  const caps = [...root.querySelectorAll('[data-cap]')];
  const dots = [...root.querySelectorAll('[data-dot]')];
  const fallback = [...root.querySelectorAll('.tur-fallback img')];
  const N = TOUR.length;
  let gT = 0, g = 0, mxT = 0, myT = 0, mx = 0, my = 0, visible = true, last = performance.now();
  const fixedG = Q.has('g') ? parseFloat(Q.get('g')) : null;

  const renderer = Q.has('nogl') ? null : makeRenderer(canvas);
  const gl = !!renderer;
  root.classList.add(gl ? 'gl' : 'no-gl');

  const portrait = () => stage.clientWidth / stage.clientHeight < 0.85;
  let scenes = [], comp = null, isPortrait = portrait();

  function measure() {
    const rect = root.getBoundingClientRect();
    const total = root.offsetHeight - stage.offsetHeight;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    gT = fixedG !== null ? fixedG : p * N;
    visible = rect.bottom > 0 && rect.top < innerHeight;
  }

  function ui(gv) {
    caps.forEach((el) => {
      const i = +el.dataset.cap;
      let o;
      if (i === 0) { o = 1 - sstep(0.42, 0.6, gv); root.style.setProperty('--hero-o', o.toFixed(3)); }
      else if (i === N - 1) o = sstep(i + 0.02, i + 0.16, gv);
      else o = sstep(i + 0.02, i + 0.16, gv) * (1 - sstep(i + 0.6, i + 0.74, gv));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - o) * 14).toFixed(1)}px, 0)`;
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.classList.toggle('on', o > 0.5);
    });
    const cur = clamp(Math.floor(gv + 0.25), 0, N - 1);
    dots.forEach((d, i) => d.classList.toggle('on', i === cur));
    root.style.setProperty('--tur-p', (gv / N).toFixed(4));
    if (!gl) {
      const i = clamp(Math.floor(gv), 0, N - 1), f = gv - i;
      const m = i < N - 1 ? sstep(0.72, 1, f) : 0;
      fallback.forEach((im, k) => {
        const o = k === i ? 1 : k === i + 1 ? m : 0;
        im.style.opacity = o.toFixed(3);
        const c = k === 0 ? clamp(gv, 0, 1) : clamp((gv - (k - 0.25)) / 1.25, 0, 1);
        im.style.transform = RM ? 'none' : `scale(${(1.04 + 0.1 * easeIO(c)).toFixed(4)})`;
      });
    }
  }

  dots.forEach((d) => d.addEventListener('click', () => {
    const i = +d.dataset.dot;
    const total = root.offsetHeight - stage.offsetHeight;
    const top = root.getBoundingClientRect().top + scrollY + total * ((i + (i ? 0.3 : 0)) / N);
    scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
  }));

  addEventListener('scroll', measure, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mxT = (e.clientX / innerWidth) * 2 - 1;
    myT = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  measure(); g = gT; ui(g);

  if (!gl) {
    fallback.forEach((im) => { if (im.dataset.src) im.src = im.dataset.src; });
    const tick = () => { requestAnimationFrame(tick); g += (gT - g) * 0.12; if (visible) ui(g); };
    tick();
    onReady && onReady(false);
    return;
  }

  comp = new Composer(renderer);
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 2 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    comp.setSize(Math.round(w * dpr), Math.round(h * dpr));
    const p = portrait();
    if (p !== isPortrait && scenes.length) {
      // orientarea s-a schimbat: refacem doar scenele care au varianta verticala
      isPortrait = p;
      scenes = scenes.map((s, i) => {
        const d = TOUR[i];
        if (!d.imgP) {
          s.focus = (p && d.focusP) || d.focus; s.to = (p && d.toP) || d.to || s.focus;
          if (s.ready) s.Dt = s.distMin(s.to[0], s.to[1], 0.03);
          return s;
        }
        s.dispose(); const n = new DepthScene(d, p); n.load(renderer); return n;
      });
    }
    measure();
  }
  scenes = TOUR.map((d) => new DepthScene(d, isPortrait));
  resize();
  new ResizeObserver(resize).observe(stage);

  // incarcam pe rand: prima scena imediat, restul dupa
  scenes[0].load(renderer).then(() => {
    root.classList.add('ready');
    onReady && onReady(true);
    let k = 1;
    const next = () => { if (k < N) scenes[k++].load(renderer).then(next, next); };
    next();
  }).catch(() => { root.classList.remove('gl'); root.classList.add('no-gl'); });

  const cOf = (i, gv) => (i === 0 ? clamp(gv, 0, 1) : clamp((gv - (i - 0.25)) / 1.25, 0, 1));

  function pose(sc, i, gv, aspect, t) {
    const d = sc.def;
    const c = cOf(i, gv);
    const k = RM ? 0.12 : 1;
    const e = easeIO(c);
    const s = e * d.walk * sc.Dn * k;
    const par = RM ? 0 : d.par;
    const ox = (mx * par + Math.sin(c * Math.PI) * d.sway * k + (RM ? 0 : Math.sin(t * 0.31) * 0.0025)) * sc.Dn;
    const oy = (my * par * 0.6 + (RM ? 0 : Math.sin(t * 0.23) * 0.002)) * sc.Dn;
    sc.frame(aspect, { s, ox, oy, f: 1 + d.zin * e * k });
  }

  let frameN = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    const kS = RM ? 1 : 1 - Math.exp(-dt * 6.5);
    const kM = 1 - Math.exp(-dt * 3);
    const moving = Math.abs(gT - g) > 1e-4 || Math.abs(mxT - mx) > 1e-3 || Math.abs(myT - my) > 1e-3;
    g += (gT - g) * kS; mx += (mxT - mx) * kM; my += (myT - my) * kM;
    if (!moving && (frameN++ & 1)) return; // in repaus: jumatate din cadre (doar granulatia se misca)
    ui(g);
    const i = clamp(Math.floor(g), 0, N - 1), f = g - i;
    let a = scenes[i];
    if (!a.ready) { // daca scena inca se incarca, ramanem pe ultima gata
      let j = i; while (j > 0 && !scenes[j].ready) j--;
      a = scenes[j]; if (!a.ready) return;
      root.classList.add('loading');
    } else root.classList.remove('loading');
    const aspect = stage.clientWidth / stage.clientHeight;
    const t = now / 1000;
    pose(a, scenes.indexOf(a), g, aspect, t);
    let b = null, m = 0;
    if (a === scenes[i] && i < N - 1 && f > 0.75 && scenes[i + 1].ready) {
      b = scenes[i + 1]; m = sstep(0.75, 1.0, f);
      pose(b, i + 1, g, aspect, t);
    }
    comp.render(a, b, m, t);
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- vizualizatorul 3D pentru camere
export class Viewer3D {
  constructor(dialog) {
    this.dlg = dialog;
    this.stage = dialog.querySelector('.viewer-stage');
    this.canvas = dialog.querySelector('canvas');
    this.items = []; this.idx = 0; this.cache = new Map();
    this.u = 0; this.v = 0; this.uT = 0; this.vT = 0; this.drag = null; this.idle = 0; this.running = false;
    this.mix = 1; this.prev = null;
    const st = this.stage;
    st.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, u: this.uT, v: this.vT };
      st.setPointerCapture(e.pointerId); st.classList.add('grab');
    });
    st.addEventListener('pointermove', (e) => {
      if (!this.drag) {
        if (e.pointerType === 'mouse') {
          const r = st.getBoundingClientRect();
          this.uT = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * 0.8;
          this.vT = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1) * 0.8;
          this.idle = 0;
        }
        return;
      }
      const r = st.getBoundingClientRect();
      this.uT = clamp(this.drag.u - ((e.clientX - this.drag.x) / r.width) * 2.4, -1, 1);
      this.vT = clamp(this.drag.v + ((e.clientY - this.drag.y) / r.height) * 2.0, -1, 1);
      this.idle = 0;
    });
    const end = () => { this.drag = null; st.classList.remove('grab'); };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
    st.addEventListener('pointerleave', () => { if (!this.drag) this.idle = 2; });
    dialog.addEventListener('close', () => { this.running = false; });
  }

  ensure() {
    if (this.renderer !== undefined) return !!this.renderer;
    this.renderer = makeRenderer(this.canvas);
    if (!this.renderer) return false;
    this.comp = new Composer(this.renderer);
    this.comp.mat.uniforms.uVig.value = 0.25;
    this.comp.mat.uniforms.uGrain.value = 0.03;
    const rs = () => {
      const w = this.stage.clientWidth, h = this.stage.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.comp.setSize(Math.round(w * dpr), Math.round(h * dpr));
    };
    this.resize = rs;
    new ResizeObserver(rs).observe(this.stage);
    return true;
  }

  scene(item) {
    if (!this.cache.has(item.img)) {
      const sc = new DepthScene({ img: item.img, depth: item.depth, hfov: 74, near: 1, far: 7, focus: [0.5, 0.5], to: [0.5, 0.5], push: 0 }, false);
      sc.load(this.renderer).then(() => { sc.pivot = sc.distMedian(0.25); });
      this.cache.set(item.img, sc);
    }
    return this.cache.get(item.img);
  }

  open(items, idx, onChange) {
    this.items = items; this.onChange = onChange;
    if (!this.dlg.open) this.dlg.showModal();
    const ok = this.ensure();
    this.dlg.classList.toggle('no-gl', !ok);
    this.show(idx, true);
    if (ok && !this.running) {
      this.running = true;
      this.resize();
      this.last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        requestAnimationFrame(loop);
        this.tick(now);
      };
      requestAnimationFrame(loop);
    }
  }

  show(idx, first) {
    const n = this.items.length;
    this.idx = ((idx % n) + n) % n;
    const item = this.items[this.idx];
    if (this.renderer) {
      const sc = this.scene(item);
      this.prev = first ? null : this.cur;
      this.cur = sc; this.mix = first ? 1 : 0;
      this.scene(this.items[(this.idx + 1) % n]);
    }
    this.onChange && this.onChange(this.idx, item);
  }

  tick(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const t = now / 1000;
    this.idle += dt;
    if (!this.drag && this.idle > 2.5 && !RM) { // miscare lenta cand nu atingi nimic
      this.uT = Math.sin(t * 0.32) * 0.75; this.vT = Math.sin(t * 0.21) * 0.35;
    }
    const k = 1 - Math.exp(-dt * 4);
    this.u += (this.uT - this.u) * k; this.v += (this.vT - this.v) * k;
    const sc = this.cur;
    if (!sc || !sc.ready) return;
    this.mix = Math.min(1, this.mix + dt * 1.6);
    const aspect = this.stage.clientWidth / this.stage.clientHeight;
    const set = (s) => {
      const piv = s.pivot || 3;
      const A = RM ? 0 : 0.085;
      s.frame(aspect, { zoom: 1.1, s: RM ? 0 : piv * 0.05 * (0.5 + 0.5 * Math.sin(t * 0.25)), ox: this.u * A, oy: this.v * A * 0.6, pivot: piv, panX: this.u * 0.85, panY: this.v * 0.4 });
    };
    set(sc);
    const p = this.prev && this.prev.ready && this.mix < 1 ? this.prev : null;
    if (p) { set(p); this.comp.render(p, sc, this.mix * this.mix * (3 - 2 * this.mix), t); }
    else this.comp.render(sc, null, 0, t);
  }
}
