/* Mô hình: cột 3D so sánh Gossipsub và mump2p (số liệu Optimum công bố, minh hoạ) */
(function (O) {
  const { C, wire, solid, label, ease, clamp } = O.kit;
  O.registerModel('bars', (s, c) => {
    c.position.set(0, 1, 15);
    const outer = new THREE.Group(); outer.rotation.x = .3; s.add(outer);
    const g = new THREE.Group(); outer.add(g);
    const base = new THREE.GridHelper(16, 16, 0x7c8cff, 0x7c8cff); base.material.transparent = true; base.material.opacity = .2; base.position.y = -3; g.add(base);
    const H = 5.4, bars = [], grp = [
      { x: -4.8, name: 'Độ trễ', items: [['Gossipsub', 1, C.RD, '~1000 ms'], ['mump2p', .15, C.CY, '~150 ms']] },
      { x: 4.8, name: 'Băng thông', items: [['Gossipsub', 1, C.RD, '100%'], ['mump2p', .1, C.CY, '−90–95%']] }];
    grp.forEach(G => {
      const t = label(G.name, { size: 1.05, color: '#ffc857' }); t.position.set(G.x, H + .3, 0); g.add(t);
      G.items.forEach(([n, v, col, val], i) => {
        const geo = new THREE.BoxGeometry(2.3, 1, 2.3), m = solid(geo, col, .5), w = wire(geo, col, 1), x = G.x + (i ? 1.45 : -1.45);
        const gp = new THREE.Group(); gp.position.set(x, -3, 0); gp.add(m, w); g.add(gp);
        const l = label(n, { size: .8, color: '#eaf0ff' }); l.position.set(x, -4.1, 1.8); g.add(l);
        const vl = label(val, { size: .85, color: '#' + col.toString(16).padStart(6, '0') }); g.add(vl);
        bars.push({ gp, m, w, v, vl, x, i });
      });
    });
    return (t) => {
      g.rotation.y = Math.sin(t * .3) * .45;
      const k = ease(clamp(((t - 1) % 9) / 2.2, 0, 1));
      bars.forEach(b => {
        const h = Math.max(.05, H * b.v * (b.i ? k : 1)); // cột Gossipsub dựng sẵn, cột mump2p mọc lên
        const hh = b.i ? Math.max(.05, H * b.v * k) : H * b.v * clamp(k * 1.6, 0, 1) || .05;
        b.gp.scale.y = hh; b.gp.position.y = -3 + hh / 2; b.vl.position.set(b.x, -3 + hh + .8, 0);
      });
    };
  });
})(window.OPT);
