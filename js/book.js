/* Engine cuốn sách lật 3D (CSS 3D) — lật trang, kéo góc, xoay/zoom cả cuốn sách.
 * Tích hợp OPT.Holo: khi trang dừng lại, mô hình 3D trong slot `.m3d` bật lên. */
(function (O) {
  'use strict';
  const { $, clamp: cl, ease } = O.kit, PI = Math.PI;
  const st = $('st'), bk = $('bk'), holder = $('src'), src = [...holder.children], N0 = src.length;
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let vyaw = 0, vt = 0, vz = 1, tilt = 40, mob = null, L = [], S = 0, pw = 300, sp = 0, drag = null, raf = 0, sT = 0;

  src.forEach((p, i) => { if (i > 0 && i < N0 - 1) p.insertAdjacentHTML('beforeend', '<i class="fo">' + i + '</i>'); });
  const face = (page, c) => {
    const f = document.createElement('div'); f.className = 'fc ' + c; if (page) f.append(page);
    f.insertAdjacentHTML('beforeend', '<div class="sh"></div>'); return f;
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function build() {
    O.Holo.drop();
    src.forEach(p => holder.append(p)); bk.querySelectorAll('.lf,.sk,.bs').forEach(e => e.remove()); L = [];
    const n = mob ? N0 : Math.ceil(N0 / 2);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div'); el.className = 'lf';
      const fp = src[mob ? i : 2 * i], bp = mob ? null : src[2 * i + 1];
      const f = face(fp, 'f'), b = face(bp, 'b'); el.append(f, b); bk.append(el);
      L.push({ el, p: 0, h: 0, ht: 0, tw: null, sf: f.lastChild, sb: b.lastChild, fs: fp && fp.querySelector('.m3d'), bs: bp && bp.querySelector('.m3d') });
    }
    bk.insertAdjacentHTML('beforeend', '<div class="bs l"></div><div class="bs r"></div><div class="sk l"></div><div class="sk r"></div>');
    bk.classList.toggle('mb', mob); S = cl(S, 0, mob ? n - 1 : n); L.forEach((l, i) => l.p = i < S ? 1 : 0);
  }

  function layout() {
    const W = st.clientWidth, H = st.clientHeight, nm = W < 860 || W < H * 1.1; let ph;
    tilt = nm ? 30 : 40; const cs = Math.cos(tilt * PI / 180);
    if (nm) { pw = Math.min(W - 16, 520); ph = Math.min(H * .92 / cs, pw * 1.75); }
    else { ph = H * .92 / cs; pw = Math.min((W - 56) / 2, ph * .74); ph = Math.min(ph, pw / .62); }
    sp = nm ? 0 : pw; const s = bk.style;
    s.setProperty('--pw', pw + 'px'); s.setProperty('--ph', ph + 'px'); s.setProperty('--sp', sp + 'px');
    s.setProperty('--bw', (nm ? pw : 2 * pw) + 'px'); s.setProperty('--fs', cl(pw / 34, 13, 17.5) + 'px');
    if (nm !== mob) { S = nm ? (S ? 2 * S - 1 : 0) : Math.ceil(S / 2); mob = nm; build(); }
    O.Holo.drop(); draw(); upd(); settle();
  }

  const shift = () => mob ? 0 : pw / 2 * (L[L.length - 1].p - (1 - L[0].p));
  const rc = () => bk.getBoundingClientRect(), spine = () => { const r = rc(); return mob ? r.left : r.left + r.width / 2; }, px = () => rc().width / (mob ? 1 : 2);

  function draw() {
    const n = L.length, sf = Array(n).fill(0), sb = Array(n).fill(0);
    L.forEach((l, i) => {
      const pe = cl(l.p + l.h * (l.p < .5 ? 1 : -1), 0, 1), mid = l.p > 0 && l.p < 1 || l.h > .002, s = Math.sin(pe * PI);
      l.el.style.transform = `translateZ(${mid ? n + 6 : l.p >= 1 ? i + 1 : n - i}px) rotateY(${-180 * pe}deg)`;
      if (pe > 0 && pe < 1) {
        sf[i] = Math.max(sf[i], .5 * s); sb[i] = Math.max(sb[i], .5 * s);
        if (i < n - 1) sf[i + 1] = Math.max(sf[i + 1], .45 * s); if (i) sb[i - 1] = Math.max(sb[i - 1], .45 * s);
      }
    });
    L.forEach((l, i) => { l.sf.style.opacity = sf[i]; l.sb.style.opacity = sb[i]; });
    bk.style.transform = `scale(${vz}) rotateX(${tilt + vt}deg) rotateZ(${vyaw}deg) translateX(${shift()}px)`;
    const r = L.filter(l => l.p < .5).length;
    bk.querySelector('.bs.r').style.opacity = r ? 1 : 0; bk.querySelector('.bs.l').style.opacity = n - r ? 1 : 0;
    bk.querySelector('.sk.r').style.setProperty('--n', Math.max(0, r - 1)); bk.querySelector('.sk.l').style.setProperty('--n', Math.max(0, n - r - 1));
    O.progress = L.reduce((a, l) => a + l.p, 0) * 300;
  }

  function frame(now) {
    raf = 0; let busy = drag && drag.m;
    L.forEach(l => {
      const w = l.tw;
      if (w) { busy = true; const t = (now - w.t0) / w.d; if (t >= 1) { l.p = w.to; l.tw = null; } else if (t > 0) l.p = w.f + (w.to - w.f) * ease(t); }
      const dh = l.ht - l.h; if (Math.abs(dh) > .002) { l.h += dh * .18; busy = true; } else l.h = l.ht;
    });
    draw(); if (busy) run(); else settle();
  }
  const tw = (l, to, dl, d) => { l.tw = { f: l.p, to, t0: performance.now() + dl, d: rm ? 1 : d }; };

  function upd() {
    const mx = mob ? L.length - 1 : L.length; $('pv').disabled = S <= 0; $('nx').disabled = S >= mx;
    $('pg').textContent = S === 0 ? 'Bìa trước' : S === mx ? 'Bìa sau' : mob ? 'Trang ' + S + ' / ' + (N0 - 2) : (2 * S - 1) + '–' + 2 * S + ' / ' + (N0 - 2);
  }
  function go(s) {
    const mx = mob ? L.length - 1 : L.length; s = cl(s, 0, mx); if (s === S) return; O.Holo.drop();
    const d = Math.abs(s - S) > 1 ? 800 : 1050; let k = 0;
    if (s > S) for (let i = S; i < s; i++) tw(L[i], 1, k++ * 120, d); else for (let i = S - 1; i >= s; i--) tw(L[i], 0, k++ * 120, d);
    S = s; upd(); run();
  }

  /* ---- Hologram ---- */
  function slotsNow() {
    const r = L[S], l = !mob && S > 0 ? L[S - 1] : null;
    return [r && r.fs, l && l.bs].filter(Boolean);
  }
  function settle() { clearTimeout(sT); sT = setTimeout(raise, 250); }
  function raise() { if (drag || vw || raf || L.some(l => l.tw) || O.Holo.isUp) return; O.Holo.raise(slotsNow()); }
  const drop = () => { clearTimeout(sT); O.Holo.drop(); };
  bk.addEventListener('scroll', () => { drop(); settle(); }, true);

  /* ---- Tương tác ---- */
  const pts = new Map(), inBook = e => { const r = rc(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
  const ok = () => { const y = ((vyaw % 360) + 540) % 360 - 180; return Math.abs(y) < 4 && Math.abs(vt) < 10; };
  let vw = null, pd0 = 0, vA = 0;
  st.addEventListener('contextmenu', e => e.preventDefault());
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('button,a')) return; pts.set(e.pointerId, [e.clientX, e.clientY]); vA++;
    if (pts.size === 2) { drag = null; const v = [...pts.values()]; pd0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); vw = { pinch: 1, z: vz }; drop(); return; }
    if (e.button === 2 || e.shiftKey || !ok() || !inBook(e)) { vw = { x: e.clientX, y: e.clientY, yaw: vyaw, t: vt }; drag = null; drop(); st.setPointerCapture(e.pointerId); return; }
    if (e.button > 0) return;
    drag = { x0: e.clientX, m: 0, lx: e.clientX, v: 0, lt: performance.now() };
  });
  st.addEventListener('pointermove', e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (vw) {
      if (vw.pinch) { if (pts.size === 2) { const v = [...pts.values()]; vz = cl(vw.z * Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]) / (pd0 || 1), .5, 2.2); draw(); } }
      else { vyaw = vw.yaw + (e.clientX - vw.x) * .3; vt = cl(vw.t + (e.clientY - vw.y) * .2, -30, 35); draw(); }
      return;
    }
    if (!drag) {
      if (e.pointerType !== 'mouse' || mob || !ok()) return; L.forEach(l => l.ht = 0);
      const x = e.clientX, sx = spine(), P = px(), r = rc();
      if (e.clientY > r.top && e.clientY < r.bottom) {
        if (x > sx + P * .82 && x < sx + P * 1.05 && S < L.length) L[S].ht = .045; else if (x < sx - P * .82 && x > sx - P * 1.05 && S > 0) L[S - 1].ht = .045;
      }
      run(); return;
    }
    const d = drag, dx = e.clientX - d.x0;
    if (!d.m && Math.abs(dx) > 8) {
      const fw = dx < 0, sx = spine(), i = fw ? S : S - 1, mx = mob ? L.length - 1 : L.length;
      if (i < 0 || (fw && S >= mx) || (!mob && (fw ? d.x0 < sx : d.x0 > sx))) { drag = null; return; }
      d.m = 1; drop(); d.l = L[i]; d.i = i; d.l.tw = null; d.l.ht = 0; d.o = d.x0 - (sx + px() * Math.cos(d.l.p * PI)); st.setPointerCapture(e.pointerId);
    }
    if (d.m) {
      const n = performance.now(), dt = n - d.lt; if (dt > 0) { d.v = (e.clientX - d.lx) / dt; d.lx = e.clientX; d.lt = n; }
      d.l.p = Math.acos(cl((e.clientX - d.o - spine()) / px(), -1, 1)) / PI; run();
    }
  });
  const end = e => {
    pts.delete(e.pointerId);
    if (vw) { if (!vw.pinch || pts.size < 2) { vw = null; settle(); } return; }
    const d = drag; drag = null; if (!d) return;
    if (d.m) { const l = d.l; let to = l.p > .5 ? 1 : 0; if (Math.abs(d.v) > .35) to = d.v < 0 ? 1 : 0; tw(l, to, 0, Math.max(250, 750 * Math.abs(to - l.p))); S = to ? d.i + 1 : d.i; upd(); run(); return; }
    if (e.type !== 'pointerup' || !ok()) return; const x = e.clientX, sx = spine(), W = st.clientWidth;
    if (mob) { if (x > W * .7) go(S + 1); else if (x < W * .3) go(S - 1); } else { if (x > sx + px() * .8) go(S + 1); else if (x < sx - px() * .8) go(S - 1); }
  };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  $('pv').onclick = () => go(S - 1); $('nx').onclick = () => go(S + 1); $('tc').onclick = () => go(1);
  document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); const i = +a.dataset.go; go(mob ? i : Math.ceil(i / 2)); });
  addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); go(S + 1); } else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(S - 1); } else if (k === 'Home') go(0); else if (k === 'End') go(99);
  });
  let wl = 0;
  addEventListener('wheel', e => {
    if (e.target.closest('.hit')) return;
    if (e.ctrlKey || e.metaKey || !inBook(e)) { e.preventDefault(); vA++; vz = cl(vz * (1 - e.deltaY * (e.ctrlKey ? .01 : .0012)), .5, 2.2); draw(); drop(); settle(); return; }
    const p = e.target.closest('.pg'); if (p && p.scrollHeight > p.clientHeight + 2) return;
    const n = performance.now(); if (n - wl < 650 || Math.abs(e.deltaY) < 8) return; wl = n; go(S + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  function viewTo(y, t, z) {
    const a = [vyaw, vt, vz], id = ++vA, t0 = performance.now(); drop();
    (function f(n) {
      if (id !== vA) return; const k = ease(Math.min(1, (n - t0) / (rm ? 1 : 450)));
      vyaw = a[0] + (y - a[0]) * k; vt = a[1] + (t - a[1]) * k; vz = a[2] + (z - a[2]) * k; draw(); if (k < 1) requestAnimationFrame(f); else settle();
    })(t0);
  }
  $('vl').onclick = () => viewTo(vyaw - 25, vt, vz); $('vr').onclick = () => viewTo(vyaw + 25, vt, vz);
  $('vp').onclick = () => viewTo(vyaw, vt, cl(vz * 1.25, .5, 2.2)); $('vm').onclick = () => viewTo(vyaw, vt, cl(vz / 1.25, .5, 2.2));
  $('v0').onclick = () => viewTo(Math.round(vyaw / 360) * 360, 0, 1);
  new ResizeObserver(layout).observe(st); layout();

  O.book = { go, get page() { return S; } };
})(window.OPT);
