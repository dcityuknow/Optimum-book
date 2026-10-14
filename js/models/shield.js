/* Mô hình: chống pollution attack — shard sai (đỏ) bị chặn bởi kiểm tra hash + chữ ký */
(function (O) {
  const { C, glow, wire, label, V } = O.kit;
  O.registerModel('shield', (s, c) => {
    c.position.set(0, 0, 13);
    const g = new THREE.Group(); s.add(g);
    const ico = wire(new THREE.IcosahedronGeometry(2.4, 1), C.CY, .85), core = glow(1.1, C.CY, .8);
    g.add(ico, core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, .035, 8, 90), new THREE.MeshBasicMaterial({ color: C.AM, transparent: true, opacity: .8 }));
    ring.rotation.x = 1.2; g.add(ring);
    const lb = label('hash + chữ ký', { size: .95, color: '#ffc857' }); lb.position.set(0, -4.9, 0); s.add(lb);
    let ps = [], acc = 0;
    const dir = () => { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, q = Math.sqrt(1 - u * u); return new V(q * Math.cos(a), u, q * Math.sin(a)); };
    return (t, dt) => {
      ico.rotation.y = t * .3; ico.rotation.x = t * .15; ring.rotation.z = t * .6; core.scale.setScalar(5.5 + Math.sin(t * 3) * .4);
      g.rotation.y = Math.sin(t * .2) * .5;
      if ((acc += dt) > .42) {
        acc = 0; const bad = Math.random() < .4, m = glow(bad ? .26 : .18, bad ? C.RD : C.CY); g.add(m);
        ps.push({ m, d: dir().multiplyScalar(8), bad, t: 0, x: 0 });
      }
      ps = ps.filter(p => {
        if (p.x > 0) { p.x += dt * 2.2; p.m.scale.setScalar(p.m.scale.x * 1.06); p.m.material.opacity = Math.max(0, 1 - p.x); if (p.x > 1) { g.remove(p.m); return false; } return true; }
        p.t += dt / 2.2; const k = p.t, stop = p.bad ? .62 : 1;
        p.m.position.copy(p.d).multiplyScalar(1 - k * (p.bad ? .66 : .95));
        if (k >= stop) { if (p.bad) { p.x = .01; return true; } g.remove(p.m); return false; }
        return true;
      });
    };
  });
})(window.OPT);
