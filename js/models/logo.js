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
  O.logoProfile = { IN: PROF_IN, OUT: PROF_OUT };      // xuất cho js/cursor.js dùng lại hình logo

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

  /* ================= GIỌT NƯỚC DẠNG TẤM (heightfield) =================
   * Hình dạng giọt = đường đẳng trị của tổng trường 2D các bi (Wyvill w=(1-q²)³) → bi gần nhau tự dính thành
   * viên thắt / tam giác / 4 thùy. Độ dày: h = T·√(2u−u²) với u = (G−ISO)/(GS−ISO) kẹp ≤ 1
   *  → mép tròn đứng, vùng gộp (G ≥ GS) có MẶT PHẲNG; bi đơn lẻ gần như hình cầu.
   * Mặt trên z = zc + h, mặt dưới z = zc − h; mép được "kéo" đúng lên đường đẳng trị bằng nội suy cạnh lưới. */
  function Liquid(mat) {
    const H = .045, GX = 7.6, GY = 7.0, ISO = .3, GS = .7, TK = .92;   // H: ô lưới; TK: độ dày so với bán kính bi
    const NX = Math.ceil(2 * GX / H) + 1, NY = Math.ceil(2 * GY / H) + 1, NN = NX * NY;
    const G = new Float32Array(NN), RW = new Float32Array(NN), ZW = new Float32Array(NN), GXA = new Float32Array(NN), GYA = new Float32Array(NN);
    const vmap = new Int32Array(NN), seen = new Uint32Array(NN);
    const MAXV = 90000, MAXI = 420000;
    const pos = new Float32Array(MAXV * 3), nor = new Float32Array(MAXV * 3), idx = new Uint32Array(MAXI);
    const geo = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(pos, 3), na = new THREE.BufferAttribute(nor, 3), ia = new THREE.BufferAttribute(idx, 1);
    pa.setUsage(THREE.DynamicDrawUsage); na.setUsage(THREE.DynamicDrawUsage); ia.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pa); geo.setAttribute('normal', na); geo.setIndex(ia); geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    let nv = 0, ni = 0, frame = 0;
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    function vert(i, j) {                                   // tạo cặp đỉnh (trên = id, dưới = id+1) cho nút lưới (i,j)
      const v = i + NX * j; let id = vmap[v]; if (id >= 0) return id;
      if (nv + 2 > MAXV) return -1;
      id = nv; nv += 2; vmap[v] = id;
      const g = G[v]; let px, py, pz, h = 0, nx = 0, ny = 0, nz = 1;
      if (g > ISO) {
        px = -GX + i * H; py = -GY + j * H; pz = ZW[v] / g;
        const T = TK * RW[v] / g, u = (g - ISO) / (GS - ISO);
        if (u < 1) {
          const hh = Math.sqrt(2 * u - u * u), k = T * (1 - u) / Math.max(hh, .02) / (GS - ISO);
          h = T * hh; nx = -k * GXA[v]; ny = -k * GYA[v]; const l = 1 / Math.hypot(nx, ny, 1); nx *= l; ny *= l; nz = l;
        } else h = T;
      } else {                                              // nút ngoài: kéo vào đường đẳng trị theo cạnh tới nút trong tốt nhất
        let bn = -1, bg = ISO, bi = 0, bj = 0;
        for (const L of [N4, N8]) {
          for (const [di, dj] of L) {
            const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NY) continue;
            const gn = G[a + NX * b]; if (gn > bg) { bg = gn; bn = a + NX * b; bi = a; bj = b; }
          }
          if (bn >= 0) break;
        }
        if (bn < 0) { px = -GX + i * H; py = -GY + j * H; pz = 0; }
        else {
          const t = (bg - ISO) / Math.max(bg - g, 1e-6), xn = -GX + bi * H, yn = -GY + bj * H;
          px = xn + (-GX + i * H - xn) * t; py = yn + (-GY + j * H - yn) * t; pz = ZW[bn] / bg;
          nx = -GXA[bn]; ny = -GYA[bn]; const l = Math.hypot(nx, ny);
          if (l > 1e-9) { nx /= l; ny /= l; } else { nx = px - xn; ny = py - yn; const q = Math.hypot(nx, ny) || 1; nx /= q; ny /= q; }
          nz = 0;
        }
      }
      let o = id * 3; pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz + h; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      o += 3; pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz - h; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = -nz;
      return id;
    }

    /** B: mảng [x, y, z, R] — R = bán kính ảnh hưởng (mặt giọt đơn có bán kính 0.575·R). */
    function update(B) {
      frame++; nv = 0; ni = 0;
      G.fill(0); RW.fill(0); ZW.fill(0); GXA.fill(0); GYA.fill(0); vmap.fill(-1);
      const rg = [];
      for (const [x, y, z, R] of B) {
        const R2 = R * R, rr = R * .575;
        const i0 = Math.max(1, Math.floor((x - R + GX) / H)), i1 = Math.min(NX - 2, Math.ceil((x + R + GX) / H));
        const j0 = Math.max(1, Math.floor((y - R + GY) / H)), j1 = Math.min(NY - 2, Math.ceil((y + R + GY) / H));
        for (let j = j0; j <= j1; j++) { const dy = -GY + j * H - y, b = NX * j;
          for (let i = i0; i <= i1; i++) {
            const dx = -GX + i * H - x, q = (dx * dx + dy * dy) / R2;
            if (q < 1) { const w = 1 - q, w3 = w * w * w, d = -6 * w * w / R2, v = b + i;
              G[v] += w3; RW[v] += w3 * rr; ZW[v] += w3 * z; GXA[v] += d * dx; GYA[v] += d * dy; }
          } }
        rg.push([i0 - 1, i1, j0 - 1, j1]);
      }
      for (const [i0, i1, j0, j1] of rg)
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const c = i + NX * j; if (seen[c] === frame) continue; seen[c] = frame;
          if (!(G[c] > ISO || G[c + 1] > ISO || G[c + NX] > ISO || G[c + NX + 1] > ISO)) continue;
          if (ni + 12 > MAXI) continue;
          const a = vert(i, j), b = vert(i + 1, j), cc = vert(i + 1, j + 1), d = vert(i, j + 1);
          if (a < 0 || b < 0 || cc < 0 || d < 0) continue;
          idx[ni++] = a; idx[ni++] = b; idx[ni++] = cc; idx[ni++] = a; idx[ni++] = cc; idx[ni++] = d;          // mặt trên
          idx[ni++] = a + 1; idx[ni++] = cc + 1; idx[ni++] = b + 1; idx[ni++] = a + 1; idx[ni++] = d + 1; idx[ni++] = cc + 1; // mặt dưới
        }
      pa.needsUpdate = na.needsUpdate = ia.needsUpdate = true; geo.setDrawRange(0, ni);
    }
    return { mesh, update, get tris() { return ni / 3; } };
  }

  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const smooth = x => x * x * (3 - 2 * x);

  O.registerModel('logo', (s, c) => {
    c.position.set(0, 0, 12);
    const env = makeEnv(), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    // Vòng logo: trắng xám satin như logo gốc
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: .03, roughness: .7, envMap: env, envMapIntensity: .15 });
    // Giọt nước: bóng hơn vòng một chút
    const liquid = new THREE.MeshStandardMaterial({ color: 0xe6e7ea, metalness: .03, roughness: .5, envMap: env, envMapIntensity: .3 });
    s.add(new THREE.HemisphereLight(0xffffff, 0x555a66, .82));
    const key = new THREE.DirectionalLight(0xffffff, .45); key.position.set(-1.5, 4, 9); s.add(key);
    const rim = new THREE.DirectionalLight(0xbfe9ff, .25); rim.position.set(5, -3, -4); s.add(rim);

    // g: CHỈ chứa vòng logo + quầng sáng → xoay/lắc. Các giọt nằm ngoài g nên không xoay theo logo.
    const g = new THREE.Group(); s.add(g);
    const halo = glow(1.9, C.CY, .06); halo.position.z = -1.5; g.add(halo);
    g.add(new THREE.Mesh(ringGeometry(), chrome));

    const liq = Liquid(liquid); s.add(liq.mesh);

    // --- Các hạt nước (toạ độ px của concept bìa) ---
    // Tất cả chỉ là bi tròn. Viên thắt / giọt tam giác / giọt 4 thùy KHÔNG dựng sẵn: chúng là 2/3/4 bi đứng sát nhau
    // nên metaball tự dính thành đúng hình đó. Lúc đầu (poster) các bi đứng sẵn thành cụm như concept; sau đó tách ra.
    const DR = [];
    const ball = (x, y, z, r) => DR.push({ b: P(x, y, z), r, rp: r * K, ph: DR.length * 1.7 });
    [[100, 250, 17, .3], [383, 208, 8, -.2], [428, 321, 4, 0], [470, 326, 3, 0], [80, 556, 9, .2], [103, 538, 6, 0],
      [168, 578, 17, .6], [80, 608, 23, .4], [452, 501, 12, -.3], [116, 556, 5, .1], [512, 292, 3, 0]]
      .forEach(([x, y, r, z]) => ball(x, y, z, Math.max(r, 9)));
    const FR = [0, 0, .85, 1.0, 1.12];                          // bán kính vòng đặt bi theo số bi (× r): quyết định độ thắt
    const cluster = (cx, cy, z, n, r, off) => { for (let q = 0; q < n; q++) { const a = off + q * 2 * PI / n, d = FR[n] * r; ball(cx + Math.cos(a) * d, cy - Math.sin(a) * d, z, r); } };
    cluster(185, 250, .2, 2, 15, 0);                           // viên thắt giữa
    cluster(340, 242, .2, 3, 14, PI / 2);                      // giọt tam giác
    cluster(58, 472, .1, 3, 10, 1);
    cluster(432, 243, .1, 4, 18, 0);                          // giọt 4 thùy
    cluster(397, 558, .1, 4, 20, 0);

    const T = 7.5, T0 = 5.2, ISOK = K / .575;                   // chu kỳ dính–tách (giây); lúc bắt đầu; px→bán kính ảnh hưởng
    const BX = 6.3, BY = 5.6;                                   // giới hạn vùng đặt giọt
    let pk = -1, plan = [];
    // Mỗi chu kỳ: chia hạt thành nhóm 1/2/3/4. Để hình luôn "sạch":
    //  1) trong nhóm, các bi được cân về CÙNG bán kính (nước chia đều) → không có bi bé bị nuốt/lòi gai;
    //  2) các nhóm được đẩy giãn ra (relaxation) để không nhóm nào dính nhầm sang nhóm khác;
    //  3) nhóm xếp thành hình chuẩn: 2 = viên thắt, 3 = tam giác, 4 = 4 thùy.
    function grouping(k) {
      const n = DR.length, used = Array(n).fill(false), res = Array(n).fill(null), Gs = [];
      const order = [...Array(n).keys()].sort((a, b) => hash(a * 7.3 + k * 13.1) - hash(b * 7.3 + k * 13.1));
      for (const a of order) {
        if (used[a]) continue; used[a] = true;
        const r = hash(a * 1.9 + k * 9.1), want = r < .1 ? 1 : r < .4 ? 2 : r < .72 ? 3 : 4;
        const cand = []; for (let b = 0; b < n; b++) if (!used[b]) { const d = DR[a].b.distanceTo(DR[b].b); if (d < 5) cand.push([b, d * (.5 + hash(a * 17 + b * 3 + k))]); }
        cand.sort((p, q) => p[1] - q[1]);
        const mem = [a, ...cand.slice(0, want - 1).map(q => q[0])]; mem.forEach(m => used[m] = true);
        const m = mem.length; let rm = 0; mem.forEach(i => rm += DR[i].r); rm /= m;
        const C = new V(); mem.forEach(i => C.add(DR[i].b)); C.multiplyScalar(1 / m);
        const rho = m > 1 ? FR[m] * rm * K : 0;
        Gs.push({ mem, m, rm, rho, ext: rho + rm * K, x: C.x, y: C.y, fix: m === 1 });
      }
      for (let it = 0; it < 60; it++) for (let a = 0; a < Gs.length; a++) for (let b = a + 1; b < Gs.length; b++) {
        const A = Gs[a], B = Gs[b]; if (A.fix && B.fix) continue;
        const need = A.ext + B.ext + .75 * (A.rm + B.rm) / 2 * K + .35;
        let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d >= need) continue;
        if (d < 1e-4) { dx = 1; dy = 0; d = 1; } const o = need - d, wa = A.fix ? 0 : 1, wb = B.fix ? 0 : 1, ws = wa + wb;
        A.x -= dx / d * o * wa / ws; A.y -= dy / d * o * wa / ws; B.x += dx / d * o * wb / ws; B.y += dy / d * o * wb / ws;
        [A, B].forEach(g => { if (!g.fix) { g.x = clamp(g.x, -BX, BX); g.y = clamp(g.y, -BY, BY); } });
      }
      Gs.forEach((g, gi) => {
        const m = g.m;
        if (m < 2) { res[g.mem[0]] = { g: gi, solo: true }; return; }
        const a0 = hash(gi * 3.1 + k * 3.3) * 2 * PI, sg = hash(gi * 5 + k) < .5 ? -1 : 1;
        const ang = i => Math.atan2(DR[i].b.y - g.y, DR[i].b.x - g.x);
        const mem = g.mem.slice().sort((p, q) => ang(p) - ang(q));
        const slots = [...Array(m)].map((_, q) => [g.x + Math.cos(a0 + q * 2 * PI / m) * g.rho, g.y + Math.sin(a0 + q * 2 * PI / m) * g.rho]);
        let best = 0, bd = 1e9;
        for (let sh = 0; sh < m; sh++) { let d = 0; mem.forEach((i, q) => { const s = slots[(q + sh) % m]; d += Math.hypot(DR[i].b.x - s[0], DR[i].b.y - s[1]); }); if (d < bd) { bd = d; best = sh; } }
        mem.forEach((i, q) => { const s = slots[(q + best) % m]; res[i] = { g: gi, x: s[0], y: s[1], s: sg, rm: g.rm }; });
      });
      return res;
    }

    const balls = [], PS = [];
    return (t, dt) => {
      const k = clamp((t - T0) / 1.4, 0, 1), e = k * k * (3 - 2 * k);
      // Vòng logo: lắc nhẹ (poster ở t≈4.8 nhìn thẳng)
      g.rotation.y = Math.sin(t * .72) * .95 * e; g.rotation.x = Math.sin(t * .47) * .3 * e;
      halo.material.opacity = .08 + .05 * Math.sin(t * 1.2) * e;

      // Hạt nước: chuyển động riêng, độc lập với logo
      const tt = Math.max(0, t - T0), kk = Math.floor(tt / T), u = tt / T - kk;
      if (kk !== pk) { pk = kk; plan = grouping(kk); }
      const w = e * smooth(clamp(Math.sin(u * PI) * 2.2, 0, 1)); // 0 = tách rời, 1 = đã gộp thành giọt lớn
      DR.forEach((d, i) => {
        const f = .35 + hash(i) * .3;
        let x = d.b.x + Math.sin(t * f + d.ph) * .28 * e, y = d.b.y + Math.cos(t * f * 1.3 + d.ph) * .32 * e, z = d.b.z + Math.sin(t * f * .8 + d.ph) * .3 * e, r = d.r;
        const p = plan[i];
        if (p && !p.solo && w > 0) {                            // bay vào vị trí trong nhóm; nhô ra trước/sau để không xuyên vòng logo
          x += (p.x - x) * w; y += (p.y - y) * w; z += (0 - z) * w * .6 + p.s * 1.9 * w; r += (p.rm - r) * w;
        }
        PS[i] = [x, y, z, r * K * (1 + .05 * w)];
      });
      // Tránh dính nhầm: hạt khác nhóm luôn giữ khoảng cách (tách dần khi bắt đầu chuyển động → cụm ở poster tự rời ra)
      const fac = .75 + .55 * e;
      for (let it = 0; it < 3; it++) for (let i = 0; i < PS.length; i++) for (let j = i + 1; j < PS.length; j++) {
        const gi = plan[i] ? plan[i].g : -1 - i, gj = plan[j] ? plan[j].g : -1 - j; if (gi === gj) continue;
        const A = PS[i], B = PS[j], need = (A[3] + B[3]) * fac; let dx = B[0] - A[0], dy = B[1] - A[1], dd = Math.hypot(dx, dy);
        if (dd >= need) continue; if (dd < 1e-4) { dx = 1; dy = 0; dd = 1; }
        const o = (need - dd) / 2; A[0] -= dx / dd * o; A[1] -= dy / dd * o; B[0] += dx / dd * o; B[1] += dy / dd * o;
      }
      balls.length = 0;
      PS.forEach(p => balls.push([p[0], p[1], p[2], p[3] / .575]));
      liq.update(balls);
    };
  });
})(window.OPT);
