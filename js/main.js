/* Khởi động: nền sao → poster mô hình 3D cho các slot → engine sách → nút điều khiển */
(function (O) {
  'use strict';
  const { $ } = O.kit;
  O.initStars($('bg'));

  // Poster tĩnh cho mọi slot 3D (tạo lần lượt để không giật khi mở trang)
  const slots = [...document.querySelectorAll('.m3d')];
  const q = slots.slice(); let n = 0;
  (function next() {
    const s = q.shift(); if (!s) return;
    const img = s.querySelector('img'), ar = parseFloat(s.dataset.ar) || 4 / 3;
    const url = O.Models.poster(s.dataset.model, ar);
    if (url && img) { img.src = url; s.classList.add('ready'); }
    (window.requestIdleCallback || (f => setTimeout(f, 30)))(next, { timeout: 120 }); n++;
  })();

  // Nút điều khiển trong trang
  const rl = () => O.Models.get('rlnc').api;
  $('bs').onclick = () => rl().send(false);
  $('bd').onclick = () => rl().send(true);

  // Thanh băng thông (trang "mump2p chạy song song")
  const dots = (on, cl) => [...Array(20)].map((_, i) => `<i class="${i < on ? cl : 'off'}"></i>`).join('');
  $('b1').innerHTML = dots(20, 'r'); $('b2').innerHTML = dots(2, 'c');
})(window.OPT);
