/* Mô hình: dữ liệu chảy vào (cyan), phí chảy ra (vàng) quanh một flexnode */
(function (O) {
  const { V, C, glow, lines, label } = O.kit;
  O.registerModel('economy', (s, c) => {
    c.position.set(0, 1, 13);
    const g = new THREE.Group(); g.rotation.x = 1; s.add(g);
    const N = 14, P = [...Array(N)].map((_, i) => new V(Math.cos(i / N * 6.283) * 5, Math.sin(i / N * 6.283) * 5, 0));
    g.add(glow(.8, C.AM));
    P.forEach(p => { const m = glow(.25, C.CY); m.position.copy(p); g.add(m); });
    g.add(lines(P.concat(new V()), P.map((_, i) => [i, N]), 0x6f86ff, .22));
    const ps = [...Array(N * 2)].map((_, i) => { const m = glow(.12, i % 2 ? C.AM : C.CY); g.add(m); return { m, i: i >> 1, t: Math.random(), out: i % 2 }; });
    const l1 = label('Flexnode', { size: .9, color: '#ffc857' }); l1.position.set(0, -.9, 1.5); s.add(l1);
    return (t, dt) => {
      g.rotation.z = t * .1;
      ps.forEach(p => { p.t = (p.t + dt * (p.out ? .25 : .5)) % 1; p.m.position.copy(P[p.i]).multiplyScalar(p.out ? p.t : 1 - p.t); });
    };
  });
})(window.OPT);
