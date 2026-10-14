/* Mô hình: gossip flooding — gói trùng lặp (đỏ) */
(function (O) {
  const { C, glow, lines, fib, knn, adjOf, setText } = O.kit;
  O.registerModel('flood', (s, c) => {
    c.position.set(0, 1, 11);
    const g = new THREE.Group(); s.add(g);
    const P = fib(16, 3.8), E = knn(P, 4), adj = adjOf(16, E);
    const nodes = P.map((p, i) => { const m = glow(i ? .2 : .45, i ? C.GY : C.CY); m.position.copy(p); g.add(m); return m; });
    g.add(lines(P, E, 0x7c8cff, .25));
    let cl, ps = [], dup, tot, rest;
    const send = (i, from) => adj[i].forEach(j => {
      if (j == from) return;
      const d = cl[j]; cl[j] = true;
      const m = glow(.13, d ? C.RD : C.CY); g.add(m);
      ps.push({ m, a: i, b: j, t: 0, d }); tot++; if (d) dup++;
    });
    const reset = () => {
      cl = P.map(() => false); cl[0] = true; ps = []; dup = 0; tot = 0; rest = 0;
      nodes.forEach((m, i) => m.material.color.setHex(i ? C.GY : C.CY)); send(0, -1);
    };
    reset();
    return (t, dt) => {
      g.rotation.y = t * .15;
      ps = ps.filter(p => {
        p.t += dt / 1.1;
        if (p.t < 1) { p.m.position.lerpVectors(P[p.a], P[p.b], p.t); return true; }
        g.remove(p.m);
        if (!p.d) { nodes[p.b].material.color.setHex(C.CY); send(p.b, p.a); }
        return false;
      });
      setText('dup', dup + ' / ' + tot);
      if (!ps.length && (rest += dt) > 2.5) reset();
    };
  });
})(window.OPT);
