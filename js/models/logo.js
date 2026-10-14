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

  /** Vòng số 8: ống tiết diện siêu-elip quét dọc đường Cassini (hai thùy, thắt ở giữa). */
  function ringGeometry() {
    const NU = 260, NV = 56, a2 = 1.21, ys = 1.12, Wc = 7.7;
    const base = [];
    for (let i = 0; i < NU; i++) {
      const th = i / NU * PI * 2, s2 = Math.sin(2 * th);
      const r = Math.sqrt(Math.cos(2 * th) + Math.sqrt(a2 * a2 - s2 * s2));
      base.push([r * Math.cos(th), r * Math.sin(th) * ys]);
    }
    const xmax = Math.max(...base.map(p => Math.abs(p[0]))), k = Wc / 2 / xmax;
    const pts = base.map(p => [p[0] * k, p[1] * k]);
    const pos = [], idx = [], cen = [];
    for (let i = 0; i < NU; i++) {
      const a = pts[(i + NU - 1) % NU], b = pts[(i + 1) % NU];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty); tx /= l; ty /= l;
      const nx = -ty, ny = tx, xn = pts[i][0] / (Wc / 2);
      const wf = Math.exp(-Math.pow(xn / .3, 2));
      const rho = .66 * (1 - .15 * wf), dep = rho * .9;
      for (let j = 0; j < NV; j++) {
        const ph = j / NV * PI * 2, cx = sgnPow(Math.cos(ph), 2 / 2.4), cy = sgnPow(Math.sin(ph), 2 / 2.4);
        pos.push(pts[i][0] + nx * rho * cx, pts[i][1] + ny * rho * cx, dep * cy); cen.push(pts[i][0], pts[i][1], 0);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const i2 = (i + 1) % NU, j2 = (j + 1) % NV, A = i * NV + j, B = i2 * NV + j, Cc = i2 * NV + j2, D = i * NV + j2;
      idx.push(A, B, D, B, Cc, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // Đảo chiều mặt nếu pháp tuyến đang hướng vào trong
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

  /** Tia lỏng: ống thon dần dọc đường cong, có "hạt" phồng và giọt ở đầu. */
  function tendril(pts, r0, beads, seed, mat, tip = 1) {
    const grp = new THREE.Group(), curve = new THREE.CatmullRomCurve3(pts), NU = 90, NV = 12;
    const fr = curve.computeFrenetFrames(NU, false), pos = [], idx = [];
    const rad = u => r0 * Math.pow(1 - u, .8) * (1 + .95 * Math.pow(Math.max(0, Math.sin(u * beads * PI + seed)), 5)) + r0 * .1;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, c = curve.getPointAt(u), r = rad(u);
      for (let j = 0; j < NV; j++) {
        const a = j / NV * PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r;
        pos.push(c.x + fr.normals[i].x * cs + fr.binormals[i].x * sn, c.y + fr.normals[i].y * cs + fr.binormals[i].y * sn, c.z + fr.normals[i].z * cs + fr.binormals[i].z * sn);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const j2 = (j + 1) % NV, A = i * NV + j, B = (i + 1) * NV + j, Cc = (i + 1) * NV + j2, D = i * NV + j2; idx.push(A, B, D, B, Cc, D);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    grp.add(new THREE.Mesh(g, mat));
    { const r1 = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.05, 20, 14), mat); r1.position.copy(curve.getPointAt(0)); grp.add(r1); }
    if (tip) { const d = new THREE.Mesh(new THREE.SphereGeometry(r0 * (.55 + .35 * tip), 24, 18), mat); d.position.copy(curve.getPointAt(1)); grp.add(d); }
    return grp;
  }

  O.registerModel('logo', (s, c) => {
    c.position.set(0, 0, 12);
    const env = makeEnv(), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .24, envMap: env, envMapIntensity: 1.45, side: THREE.DoubleSide });
    const g = new THREE.Group(); s.add(g);

    // Quầng sáng rất nhẹ phía sau để hologram có chiều sâu (poster gần như không thấy)
    const halo = glow(1.9, C.CY, .1); halo.position.z = -1.5; g.add(halo);

    const ring = new THREE.Mesh(ringGeometry(), chrome); g.add(ring);

    // --- Tia lỏng (nhóm phải-trên, nhóm trái-dưới) ---
    [
      [[P(296, 334, .1), P(338, 304, .2), P(386, 289), P(440, 283, -.1), P(506, 266, 0)], 10, 4, .3, 1],
      [[P(300, 342, 0), P(358, 322, .2), P(428, 308), P(480, 299, .1)], 5.5, 3, .9, .8],
      [[P(292, 330, .2), P(326, 292, .3), P(352, 268), P(372, 262, .2)], 6, 2, 0, 1],
      [[P(318, 322), P(346, 306), P(372, 303)], 3.4, 1, .5, .6],
      [[P(228, 479, .1), P(186, 495, .2), P(134, 501), P(84, 497, -.1), P(36, 489, 0)], 9, 4, .6, 1],
      [[P(226, 484), P(192, 507, .2), P(160, 534), P(126, 556, .1)], 6, 3, 0, 1],
      [[P(206, 482, .1), P(207, 512), P(197, 540), P(192, 562, .1)], 5.5, 2, .4, .9],
      [[P(150, 490), P(112, 482), P(80, 470, .1), P(66, 467)], 3.4, 2, .2, .8]
    ].forEach(([pts, r, b, sd, tp]) => g.add(tendril(pts, r * K, b, sd, chrome, tp)));

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
