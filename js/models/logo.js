/* Mô hình: logo Optimum (vòng số 8 chrome) + giọt kim loại bắn ra.
 * - Dùng cho ảnh bìa (poster tĩnh, nhìn thẳng) và hologram khi rê chuột vào bìa.
 * - Chất liệu chrome: MeshStandardMaterial + môi trường studio tự vẽ bằng canvas (không cần tệp ngoài).
 * - Toạ độ giọt/tia lấy từ concept bìa (px) rồi đổi sang đơn vị cảnh bằng hệ số K. */
(function (O) {
  const { glow, C } = O.kit, V = THREE.Vector3, PI = Math.PI;
  const K = 0.0255;                                   // 1px concept = K đơn vị cảnh
  const P = (x, y, z = 0) => new V((x - 258) * K, -(y - 398) * K, z);
  const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

  /** Môi trường studio: nền tối xanh, softbox trắng ở trên/trước, vài vệt cyan–tím cho đúng chất Optimum. */
  function makeEnv() {
    const S = 256, faces = [];
    const face = draw => {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d'); draw(x); faces.push(c);
    };
    const bg = (x, top, bot) => { const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, S, S); };
    const box = (x, X, Y, W, H, col, blur = 26) => { x.save(); x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = col; x.fillRect(X, Y, W, H); x.restore(); };
    // px, nx: hai bên — dải sáng đứng
    face(x => { bg(x, '#656970', '#3a3d45'); box(x, 80, 14, 96, 200, '#ffffff', 40); box(x, 214, 40, 12, 150, '#8fe9ff', 14); });
    face(x => { bg(x, '#62666e', '#383b43'); box(x, 90, 10, 90, 210, '#f4f7ff', 40); box(x, 24, 50, 12, 140, '#b9a0ff', 14); });
    // py: trần — softbox lớn
    face(x => { bg(x, '#70747c', '#80848c'); box(x, 30, 30, 196, 196, '#ffffff', 50); });
    // ny: sàn — tối, ánh cyan mờ
    face(x => { bg(x, '#4a4d55', '#2a2c33'); const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, '#2fb9d855'); g.addColorStop(1, '#0000'); x.fillStyle = g; x.fillRect(0, 0, S, S); });
    // pz: phía sau camera — bề mặt hướng thẳng vào người xem sẽ phản chiếu mặt này
    face(x => { bg(x, '#f6f7f9', '#9a9da5'); box(x, 0, 118, S, 22, '#3a3c44', 40); box(x, 50, 14, 156, 60, '#ffffff', 34); });
    // nz: phía sau logo
    face(x => { bg(x, '#5a5d66', '#26282e'); box(x, 60, 50, 136, 140, '#e9eeff', 44); });
    const t = new THREE.CubeTexture(faces); t.needsUpdate = true; return t;
  }

  /** Đường viền trong/ngoài của logo, đo trực tiếp từ ảnh logo gốc (90 mẫu theo góc, chiều rộng ngoài = 1). */
  const PROF_IN = [0.36858, 0.36904, 0.36776, 0.36488, 0.36009, 0.35245, 0.34108, 0.32623, 0.30926, 0.2915, 0.2728, 0.25158, 0.22648, 0.19849, 0.1713, 0.14941, 0.13524, 0.12784, 0.12404, 0.12093, 0.11766, 0.11502, 0.1139, 0.11408, 0.11463, 0.11522, 0.11688, 0.12151, 0.13063, 0.14451, 0.16229, 0.18269, 0.20452, 0.22681, 0.24864, 0.26926, 0.28831, 0.30571, 0.3214, 0.33498, 0.34589, 0.35396, 0.35967, 0.36383, 0.36691, 0.36861, 0.36822, 0.3653, 0.36007, 0.35304, 0.34448, 0.33416, 0.32181, 0.30757, 0.29192, 0.27506, 0.2565, 0.23543, 0.21184, 0.18728, 0.16462, 0.14661, 0.13443, 0.12725, 0.12304, 0.11993, 0.11716, 0.11511, 0.11452, 0.11568, 0.11814, 0.12117, 0.12461, 0.12956, 0.13824, 0.1528, 0.1738, 0.19941, 0.22607, 0.25035, 0.27067, 0.28766, 0.30299, 0.31766, 0.33131, 0.34285, 0.35164, 0.35801, 0.36278, 0.36637];
  const PROF_OUT = [0.49776, 0.49729, 0.49493, 0.49063, 0.48421, 0.47562, 0.46501, 0.4526, 0.43854, 0.42281, 0.40538, 0.38641, 0.36625, 0.34519, 0.32317, 0.29998, 0.27595, 0.25251, 0.23205, 0.21678, 0.20749, 0.20317, 0.20196, 0.20274, 0.20602, 0.21347, 0.22634, 0.24432, 0.2655, 0.28757, 0.30904, 0.32964, 0.34974, 0.36952, 0.38874, 0.40693, 0.42382, 0.43939, 0.45361, 0.46627, 0.47708, 0.48591, 0.49286, 0.49806, 0.50145, 0.50277, 0.50178, 0.49847, 0.493, 0.48557, 0.47625, 0.46509, 0.45222, 0.43788, 0.42219, 0.40518, 0.38686, 0.36746, 0.34739, 0.3269, 0.30588, 0.28414, 0.26208, 0.24115, 0.22349, 0.21081, 0.20337, 0.19994, 0.19891, 0.19978, 0.20361, 0.21225, 0.2268, 0.24663, 0.26961, 0.29329, 0.31607, 0.3376, 0.3582, 0.37817, 0.39735, 0.41527, 0.43149, 0.44589, 0.45858, 0.46969, 0.47922, 0.48696, 0.49269, 0.49627];
  const prof = (arr, th) => { const n = arr.length, f = ((th / (PI * 2)) % 1 + 1) % 1 * n, i = Math.floor(f), t = f - i; return arr[i % n] * (1 - t) + arr[(i + 1) % n] * t; };

  /** Vòng số 8: mỗi hướng θ có điểm trong/ngoài từ ảnh gốc; tiết diện là siêu-elip nối hai điểm đó. */
  function ringGeometry() {
    const NU = 360, NV = 64, W = 9.0, DEPTH = .78, EXP = 3.2;
    const pos = [], idx = [], cen = [];
    // độ dày (chiều sâu) lấy trung bình trượt để bề mặt mượt, không gồ ở chỗ thắt
    const hws = [...Array(NU)].map((_, i) => { const th = i / NU * PI * 2; return (prof(PROF_OUT, th) - prof(PROF_IN, th)) * W / 2; });
    const dsm = i => { let a = 0; for (let k = -24; k <= 24; k++) a += hws[(i + k + NU) % NU]; return a / 49; };
    for (let i = 0; i < NU; i++) {
      const th = i / NU * PI * 2, ri = prof(PROF_IN, th) * W, ro = prof(PROF_OUT, th) * W;
      const dx = Math.cos(th), dy = Math.sin(th), mid = (ri + ro) / 2, hw = (ro - ri) / 2, dep = dsm(i) * DEPTH;
      for (let j = 0; j < NV; j++) {
        const ph = j / NV * PI * 2, cx = sgnPow(Math.cos(ph), 2 / EXP), cy = sgnPow(Math.sin(ph), 2 / EXP);
        pos.push(dx * (mid + hw * cx), dy * (mid + hw * cx), dep * cy); cen.push(dx * mid, dy * mid, 0);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const i2 = (i + 1) % NU, j2 = (j + 1) % NV, A = i * NV + j, B = i2 * NV + j, Cc = i2 * NV + j2, D = i * NV + j2;
      idx.push(A, B, D, B, Cc, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const n = g.attributes.normal.array; let d = 0;
    for (let q = 0; q < pos.length; q += 3) d += n[q] * (pos[q] - cen[q]) + n[q + 1] * (pos[q + 1] - cen[q + 1]) + n[q + 2] * pos[q + 2];
    if (d < 0) { for (let q = 0; q < idx.length; q += 3) { const t = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
    return g;
  }

  /** Giọt phẳng nhiều thùy (hình hoa) — dùng cho các giọt "quatrefoil" trong concept. */
  function blobGeometry(R, lobes, flat, amp = .34, off = 0) {
    const g = new THREE.SphereGeometry(1, 56, 40), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ph = Math.atan2(y, x), eq = x * x + y * y;
      const r = R * (1 + amp * Math.cos(lobes * ph + off) * eq);
      p.setXYZ(i, x * r, y * r, z * r * flat);
    }
    g.computeVertexNormals(); return g;
  }

  /** Viên "thuốc" thắt giữa (logo thu nhỏ) */
  function pillGeometry(L, Rr) {
    const g = new THREE.SphereGeometry(1, 48, 32), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), pin = 1 - .28 * Math.exp(-Math.pow(x / .28, 2));
      p.setXYZ(i, x * L, y * Rr * pin, z * Rr * pin);
    }
    g.computeVertexNormals(); return g;
  }

  O.registerModel('logo', (s, c) => {
    c.position.set(0, 0, 12);
    const env = makeEnv(), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    // Chất liệu như logo gốc: trắng xám satin, hơi mờ (không phải gương chrome)
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: .03, roughness: .7, envMap: env, envMapIntensity: .15 });
    s.add(new THREE.HemisphereLight(0xffffff, 0x555a66, .82));
    const key = new THREE.DirectionalLight(0xffffff, .45); key.position.set(-1.5, 4, 9); s.add(key);
    const rim = new THREE.DirectionalLight(0xbfe9ff, .25); rim.position.set(5, -3, -4); s.add(rim);
    const g = new THREE.Group(); s.add(g);

    // Quầng sáng rất nhẹ phía sau để hologram có chiều sâu (poster gần như không thấy)
    const halo = glow(1.9, C.CY, .06); halo.position.z = -1.5; g.add(halo);

    const ring = new THREE.Mesh(ringGeometry(), chrome); g.add(ring);

    // --- Giọt trôi quanh logo ---
    const drops = [];
    const add = (mesh, x, y, z, sc = 1) => { mesh.position.copy(P(x, y, z)); mesh.scale.setScalar(sc); g.add(mesh); drops.push({ m: mesh, b: mesh.position.clone(), f: .5 + Math.random() * .6, p: Math.random() * 6.28, r: (Math.random() - .5) * .5 }); return mesh; };
    const sph = (r) => new THREE.Mesh(new THREE.SphereGeometry(r * K, 36, 28), chrome);
    [[100, 250, 17, .3], [383, 208, 8, -.2], [428, 321, 4, 0], [470, 326, 3, 0], [80, 556, 9, .2], [103, 538, 6, 0],
      [168, 578, 17, .6], [80, 608, 23, .4], [452, 501, 12, -.3], [116, 556, 5, .1], [512, 292, 3, 0]].forEach(([x, y, r, z]) => add(sph(r), x, y, z));
    add(new THREE.Mesh(pillGeometry(36 * K, 15 * K), chrome), 185, 250, .2);
    add(new THREE.Mesh(blobGeometry(40 * K, 4, .55, .17, .3), chrome), 432, 243, .1).rotation.set(.35, -.25, .2);
    add(new THREE.Mesh(blobGeometry(46 * K, 4, .55, .17, .8), chrome), 397, 558, .1).rotation.set(-.3, .3, -.15);
    add(new THREE.Mesh(blobGeometry(25 * K, 3, .65, .2, 0), chrome), 340, 242, .2).rotation.set(.3, .2, 0);
    add(new THREE.Mesh(blobGeometry(17 * K, 3, .65, .2, 1), chrome), 58, 472, .1);

    // Hologram: sau ~0.4s mới bắt đầu lắc/xoay nhẹ để ảnh poster (t≈4.8) luôn nhìn thẳng như concept
    return (t, dt) => {
      const k = clamp((t - 5.2) / 1.4, 0, 1), e = k * k * (3 - 2 * k);
      g.rotation.y = Math.sin(t * .72) * .95 * e; g.rotation.x = Math.sin(t * .47) * .3 * e;
      drops.forEach(d => {
        d.m.position.set(d.b.x + Math.sin(t * d.f + d.p) * .06 * e * 4, d.b.y + Math.cos(t * d.f * 1.3 + d.p) * .16 * e, d.b.z + Math.sin(t * d.f * .8 + d.p) * .5 * e);
        d.m.rotation.z += d.r * dt * e;
      });
      halo.material.opacity = .08 + .05 * Math.sin(t * 1.2) * e;
    };
  });
})(window.OPT);
