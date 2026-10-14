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

  /* ---------- Đa ngôn ngữ cho nhãn 3D ----------
   * Nhãn vẽ bằng canvas nên i18n.js (duyệt DOM) không thấy. Mỗi nhãn nhớ chuỗi tiếng Việt gốc
   * (s.src) và vẽ lại bằng OPT_I18N.t(...) mỗi khi bản dịch về (sự kiện 'opt-i18n') hoặc font tải xong. */
  const I18 = () => window.OPT_I18N;
  const T = s => { const i = I18(); return i && i.t ? i.t(s) : s; };
  const seen = new Set(); let queue = [], qt = 0;
  const need = s => {                                  // xếp chuỗi vào hàng đợi dịch (gộp thành 1 lượt)
    const i = I18(); if (!i || !i.load || i.isSource() || !s) return;
    const k = s.replace(/\d+/g, '0'); if (seen.has(k)) return; seen.add(k);
    queue.push(s); clearTimeout(qt);
    qt = setTimeout(() => { const l = queue; queue = []; i.load(l); }, 60);
  };
  const stack = () => {
    const f = (getComputedStyle(document.documentElement).getPropertyValue('--i18n-font') || '').replace(/,\s*system-ui,sans-serif\s*$/, '').trim();
    return (f ? f + ',' : '') + "'Be Vietnam Pro',system-ui,-apple-system,'Segoe UI',sans-serif";
  };
  const REG = [];
  const reg = sp => REG.push(window.WeakRef ? new WeakRef(sp) : { deref: () => sp });
  const redrawAll = () => { for (let i = REG.length - 1; i >= 0; i--) { const sp = REG[i].deref(); if (sp) sp.redraw(); else REG.splice(i, 1); } };
  addEventListener('opt-i18n', () => {
    const i = I18(), f = i && i.font && i.font().split(',')[0].replace(/['"]/g, '').trim();
    if (f && document.fonts && document.fonts.load) document.fonts.load("600 30px '" + f + "'", 'Aあ가한').then(redrawAll, () => {});
    redrawAll();
  });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', redrawAll);

  /** Nhãn chữ dạng sprite. Trả về sprite có hàm .set(text) để đổi chữ (text luôn là tiếng Việt gốc). */
  function label(text, { color = '#eaf0ff', size = 1.1, px = 30, w = 320, h = 72, weight = 600 } = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'), t = new THREE.CanvasTexture(cv);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }));
    s.scale.set(size * w / h, size, 1); s.renderOrder = 10;
    let src = '', col;
    const draw = () => {
      const txt = T(src), fam = stack(); let p = px;
      x.clearRect(0, 0, w, h);
      x.font = `${weight} ${p}px ${fam}`;
      while (p > 11 && x.measureText(txt).width > w - 12) { p--; x.font = `${weight} ${p}px ${fam}`; }  // bản dịch dài → thu nhỏ chữ cho vừa nhãn
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 8; x.fillStyle = col || color; x.fillText(txt, w / 2, h / 2); t.needsUpdate = true;
    };
    s.set = (txt, c) => { src = txt; col = c; need(txt); draw(); };
    s.redraw = draw; reg(s);
    s.set(text); return s;
  }

  const hexCss = h => '#' + h.toString(16).padStart(6, '0');
  const $ = id => document.getElementById(id);
  const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  O.kit = { V, C, AD, tex, glow, seg, lines, fib, knn, adjOf, wire, solid, label, T, hexCss, $, setText, ease, clamp };
})(window.OPT);
