/* Hologram: mô hình 3D "bật lên" khỏi trang sách.
 * - Tối đa 2 hologram cùng lúc (trang trái + trang phải), mỗi cái một canvas WebGL riêng.
 * - Slot trên trang: <figure class="m3d" data-model="tên"> chứa ảnh poster.
 * - Kéo để xoay · cuộn/chụm để phóng · rời chuột thì tự về vị trí cũ. */
(function (O) {
  'use strict';
  const { ease, clamp, $ } = O.kit;
  const fx = $('fx'), tip = $('tip'), PI = Math.PI;
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const pool = [0, 1].map(() => ({ canvas: null, r: null, hit: null, beam: null, job: null, ptrs: new Map(), rt: 0 }));
  let active = [], raf = 0, last = 0, hT = 0;

  function unit(u) {
    if (u.canvas) return u;
    u.canvas = document.createElement('canvas'); u.canvas.className = 'holo';
    u.hit = document.createElement('div'); u.hit.className = 'hit';
    u.beam = document.createElement('div'); u.beam.className = 'beam';
    u.r = new THREE.WebGLRenderer({ canvas: u.canvas, antialias: true, alpha: true });
    u.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    bind(u); return u;
  }

  function bind(u) {
    const h = u.hit;
    h.addEventListener('pointerdown', e => { if (!h.classList.contains('up')) return; u.rt++; h.setPointerCapture(e.pointerId); u.ptrs.set(e.pointerId, [e.clientX, e.clientY]); });
    h.addEventListener('pointermove', e => {
      const p = u.ptrs.get(e.pointerId); if (!p || !u.job) return; const o = u.job.o;
      if (u.ptrs.size === 2) {
        const v = [...u.ptrs.values()], d0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); p[0] = e.clientX; p[1] = e.clientY;
        const d1 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); o.z = clamp(o.z * d1 / (d0 || 1), .5, 2.6);
      } else { o.ry += (e.clientX - p[0]) * .008; o.rx = clamp(o.rx + (e.clientY - p[1]) * .008, -1.3, 1.3); p[0] = e.clientX; p[1] = e.clientY; }
    });
    const up = e => u.ptrs.delete(e.pointerId);
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    h.addEventListener('wheel', e => { if (!u.job) return; e.preventDefault(); e.stopPropagation(); u.rt++; u.job.o.z = clamp(u.job.o.z * (1 - e.deltaY * .0012), .5, 2.6); }, { passive: false });
    h.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !u.ptrs.size) back(u); });
  }

  function back(u) {
    const j = u.job; if (!j) return; const o = j.o, a = { rx: o.rx, ry: o.ry, z: o.z }, ty = Math.round(o.ry / (2 * PI)) * 2 * PI, t0 = performance.now(), id = ++u.rt;
    (function f(n) {
      if (id !== u.rt || u.job !== j) return;
      const k = ease(Math.min(1, (n - t0) / (rm ? 1 : 700)));
      o.rx = a.rx * (1 - k); o.ry = a.ry + (ty - a.ry) * k; o.z = a.z + (1 - a.z) * k;
      if (k < 1) requestAnimationFrame(f); else o.ry = 0;
    })(t0);
  }

  function raise(slots) {
    if (active.length) return;
    slots.filter(Boolean).slice(0, 2).forEach((slot, i) => {
      const model = O.Models.get(slot.dataset.model), r = slot.getBoundingClientRect();
      if (!model || r.width < 60 || r.height < 60) return;
      let u; try { u = unit(pool[i]); } catch (e) { return; }
      const stage = slot.classList.contains('stage'), grow = stage ? 1 : 1.12, PAD = 1.45;
      const w = r.width * grow, h = r.height * grow, cx = r.left + r.width / 2, cy = r.top + r.height / 2 - (stage ? 0 : r.height * .08);
      const cv = u.canvas, W = innerWidth, H = innerHeight;
      cv.style.cssText = `left:0;top:0;width:${W}px;height:${H}px;transform-origin:${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
      u.r.setSize(W, H, false);
      // Canvas toàn màn hình: mô hình đặt giữa vùng (cx,cy) bằng view offset, phóng to không bị cắt mép.
      const cam = model.camera, a = w / h;
      cam.aspect = W / H; model.cz = model.bz * Math.max(1, 1.15 / a) * (H / h);
      cam.setViewOffset(W, H, -(cx - W / 2), -(cy - H / 2), W, H); cam.updateProjectionMatrix();
      const bot = r.bottom - r.height * .1;
      u.beam.style.cssText = `left:${cx - w * .35}px;width:${w * .7}px;top:${cy}px;height:${Math.max(20, bot - cy)}px`;
      u.hit.style.cssText = `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px`;
      u.job = { model, slot, o: { rx: 0, ry: 0, z: 1 }, cz: model.cz, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      u.ptrs.clear(); fx.append(u.beam, cv, u.hit); active.push(u);
    });
    if (!active.length) return;
    hT = setTimeout(() => {
      active.forEach(u => {
        const f = document.createElement('div'); f.className = 'flash'; f.style.cssText = `left:${u.job.cx}px;top:${u.job.cy}px`; fx.append(f); setTimeout(() => f.remove(), 950);
        u.job.slot.classList.add('on'); u.canvas.classList.add('up'); u.hit.classList.add('up'); u.beam.classList.add('up');
      });
      tip.classList.add('on');
    }, rm ? 50 : 650);
    last = performance.now(); if (!raf) raf = requestAnimationFrame(loop);
  }

  function drop() {
    clearTimeout(hT); if (!active.length) return;
    const gone = active; active = []; tip.classList.remove('on');
    gone.forEach(u => {
      u.canvas.classList.remove('up'); u.beam.remove(); u.hit.classList.remove('up'); u.hit.remove();
      const j = u.job; u.job = null;
      setTimeout(() => { if (!u.job) u.canvas.remove(); j.slot.classList.remove('on'); }, rm ? 0 : 340);
      j.slot.classList.remove('on');
    });
  }

  function loop(now) {
    raf = 0; if (!active.length) return;
    const t1 = performance.now(), dt = clamp((t1 - last) / 1000, 0, .05); last = t1;
    active.forEach(u => {
      const j = u.job; if (!j) return;
      j.model.step(dt);
      j.model.scene.rotation.set(j.o.rx, j.o.ry, 0); j.model.camera.position.z = j.cz / j.o.z;
      u.r.render(j.model.scene, j.model.camera);
    });
    raf = requestAnimationFrame(loop);
  }

  O.Holo = { raise, drop, get isUp() { return active.length > 0; } };
})(window.OPT);
