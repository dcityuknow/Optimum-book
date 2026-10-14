/* Mô hình: mesh peer — GRAFT thêm peer, PRUNE bớt peer */
(function (O) {
  const { C, glow, label, V } = O.kit;
  O.registerModel('mesh', (s, c) => {
    c.position.set(0, 0, 13);
    const outer = new THREE.Group(); outer.rotation.x = .9; s.add(outer);
    const g = new THREE.Group(); outer.add(g);
    g.add(glow(.9, C.CY));
    const N = 12, P = [], peers = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, p = new V(Math.cos(a) * 5, Math.sin(a) * 5, 0); P.push(p);
      const m = glow(.22, C.GY); m.position.copy(p); g.add(m);
      const geo = new THREE.BufferGeometry().setFromPoints([new V(), p]);
      const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: C.CY, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(ln);
      const pk = glow(.14, 0xffffff); g.add(pk);
      peers.push({ m, ln, pk, on: i % 2 == 0, o: 0, t: Math.random(), fl: 0, fc: C.CY });
      if (peers[i].on) peers[i].o = .6;
    }
    const lb = label('mesh: 6 peer', { size: 1.1, color: '#4de3ff' }); lb.position.set(0, -4.6, 2.5); s.add(lb);
    const lm = label('', { size: 1.2, color: '#4dffb0' }); lm.position.set(0, 4.6, 2.5); s.add(lm);
    let acc = 0, shown = '';
    return (t, dt) => {
      g.rotation.z = t * .12;
      if ((acc += dt) > 1.5) {
        acc = 0;
        const deg = peers.filter(p => p.on).length;
        const graft = deg <= 4 ? true : deg >= 8 ? false : Math.random() < .5;
        const pool = peers.filter(p => p.on != graft);
        if (pool.length) {
          const p = pool[Math.random() * pool.length | 0]; p.on = graft; p.fl = 1; p.fc = graft ? C.CY : C.RD;
          lm.set(graft ? 'GRAFT +1' : 'PRUNE −1', graft ? '#4de3ff' : '#ff5d73'); lm.userData.t = 1.4;
        }
      }
      if (lm.userData.t > 0) { lm.userData.t -= dt; lm.material.opacity = Math.min(1, lm.userData.t); } else lm.material.opacity = 0;
      const deg = peers.filter(p => p.on).length, txt = 'mesh: ' + deg + ' peer';
      if (txt !== shown) { shown = txt; lb.set(txt); }
      peers.forEach(p => {
        p.o += ((p.on ? .65 : 0) - p.o) * .08; p.ln.material.opacity = p.o;
        p.m.material.color.setHex(p.on ? C.CY : C.GY);
        if (p.fl > 0) { p.fl -= dt * 1.2; p.m.material.color.setHex(p.fc); p.m.scale.setScalar(1.1 * (1 + p.fl * 2.5)); } else p.m.scale.setScalar(1.1);
        p.pk.visible = p.on; p.t = (p.t + dt * .6) % 1; p.pk.position.copy(P[peers.indexOf(p)]).multiplyScalar(p.t);
      });
    };
  });
})(window.OPT);
