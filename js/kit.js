/* Optimum Book — tiện ích Three.js dùng chung (glow, đường nối, nhãn chữ...) */
window.OPT = window.OPT || {};
(function (O) {
  'use strict';
  const V = THREE.Vector3;
  const C = { CY: 0x4de3ff, VI: 0xb28cff, RD: 0xff5d73, GY: 0x8a93b8, AM: 0xffc857, GR: 0x4dffb0 };
  const AD = THREE.AdditiveBlending;

  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#fff'); g.addColorStop(.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const glow = (r, col, o = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: o, blending: AD, depthWrite: false }));
    s.scale.set(r * 5, r * 5, 1); return s;
  };
  const seg = (pts, col, op) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: AD, depthWrite: false }));
  const lines = (P, E, col, op) => seg(E.flatMap(([a, b]) => [P[a], P[b]]), col, op);
  const fib = (n, R) => [...Array(n)].map((_, i) => {
    const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), a = i * 2.4;
    return new V(Math.cos(a) * r * R, y * R, Math.sin(a) * r * R);
  });
  function knn(P, k) {
    const E = [], seen = new Set();
    P.forEach((p, i) => P.map((q, j) => [j, p.distanceTo(q)]).filter(x => x[0] != i).sort((a, b) => a[1] - b[1]).slice(0, k)
      .forEach(([j]) => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (!seen.has(key)) { seen.add(key); E.push([i, j]); } }));
    return E;
  }
  const adjOf = (n, E) => { const a = [...Array(n)].map(() => []); E.forEach(([x, y]) => { a[x].push(y); a[y].push(x); }); return a; };

  /** Khung dây của hộp/hình học (viền sáng) */
  const wire = (geo, col, op = .8) => new THREE.LineSegments(new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: AD, depthWrite: false }));
  const solid = (geo, col, op = .15) => new THREE.Mesh(geo,
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));

  /** Nhãn chữ dạng sprite. Trả về sprite có hàm .set(text) để đổi chữ. */
  function label(text, { color = '#eaf0ff', size = 1.1, px = 30, w = 320, h = 72, weight = 600 } = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'), t = new THREE.CanvasTexture(cv);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }));
    s.scale.set(size * w / h, size, 1); s.renderOrder = 10;
    s.set = (txt, col) => {
      x.clearRect(0, 0, w, h); x.font = `${weight} ${px}px 'Be Vietnam Pro',system-ui,-apple-system,'Segoe UI',sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 8; x.fillStyle = col || color; x.fillText(txt, w / 2, h / 2); t.needsUpdate = true;
    };
    s.set(text); return s;
  }

  const hexCss = h => '#' + h.toString(16).padStart(6, '0');
  const $ = id => document.getElementById(id);
  const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  O.kit = { V, C, AD, tex, glow, seg, lines, fib, knn, adjOf, wire, solid, label, hexCss, $, setText, ease, clamp };
})(window.OPT);
