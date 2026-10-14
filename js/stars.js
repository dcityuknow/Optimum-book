/* Nền sao 3D, xoay theo tiến độ lật sách (OPT.progress) */
(function (O) {
  'use strict';
  O.progress = 0;
  O.initStars = function (canvas) {
    const { tex, AD } = O.kit;
    let r; try { r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    const s = new THREE.Scene(), c = new THREE.PerspectiveCamera(65, 1, .1, 200);
    const pts = (n, sz, col) => {
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i += 3) {
        const R = 30 + Math.random() * 60, u = Math.random() * 2 - 1, th = Math.random() * 6.283, q = Math.sqrt(1 - u * u);
        a[i] = R * q * Math.cos(th); a[i + 1] = R * u; a[i + 2] = R * q * Math.sin(th);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ size: sz, color: col, map: tex, transparent: true, blending: AD, depthWrite: false }));
    };
    const A = pts(900, .35, 0xaec2ff), B = pts(160, .8, 0xffffff); s.add(A, B);
    const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const fit = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; r.setSize(w, h, false); c.aspect = w / h; c.updateProjectionMatrix(); };
    new ResizeObserver(fit).observe(canvas); fit();
    (function loop() {
      requestAnimationFrame(loop);
      const t = performance.now() / 1000 * (rm ? .3 : 1);
      A.rotation.y = B.rotation.y = t * .008 + O.progress * .0004; A.rotation.x = B.rotation.x = O.progress * .0002;
      r.render(s, c);
    })();
  };
})(window.OPT);
