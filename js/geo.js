// 幾何輔助函式、程序化貼圖與材質庫。
// 所有函式在執行期才取用全域 THREE（由 index.html 的 module 設定）。
(function () {
  const G = {};
  let T;
  G.init = () => { T = window.THREE; };

  G.V = (x, y, z) => new T.Vector3(x, y, z);
  const sp = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

  // 超橢圓截面環。plane: 'zy'（沿 x 排列的截面）、'xy'（沿 z）、'xz'（沿 y）
  G.sring = (cx, cy, cz, a, b, n, e, plane, phase) => {
    const out = [];
    const p = 2 / (e || 2);
    for (let j = 0; j < n; j++) {
      const t = (j / n) * Math.PI * 2 + (phase || 0);
      const u = a * sp(Math.cos(t), p), v = b * sp(Math.sin(t), p);
      if (plane === 'xy') out.push(new T.Vector3(cx + u, cy + v, cz));
      else if (plane === 'xz') out.push(new T.Vector3(cx + u, cy, cz + v));
      else out.push(new T.Vector3(cx, cy + v, cz + u));
    }
    return out;
  };

  // 由多個截面環蒙皮成網格。rings: Vector3[][]（每環點數相同）
  // o.closed：環本身是否封閉（預設 true）；o.loop：最後一環接回第一環
  // o.capStart / o.capEnd：封端；o.groups(i,j)：回傳材質群組編號
  G.skin = (ringsIn, o = {}) => {
    const closed = o.closed !== false;
    const rings = o.loop ? ringsIn.concat([ringsIn[0]]) : ringsIn;
    const R = rings.length, N = rings[0].length;
    const cols = closed ? N + 1 : N;
    const pos = [], uv = [];
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < cols; j++) {
        const p = rings[i][j % N];
        pos.push(p.x, p.y, p.z);
        uv.push(j / (cols - 1), R > 1 ? i / (R - 1) : 0);
      }
    }
    // 判斷側面繞序（以各環中心投票，讓法線朝外）
    let flip = !!o.flip;
    if (closed && o.solid !== false && !o.flip) {
      const cents = rings.map((r) => { const c = new T.Vector3(); r.forEach((q) => c.add(q)); return c.multiplyScalar(1 / r.length); });
      const e1 = new T.Vector3(), e2 = new T.Vector3(), n = new T.Vector3(), w = new T.Vector3(), w2 = new T.Vector3();
      let vote = 0;
      for (let i = 0; i < R - 1; i++) {
        for (let j = 0; j < N; j++) {
          const a = rings[i][j], b = rings[i][(j + 1) % N], c = rings[i + 1][j];
          e1.subVectors(c, a); e2.subVectors(b, a); n.crossVectors(e1, e2);
          w.subVectors(a, cents[i]).add(w2.subVectors(c, cents[i + 1]));
          vote += Math.sign(n.dot(w));
        }
      }
      flip = vote < 0;
    }
    const groups = {};
    const push = (g, a, b, c) => { (groups[g] = groups[g] || []).push(a, b, c); };
    for (let i = 0; i < R - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
        const g = o.groups ? o.groups(i, j) : 0;
        if (flip) { push(g, a, b, c); push(g, b, d, c); } else { push(g, a, c, b); push(g, b, c, d); }
      }
    }
    const cap = (ri, other, g) => {
      const ring = rings[ri];
      const cen = new T.Vector3(); ring.forEach((q) => cen.add(q)); cen.multiplyScalar(1 / N);
      const oc = new T.Vector3(); rings[other].forEach((q) => oc.add(q)); oc.multiplyScalar(1 / N);
      const outward = cen.clone().sub(oc);
      const base = pos.length / 3;
      pos.push(cen.x, cen.y, cen.z); uv.push(0.5, 0.5);
      for (let j = 0; j < N; j++) {
        const q = ring[j];
        pos.push(q.x, q.y, q.z);
        uv.push(0.5 + 0.5 * Math.cos((j / N) * Math.PI * 2), 0.5 + 0.5 * Math.sin((j / N) * Math.PI * 2));
      }
      // 用第一個三角形決定繞序
      const n = new T.Vector3().crossVectors(ring[0].clone().sub(cen), ring[1 % N].clone().sub(cen));
      const f = n.dot(outward) < 0;
      for (let j = 0; j < N; j++) {
        const a = base + 1 + j, b = base + 1 + ((j + 1) % N);
        if (f) push(g, base, b, a); else push(g, base, a, b);
      }
    };
    if (o.capStart) cap(0, 1, o.capGroup || 0);
    if (o.capEnd) cap(R - 1, R - 2, o.capGroup || 0);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const index = [];
    for (const k of keys) {
      if (o.groups) geo.addGroup(index.length, groups[k].length, k);
      for (const v of groups[k]) index.push(v);
    }
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  };

  // 兩圓外公切線構成的膠囊形 2D Shape
  G.capsuleShape = (x1, y1, r1, x2, y2, r2) => {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    const th = Math.atan2(dy, dx);
    const phi = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    const s = new T.Shape();
    s.moveTo(x1 + r1 * Math.cos(th + phi), y1 + r1 * Math.sin(th + phi));
    s.absarc(x1, y1, r1, th + phi, th - phi + Math.PI * 2, false);
    s.lineTo(x2 + r2 * Math.cos(th - phi), y2 + r2 * Math.sin(th - phi));
    s.absarc(x2, y2, r2, th - phi, th + phi, false);
    s.closePath();
    return s;
  };
  G.capsulePath = (x1, y1, r1, x2, y2, r2) => {
    const s = G.capsuleShape(x1, y1, r1, x2, y2, r2);
    const p = new T.Path();
    const pts = s.getPoints(24);
    p.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
    return p;
  };

  // 皮帶／鏈條路徑：兩圓外切的封閉迴圈（xy 平面，z 固定）
  G.beltPath = (c1, r1, c2, r2, z, step) => {
    step = step || 0.006;
    const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy);
    const th = Math.atan2(dy, dx);
    const phi = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    const pts = [];
    const arc = (c, r, a0, a1) => {
      const n = Math.max(6, Math.ceil((Math.abs(a1 - a0) * r) / step));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        pts.push(new T.Vector3(c.x + r * Math.cos(a), c.y + r * Math.sin(a), z));
      }
    };
    const line = (p, q) => {
      const n = Math.max(2, Math.ceil(p.distanceTo(q) / step));
      for (let i = 0; i < n; i++) pts.push(p.clone().lerp(q, i / n));
    };
    const P = (c, r, a) => new T.Vector3(c.x + r * Math.cos(a), c.y + r * Math.sin(a), z);
    arc(c1, r1, th + phi, th - phi + Math.PI * 2);
    line(P(c1, r1, th - phi), P(c2, r2, th - phi));
    arc(c2, r2, th - phi, th + phi);
    line(P(c2, r2, th + phi), P(c1, r1, th + phi));
    return pts;
  };
  // 沿封閉平面路徑掃出矩形截面帶（皮帶、鏈條），planeN 為平面法線
  G.band = (path, width, thick, planeN) => {
    const N = planeN || new T.Vector3(0, 0, 1);
    const n = path.length;
    const rings = [];
    const t = new T.Vector3(), r = new T.Vector3();
    for (let i = 0; i < n; i++) {
      const p0 = path[(i - 1 + n) % n], p1 = path[(i + 1) % n];
      t.subVectors(p1, p0).normalize();
      r.crossVectors(t, N).normalize(); // 平面內垂直方向
      const p = path[i];
      const hw = width / 2, ht = thick / 2;
      rings.push([
        p.clone().addScaledVector(r, ht).addScaledVector(N, hw),
        p.clone().addScaledVector(r, ht).addScaledVector(N, -hw),
        p.clone().addScaledVector(r, -ht).addScaledVector(N, -hw),
        p.clone().addScaledVector(r, -ht).addScaledVector(N, hw),
      ]);
    }
    return G.skin(rings, { loop: true, solid: false });
  };

  G.extrude = (shape, depth, o = {}) => {
    const bev = o.bevel || 0;
    const geo = new T.ExtrudeGeometry(shape, {
      depth: Math.max(0.0001, depth - bev * 2),
      bevelEnabled: bev > 0,
      bevelThickness: bev,
      bevelSize: o.bevelSize != null ? o.bevelSize : bev,
      bevelSegments: o.bevelSegments || 2,
      curveSegments: o.curveSegments || 24,
      steps: 1,
    });
    geo.translate(0, 0, bev); // 讓整體落在 z ∈ [0, depth]
    return geo;
  };

  // 以 z 為軸的旋轉體，profile: [[半徑, z], ...]
  G.latheZ = (profile, segs) => {
    const pts = profile.map((p) => new T.Vector2(Math.max(0.0001, p[0]), p[1]));
    const geo = new T.LatheGeometry(pts, segs || 48);
    geo.rotateX(Math.PI / 2); // lathe 軸 Y -> Z（y' = -z, z' = y）
    return geo;
  };

  G.tube = (pts, r, segs, radial, closed, tension) => {
    const curve = new T.CatmullRomCurve3(pts, !!closed, 'catmullrom', tension == null ? 0.5 : tension);
    return new T.TubeGeometry(curve, segs || Math.max(8, pts.length * 8), r, radial || 8, !!closed);
  };

  // 沿 +Y 的螺旋彈簧
  G.helix = (radius, length, turns, wire, perTurn) => {
    const pts = [];
    const n = Math.max(16, Math.round(turns * (perTurn || 16)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * turns * Math.PI * 2;
      pts.push(new T.Vector3(radius * Math.cos(a), t * length, radius * Math.sin(a)));
    }
    const curve = new T.CatmullRomCurve3(pts);
    return new T.TubeGeometry(curve, n * 2, wire, 6, false);
  };

  G.mesh = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    return m;
  };
  G.box = (w, h, d) => new T.BoxGeometry(w, h, d);
  G.rbox = (w, h, d, r, segs) => {
    if (CY.lib && CY.lib.RoundedBoxGeometry) {
      return new CY.lib.RoundedBoxGeometry(w, h, d, segs || 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    }
    return new T.BoxGeometry(w, h, d);
  };
  G.cyl = (rt, rb, h, seg, open) => new T.CylinderGeometry(rt, rb, h, seg || 24, 1, !!open);
  // Y 軸朝向的網格擺在兩點之間
  const UP = () => new T.Vector3(0, 1, 0);
  G.place = (obj, p1, p2) => {
    const dir = new T.Vector3().subVectors(p2, p1);
    const len = dir.length();
    obj.position.copy(p1).addScaledVector(dir, 0.5);
    obj.quaternion.setFromUnitVectors(UP(), dir.normalize());
    return len;
  };
  G.cylBetween = (p1, p2, r, mat, seg, r2) => {
    const len = p1.distanceTo(p2);
    const m = new T.Mesh(new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 12), mat);
    G.place(m, p1, p2);
    return m;
  };
  G.hexNut = (across, h) => {
    const g = new T.CylinderGeometry(across / Math.sqrt(3), across / Math.sqrt(3), h, 6);
    return g;
  };

  G.gearShape = (rRoot, rTip, teeth, holeR) => {
    const s = new T.Shape();
    const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = i % 4;
      const r = k === 1 || k === 2 ? rTip : rRoot;
      if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    if (holeR) { const h = new T.Path(); h.absarc(0, 0, holeR, 0, Math.PI * 2, true); s.holes.push(h); }
    return s;
  };
  G.ringShape = (rOut, rIn, holes) => {
    const s = new T.Shape();
    s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    if (rIn) { const h = new T.Path(); h.absarc(0, 0, rIn, 0, Math.PI * 2, true); s.holes.push(h); }
    (holes || []).forEach((hh) => {
      for (let k = 0; k < hh.count; k++) {
        const a = (k / hh.count) * Math.PI * 2 + (hh.phase || 0);
        const p = new T.Path();
        p.absarc(hh.r * Math.cos(a), hh.r * Math.sin(a), hh.size, 0, Math.PI * 2, true);
        s.holes.push(p);
      }
    });
    return s;
  };
  G.polyShape = (pts) => {
    const s = new T.Shape();
    pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    s.closePath();
    return s;
  };

  // ---------- 程序化貼圖 ----------
  const TEX = {};
  G.TEX = TEX;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toTex = (c, rep, srgb) => {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    if (srgb) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  G.makeTextures = () => {
    const rnd = CY.U.rng(7);
    // 塑膠細紋（bump）
    {
      const c = canvas(256, 256), x = c.getContext('2d');
      const img = x.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (rnd() - 0.5) * 70;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      TEX.grain = toTex(c, [6, 6]);
    }
    // 皮革坐墊紋
    {
      const c = canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) {
        const r = 1 + rnd() * 3.2;
        x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.13)';
        x.beginPath(); x.arc(rnd() * 256, rnd() * 256, r, 0, Math.PI * 2); x.fill();
      }
      TEX.leather = toTex(c, [4, 3]);
    }
    // 輪胎胎紋（bump）：u 沿圓周、v 沿斷面
    {
      const c = canvas(1024, 128), x = c.getContext('2d');
      x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 1024, 128);
      x.fillStyle = '#b0b0b0'; x.fillRect(0, 38, 1024, 52);
      x.strokeStyle = '#202020'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(0, 64); x.lineTo(1024, 64); x.stroke();
      const n = 36;
      for (let i = 0; i < n; i++) {
        const u = (i / n) * 1024;
        x.lineWidth = 4;
        x.beginPath(); x.moveTo(u, 40); x.quadraticCurveTo(u + 14, 50, u + 24, 60); x.stroke();
        x.beginPath(); x.moveTo(u + 14, 88); x.quadraticCurveTo(u + 26, 78, u + 38, 68); x.stroke();
      }
      TEX.tread = toTex(c, [1, 1]);
    }
    // 皮帶齒（bump）：沿路徑方向是 v
    {
      const c = canvas(16, 64), x = c.getContext('2d');
      x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, 16, 64);
      x.fillStyle = '#303030';
      for (let i = 0; i < 4; i++) x.fillRect(0, i * 16 + 10, 16, 6);
      TEX.belt = toTex(c, [1, 60]);
    }
    // 鏈條：沿路徑方向是 v
    {
      const c = canvas(16, 64), x = c.getContext('2d');
      x.fillStyle = '#6d7277'; x.fillRect(0, 0, 16, 64);
      x.fillStyle = '#b9bec4';
      for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(8, i * 16 + 8, 5, 6.5, 0, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#2b2e31';
      for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(8, i * 16 + 8, 2.2, 0, Math.PI * 2); x.fill(); }
      TEX.chain = toTex(c, [1, 40], true);
    }
    // 水泥地
    {
      const c = canvas(512, 512), x = c.getContext('2d');
      x.fillStyle = '#7d7f7c'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        const g = 100 + rnd() * 40;
        x.fillStyle = `rgba(${g},${g + 2},${g},0.35)`;
        x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      for (let i = 0; i < 18; i++) {
        const gx = rnd() * 512, gy = rnd() * 512, r = 20 + rnd() * 70;
        const gr = x.createRadialGradient(gx, gy, 0, gx, gy, r);
        gr.addColorStop(0, 'rgba(40,36,30,0.22)'); gr.addColorStop(1, 'rgba(40,36,30,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.fill();
      }
      x.strokeStyle = 'rgba(40,40,40,0.55)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, 1); x.lineTo(512, 1); x.moveTo(1, 0); x.lineTo(1, 512); x.stroke();
      TEX.concrete = toTex(c, [8, 8], true);
    }
    // 零件工作墊（10 公分格線）
    {
      const c = canvas(512, 512), x = c.getContext('2d');
      x.fillStyle = '#2e3a36'; x.fillRect(0, 0, 512, 512);
      x.strokeStyle = 'rgba(210,225,215,0.18)'; x.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        x.beginPath(); x.moveTo(i * 51.2, 0); x.lineTo(i * 51.2, 512); x.stroke();
        x.beginPath(); x.moveTo(0, i * 51.2); x.lineTo(512, i * 51.2); x.stroke();
      }
      x.strokeStyle = 'rgba(210,225,215,0.34)'; x.lineWidth = 2;
      x.strokeRect(1, 1, 510, 510);
      TEX.mat = toTex(c, [1, 1], true);
    }
    // 洞洞板
    {
      const c = canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#8a6d4c'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#3a2c1e';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 4, 0, Math.PI * 2); x.fill(); }
      TEX.peg = toTex(c, [8, 4], true);
    }
    // 風扇護罩格柵（alpha）
    {
      const c = canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#000';
      for (let i = 0; i < 28; i++) {
        x.save(); x.translate(128, 128); x.rotate((i / 28) * Math.PI * 2);
        x.fillRect(40, -3, 78, 6); x.restore();
      }
      const t = toTex(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
      TEX.grille = t;
    }
    // 煙霧粒子
    {
      const c = canvas(64, 64), x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
      TEX.puff = t;
    }
  };

  // ---------- 材質 ----------
  const M = {};
  CY.M = M;
  CY.PAINTS = [
    { id: 'blue', name: '競技藍', hex: '#1b4db8', metal: 0.45, rough: 0.3, cc: 1 },
    { id: 'yellow', name: '閃電黃', hex: '#eeb400', metal: 0.25, rough: 0.3, cc: 1 },
    { id: 'white', name: '珍珠白', hex: '#e4e7ea', metal: 0.12, rough: 0.26, cc: 1 },
    { id: 'red', name: '烈焰紅', hex: '#b3121f', metal: 0.4, rough: 0.3, cc: 1 },
    { id: 'grey', name: '消光灰', hex: '#6b7076', metal: 0.35, rough: 0.55, cc: 0.15 },
    { id: 'black', name: '消光黑', hex: '#2a2c2f', metal: 0.2, rough: 0.62, cc: 0 },
  ];
  G.makeMaterials = () => {
    const S = (o) => new T.MeshStandardMaterial(o);
    const P = (o) => new T.MeshPhysicalMaterial(o);
    const DS = T.DoubleSide;
    M.paint = P({ color: 0x1b4db8, metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, side: DS });
    M.paint.userData.paint = true;
    M.plastic = S({ color: 0x18191b, roughness: 0.66, metalness: 0, bumpMap: TEX.grain, bumpScale: 0.35, side: DS });
    M.plasticSolid = S({ color: 0x18191b, roughness: 0.66, metalness: 0, bumpMap: TEX.grain, bumpScale: 0.35 });
    M.gloss = S({ color: 0x0d0e0f, roughness: 0.22, metalness: 0.1, side: DS });
    M.grey = S({ color: 0x45494e, roughness: 0.6, metalness: 0.05 });
    M.lightGrey = S({ color: 0xb9bdc2, roughness: 0.5, metalness: 0.0 });
    M.rubber = S({ color: 0x121212, roughness: 0.92, metalness: 0 });
    M.tire = S({ color: 0x161616, roughness: 0.88, metalness: 0, bumpMap: TEX.tread, bumpScale: 1.2, side: DS });
    M.chrome = S({ color: 0xe8eaec, roughness: 0.08, metalness: 1 });
    M.alu = S({ color: 0xc9cdd1, roughness: 0.3, metalness: 1 });
    M.cast = S({ color: 0x9da2a8, roughness: 0.55, metalness: 0.8 });
    M.castDark = S({ color: 0x5c6167, roughness: 0.5, metalness: 0.75 });
    M.case = S({ color: 0x7c8187, roughness: 0.5, metalness: 0.75, side: DS });
    M.steel = S({ color: 0x8c9197, roughness: 0.35, metalness: 1 });
    M.darkSteel = S({ color: 0x3b3f44, roughness: 0.4, metalness: 0.9 });
    M.frame = S({ color: 0x1e2023, roughness: 0.45, metalness: 0.55 });
    M.blackMetal = S({ color: 0x1b1c1e, roughness: 0.42, metalness: 0.6, side: DS });
    M.fins = S({ color: 0x55595f, roughness: 0.55, metalness: 0.7 });
    M.copper = S({ color: 0xb8733a, roughness: 0.35, metalness: 1 });
    M.brass = S({ color: 0xc9a23c, roughness: 0.3, metalness: 1 });
    M.zinc = S({ color: 0xd4c784, roughness: 0.35, metalness: 1 }); // 黃鋅螺絲
    M.seat = S({ color: 0x141415, roughness: 0.78, metalness: 0, bumpMap: TEX.leather, bumpScale: 0.8 });
    M.ceramic = S({ color: 0xf1efe8, roughness: 0.3, metalness: 0 });
    M.belt = S({ color: 0x1a1a1a, roughness: 0.82, metalness: 0, bumpMap: TEX.belt, bumpScale: 1.5 });
    M.chain = S({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.9, map: TEX.chain });
    M.hose = S({ color: 0x131313, roughness: 0.6, metalness: 0 });
    M.wire = S({ color: 0x101010, roughness: 0.7, metalness: 0 });
    M.wireRed = S({ color: 0xa3161a, roughness: 0.55, metalness: 0 });
    M.redCap = S({ color: 0xc0282a, roughness: 0.45, metalness: 0 });
    M.fanPlastic = S({ color: 0xd8d9d4, roughness: 0.55, metalness: 0 });
    M.roller = S({ color: 0xe9e4d8, roughness: 0.45, metalness: 0 });
    M.yellowCap = S({ color: 0xe0a800, roughness: 0.45, metalness: 0 });
    M.pad = S({ color: 0x5a4a3c, roughness: 0.9, metalness: 0.1 });
    M.mirror = S({ color: 0xdfe6ee, roughness: 0.02, metalness: 1 });
    M.reflector = S({ color: 0xbfc7cf, roughness: 0.16, metalness: 0.85, side: DS });
    M.lensClear = P({ color: 0xeaf4ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, side: DS, depthWrite: false });
    M.lensRed = P({ color: 0x9e0f17, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.9, clearcoat: 1, emissive: 0x000000, side: DS });
    M.lensAmber = P({ color: 0xd97a10, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.85, clearcoat: 1, side: DS });
    M.lightGuide = S({ color: 0x9fb4c8, roughness: 0.3, metalness: 0, emissive: 0x000000 });
    M.bulb = S({ color: 0xfff6d8, roughness: 0.2, metalness: 0, emissive: 0x000000 });
    M.tailGuide = S({ color: 0x5a0a0e, roughness: 0.3, metalness: 0, emissive: 0x000000 });
    M.plate = S({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.1 });
    M.oil = S({ color: 0x6b3f0c, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
    M.grilleMat = S({ color: 0x0f1011, roughness: 0.7, metalness: 0, alphaMap: TEX.grille, alphaTest: 0.5, side: DS });
    M.foam = S({ color: 0x151617, roughness: 0.9 });
    M.lcd = new T.MeshBasicMaterial({ color: 0xffffff });
    // 發光材質在高亮時不要被覆蓋
    [M.lensRed, M.lightGuide, M.bulb, M.tailGuide, M.lcd].forEach((m) => { m.userData.selfLit = true; });
  };
  G.applyPaint = (paintId) => {
    const p = CY.PAINTS.find((q) => q.id === paintId) || CY.PAINTS[0];
    const c = new T.Color(p.hex);
    const list = [M.paint].concat(CY.paintClones || []);
    list.forEach((m) => {
      m.color.copy(c);
      m.metalness = p.metal; m.roughness = p.rough;
      if ('clearcoat' in m) m.clearcoat = p.cc;
    });
  };

  CY.G = G;
})();
