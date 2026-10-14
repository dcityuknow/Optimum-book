/* Mô hình: các tầng blockchain — Optimum là lớp dữ liệu bên dưới, không đổi consensus */
(function (O) {
  const { C, glow, wire, solid, label, seg, V } = O.kit;
  O.registerModel('layers', (s, c) => {
    c.position.set(0, 0, 14);
    const outer = new THREE.Group(); outer.rotation.x = .55; s.add(outer);
    const g = new THREE.Group(); outer.add(g);
    const defs = [[3.2, C.VI, 'Execution', .08], [.4, C.VI, 'Consensus (không đổi)', .08], [-2.6, C.CY, 'Optimum · lớp dữ liệu', .2]];
    defs.forEach(([y, col, name, op]) => {
      const geo = new THREE.BoxGeometry(9, .12, 6);
      const m = solid(geo, col, op); m.position.y = y; g.add(m);
      const w = wire(geo, col, .9); w.position.y = y; g.add(w);
      const grid = new THREE.GridHelper(9, 9, col, col); grid.material.transparent = true; grid.material.opacity = col === C.CY ? .45 : .18; grid.material.blending = THREE.AdditiveBlending; grid.position.y = y + .08; g.add(grid);
      const l = label(name, { size: .95, color: '#' + col.toString(16).padStart(6, '0') }); l.position.set(0, y + .9, 3.4); g.add(l);
    });
    const ps = [...Array(26)].map(() => {
      const m = glow(.16, C.CY); g.add(m);
      return { m, x: (Math.random() - .5) * 8, z: (Math.random() - .5) * 5, t: Math.random() };
    });
    const pts = []; [-3.5, 0, 3.5].forEach(x => [-2.2, 2.2].forEach(z => pts.push(new V(x, -2.6, z), new V(x, 3.2, z))));
    g.add(seg(pts, 0x7c8cff, .16));
    return (t, dt) => {
      g.rotation.y = Math.sin(t * .25) * .7;
      ps.forEach(p => { p.t = (p.t + dt * .28) % 1; p.m.position.set(p.x, -2.6 + p.t * 5.8, p.z); p.m.material.opacity = Math.sin(p.t * Math.PI); });
    };
  });
})(window.OPT);
