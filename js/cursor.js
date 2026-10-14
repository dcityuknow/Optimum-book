/* js/cursor.js — con trỏ = logo Optimum (vòng số 8 chrome) + vệt chuột cũng là logo, mờ nhạt và tan nhanh
 *
 * - Logo là con trỏ GỐC của hệ điều hành (CSS cursor: url(svg)) nên không có độ trễ nào.
 * - Vệt là canvas phủ trang, các bóng logo nằm phía sau con trỏ nên có trễ nhẹ cũng không lộ.
 * - Chỉ bật trên máy có chuột (hover:hover + pointer:fine); máy cảm ứng giữ nguyên.
 * Thêm <link rel="stylesheet" href="css/cursor.css"> và <script src="js/cursor.js"></script>.
 */
(function () {
  'use strict';
  if (!window.matchMedia || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var root = document.documentElement;

  /* ================= 1) Con trỏ logo (SVG làm cursor gốc) ================= */
  var OUTER = 'M60,16C52,16 46,6 34,6C17,6 4,19 4,36C4,53 17,66 34,66C46,66 52,56 60,56C68,56 74,66 86,66C103,66 116,53 116,36C116,19 103,6 86,6C74,6 68,16 60,16Z';
  var INNER = 'M60,29C54,29 50,19 34,19C24,19 17,27 17,36C17,45 24,53 34,53C50,53 54,43 60,43C66,43 70,53 86,53C96,53 103,45 103,36C103,27 96,19 86,19C70,19 66,29 60,29Z';

  // Chrome ẩn con trỏ lớn hơn 32px khi nó chạm viền cửa sổ, nên giữ logo trong 32 x 19 px
  function ring(o) {
    var st = o.stops.map(function (c, i) {
      return '<stop offset="' + [0, .26, .5, .74, 1][i] + '" stop-color="' + c + '"/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="19" viewBox="0 0 120 72">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' + st + '</linearGradient></defs>' +
      '<g transform="translate(60 36) scale(' + o.s + ') translate(-60 -36)">' +
      (o.glow ? '<path d="' + OUTER + '" fill="none" stroke="rgba(53,224,255,.55)" stroke-width="6"/>' : '') +
      '<path fill-rule="evenodd" fill="url(#g)" d="' + OUTER + INNER + '"/>' +
      '<path d="' + INNER + '" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"/>' +
      '<path d="' + OUTER + '" fill="none" stroke="' + o.rim + '" stroke-width="1.6"/>' +
      '</g></svg>';
  }
  function cur(svg, fallback) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 16 10, ' + fallback;
  }

  var C_NORMAL = cur(ring({ s: 1,   rim: 'rgba(15,25,45,.55)', stops: ['#ffffff', '#b4bcc8', '#f4f6f9', '#7f8a99', '#e2e7ee'] }), 'auto');
  var C_HOT    = cur(ring({ s: 1,   rim: 'rgba(0,110,150,.8)', glow: true, stops: ['#ffffff', '#86f0ff', '#f2fdff', '#34c3e6', '#cdf8ff'] }), 'pointer');
  var C_DOWN   = cur(ring({ s: .8,  rim: 'rgba(15,25,45,.6)',  stops: ['#e8edf3', '#9aa4b2', '#d5dbe3', '#6b7685', '#c3cad4'] }), 'auto');

  var HOT = ':is(a,button,[role="button"],[role="option"],[data-go],summary,label,select,input,textarea)';
  var style = document.createElement('style');
  style.id = 'cur-style';
  style.textContent =
    'html,html *{cursor:' + C_NORMAL + ' !important}' +
    'html ' + HOT + ',html ' + HOT + ' *{cursor:' + C_HOT + ' !important}' +
    'html.cur-down,html.cur-down *,html.cur-down ' + HOT + ',html.cur-down ' + HOT + ' *{cursor:' + C_DOWN + ' !important}';
  document.head.appendChild(style);

  addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') root.classList.add('cur-down'); }, true);
  ['pointerup', 'pointercancel', 'blur'].forEach(function (ev) {
    addEventListener(ev, function () { root.classList.remove('cur-down'); }, true);
  });

  if (reduce) return;     // người dùng tắt chuyển động: giữ logo, bỏ vệt

  /* ================= 2) Vệt logo mờ ================= */
  var MAXD = 30;
  var GW = 32, GH = 19.2;         // kích thước mỗi bóng logo = đúng bằng con trỏ
  var ALPHA = .3;                 // độ đậm tối đa của bóng (càng nhỏ càng nhạt)
  var LIFE_MIN = 240, LIFE_VAR = 90;   // ms: tan rất nhanh
  var cv, ctx, vw = 0, vh = 0, dpr = 1, sprite;
  var drops = [], raf = 0, lastTick = 0, dirty = null;
  var lx = null, ly = 0, lt = 0, acc = 0, gap = 14;

  // Vẽ sẵn logo chrome nhạt một lần, các bóng chỉ việc dán lại
  function makeSprite() {
    var k = 160 / 120, c = document.createElement('canvas'), g;
    c.width = 160; c.height = Math.round(72 * k); g = c.getContext('2d');
    g.scale(k, k);
    var gr = g.createLinearGradient(0, 0, 120, 72);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.26, '#c3cad5'); gr.addColorStop(.5, '#f4f6f9');
    gr.addColorStop(.74, '#98a3b1'); gr.addColorStop(1, '#e2e7ee');
    g.fillStyle = gr; g.fill(new Path2D(OUTER + INNER), 'evenodd');
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.stroke(new Path2D(INNER));
    return c;
  }

  function size() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); dirty = null;
  }

  function spawn(x, y) {
    drops.push({ x: x, y: y, t0: performance.now(), life: LIFE_MIN + Math.random() * LIFE_VAR });
    if (drops.length > MAXD) drops.shift();
  }

  function tick(now) {
    raf = 0; lastTick = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (dirty) ctx.clearRect(dirty.x0, dirty.y0, dirty.x1 - dirty.x0, dirty.y1 - dirty.y0);
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;

    for (var i = drops.length - 1; i >= 0; i--) {
      var p = drops[i], age = (now - p.t0) / p.life;
      if (age >= 1) { drops.splice(i, 1); continue; }
      var sc = 1 - .22 * age;                         // co lại một chút khi tan
      var w = GW * sc, h = GH * sc;
      ctx.globalAlpha = ALPHA * Math.pow(1 - age, 1.5);
      ctx.drawImage(sprite, p.x - w / 2, p.y - h / 2, w, h);
      if (p.x - GW / 2 - 2 < x0) x0 = p.x - GW / 2 - 2; if (p.y - GH / 2 - 2 < y0) y0 = p.y - GH / 2 - 2;
      if (p.x + GW / 2 + 2 > x1) x1 = p.x + GW / 2 + 2; if (p.y + GH / 2 + 2 > y1) y1 = p.y + GH / 2 + 2;
    }
    ctx.globalAlpha = 1;
    dirty = drops.length ? { x0: x0, y0: y0, x1: x1, y1: y1 } : null;
    if (drops.length) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf) { lastTick = performance.now(); raf = requestAnimationFrame(tick); } }

  function step(px, py, now) {
    if (lx === null) { lx = px; ly = py; lt = now; return; }
    var dx = px - lx, dy = py - ly, d = Math.hypot(dx, dy);
    if (d < .5) return;
    var ux = dx / d, uy = dy / d, n = 0;
    acc += d;
    while (acc >= gap && n < 8) {            // cứ mỗi ~12–16px chuột đi qua là để lại một bóng logo
      var o = acc - gap;
      spawn(px - ux * o, py - uy * o);
      acc = o; gap = 12 + Math.random() * 4; n++;
    }
    if (n >= 8) acc = 0;
    lx = px; ly = py; lt = now;
  }

  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    var evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!evs.length) evs = [e];
    var now = performance.now();
    evs.forEach(function (ev) { step(ev.clientX, ev.clientY, now); });
    if (drops.length) wake();
  }

  function init() {
    sprite = makeSprite();
    cv = document.createElement('canvas');
    cv.id = 'cur-trail'; cv.setAttribute('aria-hidden', 'true');
    ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    document.body.appendChild(cv);
    size(); addEventListener('resize', size);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('mouseout', function (e) { if (!e.relatedTarget) { lx = null; acc = 0; } });   // chuột rời cửa sổ
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
