/* Hình minh hoạ SVG (assets/img/*.svg): dịch theo ngôn ngữ đang chọn + dùng CHUNG FONT với chữ của sách.
 *
 * Vì sao nhúng trực tiếp (inline) thay vì để <img>:
 *   SVG nạp bằng <img> là "ảnh chết": (1) i18n.js không thấy chữ bên trong để dịch,
 *   (2) nó không dùng được web font của trang (Be Vietnam Pro, Noto Sans Devanagari/KR/SC…) nên chữ hình
 *       luôn khác kiểu với chữ sách. SVG nhúng trực tiếp thì kế thừa đúng font của trang.
 *
 * Cách làm: lấy mã nguồn SVG gốc từ js/svg-data.js (OPT.svgSrc, sinh bằng tools/build-svg-data.py) →
 * gom chuỗi <text> → OPT_I18N.load() (cùng Google Dịch + cache với cả trang) → thay chữ, co chữ cho vừa khung →
 * thay mọi <img src="assets/img/xxx.svg"> bằng <svg> tương ứng (kể cả <img> sách dựng/nhân bản về sau).
 * Nạp SAU js/i18n.js và js/svg-data.js.
 */
(function (O) {
  'use strict';
  const I = window.OPT_I18N;
  if (!I || !O.svgSrc) return;

  const INLINE_SOURCE = true;       // true: tiếng Việt gốc cũng nhúng trực tiếp để font hình = font sách. false: giữ <img> cho tiếng Việt
  const FONT = "var(--i18n-font,'Be Vietnam Pro'),'Be Vietnam Pro',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const imgRe = /assets\/img\/([\w-]+)\.svg/;
  const COPY = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'borderRadius', 'boxShadow', 'filter', 'opacity'];
  let tpl = null, running = false, built = null;   // built: 'src' (tiếng Việt gốc) | 'tr' (đã dịch)

  const textEls = root => [...root.querySelectorAll('text')];
  const txt = el => (el.textContent || '').trim();

  // Mọi SVG dùng chung id (bg, hl, gl, ac…) và "bg" còn trùng #bg của canvas nền sao → đổi id theo từng hình
  function prep(name) {
    const cls = 'svgi-' + name.replace(/[^\w-]/g, '');
    let s = O.svgSrc[name];
    [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]).forEach(id => {
      s = s.split(`id="${id}"`).join(`id="${cls}-${id}"`).split(`url(#${id})`).join(`url(#${cls}-${id})`);
    });
    const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return null;
    const svg = document.importNode(doc.documentElement, true);
    svg.classList.add(cls); svg.dataset.svgName = name;
    // <style> trong SVG là toàn cục khi nhúng → giới hạn trong hình này
    svg.querySelectorAll('style').forEach(st => {
      st.textContent = st.textContent.replace(/([^{}]+)\{/g, (m, sel) => sel.split(',').map(x => `.${cls} ${x.trim()}`).join(',') + '{');
    });
    svg.removeAttribute('font-family');
    svg.style.fontFamily = FONT;
    return svg;
  }

  function translate(svg, translating) {
    if (!translating) return svg;
    const vb = (svg.getAttribute('viewBox') || '0 0 400 240').split(/[\s,]+/).map(Number);
    svg.setAttribute('width', vb[2]); svg.setAttribute('height', vb[3]);
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none';
    holder.appendChild(svg); document.body.appendChild(holder);
    try {
      const els = textEls(svg).filter(el => I.wants(txt(el)));
      const m0 = els.map(el => ({ w: el.getComputedTextLength(), fs: parseFloat(getComputedStyle(el).fontSize) || 10 }));
      els.forEach((el, i) => {
        const src = txt(el), tr = I.t(src);
        if (tr === src) return;
        el.textContent = tr;
        const w1 = el.getComputedTextLength(); if (!w1) return;
        let k = Math.min(1, Math.max(m0[i].w * 1.12, 12) / w1);          // không rộng hơn bản gốc quá ~12%
        const bb = el.getBBox(), anchor = el.getAttribute('text-anchor') || 'start', pad = 4;
        const room = anchor === 'middle' ? 2 * Math.min(bb.x + bb.width / 2 - pad, vb[2] - pad - (bb.x + bb.width / 2))
          : anchor === 'end' ? bb.x + bb.width - pad : vb[2] - pad - bb.x;   // và không tràn mép hình
        k = Math.max(.5, Math.min(k, room / w1));
        if (k < .995) el.setAttribute('font-size', (m0[i].fs * k).toFixed(2));
      });
    } finally { svg.removeAttribute('width'); svg.removeAttribute('height'); holder.remove(); }
    return svg;
  }

  function inline(img) {
    if (!tpl) return;
    const name = (imgRe.exec(img.getAttribute('src') || '') || [])[1];
    const t = name && tpl[name]; if (!t) return;
    const svg = t.cloneNode(true), cs = getComputedStyle(img), par = img.parentElement;
    img.classList.forEach(c => svg.classList.add(c));
    let w = '100%';                                    // giữ tỉ lệ bề rộng như <img> cũ
    if (par) {
      const pc = getComputedStyle(par), pw = par.clientWidth - parseFloat(pc.paddingLeft) - parseFloat(pc.paddingRight), iw = parseFloat(cs.width);
      if (iw > 0 && pw > 0) w = Math.min(100, iw / pw * 100).toFixed(2) + '%';
    }
    const st = svg.style;
    st.width = w; st.height = 'auto'; st.display = 'block';
    if (cs.maxWidth && cs.maxWidth !== 'none') st.maxWidth = cs.maxWidth;
    COPY.forEach(p => { if (cs[p]) st[p] = cs[p]; });
    svg.setAttribute('role', 'img');
    if (img.alt) svg.setAttribute('aria-label', img.alt);
    img.replaceWith(svg);
  }
  // Đổi SVG đã nhúng (bản tiếng Việt) sang bản dịch khi ngôn ngữ được xác định muộn (vd. tự nhận theo IP)
  function restamp(old) {
    const t = tpl && tpl[old.dataset.svgName];
    if (!t || old.dataset.svgBuilt === built) return;
    const svg = t.cloneNode(true);
    svg.style.cssText = old.style.cssText; svg.style.fontFamily = FONT;
    old.classList.forEach(c => svg.classList.add(c));
    if (old.hasAttribute('aria-label')) svg.setAttribute('aria-label', old.getAttribute('aria-label'));
    svg.setAttribute('role', 'img');
    old.replaceWith(svg);
  }
  const inlineAll = root => {
    const r = root || document;
    r.querySelectorAll('img[src*="assets/img/"]').forEach(inline);
    r.querySelectorAll('svg[data-svg-name]').forEach(restamp);
  };

  function fontReady(strings) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const f = (I.font() || "'Be Vietnam Pro'").split(',')[0].replace(/['"]/g, '').trim();
    const sample = strings.join(' ').slice(0, 800) || 'Aa';
    const to = new Promise(r => setTimeout(r, 2500));
    return Promise.race([Promise.all([
      document.fonts.load(`600 12px '${f}'`, sample), document.fonts.load("600 12px 'Be Vietnam Pro'", sample)]).catch(() => {}), to]);
  }

  function run() {
    const translating = !I.isSource();
    if (running || (translating ? built === 'tr' : built)) return;
    if (!translating && !INLINE_SOURCE) return;
    running = true;
    const names = Object.keys(O.svgSrc), strs = new Set();
    if (translating) names.forEach(n => {
      const doc = new DOMParser().parseFromString(O.svgSrc[n], 'image/svg+xml');
      textEls(doc).forEach(el => { const s = txt(el); if (I.wants(s)) strs.add(s); });
    });
    const list = [...strs];
    (translating ? I.load(list) : Promise.resolve()).then(() => fontReady(list.map(s => I.t(s)))).then(() => {
      tpl = {}; built = translating ? 'tr' : 'src';
      names.forEach(n => { try { const s = prep(n); if (s) { tpl[n] = translate(s, translating); tpl[n].dataset.svgBuilt = built; } } catch (e) { console.warn('svg-i18n', n, e); } });
      inlineAll();
    }).catch(e => console.warn('svg-i18n', e)).then(() => { running = false; setTimeout(run, 0); });   // ngôn ngữ đổi giữa chừng → làm lại
  }

  addEventListener('opt-i18n', run);                  // i18n.js bắn khi đã biết ngôn ngữ đích
  const go = () => { if (!I.isSource() || INLINE_SOURCE) run(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(go, 0)); else go();

  // <img> mới (sách dựng/nhân bản trang) → thay bằng SVG đã dịch
  new MutationObserver(ms => {
    if (!tpl) return;
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'IMG') inline(n); else inlineAll(n);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})(window.OPT = window.OPT || {});
