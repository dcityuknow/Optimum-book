/* Mô hình: lộ trình — hiện tại → tiếp theo → hướng tới */
(function (O) {
  const { C, glow, label, V } = O.kit;
  O.registerModel('roadmap', (s, c) => {
    c.position.set(0, 0, 14);
    const g = new THREE.Group(); s.add(g);
    const curve = new THREE.CatmullRomCurve3([new V(-6.5, -3, 1), new V(-3, -1, -1.5), new V(0, .3, 1.5), new V(3.5, 1.8, -1), new V(6.5, 3.2, 1)]);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), new THREE.LineBasicMaterial({ color: 0x7c8cff, transparent: true, opacity: .55 })));
    const ms = [[.02, C.CY, 'Hiện tại', 'mump2p cho validator ETH'], [.52, C.VI, 'Tiếp theo', 'DeRAM · nhiều chain'], [.98, C.AM, 'Hướng tới', 'Flexnodes · Marketplace']].map(([u, col, n, sub]) => {
      const p = curve.getPoint(u), m = glow(.55, col); m.position.copy(p); g.add(m);
      const r = new THREE.Mesh(new THREE.TorusGeometry(.7, .03, 8, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .8 })); r.position.copy(p); g.add(r);
      const l = label(n, { size: .95, color: '#' + col.toString(16).padStart(6, '0') }); l.position.copy(p).add(new V(0, 1.5, 0)); g.add(l);
      const l2 = label(sub, { size: .62, color: '#c4cdf5', px: 26 }); l2.position.copy(p).add(new V(0, .95, 0)); g.add(l2);
      return { m, r, col };
    });
    const tr = glow(.3, 0xffffff); g.add(tr);
    return (t) => {
      g.rotation.y = Math.sin(t * .25) * .4; g.rotation.x = .12;
      tr.position.copy(curve.getPoint((t * .09) % 1));
      ms.forEach((m, i) => { m.r.rotation.x = t * (1 + i * .2); m.r.rotation.y = t * .7; m.m.scale.setScalar(2.75 * (1 + (i == 0 ? .25 * Math.sin(t * 4) : 0))); });
    };
  });
})(window.OPT);
