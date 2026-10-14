/* Mô hình: RLNC — gửi phương trình, không gửi mảnh. Có API: send(drop) */
(function (O) {
  const { C, glow, setText } = O.kit;
  const SC = [0xff7ab8, 0x6aa8ff, 0xffd34d, 0x4dffb0], NM = 'ABCD';
  const EQ0 = 'Đang tự chạy. Thử gửi hoặc làm mất gói.';
  O.registerModel('rlnc', (s, c) => {
    c.position.set(0, 1, 13);
    const dst = [];
    SC.forEach((col, i) => {
      const y = (1.5 - i) * 1.6, a = glow(.5, col); a.position.set(-6, y, 0); s.add(a);
      const d = glow(.5, col, .15); d.position.set(6, y, 0); s.add(d); dst.push(d);
    });
    for (let i = 0; i < 16; i++) {
      const m = glow(.12, C.GY, .5); m.position.set((Math.random() - .5) * 8, (Math.random() - .5) * 5, (Math.random() - .5) * 3); s.add(m);
    }
    let rank = 0, pk = [], idle = 0, cel = 0;
    const upd = () => setText('rank', rank + ' / 4');
    const send = drop => {
      idle = 0; if (rank >= 4 || pk.length > 4) return;
      const cf = SC.map(() => Math.random() * 9 + 1 | 0), sum = cf.reduce((a, b) => a + b), col = new THREE.Color(0, 0, 0);
      SC.forEach((h, i) => { const k = new THREE.Color(h); col.r += k.r * cf[i] / sum; col.g += k.g * cf[i] / sum; col.b += k.b * cf[i] / sum; });
      const m = glow(.5, 0xffffff); m.material.color.copy(col); s.add(m);
      pk.push({ m, t: 0, drop, amp: (Math.random() - .5) * 4 });
      setText('eq', 'Packet = ' + cf.map((x, i) => x + '·' + NM[i]).join(' + '));
    };
    const tick = (t, dt) => {
      idle += dt; if (rank < 4 && idle > 1.3) send(Math.random() < .3);
      if (rank >= 4 && (cel += dt) > 2.6) { rank = 0; cel = 0; upd(); setText('eq', EQ0); }
      pk = pk.filter(p => {
        p.t += dt / 1.6; p.m.position.set(-4 + p.t * 8, Math.sin(p.t * Math.PI) * p.amp, 0);
        if (p.drop && p.t > .5) {
          p.m.material.color.setHex(C.RD); p.m.scale.setScalar(Math.max(.01, 2.5 * (1 - (p.t - .5) * 5)));
          if (p.t > .7) { s.remove(p.m); setText('eq', 'Mất gói: không sao, chỉ cần thêm một packet bất kỳ.'); return false; }
        }
        if (p.t >= 1) { s.remove(p.m); if (rank < 4) { rank++; upd(); if (rank >= 4) setText('eq', 'Đủ 4 packet độc lập: tái tạo dữ liệu gốc.'); } return false; }
        return true;
      });
      dst.forEach((d, i) => {
        const tg = rank >= 4 ? 1 : .15 + (i < rank ? .7 : 0);
        d.material.opacity += (tg - d.material.opacity) * .1; d.scale.setScalar(2.5 * (rank >= 4 ? 1 + .15 * Math.sin(t * 5) : 1));
      });
    };
    tick.api = { send };
    return tick;
  });
})(window.OPT);
