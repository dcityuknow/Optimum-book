/* Khởi động: nền sao → poster mô hình 3D cho các slot → engine sách → nút điều khiển */
(function (O) {
  'use strict';
  const { $ } = O.kit;
  O.initStars($('bg'));

  // Poster tĩnh cho mọi slot 3D (tạo lần lượt để không giật khi mở trang).
  // Vẽ lại sau khi bản dịch nhãn 3D về (sự kiện 'opt-i18n' do i18n.js bắn) để poster đúng ngôn ngữ.
  const idle = window.requestIdleCallback || (f => setTimeout(f, 30));
  const posters = {};                                   // "mô hình|tỉ lệ" → dataURL gần nhất
  const keyOf = s => s.dataset.model + '|' + (s.dataset.ar || '');
  const paint = (s, url) => {
    const img = s.querySelector('img');
    if (url && img) { img.src = url; s.classList.add('ready'); }
  };
  let gen = 0;
  function renderPosters() {
    const my = ++gen, q = [...document.querySelectorAll('.m3d')], fresh = {};
    (function next() {
      if (my !== gen) return;                           // đã có đợt vẽ mới hơn → bỏ đợt này
      const s = q.shift(); if (!s) return;
      const k = keyOf(s), ar = parseFloat(s.dataset.ar) || 4 / 3;
      if (!(k in fresh)) fresh[k] = posters[k] = O.Models.poster(s.dataset.model, ar);
      paint(s, fresh[k]);
      idle(next, { timeout: 120 });
    })();
  }
  renderPosters();

  let pt;
  addEventListener('opt-i18n', () => { clearTimeout(pt); pt = setTimeout(renderPosters, 500); });

  // Trang được sách dựng/nhân bản về sau: gắn ngay poster đã có
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    (n.matches && n.matches('.m3d') ? [n] : [...n.querySelectorAll('.m3d')])
      .forEach(s => { const u = posters[keyOf(s)]; if (u) paint(s, u); });
  }))).observe(document.body, { childList: true, subtree: true });

  // Nút điều khiển trong trang
  const rl = () => O.Models.get('rlnc').api;
  $('bs').onclick = () => rl().send(false);
  $('bd').onclick = () => rl().send(true);

  // Thanh băng thông (trang "mump2p chạy song song")
  const dots = (on, cl) => [...Array(20)].map((_, i) => `<i class="${i < on ? cl : 'off'}"></i>`).join('');
  $('b1').innerHTML = dots(20, 'r'); $('b2').innerHTML = dots(2, 'c');
})(window.OPT);
