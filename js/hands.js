/* Hai bàn tay làm từ chấm sáng đỡ dưới đáy MỖI mô hình 3D.
 *
 * Hình dạng bàn tay lấy từ network.js của ApolloSYNC: bề mặt liền khối (signed-distance field) → lấy mẫu → lọc đều
 * (blue-noise) → mỗi chấm có pháp tuyến để tô sáng theo khối, cộng một "sóng sáng" chạy từ cổ tay lên đầu ngón.
 * Ở đây đưa sang three.js: dựng đám mây điểm MỘT lần (dùng chung cho mọi cảnh), mỗi mô hình có 1 THREE.Points riêng,
 * tự co/đặt theo kích thước mô hình + khung nhìn của camera nên không cần sửa từng file js/models/*.js.
 *
 * Cách gắn: nạp file này SAU js/models-core.js (nơi định nghĩa OPT.registerModel) và TRƯỚC các js/models/*.js.
 * Tắt cho một mô hình:  OPT.hands.skip.add('tên-mô-hình')   ·   tắt hẳn:  OPT.hands.enabled = false
 */
(function (O) {
  'use strict';
  const GAP = .0145;                                  // khoảng cách giữa các chấm (đơn vị: bán kính mô hình = 1)
  const HAND = { gap: GAP };
  const POSE={cup:0,wr:[3,2.7],
 fingers:[{x:2.5,y:8.6,L:[4.3,2.6,2.2],r:.95,yaw:.09,a:[.3,.42,.3]},{x:.85,y:8.9,L:[4.8,3,2.3],r:.98,yaw:.015,a:[.28,.42,.3]},
  {x:-.85,y:8.6,L:[4.4,2.8,2.2],r:.92,yaw:-.06,a:[.32,.46,.34]},{x:-2.5,y:7.9,L:[3.5,2.1,2],r:.8,yaw:-.17,a:[.36,.5,.36]}],
 thumb:{o:[2.3,.9,.3],L:[3.6,3,2.5],a:[[.55,.62],[0,.5],[-.75,.3]],r:[1.9,1.6,1.3,1]}};
const HANDS=[
 {T:{base:[[0,0,1],[0,1,0],[-1,0,0]],tx:-1.225,ty:-1.592,tz:-.3,rx:.1,ry:0,rz:-.3,s:.052},mir:1}, // tay TRÁI trên màn hình: nhỏ, xa, lòng bàn tay quay sang phải, ngón cái hướng ra phía người xem
 {T:{base:[[0,1,0],[0,0,1],[1,0,0]],tx:-.266,ty:-1.978,tz:.4,rx:.147,ry:.446,rz:.137,s:.079},mir:0}      // tay phải trên màn hình: lớn, gần, ngửa lên
];
const buildCloud=()=>{
 const mm=(A,B)=>A.map(r=>[0,1,2].map(j=>r[0]*B[0][j]+r[1]*B[1][j]+r[2]*B[2][j])),
  rX=a=>[[1,0,0],[0,Math.cos(a),-Math.sin(a)],[0,Math.sin(a),Math.cos(a)]],rY=a=>[[Math.cos(a),0,Math.sin(a)],[0,1,0],[-Math.sin(a),0,Math.cos(a)]],rZ=a=>[[Math.cos(a),-Math.sin(a),0],[Math.sin(a),Math.cos(a),0],[0,0,1]];
 const makeHand=(P=>{
 const mn=Math.min,mx=Math.max,hyp=Math.hypot,sqrt=Math.sqrt;
 const smin=(a,b,k)=>{const h=mx(k-Math.abs(a-b),0)/k;return mn(a,b)-h*h*k*.25};
 const cone=(x,y,z,a,b,ra,rb)=>{const bx=b[0]-a[0],by=b[1]-a[1],bz=b[2]-a[2],px=x-a[0],py=y-a[1],pz=z-a[2],
  t=mn(1,mx(0,(px*bx+py*by+pz*bz)/(bx*bx+by*by+bz*bz))),dx=px-bx*t,dy=py-by*t,dz=pz-bz*t;return sqrt(dx*dx+dy*dy+dz*dz)-(ra+(rb-ra)*t)};
 const ell=(x,y,z,c,r)=>{const qx=x-c[0],qy=y-c[1],qz=z-c[2],k0=sqrt((qx/r[0])**2+(qy/r[1])**2+(qz/r[2])**2),k1=sqrt((qx/(r[0]*r[0]))**2+(qy/(r[1]*r[1]))**2+(qz/(r[2]*r[2]))**2);return k1<1e-9?-mn(r[0],r[1],r[2]):k0*(k0-1)/k1};
 const box=(x,y,z,c,h,r)=>{const qx=Math.abs(x-c[0])-h[0],qy=Math.abs(y-c[1])-h[1],qz=Math.abs(z-c[2])-h[2];
  return sqrt(mx(qx,0)**2+mx(qy,0)**2+mx(qz,0)**2)+mn(mx(qx,mx(qy,qz)),0)-r};
 const chain=(o,L,dirs,r)=>{const J=[o];let p=o;for(let j=0;j<L.length;j++){const d=dirs[j];p=[p[0]+d[0]*L[j],p[1]+d[1]*L[j],p[2]+d[2]*L[j]];J.push(p)}
  const c=[0,0,0];J.forEach(q=>{c[0]+=q[0]/J.length;c[1]+=q[1]/J.length;c[2]+=q[2]/J.length});
  let br=0;J.forEach(q=>br=mx(br,hyp(q[0]-c[0],q[1]-c[1],q[2]-c[2])));return{J,r,c,br:br+r[0]+.3}};
 const FG=P.fingers.map(f=>{let ang=0;const dirs=f.a.map((a,j)=>{ang+=a;const yw=f.yaw*(j?.5:1);return[Math.sin(yw)*Math.cos(ang),Math.cos(yw)*Math.cos(ang),Math.sin(ang)]});
  const r=f.r;return chain([f.x,f.y,-.1],f.L,dirs,[r,r*.92,r*.84,r*.72])});
 const TH=chain(P.thumb.o,P.thumb.L,P.thumb.a.map(([ya,pi])=>[Math.sin(ya)*Math.cos(pi),Math.cos(ya)*Math.cos(pi),Math.sin(pi)]),P.thumb.r);
 const part=(c,x,y,z)=>{let q=1e9;const J=c.J,r=c.r;for(let j=0;j<J.length-1;j++)q=mn(q,cone(x,y,z,J[j],J[j+1],r[j],r[j+1]));return q};
 const near=(c,x,y,z)=>hyp(x-c.c[0],y-c.c[1],z-c.c[2])-c.br;
 function sdf(x,y,z){
  let d=cone(x,y,z*1.45,[0,-4.6,0],[0,.8,0],P.wr[0],P.wr[1]);
  d=smin(d,box(x,y,z,[0,5.1,-.15],[3.0,3.5,.55],1.15),1.6);
  d=smin(d,ell(x,y,z,[2.2,2.9,.7],[2.6,3.4,1.8]),1.4);   // gò ngón cái
  d=smin(d,ell(x,y,z,[-2.6,4.2,.1],[1.6,3.6,1.3]),1.2);   // gò ngón út
  d=-smin(-d,ell(x,y,z,[.2,5.6,3.6+P.cup],[3.0,4.2,2.5]),.9); // lòng bàn tay hơi lõm
  let fd=1e9;for(const f of FG)if(near(f,x,y,z)<d+1)fd=mn(fd,part(f,x,y,z));
  if(fd<1e8)d=smin(d,fd,.55);
  if(near(TH,x,y,z)<d+1.2)d=smin(d,part(TH,x,y,z),.9);
  return mx(d,-(y+4.3))} // cắt phẳng ở cổ tay
 function nrm(x,y,z){const e=.02,a=sdf(x+e,y,z),b=sdf(x,y+e,z),c=sdf(x,y,z+e),d=sdf(x,y,z);return[a-d,b-d,c-d]}
 // lấy mẫu: lưới thô → chỉ lớp sát bề mặt → điểm ngẫu nhiên chiếu về bề mặt → lọc đều (blue-noise)
 function cloud(rc,seed){
  const cs=.8,cand=[];let zs=seed;const rnd=()=>{zs=(zs*1664525+1013904223)>>>0;return zs/4294967296};
  const per=Math.max(2,Math.round(cs*cs*1.5/(rc*rc*.87)*.6));
  for(let X=-8;X<9;X+=cs)for(let Y=-4.5;Y<23;Y+=cs)for(let Z=-7;Z<9;Z+=cs){
   if(Math.abs(sdf(X+cs/2,Y+cs/2,Z+cs/2))>cs*.87)continue;
   for(let i=0;i<per;i++){let px=X+rnd()*cs,py=Y+rnd()*cs,pz=Z+rnd()*cs,d=sdf(px,py,pz);
    for(let it=0;it<3;it++){const g=nrm(px,py,pz),l=hyp(g[0],g[1],g[2])||1,e=.02;px-=g[0]/l*d;py-=g[1]/l*d;pz-=g[2]/l*d;d=sdf(px,py,pz)}
    if(Math.abs(d)>.05)continue;
    const g=nrm(px,py,pz),l=hyp(g[0],g[1],g[2])||1;cand.push([px,py,pz,g[0]/l,g[1]/l,g[2]/l])}}
  const G=new Map(),keep=[],K=(i,j,k)=>((i+600)*1200+(j+600))*1200+(k+600);
  for(let i=cand.length-1;i>0;i--){const j=rnd()*(i+1)|0;const t=cand[i];cand[i]=cand[j];cand[j]=t}
  for(const p of cand){const i=Math.floor(p[0]/rc),j=Math.floor(p[1]/rc),k=Math.floor(p[2]/rc);let ok=1;
   for(let a=-1;a<2&&ok;a++)for(let b=-1;b<2&&ok;b++)for(let c=-1;c<2&&ok;c++){const l=G.get(K(i+a,j+b,k+c));if(l)for(const o of l)if((o[0]-p[0])**2+(o[1]-p[1])**2+(o[2]-p[2])**2<rc*rc){ok=0;break}}
   if(ok){const key=K(i,j,k);(G.get(key)||G.set(key,[]).get(key)).push(p);keep.push(p)}}
  return keep}
 return{sdf,cloud}})(POSE);
 const A=[],ST=[];
HANDS.forEach((h,hi)=>{const T=h.T,M=mm(mm(mm(rY(T.ry),rX(T.rx)),rZ(T.rz)),T.base),pts=makeHand.cloud(HAND.gap/T.s,7+hi*131),mr=h.mir?-1:1;ST.push(A.length);
  for(const p of pts){const x=p[0]*mr*T.s,y=p[1]*T.s,z=p[2]*T.s,nx=p[3]*mr,ny=p[4],nz=p[5],yl=p[1];
   A.push([M[0][0]*x+M[0][1]*y+M[0][2]*z+T.tx,M[1][0]*x+M[1][1]*y+M[1][2]*z+T.ty,M[2][0]*x+M[2][1]*y+M[2][2]*z+T.tz,
    M[0][0]*nx+M[0][1]*ny+M[0][2]*nz,M[1][0]*nx+M[1][1]*ny+M[1][2]*nz,M[2][0]*nx+M[2][1]*ny+M[2][2]*nz,
    yl<-.6?Math.max(0,1+(yl+.6)/3.6):1, // phần cẳng tay mờ dần về 0 ở mặt cắt
    Math.min(1,Math.max(0,(yl+3)/22))])}}); // 0 ở cổ tay → 1 ở đầu ngón (sóng sáng chạy theo)
 const n=A.length,F=()=>new Float32Array(n),X=F(),Y=F(),Z=F(),NX=F(),NY=F(),NZ=F(),Fd=F(),Hh=F();
 A.forEach((a,i)=>{X[i]=a[0];Y[i]=a[1];Z[i]=a[2];NX[i]=a[3];NY[i]=a[4];NZ[i]=a[5];Fd[i]=a[6];Hh[i]=a[7]});
 
 let sx=0,sy=0,sz=0;for(let i=0;i<n;i++){sx+=X[i];sy+=Y[i];sz+=Z[i]}
 let x0=1e9,x1=-1e9,y0=1e9;for(let i=0;i<n;i++){x0=Math.min(x0,X[i]);x1=Math.max(x1,X[i]);y0=Math.min(y0,Y[i])}
 return{n,h1:ST[1],X,Y,Z,NX,NY,NZ,F:Fd,Hh,cx:sx/n,cy:sy/n,cz:sz/n,minX:x0,maxX:x1,minY:y0}};

  // ---------------------------------------------------------------------------------------------
  // PHẦN TÍCH HỢP three.js
  // ---------------------------------------------------------------------------------------------
  const TILT = .38;                                   // camera của mạng lưới nghiêng ~.55, trừ .155 → tay được nhìn từ trên xuống ~.4 rad
  const LIGHT = [-.35, .75, .55];
  let CLOUD = null;
  const cloud = () => CLOUD || (CLOUD = buildCloud());   // dựng lười: chỉ tốn thời gian khi mô hình đầu tiên xuất hiện

  // chấm tròn mềm (một texture dùng chung)
  let DOT = null;
  const dotTex = () => {
    if (DOT) return DOT;
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, '#fff'); g.addColorStop(.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return (DOT = new THREE.CanvasTexture(c));
  };

  let POS = null;                                      // thuộc tính vị trí dùng chung giữa mọi cảnh (chuyển động tay giống hệt nhau)
  function positions() {
    if (POS) return POS;
    const H = cloud(), n = H.n, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = H.X[i]; pos[i * 3 + 1] = H.Y[i]; pos[i * 3 + 2] = H.Z[i]; }
    POS = new THREE.BufferAttribute(pos, 3); POS.setUsage(THREE.DynamicDrawUsage);
    return POS;
  }

  /** Bao quanh thân mô hình (bỏ qua nhãn chữ; sprite phát sáng chỉ tính tâm). */
  function bounds(scene) {
    const box = new THREE.Box3(), tmp = new THREE.Box3(), v = new THREE.Vector3();
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (o.userData && o.userData.isHands) return;
      if (o.isSprite) {
        if (o.set) return;                                            // nhãn chữ: bỏ qua (nằm đè lên tay, vẽ sau cùng nên vẫn đọc được)
        o.getWorldPosition(v); tmp.setFromCenterAndSize(v, new THREE.Vector3(.4, .4, .4)); box.union(tmp);   // glow: chỉ tính tâm
      } else if (o.geometry && (o.isMesh || o.isLine || o.isLineSegments || o.isPoints)) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp);
      }
    });
    return box.isEmpty() ? new THREE.Box3(new THREE.Vector3(-4, -4, -4), new THREE.Vector3(4, 4, 4)) : box;
  }

  function attach(scene, camera, name) {
    const H = cloud(), n = H.n, box = bounds(scene);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const rho = Math.max(.5 * Math.max(size.x, size.z), 1.5), bottom = box.min.y;

    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', positions());   // màu riêng cho từng cảnh
    const col = new Float32Array(n * 3), colAttr = new THREE.BufferAttribute(col, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('color', colAttr);

    const mat = new THREE.PointsMaterial({ size: .05, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, alphaTest: .01 });
    const pts = new THREE.Points(geo, mat), grp = new THREE.Group();
    grp.add(pts); grp.userData.isHands = true; pts.userData.isHands = true;
    pts.frustumCulled = false; pts.renderOrder = -1; grp.rotation.x = TILT;
    scene.add(grp);

    const mv = new THREE.Matrix4(), dir = new THREE.Vector3(), tmpV = new THREE.Vector3();
    let last = -1, S = 1;

    // đặt tay: co theo mô hình, nhưng không tràn khỏi khung nhìn của camera (tính mỗi khung → theo kịp đổi cỡ/tỉ lệ khung)
    const place = (cam, T) => {
      const asp = cam.aspect || 4 / 3, fov = (cam.fov || 45) * Math.PI / 180;
      cam.getWorldDirection(dir);
      const t = dir.z < -.05 ? (ctr.z - cam.position.z) / dir.z : cam.position.distanceTo(ctr);
      const yc = cam.position.y + dir.y * t, hh = Math.tan(fov / 2) * Math.abs(t), hw = hh * asp;
      const ext = -1.05 - H.minY, halfW = Math.max(-H.minX, H.maxX) + .05,       // tay thò xuống `ext`·S dưới đáy, rộng `halfW`·S mỗi bên
        sRoom = (bottom - (yc - hh * .98)) / ext, sWide = hw * .96 / halfW,
        fit = Math.min(rho * .8, sRoom, sWide);
      S = Math.max(fit, Math.min(rho * .35, sWide));                    // ưu tiên vừa khung; không nhỏ hơn ~.35 bán kính mô hình
      grp.scale.setScalar(S);
      grp.position.set(ctr.x + .1 * S, bottom + 1.05 * S, ctr.z);
      grp.rotation.y = .1 * Math.sin(T * .00017);                       // đung đưa nhẹ như bản gốc
      grp.updateMatrixWorld(true);                                      // onBeforeRender chạy SAU khi renderer đã cập nhật ma trận → tự cập nhật lại
      mat.size = .016 * S;                                              // đường kính chấm theo cỡ tay
    };
    place(camera, performance.now());

    // tô sáng: pháp tuyến → độ sáng, cộng sóng sáng cổ tay → đầu ngón (cộng màu nên tối = trong suốt)
    pts.onBeforeRender = (renderer, sc, cam) => {
      const T = performance.now(); cam = cam || camera;
      place(cam, T);
      if (T - last < 33) return; last = T;
      mv.multiplyMatrices(cam.matrixWorldInverse, grp.matrixWorld);
      const e = mv.elements, wv = ((T / 3200) % 1.6) - .3, bob = .03 * Math.sin(T / 900), br = .025 * Math.sin(T / 1400), P = POS;
      tmpV.set(H.cx, H.cy, H.cz).applyMatrix4(mv); const zc = tmpV.z;
      const lx = LIGHT[0], ly = LIGHT[1], lz = LIGHT[2], ll = Math.hypot(lx, ly, lz);
      for (let i = 0; i < n; i++) {
        const sh = i < H.h1 ? br : -br, px = H.X[i] + sh, py = H.Y[i] + bob, pz = H.Z[i];
        P.array[i * 3] = px; P.array[i * 3 + 1] = py;                   // đung đưa/hít thở như bản gốc
        // pháp tuyến trong hệ camera (chỉ phần xoay của mv; scale đều nên chuẩn hoá)
        let nx = e[0] * H.NX[i] + e[4] * H.NY[i] + e[8] * H.NZ[i], ny = e[1] * H.NX[i] + e[5] * H.NY[i] + e[9] * H.NZ[i], nz = e[2] * H.NX[i] + e[6] * H.NY[i] + e[10] * H.NZ[i];
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const lt = Math.max(0, (nx * lx + ny * ly + nz * lz) / ll),
          zv = e[2] * px + e[6] * py + e[10] * pz + e[14],              // độ sâu trong hệ camera (+ = gần người xem)
          dp = Math.min(1, Math.max(0, ((zv - zc) / S + 1.3) / 2.6)),
          pu = Math.max(0, 1 - Math.abs(H.Hh[i] - wv) * 5),
          vis = nz > -.05 ? 1 : .08, rim = Math.max(0, 1 - Math.abs(nz) / .3) * .3,
          a = Math.min(1, H.F[i] * vis * (.14 + .5 * lt + .22 * dp + rim + .45 * pu));
        col[i * 3] = .72 * a; col[i * 3 + 1] = .93 * a; col[i * 3 + 2] = a;   // trắng pha xanh lơ như ánh hologram của sách
      }
      P.needsUpdate = true; colAttr.needsUpdate = true;
    };
    return grp;
  }

  const api = O.hands = { enabled: true, skip: new Set(), build: () => cloud(), attach };

  // Bọc OPT.registerModel: sau khi mô hình dựng xong cảnh thì thêm tay (không đụng tới hàm tick/api trả về)
  const reg = O.registerModel;
  if (typeof reg !== 'function') { console.warn('hands.js: chưa có OPT.registerModel — nạp file này sau models-core.js'); return; }
  O.registerModel = function (name, factory) {
    return reg.call(this, name, function (s, c) {
      const tick = factory.apply(this, arguments);
      if (api.enabled && !api.skip.has(name)) { try { attach(s, c, name); } catch (e) { console.warn('hands.js', name, e); } }
      return tick;
    });
  };
})(window.OPT = window.OPT || {});
