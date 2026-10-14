/* Mô hình: Gossipsub (đỏ, chậm) vs Gateway·mump2p (cyan, nhanh) */
(function (O) {
  const { V, C, glow, seg, label, setText } = O.kit;
  O.registerModel('race', (s, c) => {
    c.position.set(0, 1, 15);
    const X = [-7, -3, 1, 5], Cc = new V(-7, 0, 0), rows = [];
    const cl = glow(1.3, C.VI); cl.position.copy(Cc); s.add(cl);
    const lc = label('Client', { size: 1.3, color: '#b28cff' }); lc.position.set(-7, -1.5, 0); s.add(lc);
    const row = (y, fast) => {
      const L = X.map((x, k) => k ? [0, 1, 2].map(i => new V(x, y + (1 - i) * .9, 0)) : [Cc]), nodes = [], ed = [];
      L.forEach((l, k) => k && l.forEach(p => { const m = glow(.4, C.GY); m.position.copy(p); s.add(m); nodes.push({ m, k }); }));
      for (let k = 0; k < 3; k++) L[k].forEach((a, i) => L[k + 1].forEach((b, j) => {
        if (fast && k > 0 && i != j) return;
        ed.push({ a, b, k, d: !fast && k > 0 && i != j });
      }));
      s.add(seg(ed.flatMap(e => [e.a, e.b]), fast ? C.CY : C.RD, fast ? .55 : .35));
      ed.forEach(e => { e.m = glow(.26, e.d ? C.RD : C.CY); s.add(e.m); });
      rows.push({ nodes, ed, hop: fast ? .3 : 2 });
    };
    row(2.6, false); row(-2.6, true);
    const lg = label('Gossipsub', { size: 1.3, color: '#ff5d73' }); lg.position.set(-2, 5.2, 0); s.add(lg);
    const lm = label('Gateway · mump2p', { size: 1.3, color: '#4de3ff' }); lm.position.set(-2, -5.2, 0); s.add(lm);
    const CYC = 7.5;
    return t => {
      const tc = t % CYC;
      rows.forEach(r => {
        r.ed.forEach(e => { const l = (tc - e.k * r.hop) / r.hop; e.m.visible = l >= 0 && l <= 1; if (e.m.visible) e.m.position.lerpVectors(e.a, e.b, l); });
        r.nodes.forEach(n => n.m.material.color.setHex(tc >= n.k * r.hop ? C.CY : C.GY));
      });
      setText('tg', Math.round(Math.min(1000, tc / 6 * 1000)) + ' ms');
      setText('tm', Math.round(Math.min(150, tc / .9 * 150)) + ' ms');
    };
  });
})(window.OPT);
