/* Mô hình: mã hoá → recode → giải mã (RLNC) */
(function (O) {
  const { C, glow, wire, solid, label } = O.kit;
  const SC = [0xff7ab8, 0x6aa8ff, 0xffd34d, 0x4dffb0];
  O.registerModel('shards', (s, c) => {
    c.position.set(0, .5, 14);
    const g = new THREE.Group(); s.add(g);
    const cube = (x, y, col, op) => {
      const geo = new THREE.BoxGeometry(1, 1, 1), m = solid(geo, col, op), w = wire(geo, col, .95);
      m.position.set(x, y, 0); w.position.set(x, y, 0); g.add(m, w); return m;
    };
    SC.forEach((col, i) => cube(-6.5, (1.5 - i) * 1.4, col, .55));
    const out = SC.map((col, i) => cube(6.5, (1.5 - i) * 1.4, col, .08));
    const oct = new THREE.OctahedronGeometry(1.5), ow = wire(oct, C.VI, .95); g.add(ow);
    const og = glow(1.1, C.VI, .7); g.add(og);
    [['Mã hoá', -6.5, '#ff7ab8'], ['Recode', 0, '#b28cff'], ['Giải mã', 6.5, '#4dffb0']].forEach(([n, x, col]) => {
      const l = label(n, { size: 1, color: col }); l.position.set(x, -3.7, 0); g.add(l);
    });
    const mix = () => { const k = new THREE.Color(0, 0, 0), cf = SC.map(() => Math.random() + .15), sum = cf.reduce((a, b) => a + b); SC.forEach((h, i) => { const q = new THREE.Color(h); k.r += q.r * cf[i] / sum; k.g += q.g * cf[i] / sum; k.b += q.b * cf[i] / sum; }); return k; };
    let ps = [], spawn = 0, rank = 0, cel = 0;
    return (t, dt) => {
      ow.rotation.y = t * .8; ow.rotation.x = t * .5; og.scale.setScalar(5 + Math.sin(t * 4) * .5);
      if (rank < 4 && (spawn += dt) > .85) {
        spawn = 0; const m = glow(.38, 0xffffff); m.material.color.copy(mix()); g.add(m);
        ps.push({ m, ph: 0, t: 0, y: (Math.random() - .5) * 4 });
      }
      if (rank >= 4 && (cel += dt) > 2.2) { rank = 0; cel = 0; out.forEach(o => o.material.opacity = .08); }
      ps = ps.filter(p => {
        p.t += dt / 1.3;
        if (p.ph == 0) {
          p.m.position.set(-5.5 + p.t * 4.3, p.y * (1 - p.t), 0);
          if (p.t >= 1) { p.ph = 1; p.t = 0; p.m.material.color.copy(mix()); }
        } else {
          const ty = (1.5 - rank) * 1.4;
          p.m.position.set(1.2 + p.t * 4.8, ty * p.t, 0);
          if (p.t >= 1) { g.remove(p.m); if (rank < 4) { out[rank].material.opacity = .65; rank++; } return false; }
        }
        return true;
      });
      if (rank >= 4) out.forEach(o => o.material.opacity = .65 + .2 * Math.sin(t * 6));
      g.rotation.y = Math.sin(t * .3) * .25;
    };
  });
})(window.OPT);
