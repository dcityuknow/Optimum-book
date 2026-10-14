/* Dịch hình minh hoạ SVG (assets/img/*.svg) sang ngôn ngữ đang chọn — mọi ngôn ngữ trong menu.
 *
 * SVG nạp bằng <img> là "ảnh chết": i18n.js (duyệt DOM) không thấy chữ bên trong. Ở đây:
 *   1. lấy mã nguồn SVG gốc từ js/svg-data.js (OPT.svgSrc, sinh bằng tools/build-svg-data.py),
 *   2. gom mọi chuỗi trong <text> → OPT_I18N.load() (cùng Google Dịch + cache localStorage với cả trang),
 *   3. thay chữ, tự thu nhỏ cỡ chữ nếu bản dịch dài hơn khung,
 *   4. gán SVG đã dịch (data: URL) lại cho các <img> — kể cả <img> sách dựng/nhân bản về sau.
 * Nạp file này SAU js/i18n.js và js/svg-data.js.
 */
(function (O) {
  'use strict';
  const I = window.OPT_I18N;
  if (!I || !O.svgSrc) return;

  const NS = 'http://www.w3.org/2000/svg';
  const SYS = "system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans',sans-serif";   // <img> không dùng được web font của trang
  const imgRe = /assets\/img\/([\w-]+)\.svg/;
  let urls = null, running = false;

  const textEls = root => [...root.querySelectorAll('text')];
  const txt = el => (el.textContent || '').trim();

  function build(name, family) {
    const doc = new DOMParser().parseFromString(O.svgSrc[name], 'image/svg+xml');
    if (doc.querySelector('parsererror')) return null;
    const svg = document.importNode(doc.documentElement, true);
    const vb = (svg.getAttribute('viewBox') || '0 0 400 240').split(/[\s,]+/).map(Number);
    svg.setAttribute('font-family', family);
    svg.setAttribute('width', vb[2]); svg.setAttribute('height', vb[3]);
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none';
    holder.appendChild(svg); document.body.appendChild(holder);
    try {
      const els = textEls(svg).filter(el => I.wants(txt(el)));
      // đo chiều rộng bản gốc (cùng font với bản dịch để so sánh công bằng)
      const m0 = els.map(el => ({ w: el.getComputedTextLength(), fs: parseFloat(getComputedStyle(el).fontSize) || 10 }));
      els.forEach((el, i) => {
        const src = txt(el), tr = I.t(src);
        if (tr === src) return;
        el.textContent = tr;
        const w1 = el.getComputedTextLength(); if (!w1) return;
        let k = Math.min(1, Math.max(m0[i].w * 1.12, 12) / w1);       // không rộng hơn bản gốc quá ~12%
        const bb = el.getBBox(), anchor = el.getAttribute('text-anchor') || 'start', pad = 4;
        const room = anchor === 'middle' ? 2 * Math.min(bb.x + bb.width / 2 - pad, vb[2] - pad - (bb.x + bb.width / 2))
          : anchor === 'end' ? bb.x + bb.width - pad : vb[2] - pad - bb.x;  // và không tràn mép hình
        k = Math.max(.5, Math.min(k, room / w1));
        if (k < .995) el.setAttribute('font-size', (m0[i].fs * k).toFixed(2));
      });
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    } finally { holder.remove(); }
  }

  function applyImg(img) {
    if (!urls) return;
    const name = img.dataset.svgName || (imgRe.exec(img.getAttribute('src') || '') || [])[1];
    if (!name) return;
    img.dataset.svgName = name;
    if (urls[name] && img.getAttribute('src') !== urls[name]) img.src = urls[name];
  }
  const applyAll = root => (root || document).querySelectorAll('img[src*="assets/img/"],img[data-svg-name]').forEach(applyImg);

  function run() {
    if (running || I.isSource()) return;
    running = true;
    const names = Object.keys(O.svgSrc), strs = new Set();
    names.forEach(n => {
      const doc = new DOMParser().parseFromString(O.svgSrc[n], 'image/svg+xml');
      textEls(doc).forEach(el => { const s = txt(el); if (I.wants(s)) strs.add(s); });
    });
    I.load([...strs]).then(() => {
      const fam = (I.font() ? I.font() + ',' : '') + SYS;
      urls = {};
      names.forEach(n => { try { const u = build(n, fam); if (u) urls[n] = u; } catch (e) { console.warn('svg-i18n', n, e); } });
      applyAll();
    });
  }

  addEventListener('opt-i18n', run);                  // i18n.js bắn khi đã biết ngôn ngữ đích
  if (!I.isSource() && document.readyState !== 'loading') run();

  // <img> mới (sách dựng/nhân bản trang) → áp bản đã dịch
  new MutationObserver(ms => {
    if (!urls) return;
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'IMG') applyImg(n); else applyAll(n);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})(window.OPT = window.OPT || {});
