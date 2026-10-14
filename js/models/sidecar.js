/* Mô hình: Ethereum client + sidecar mump2p → mạng Optimum */
(function (O) {
  const { C, glow, wire, solid, label, lines, fib, knn, V } = O.kit;
  O.registerModel('sidecar', (s, c) => {
    c.position.set(0, .5, 15);
    const g = new THREE.Group(); s.add(g);
    const box = (x, w, h, col, op) => {
      const geo = new THREE.BoxGeometry(w, h, 2.2), m = solid(geo, col, op), e = wire(geo, col, .95);
      m.position.set(x, 0, 0); e.position.set(x, 0, 0); g.add(m, e);
    };
    box(-6.2, 3, 3.4, C.VI, .14); box(-2.2, 1.9, 1.9, C.CY, .3);
    [['Client', -6.2, '#b28cff'], ['Sidecar', -2.2, '#4de3ff'], ['Optimum', 5.4, '#4de3ff']].forEach(([n, x, col]) => { const l = label(n, { size: 1, color: col }); l.position.set(x, -3.5, 0); s.add(l); });
    const NP = fib(14, 2.3).map(p => p.add(new V(5.4, 0, 0))), E = knn(NP, 3);
    NP.forEach(p => { const m = glow(.2, C.CY); m.position.copy(p); g.add(m); });
    g.add(lines(NP, E, 0x7c8cff, .3));
    const a = new V(-4.7, 0, 0), b = new V(-3.15, 0, 0), ps = [...Array(18)].map((_, i) => {
      const m = glow(.14, i < 6 ? C.VI : C.CY); g.add(m); return { m, k: i < 6 ? 0 : 1, t: Math.random(), j: i % NP.length };
    });
    const slow = glow(.22, C.RD); g.add(slow);
    const l2 = label('Gossipsub vẫn chạy', { size: .8, color: '#ff5d73' }); l2.position.set(-0.5, 3.1, 0); s.add(l2);
    const from = new V(-6.2, 1.9, 0), to = new V(4, 2.4, 0);
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new V().lerpVectors(from, to, u).setY(2 + Math.sin(u * 3.14) * 1.1)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: C.RD, transparent: true, opacity: .3, dashSize: .2, gapSize: .2 })));
    return (t, dt) => {
      g.rotation.y = Math.sin(t * .3) * .35; g.rotation.x = .12;
      ps.forEach(p => {
        p.t += dt * (p.k ? .45 : .7); if (p.t >= 1) { p.t = 0; p.j = Math.random() * NP.length | 0; }
        if (p.k == 0) p.m.position.lerpVectors(a, b, p.t);
        else p.m.position.lerpVectors(new V(-1.2, 0, 0), NP[p.j], p.t);
      });
      const u = (t * .06) % 1; slow.position.copy(pts[Math.floor(u * 30)]);
    };
  });
})(window.OPT);
