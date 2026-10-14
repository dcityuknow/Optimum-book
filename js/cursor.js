/* Con trỏ chuột = logo Optimum (vòng số 8) + vệt ảo ảnh tàn dư khi rê.
 * - Ẩn con trỏ mặc định (cursor:none) chỉ trên máy có chuột; máy cảm ứng giữ nguyên.
 * - Hình logo vẽ lại từ chính đường viền trong js/models/logo.js (O.logoProfile).
 * - Vệt: dải sáng cyan→tím mảnh dần + các "bóng ma" logo nhỏ dần, trễ theo đường đi, mờ rồi tan.
 * - Điểm bấm (hotspot) = tâm logo. Rê lên link/nút thì phóng to, nhấn chuột thì thu nhỏ. */
(function (O) {
  'use strict';
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const PI = Math.PI, rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const S = 46, PAD = 16, LIFE = 560, HOT = 'a,button,[data-go],[role=button],summary,label,input,select,textarea';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ---- Đường viền logo (ngoài/trong theo góc). Nếu logo.js chưa nạp thì dùng dạng ∞ gần đúng.
  const LP = O.logoProfile || (() => {
    const o = [], i = []; for (let k = 0; k < 90; k++) { const c = Math.cos(k / 90 * 2 * PI) ** 2; o.push(.2 + .3 * c); i.push(.115 + .255 * c); }
    return { OUT: o, IN: i };
  })();
  const prof = (arr, th) => { const n = arr.length, f = ((th / (2 * PI)) % 1 + 1) % 1 * n, i = Math.floor(f), t = f - i; return arr[i % n] * (1 - t) + arr[(i + 1) % n] * t; };
  function shape(g, x0, y0) {
    const N = 240; g.beginPath();
    [LP.OUT, LP.IN].forEach(arr => {
      for (let i = 0; i <= N; i++) { const th = i / N * 2 * PI, r = prof(arr, th) * S, x = x0 + Math.cos(th) * r, y = y0 - Math.sin(th) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath();
    });
  }
  const BOX = S + 2 * PAD, BH = S * .62 + 2 * PAD;              // khung sprite (css px)
  const sprite = fn => { const c = document.createElement('canvas'); c.width = Math.ceil(BOX * dpr); c.height = Math.ceil(BH * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); fn(g, BOX / 2, BH / 2); return c; };

  // Logo chính: trắng bạc satin, viền tối mảnh để nhìn rõ trên cả nền sáng, quầng cyan nhẹ
  const main = sprite((g, x, y) => {
    shape(g, x, y); g.shadowColor = 'rgba(77,227,255,.55)'; g.shadowBlur = 10;
    const gr = g.createLinearGradient(0, y - S * .3, 0, y + S * .3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#d3d8e4'); gr.addColorStop(1, '#8e97ab');
    g.fillStyle = gr; g.fill('evenodd'); g.shadowBlur = 0;
    g.lineWidth = 1.1; g.strokeStyle = 'rgba(8,12,28,.8)'; g.stroke();
  });
  // Bóng ma: cùng hình, tô màu cyan → tím, phát sáng
  const GN = 7, ghosts = [...Array(GN)].map((_, k) => sprite((g, x, y) => {
    const col = `hsl(${188 + 11 * k},100%,${70 - 2 * k}%)`; shape(g, x, y);
    g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = col; g.fill('evenodd');
  }));

  // ---- Canvas phủ toàn trang (không chặn chuột)
  const st = document.createElement('style'); st.textContent = 'html.opt-cur,html.opt-cur *{cursor:none!important}'; document.head.append(st);
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647';
  document.body.append(cv); const cx = cv.getContext('2d');
  const fit = () => { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
  fit(); addEventListener('resize', fit);

  // ---- Trạng thái
  let mx = 0, my = 0, vis = false, sc = 1, scT = 1, vx = 0, raf = 0, down = false, lastT = 0;
  const hist = [];                                              // {x, y, t}
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const hide = () => { vis = false; hist.length = 0; document.documentElement.classList.remove('opt-cur'); cx.clearRect(0, 0, cv.width, cv.height); };
  function hot(t) { return !!(t && t.closest && t.closest(HOT)); }
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (!vis) { vis = true; hist.length = 0; document.documentElement.classList.add('opt-cur'); }
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null, now = performance.now();
    (list && list.length ? list : [e]).forEach((p, i, a) => hist.push({ x: p.clientX, y: p.clientY, t: now - (a.length - 1 - i) * 2 }));
    mx = e.clientX; my = e.clientY; scT = down ? .82 : hot(e.target) ? 1.3 : 1; run();
  }, { passive: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { down = true; scT = .82; run(); } }, true);
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { down = false; scT = hot(e.target) ? 1.3 : 1; run(); } }, true);
  document.addEventListener('mouseleave', hide); addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });

  // Vị trí tại thời điểm tq (nội suy trên lịch sử)
  function at(tq) {
    const n = hist.length; if (!n) return null; if (tq <= hist[0].t) return hist[0]; if (tq >= hist[n - 1].t) return hist[n - 1];
    let i = n - 1; while (i > 0 && hist[i - 1].t > tq) i--;
    const a = hist[i - 1], b = hist[i], k = (tq - a.t) / (b.t - a.t || 1); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  function frame(now) {
    raf = 0; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
    while (hist.length && now - hist[0].t > LIFE) hist.shift();
    const dt = Math.min(48, now - (lastT || now)); lastT = now;
    sc += (scT - sc) * Math.min(1, dt / 70);
    if (vis && !rm && hist.length > 1) {
      cx.globalCompositeOperation = 'lighter'; cx.lineCap = cx.lineJoin = 'round';
      // 1) Dải sáng liền: các tứ giác chung cạnh, thon dần về phía đuôi, mờ dần + chuyển cyan → tím
      //    (cộng sáng 'lighter' nên chỗ giáp cạnh không lộ đường nối)
      const P = []; for (const h of hist) { const q = P[P.length - 1]; if (!q || Math.hypot(h.x - q.x, h.y - q.y) > 1.5) P.push(h); }
      if (P.length > 1) {
        const E = P.map((p, i) => {
          const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1;
          const age = clamp((now - p.t) / LIFE, 0, 1), f = 1 - age, hw = (1.5 + 8 * f * f) * sc;
          return { lx: p.x - dy / l * hw, ly: p.y + dx / l * hw, rx: p.x + dy / l * hw, ry: p.y - dx / l * hw, age };
        });
        for (let i = 1; i < E.length; i++) {
          const a = E[i - 1], b = E[i], age = (a.age + b.age) / 2, f = 1 - age;
          cx.fillStyle = `hsla(${190 + 70 * age},100%,${72 - 14 * age}%,${.55 * f * f})`;
          cx.beginPath(); cx.moveTo(a.lx, a.ly); cx.lineTo(a.rx, a.ry); cx.lineTo(b.rx, b.ry); cx.lineTo(b.lx, b.ly); cx.closePath(); cx.fill();
        }
      }
      // 2) Bóng ma logo: bám theo đường đã đi, nhỏ dần, trễ dần
      for (let k = 0; k < GN; k++) {
        const age = 38 + k * 44, p = at(now - age); if (!p) continue;
        const d = Math.hypot(mx - p.x, my - p.y); if (d < 3) continue;
        const al = (1 - age / (LIFE * .75)) * .7 * Math.min(1, d / 28); if (al <= 0) continue;
        const s = sc * (1 - k * .06), w = BOX * s, h = BH * s;
        cx.globalAlpha = al; cx.drawImage(ghosts[k], p.x - w / 2, p.y - h / 2, w, h);
      }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    }
    if (vis) {                                                  // Logo chính: luôn đúng vị trí chuột; nghiêng nhẹ theo hướng di chuyển
      const p = hist.length > 3 ? hist[hist.length - 4] : null;
      vx += (((p ? mx - p.x : 0) * .012) - vx) * .25; const rot = clamp(vx, -.45, .45);
      cx.save(); cx.translate(mx, my); cx.rotate(rot); const w = BOX * sc, h = BH * sc; cx.drawImage(main, -w / 2, -h / 2, w, h); cx.restore();
    }
    if (vis && (hist.length || Math.abs(sc - scT) > .005 || Math.abs(vx) > .005)) run();
    else if (!vis) lastT = 0;
  }
})(window.OPT || (window.OPT = {}));
