/* Mô hình: mạng node (trang giới thiệu) */
(function (O) {
  const { V, C, glow, lines, fib, knn, adjOf } = O.kit;
  O.registerModel('network', (s, c) => {
    c.position.set(0, 0, 12);
    const g = new THREE.Group(); s.add(g);
    const N = 48, P = fib(N, 5), E = knn(P, 3), adj = adjOf(N, E);
    P.forEach((p, i) => { const m = glow(.14, i % 5 ? C.CY : C.VI); m.position.copy(p); g.add(m); });
    g.add(lines(P, E, 0x7c8cff, .3));
    const ps = [...Array(36)].map(() => {
      const m = glow(.2, 0xffffff); g.add(m);
      const a = Math.random() * N | 0;
      return { m, a, b: adj[a][Math.random() * adj[a].length | 0], t: Math.random() };
    });
    let mx = 0, my = 0;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    return (t, dt) => {
      g.rotation.y = t * .12 + mx * .8; g.rotation.x = my * .5;
      ps.forEach(p => {
        p.t += dt * .8;
        if (p.t >= 1) { p.t = 0; const n = adj[p.b].filter(x => x != p.a); p.a = p.b; p.b = n.length ? n[Math.random() * n.length | 0] : adj[p.a][0]; }
        p.m.position.lerpVectors(P[p.a], P[p.b], p.t);
      });
    };
  });
})(window.OPT);
