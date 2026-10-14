/* Optimum Book — registry mô hình 3D.
 * Mỗi mô hình: OPT.registerModel(name, (scene, camera) => tick(t, dt)).
 * - Scene được dựng lười (lazy) và dùng chung giữa "poster" (ảnh tĩnh trên trang) và hologram.
 * - inst.t giữ thời gian riêng, để hologram tiếp nối đúng khoảnh khắc của poster. */
(function (O) {
  'use strict';
  const reg = {}, inst = {};
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let posterR = null, posterOK = true;

  O.registerModel = (name, build) => { reg[name] = build; };
  O.has = n => !!reg[n];

  function get(name) {
    if (inst[name]) return inst[name];
    const build = reg[name]; if (!build) return null;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, .1, 200);
    camera.position.set(0, 0, 12);
    const tick = build(scene, camera);
    const m = inst[name] = { name, scene, camera, tick, bz: camera.position.z, t: 2.5, api: tick.api || {} };
    m.step = dt => { dt = Math.min(.05, dt) * (rm ? .3 : 1); m.t += dt; m.tick(m.t, dt); };
    return m;
  }

  /** Đặt camera sao cho cảnh vừa khung có tỉ lệ `a`; `mag` = hệ số phóng vùng đệm quanh khung. */
  function frame(m, a, mag = 1) {
    m.cz = m.bz * Math.max(1, 1.15 / a) * mag;
    m.camera.aspect = a; m.camera.position.z = m.cz; m.camera.updateProjectionMatrix();
  }

  /** Ảnh tĩnh (PNG trong suốt) của mô hình, sau khi "chạy nóng" vài giây. */
  function poster(name, ar = 4 / 3, W = 640) {
    const m = get(name); if (!m || !posterOK) return null;
    try {
      if (!posterR) {
        const cv = document.createElement('canvas');
        posterR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
        posterR.setPixelRatio(1);
      }
      const H = Math.round(W / ar);
      posterR.setSize(W, H, false); posterR.setClearColor(0, 0);
      if (!m.warm) { for (let i = 0; i < 70; i++) m.tick(m.t += 1 / 30, 1 / 30); m.warm = true; }
      m.scene.rotation.set(0, 0, 0); m.camera.clearViewOffset(); frame(m, ar);
      posterR.render(m.scene, m.camera);
      return posterR.domElement.toDataURL('image/png');
    } catch (e) { posterOK = false; console.warn('Poster 3D không khả dụng', e); return null; }
  }

  O.Models = { get, frame, poster };
})(window.OPT);
