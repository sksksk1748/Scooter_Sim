// 外觀車殼：前面板、內箱、側殼、坐墊、置物箱、燈具……
(function () {
  const B = CY.B;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cr = (a, f) => CY.U.cr(a, f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };

  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- 前面板（大盾）：勁戰四代的「<」字形車頭 ----------
  // 上段「罩」：正面往後傾約 47°，兩側是平整側牆，轉角是俐落的小圓角。
  // 下段「裙腳」：從下巴兩側往後下方延伸，繞過前輪後方接到腳踏板側裙。
  const HOOD_W = [0.178, 0.19, 0.198, 0.2, 0.198];
  const HOOD_D = [0.133, 0.127, 0.12, 0.105, 0.085];
  const RC = 0.03, CROWN = 0.014, CHIN_Y = 0.645, HOOD_H = 0.31;
  const hoodY = (v) => CHIN_Y + HOOD_H * v;
  const hoodXf = (v) => 0.738 - 0.33 * v + 0.02 * Math.sin(Math.PI * v);
  const hoodW = (v) => cr(HOOD_W, clamp(v, 0, 1) * 4);
  const hoodD = (v) => cr(HOOD_D, clamp(v, 0, 1) * 4);
  // 高度 v 的水平截面：左後緣 → 左側牆 → 左圓角 → 正面 → 右圓角 → 右側牆 → 右後緣
  function hoodRow(v) {
    const y = hoodY(v), xf = hoodXf(v), w = hoodW(v), d = hoodD(v);
    const zc = w - RC, xc = xf - CROWN - RC, xr = xf - d;
    const pts = [];
    const NS = 5, NCo = 6, NF = 18;
    for (let i = 0; i < NS; i++) pts.push(V(lerp(xr, xc, i / NS), y, -w));
    for (let i = 0; i < NCo; i++) { const a = -Math.PI / 2 + (i / NCo) * (Math.PI / 2); pts.push(V(xc + RC * Math.cos(a), y, -zc + RC * Math.sin(a))); }
    for (let i = 0; i <= NF; i++) { const z = -zc + (2 * zc * i) / NF; pts.push(V(xf - CROWN * (z / zc) ** 2, y, z)); }
    for (let i = 1; i <= NCo; i++) { const a = (i / NCo) * (Math.PI / 2); pts.push(V(xc + RC * Math.cos(a), y, zc + RC * Math.sin(a))); }
    for (let i = 1; i <= NS; i++) pts.push(V(lerp(xc, xr, i / NS), y, w));
    return pts;
  }
  // 正面上的點（v 沿斜面、z 橫向）與朝外法線
  function facePoint(v, z) {
    const zc = hoodW(v) - RC;
    const zz = clamp(z, -zc, zc);
    return V(hoodXf(v) - CROWN * (zz / zc) ** 2, hoodY(v), zz);
  }
  function faceNormal(v, z) {
    const e = 0.004;
    const a = facePoint(Math.min(1, v + e), z).sub(facePoint(Math.max(0, v - e), z));
    const b = facePoint(v, z + e).sub(facePoint(v, z - e));
    const n = new THREE.Vector3().crossVectors(b, a).normalize();
    if (n.x < 0) n.negate();
    return n;
  }
  // 在正面鋪一塊貼片：map(a, b) → [z, v]，a、b ∈ [0,1]
  function faceGrid(map, nu, nv, off) {
    const rows = [];
    for (let j = 0; j <= nv; j++) {
      const row = [];
      for (let i = 0; i <= nu; i++) {
        const [z, v] = map(i / nu, j / nv);
        row.push(facePoint(v, z).addScaledVector(faceNormal(v, z), off));
      }
      rows.push(row);
    }
    return CY.G.skin(rows, { closed: false });
  }

  // 裙腳：前緣 (fx,fy)、後緣 (rx,ry)，外側半寬 wo、正面收邊內緣 wi
  const LEG = {
    fx: [0.708, 0.672, 0.628, 0.578, 0.532, 0.494, 0.465, 0.448],
    fy: [0.645, 0.603, 0.552, 0.498, 0.447, 0.4, 0.352, 0.305],
    rx: [0.605, 0.578, 0.548, 0.518, 0.492, 0.468, 0.452, 0.442],
    ry: [0.645, 0.612, 0.572, 0.527, 0.482, 0.437, 0.392, 0.345],
    wo: [0.178, 0.178, 0.178, 0.177, 0.176, 0.175, 0.175, 0.175],
    wi: [0.128, 0.13, 0.132, 0.135, 0.138, 0.142, 0.146, 0.15],
  };
  const LEGN = LEG.fx.length - 1;
  const legVal = (k, f) => cr(LEG[k], clamp(f, 0, LEGN));
  // 側牆上的點：k = 0 前緣、1 後緣
  function legSide(f, k, s) {
    const fx = legVal('fx', f) - 0.014, fy = legVal('fy', f);
    return V(lerp(fx, legVal('rx', f), k), lerp(fy, legVal('ry', f), k), s * legVal('wo', f));
  }
  function legRow(f, s) {
    const fx = legVal('fx', f), fy = legVal('fy', f), wo = legVal('wo', f), wi = legVal('wi', f);
    const pts = [
      V(fx - 0.02, fy + 0.012, s * wi),
      V(fx - 0.006, fy + 0.004, s * lerp(wi, wo, 0.55)),
      V(fx, fy, s * (wo - 0.012)),
      V(fx - 0.006, fy - 0.001, s * (wo - 0.002)),
    ];
    for (let k = 1; k <= 6; k++) pts.push(legSide(f, k / 6, s));
    return pts;
  }
  // 沿裙腳後緣找高度 y 對應的值
  function legAtY(y, arr) {
    const ys = LEG.ry;
    if (y >= ys[0]) return arr[0];
    for (let i = 0; i < ys.length - 1; i++) {
      if (y <= ys[i] && y >= ys[i + 1]) return lerp(arr[i], arr[i + 1], (ys[i] - y) / (ys[i] - ys[i + 1]));
    }
    return arr[arr.length - 1];
  }
  // 前車殼在高度 y 的半寬，以及大盾後緣（＝內箱側牆的前緣）
  function frontW(y) {
    return y >= CHIN_Y ? hoodW((y - CHIN_Y) / HOOD_H) : legAtY(y, LEG.wo);
  }
  function apronRearX(y) {
    if (y >= CHIN_Y) { const v = (y - CHIN_Y) / HOOD_H; return hoodXf(v) - hoodD(v); }
    return legAtY(y, LEG.rx);
  }

  B.front_apron = () => {
    const g = grp('front_apron');
    const M = CY.M;
    // 上段罩
    const rows = [];
    for (let i = 0; i <= 30; i++) rows.push(hoodRow(i / 30));
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), M.paint));
    // 下巴底板（兩裙腳之間，從下方看得到）
    const bottom = hoodRow(0);
    const bc = new THREE.Vector3(); bottom.forEach((p) => bc.add(p)); bc.multiplyScalar(1 / bottom.length);
    g.add(new THREE.Mesh(CY.G.skin([bottom, bottom.map(() => bc.clone())], { solid: false }), M.plastic));
    // 下段裙腳
    [-1, 1].forEach((s) => {
      const lr = [];
      for (let i = 0; i <= 28; i++) lr.push(legRow((LEGN * i) / 28, s));
      g.add(new THREE.Mesh(CY.G.skin(lr, { closed: false }), M.paint));
      // 側面黑色斜紋飾板（沿裙腳後緣）與兩道車色細線
      const trim = [];
      for (let i = 0; i <= 10; i++) {
        const f = 0.15 + (2.6 * i) / 10, row = [];
        for (let j = 0; j <= 4; j++) row.push(legSide(f, 0.52 + (0.46 * j) / 4, s).add(V(0, 0, s * 0.002)));
        trim.push(row);
      }
      g.add(new THREE.Mesh(CY.G.skin(trim, { closed: false }), M.gloss));
      [0.66, 0.8].forEach((k) => {
        const line = [];
        for (let i = 0; i <= 10; i++) {
          const f = 0.25 + (2.3 * i) / 10;
          line.push([legSide(f, k, s).add(V(0, 0, s * 0.0028)), legSide(f, k + 0.035, s).add(V(0, 0, s * 0.0028))]);
        }
        g.add(new THREE.Mesh(CY.G.skin(line, { closed: false }), M.paint));
      });
    });
    // 正面中央的亮黑「H 面板」：往下以 V 字接到大燈
    g.add(new THREE.Mesh(faceGrid((a, b) => {
      const x = 2 * a - 1;
      const vBot = 0.386 + 0.27 * Math.abs(x);
      return [x * lerp(0.159, 0.146, b), lerp(vBot, 0.992, b)];
    }, 20, 16, 0.0022), M.gloss));
    // 上方 V 形進氣凹口
    g.add(new THREE.Mesh(faceGrid((a, b) => [(2 * a - 1) * lerp(0.009, 0.05, b), lerp(0.8, 0.965, b)], 8, 6, 0.0032), M.plastic));
    // 中央圓形徽章座
    const bp = facePoint(0.55, 0), bn = faceNormal(0.55, 0);
    const badge = add(g, new THREE.TorusGeometry(0.017, 0.0032, 8, 24), M.chrome);
    badge.position.copy(bp).addScaledVector(bn, 0.004);
    badge.quaternion.setFromUnitVectors(V(0, 0, 1), bn);
    const disc = add(g, new THREE.CircleGeometry(0.015, 24), M.gloss);
    disc.position.copy(bp).addScaledVector(bn, 0.0035);
    disc.quaternion.setFromUnitVectors(V(0, 0, 1), bn);
    // 大燈下方的銀色飾條
    g.add(new THREE.Mesh(faceGrid((a, b) => [(2 * a - 1) * 0.128, lerp(0.004, 0.026, b)], 14, 2, 0.003), M.alu));
    return g;
  };

  // 盾形大燈：上緣 V 字、兩側往下收、底部圓弧；下方大反射碗，上方兩翼導光定位燈
  // 大燈兩側上角約在正面 64% 高、V 字尖端約 37%，寬度約佔前面板的七成
  const HL_TOP = (ax) => 0.37 + 0.27 * ax;
  function shield(a, b, grow) {
    const x = 2 * a - 1;
    const halfW = 0.128 + 0.018 * b + grow;
    const vBot = 0.035 + 0.16 * Math.pow(Math.abs(x), 2.2) - grow;
    const vTop = HL_TOP(Math.abs(x)) + grow;
    return [x * halfW, lerp(vBot, vTop, b)];
  }
  // 大燈外緣一圈的側牆（燈殼微微凸出車殼）
  function shieldWall(grow, o0, o1) {
    const loop = [];
    const N = 16, E = 6;
    for (let i = 0; i < N; i++) loop.push(shield(i / N, 0, grow));
    for (let i = 0; i < E; i++) loop.push(shield(1, i / E, grow));
    for (let i = 0; i < N; i++) loop.push(shield(1 - i / N, 1, grow));
    for (let i = 0; i < E; i++) loop.push(shield(0, 1 - i / E, grow));
    const ring = (off) => loop.map(([z, v]) => facePoint(v, z).addScaledVector(faceNormal(v, z), off));
    return CY.G.skin([ring(o0), ring(o1)], { solid: false });
  }
  B.headlight = () => {
    const g = grp('headlight');
    const M = CY.M;
    const LENS = 0.02;
    g.add(new THREE.Mesh(faceGrid((a, b) => shield(a, b, 0.012), 22, 10, 0.0026), M.gloss));    // 黑色燈框
    g.add(new THREE.Mesh(faceGrid((a, b) => shield(a, b, 0.003), 22, 10, 0.004), M.reflector)); // 燈殼內的銀色反射面
    g.add(new THREE.Mesh(shieldWall(0.004, 0.002, LENS), M.gloss));
    g.add(new THREE.Mesh(faceGrid((a, b) => shield(a, b, 0.004), 22, 10, LENS), M.lensClear)); // 透鏡
    // 兩翼導光條：平行於 V 字上緣
    [-1, 1].forEach((s) => {
      g.add(new THREE.Mesh(faceGrid((a, b) => {
        const z = s * (0.024 + 0.114 * a);
        const vTop = HL_TOP(Math.abs(z) / 0.146);
        return [z, vTop - 0.062 + 0.03 * b];
      }, 12, 2, 0.009), M.lightGuide));
    });
    // 大反射碗與燈泡（H4）
    const pc = facePoint(0.175, 0), n = faceNormal(0.175, 0);
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([0.003, 0.016, 0.03, 0.044, 0.056].map((r) => new THREE.Vector2(r, (r * r) / 0.26)), 36), M.reflector);
    bowl.position.copy(pc).addScaledVector(n, 0.004);
    bowl.quaternion.setFromUnitVectors(V(0, 1, 0), n);
    g.add(bowl);
    const ring = add(g, new THREE.TorusGeometry(0.056, 0.0025, 6, 40), M.chrome);
    ring.position.copy(pc).addScaledVector(n, 0.016);
    ring.quaternion.setFromUnitVectors(V(0, 0, 1), n);
    const bulb = add(g, new THREE.SphereGeometry(0.011, 16, 12), M.bulb);
    bulb.position.copy(pc).addScaledVector(n, 0.013);
    CY.anim.headLamps = [bulb];
    CY.anim.headCenter = pc.clone().addScaledVector(n, 0.03);
    CY.anim.headDir = n.clone();
    return g;
  };

  // ---------- 內箱（護腿板） ----------
  // 面向騎士的後牆 + 兩側牆（填滿大盾「<」字的凹口，從側面看是黑色的三角區）
  const IP = {
    y: [0.360, 0.430, 0.500, 0.580, 0.660, 0.740, 0.810, 0.870, 0.935],
    xc: [0.420, 0.418, 0.408, 0.394, 0.378, 0.360, 0.338, 0.312, 0.288],
    xe: [0.438, 0.446, 0.450, 0.445, 0.438, 0.425, 0.410, 0.396, 0.345],
  };
  const IPN = IP.y.length - 1;
  function innerPt(f, t) {
    f = clamp(f, 0, IPN); t = clamp(t, -1, 1);
    const y = cr(IP.y, f), xc = cr(IP.xc, f), xe = cr(IP.xe, f), w = frontW(y);
    return V(xe - (xe - xc) * Math.pow(Math.max(0, 1 - t * t), 0.8), y, w * t);
  }
  function innerRow(f) {
    f = clamp(f, 0, IPN);
    const y = cr(IP.y, f), xe = cr(IP.xe, f), w = frontW(y);
    const xr = Math.max(xe, apronRearX(y));
    const pts = [];
    for (let k = 0; k < 4; k++) pts.push(V(lerp(xr, xe, k / 4), y, -w));
    for (let j = 0; j <= 28; j++) pts.push(innerPt(f, -1 + (2 * j) / 28));
    for (let k = 1; k <= 4; k++) pts.push(V(lerp(xe, xr, k / 4), y, w));
    return pts;
  }
  function surfNormal(fn, f, t, fMax, inner) {
    const e = 0.01;
    const p = fn(f, t);
    const dt = fn(f, clamp(t + e, -1, 1)).sub(fn(f, clamp(t - e, -1, 1)));
    const df = fn(clamp(f + e, 0, fMax), t).sub(fn(clamp(f - e, 0, fMax), t));
    const n = new THREE.Vector3().crossVectors(dt, df).normalize();
    if (n.dot(p.clone().sub(inner(p))) < 0) n.negate();
    return n;
  }
  function patch(fn, fMax, inner, f0, f1, t0, t1, off, nu, nv) {
    const rows = [];
    for (let i = 0; i <= nv; i++) {
      const f = f0 + ((f1 - f0) * i) / nv;
      const row = [];
      for (let j = 0; j <= nu; j++) {
        const t = clamp(t0 + ((t1 - t0) * j) / nu, -1, 1);
        row.push(fn(f, t).addScaledVector(surfNormal(fn, f, t, fMax, inner), off));
      }
      rows.push(row);
    }
    return CY.G.skin(rows, { closed: false });
  }
  const innerIn = (p) => V(0.6, p.y, 0); // 內部參考點在前方 → 法線朝騎士
  B.inner_panel = () => {
    const g = grp('inner_panel');
    const rows = [];
    for (let i = 0; i <= 44; i++) rows.push(innerRow((IPN * i) / 44));
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), CY.M.plastic));
    // 置物格開口
    [-1, 1].forEach((s) => {
      g.add(new THREE.Mesh(patch(innerPt, IPN, innerIn, 3.7, 4.9, s * 0.3, s * 0.86, 0.002, 8, 4), CY.M.gloss));
    });
    // 掛勾
    const hp = innerPt(4.4, 0), hn = surfNormal(innerPt, 4.4, 0, IPN, innerIn);
    const hook = add(g, new THREE.TorusGeometry(0.012, 0.0032, 8, 16, Math.PI), CY.M.chrome);
    hook.position.copy(hp).addScaledVector(hn, 0.012);
    hook.rotation.set(0, Math.PI / 2, Math.PI);
    // 主開關（鑰匙孔）與鑰匙
    const kp = innerPt(6.05, 0.58), kn = surfNormal(innerPt, 6.05, 0.58, IPN, innerIn);
    const sw = new THREE.Group();
    sw.position.copy(kp);
    sw.quaternion.setFromUnitVectors(V(0, 0, 1), kn);
    g.add(sw);
    add(sw, CY.G.cyl(0.02, 0.022, 0.012, 24), CY.M.chrome, 0, 0, 0.004, Math.PI / 2, 0, 0);
    add(sw, CY.G.cyl(0.013, 0.013, 0.012, 20), CY.M.gloss, 0, 0, 0.008, Math.PI / 2, 0, 0);
    const key = new THREE.Group();
    key.position.set(0, 0, 0.014);
    sw.add(key);
    add(key, CY.G.box(0.003, 0.009, 0.02), CY.M.chrome, 0, 0, 0.008);
    add(key, CY.G.rbox(0.007, 0.03, 0.026, 0.003), CY.M.gloss, 0, 0, 0.03);
    key.rotation.z = 0; // OFF；ON = -90°
    key.userData.keep = true;
    CY.anim.key = key;
    return g;
  };

  // ---------- 車身側殼 ----------
  const SC = [ // xb, yb, zb, xt, yt, zt, zm
    [0.080, 0.360, 0.170, -0.030, 0.715, 0.150, 0.182],
    [-0.040, 0.340, 0.178, -0.100, 0.722, 0.156, 0.198],
    [-0.180, 0.385, 0.182, -0.200, 0.730, 0.160, 0.202],
    [-0.340, 0.465, 0.182, -0.340, 0.738, 0.160, 0.200],
    [-0.500, 0.522, 0.175, -0.500, 0.746, 0.157, 0.193],
    [-0.650, 0.556, 0.162, -0.650, 0.752, 0.150, 0.180],
    [-0.780, 0.582, 0.142, -0.780, 0.758, 0.132, 0.160],
    [-0.880, 0.606, 0.112, -0.880, 0.758, 0.104, 0.128],
    [-0.950, 0.630, 0.080, -0.945, 0.748, 0.072, 0.092],
    [-0.990, 0.648, 0.052, -0.985, 0.735, 0.046, 0.058],
  ];
  const SCN = SC.length - 1;
  const col = (k) => SC.map((r) => r[k]);
  const SCC = [0, 1, 2, 3, 4, 5, 6].map(col);
  // 車色與黑色的分界（也是腰線）：前段壓低、往車尾斜斜上揚，接續腳踏板側裙的車色流線
  const SPLIT = [0.02, 0.1, 0.26, 0.35, 0.4, 0.42, 0.44, 0.45, 0.45, 0.45];
  const splitV = (f) => cr(SPLIT, clamp(f, 0, SCN));
  function sidePt(f, v, s) {
    f = clamp(f, 0, SCN);
    const [xb, yb, zb, xt, yt, zt, zm] = SCC.map((a) => cr(a, f));
    const x = xb + (xt - xb) * v, y = yb + (yt - yb) * v;
    let z = zb + (zt - zb) * v + (zm - (zb + zt) / 2) * Math.sin(Math.PI * v);
    z += 0.006 * Math.max(0, 1 - Math.abs(v - splitV(f)) / 0.07); // 腰線
    if (v > 0.9) z -= (v - 0.9) * 0.12;
    return V(x, y, z * s);
  }
  CY.sidePt = sidePt;
  B.side_covers = () => {
    const g = grp('side_covers');
    [-1, 1].forEach((s) => {
      const side = grp('side' + s);
      side.userData.side = s;
      // 沿分界線切成上下兩塊曲面，車色邊界才會是平順的斜線
      const rowsB = [], rowsP = [];
      const NR = 48, NB = 10, NP = 20;
      for (let i = 0; i <= NR; i++) {
        const f = (SCN * i) / NR, sv = splitV(f);
        const rb = [], rp = [];
        for (let j = 0; j <= NB; j++) rb.push(sidePt(f, (sv * j) / NB, s));
        for (let j = 0; j <= NP; j++) rp.push(sidePt(f, sv + ((1 - sv) * j) / NP, s));
        rowsB.push(rb); rowsP.push(rp);
      }
      side.add(new THREE.Mesh(CY.G.skin(rowsB, { closed: false }), CY.M.plastic));
      side.add(new THREE.Mesh(CY.G.skin(rowsP, { closed: false }), CY.M.paint));
      g.add(side);
    });
    // 中央蓋（坐墊前方的斜面，加油口蓋）
    const rows = [];
    for (let i = 0; i <= 16; i++) {
      const v = i / 16, L = sidePt(0, v, -1), R = sidePt(0, v, 1), row = [];
      for (let j = 0; j <= 20; j++) {
        const t = -1 + (2 * j) / 20;
        const p = L.clone().lerp(R, (t + 1) / 2);
        p.x += 0.016 * (1 - t * t);
        row.push(p);
      }
      rows.push(row);
    }
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), CY.M.plastic));
    // 加油口蓋
    const lidC = sidePt(0, 0.47, 1).lerp(sidePt(0, 0.47, -1), 0.5);
    lidC.x += 0.019;
    const lid = add(g, CY.G.rbox(0.012, 0.055, 0.085, 0.005), CY.M.gloss);
    lid.position.copy(lidC);
    lid.rotation.z = Math.atan2(0.11, 0.355); // 貼齊斜面
    add(g, CY.G.cyl(0.006, 0.006, 0.004, 12), CY.M.chrome, lidC.x + 0.006, lidC.y + 0.012, 0.02, 0, 0, Math.PI / 2);
    return g;
  };

  // 尾燈（嵌在側殼尾端）
  B.tail_light = () => {
    const g = grp('tail_light');
    const rings = [];
    const xs = [-0.93, -0.96, -0.985, -1.0, -1.007];
    const hw = [0.07, 0.074, 0.07, 0.062, 0.05];
    const hh = [0.042, 0.044, 0.043, 0.04, 0.032];
    xs.forEach((x, i) => rings.push(CY.G.sring(x, 0.692, 0, hw[i], hh[i], 32, 4, 'zy')));
    g.add(new THREE.Mesh(CY.G.skin(rings, { capEnd: true }), CY.M.lensRed));
    // 導光條
    const guide = add(g, CY.G.box(0.004, 0.008, 0.1), CY.M.tailGuide, -1.009, 0.7, 0);
    CY.anim.tailGuide = guide;
    // 後方向燈
    [-1, 1].forEach((s) => add(g, CY.G.rbox(0.03, 0.022, 0.03, 0.006), CY.M.lensAmber, -0.985, 0.672, s * 0.066));
    return g;
  };

  // ---------- 坐墊 ----------
  B.seat = () => {
    const g = grp('seat');
    const ST = [
      [-0.030, 0.090, 0.712, 0.738, 3.0], [-0.070, 0.140, 0.715, 0.768, 3.2], [-0.150, 0.160, 0.722, 0.782, 3.5],
      [-0.300, 0.166, 0.734, 0.787, 3.6], [-0.450, 0.164, 0.742, 0.789, 3.6], [-0.540, 0.160, 0.745, 0.800, 3.6],
      [-0.610, 0.156, 0.748, 0.814, 3.6], [-0.720, 0.146, 0.753, 0.817, 3.5], [-0.820, 0.124, 0.756, 0.810, 3.2],
      [-0.868, 0.090, 0.758, 0.797, 3.0], [-0.892, 0.045, 0.760, 0.783, 2.6],
    ];
    const rings = [];
    const n = ST.length - 1;
    for (let i = 0; i <= 50; i++) {
      const f = (n * i) / 50;
      const x = cr(ST.map((r) => r[0]), f), hw = cr(ST.map((r) => r[1]), f);
      const yb = cr(ST.map((r) => r[2]), f), yt = cr(ST.map((r) => r[3]), f), e = cr(ST.map((r) => r[4]), f);
      rings.push(CY.G.sring(x, (yb + yt) / 2, 0, hw, (yt - yb) / 2, 40, e, 'zy'));
    }
    g.add(new THREE.Mesh(CY.G.skin(rings, { capStart: true, capEnd: true }), CY.M.seat));
    // 坐墊底板（黑色塑膠邊）
    const base = [];
    for (let i = 0; i <= 25; i++) {
      const f = (n * i) / 25;
      const x = cr(ST.map((r) => r[0]), f), hw = cr(ST.map((r) => r[1]), f), yb = cr(ST.map((r) => r[2]), f);
      base.push(CY.G.sring(x, yb + 0.004, 0, hw + 0.004, 0.006, 32, 6, 'zy'));
    }
    g.add(new THREE.Mesh(CY.G.skin(base, { capStart: true, capEnd: true }), CY.M.plasticSolid));
    // 鉸鏈
    add(g, CY.G.box(0.04, 0.02, 0.1), CY.M.darkSteel, -0.05, 0.705, 0);
    return g;
  };

  // ---------- 置物箱 ----------
  B.storage_box = () => {
    const g = grp('storage_box');
    const SB = [[0.475, -0.33, 0.2, 0.095], [0.54, -0.365, 0.27, 0.105], [0.62, -0.385, 0.305, 0.118], [0.69, -0.395, 0.318, 0.126], [0.708, -0.398, 0.322, 0.128]];
    const rings = SB.map(([y, cx, hx, hz]) => CY.G.sring(cx, y, 0, hx, hz, 40, 5, 'xz'));
    g.add(new THREE.Mesh(CY.G.skin(rings, { capStart: true, solid: false }), CY.M.plastic));
    const rimIn = CY.G.sring(-0.398, 0.708, 0, 0.322, 0.128, 40, 5, 'xz');
    const rimOut = CY.G.sring(-0.398, 0.708, 0, 0.338, 0.142, 40, 5, 'xz');
    g.add(new THREE.Mesh(CY.G.skin([rimIn, rimOut], { solid: false }), CY.M.plastic));
    return g;
  };

  B.battery_cover = () => {
    const g = grp('battery_cover');
    add(g, CY.G.rbox(0.1, 0.01, 0.15, 0.004), CY.M.plasticSolid, -0.808, 0.735, 0);
    [-1, 1].forEach((s) => add(g, CY.G.cyl(0.005, 0.005, 0.004, 12), CY.M.steel, -0.808, 0.741, s * 0.055));
    return g;
  };

  // ---------- 後扶手 ----------
  B.grab_rail = () => {
    const g = grp('grab_rail');
    const pts = [
      V(-0.6, 0.764, -0.168), V(-0.72, 0.772, -0.16), V(-0.84, 0.773, -0.134), V(-0.925, 0.768, -0.085), V(-0.952, 0.764, 0),
      V(-0.925, 0.768, 0.085), V(-0.84, 0.773, 0.134), V(-0.72, 0.772, 0.16), V(-0.6, 0.764, 0.168),
    ];
    g.add(new THREE.Mesh(CY.G.tube(pts, 0.014, 90, 10), CY.M.blackMetal));
    [V(-0.62, 0.764, -0.166), V(-0.62, 0.764, 0.166), V(-0.94, 0.765, 0)].forEach((p) => {
      g.add(CY.G.cylBetween(p, V(p.x, p.y - 0.035, p.z * 0.93), 0.011, CY.M.blackMetal));
    });
    return g;
  };

  B.footpegs = () => {
    const g = grp('footpegs');
    [-1, 1].forEach((s) => {
      const side = grp('peg' + s); side.userData.side = s;
      add(side, CY.G.rbox(0.07, 0.03, 0.02, 0.006), CY.M.blackMetal, -0.3, 0.4, s * 0.195);
      add(side, CY.G.rbox(0.028, 0.07, 0.03, 0.01), CY.M.rubber, -0.3, 0.44, s * 0.212);
      g.add(side);
    });
    return g;
  };

  // ---------- 腳踏板 ----------
  B.floor_board = () => {
    const g = grp('floor_board');
    add(g, CY.G.rbox(0.41, 0.018, 0.344, 0.006), CY.M.plasticSolid, 0.225, 0.353, 0);
    for (let k = -3; k <= 3; k++) add(g, CY.G.box(0.34, 0.006, 0.014), CY.M.rubber, 0.23, 0.364, k * 0.043);
    [-1, 1].forEach((s) => add(g, CY.G.box(0.41, 0.01, 0.006), CY.M.alu, 0.225, 0.358, s * 0.173));
    return g;
  };

  // ---------- 側裙與下護蓋 ----------
  // 下半部是一道車色流線：接在前面板裙腳後面，沿腳踏板側邊一路往後延伸
  const SK = [ // x, yt, zt, yb, zb, zm
    [0.445, 0.34, 0.175, 0.25, 0.158, 0.178], [0.39, 0.352, 0.174, 0.18, 0.148, 0.179],
    [0.3, 0.35, 0.174, 0.152, 0.141, 0.179], [0.1, 0.35, 0.174, 0.148, 0.139, 0.179], [-0.05, 0.345, 0.176, 0.162, 0.141, 0.181],
  ];
  B.side_skirts = () => {
    const g = grp('side_skirts');
    const n = SK.length - 1;
    const c = (k) => SK.map((r) => r[k]);
    const C = [0, 1, 2, 3, 4, 5].map(c);
    [-1, 1].forEach((s) => {
      const side = grp('skirt' + s); side.userData.side = s;
      const skirtPt = (f, v) => {
        const [x, yt, zt, yb, zb, zm] = C.map((a) => cr(a, f));
        return V(x, yt + (yb - yt) * v, s * (zt + (zb - zt) * v + (zm - (zt + zb) / 2) * Math.sin(Math.PI * v)));
      };
      // 上半黑、下半車色；到後端車色往上延伸，和側殼的車色接成一條流線
      const SPL = [0.52, 0.52, 0.5, 0.36, 0.02];
      const up = [], low = [];
      for (let i = 0; i <= 24; i++) {
        const f = (n * i) / 24, sp = cr(SPL, f), ru = [], rl = [];
        for (let j = 0; j <= 6; j++) ru.push(skirtPt(f, (sp * j) / 6));
        for (let j = 0; j <= 6; j++) rl.push(skirtPt(f, sp + ((1 - sp) * j) / 6));
        up.push(ru); low.push(rl);
      }
      side.add(new THREE.Mesh(CY.G.skin(up, { closed: false }), CY.M.plastic));
      side.add(new THREE.Mesh(CY.G.skin(low, { closed: false }), CY.M.paint));
      g.add(side);
    });
    const rows = [];
    for (let i = 0; i <= 12; i++) {
      const f = 1 + (3 * i) / 12;
      const [x, , , yb, zb] = C.map((a) => cr(a, f));
      const row = [];
      for (let j = 0; j <= 12; j++) { const t = -1 + (2 * j) / 12; row.push(V(x, yb - 0.008 * (1 - t * t), zb * t)); }
      rows.push(row);
    }
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), CY.M.plastic));
    return g;
  };

  // ---------- 前土除 ----------
  // 車色的長鳥嘴造型，頂面平直往前伸出輪胎前緣，前端兩側有黑色斜紋
  const FF = {
    x: [0.528, 0.565, 0.63, 0.7, 0.765, 0.822, 0.862, 0.888],
    y: [0.455, 0.478, 0.49, 0.489, 0.482, 0.468, 0.451, 0.434],
    w: [0.066, 0.071, 0.074, 0.073, 0.07, 0.064, 0.054, 0.038],
    h: [0.052, 0.05, 0.048, 0.046, 0.042, 0.036, 0.029, 0.018],
  };
  const FFN = FF.x.length - 1;
  function fenderPt(f, u) {
    const x = cr(FF.x, f), y = cr(FF.y, f), w = cr(FF.w, f), h = cr(FF.h, f);
    return V(x, y - h * Math.pow(Math.abs(u), 2.4), w * u);
  }
  B.front_fender = () => {
    const g = grp('front_fender');
    const M = CY.M;
    const rows = [];
    for (let i = 0; i <= 30; i++) {
      const f = (FFN * i) / 30, row = [];
      for (let j = 0; j <= 14; j++) row.push(fenderPt(f, -1 + (2 * j) / 14));
      rows.push(row);
    }
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), M.paint));
    [-1, 1].forEach((s) => {
      [0, 1].forEach((k) => {
        const band = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6, f = 4.2 + k * 0.85 + 1.1 * t;
          band.push([fenderPt(f, s * (0.58 + 0.2 * t)), fenderPt(f, s * (0.7 + 0.2 * t))].map((p) => p.add(V(0, 0.0015, s * 0.0015))));
        }
        g.add(new THREE.Mesh(CY.G.skin(band, { closed: false }), M.gloss));
      });
      add(g, CY.G.box(0.04, 0.05, 0.004), M.plasticSolid, 0.57, 0.437, s * 0.075);
    });
    return g;
  };

  // ---------- 後土除與牌照架 ----------
  B.rear_fender = () => {
    const g = grp('rear_fender');
    const path = [V(-0.76, 0.555, 0), V(-0.88, 0.585, 0), V(-0.97, 0.566, 0), V(-1.03, 0.505, 0), V(-1.06, 0.44, 0)];
    const curve = new THREE.CatmullRomCurve3(path);
    const rows = [];
    for (let i = 0; i <= 24; i++) {
      const p = curve.getPoint(i / 24), row = [];
      for (let j = 0; j <= 8; j++) {
        const z = -0.065 + (0.13 * j) / 8;
        row.push(V(p.x, p.y - 0.014 * Math.pow(z / 0.065, 2), z));
      }
      rows.push(row);
    }
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), CY.M.plastic));
    const plate = new THREE.Group();
    plate.position.set(-1.075, 0.395, 0);
    plate.rotation.z = CY.U.deg(-14);
    add(plate, CY.G.box(0.012, 0.112, 0.178), CY.M.plasticSolid);
    add(plate, CY.G.box(0.004, 0.1, 0.166), CY.M.plate, -0.007, 0, 0);
    add(plate, CY.G.box(0.006, 0.012, 0.05), CY.M.lensRed, -0.004, -0.07, 0);
    add(plate, CY.G.rbox(0.02, 0.014, 0.05, 0.004), CY.M.plasticSolid, -0.004, 0.066, 0);
    g.add(plate);
    return g;
  };

  // ---------- 龍頭蓋：蝙蝠翼造型 ----------
  // 前半車色、後半黑色；中央一塊亮黑倒三角面罩；兩端各一顆往外上揚的透明方向燈
  const HC_Z = 0.235;
  function hcSection(z) {
    const az = Math.abs(z);
    const k = Math.pow(Math.min(1, az / 0.225), 1.4);
    const end = az > 0.21 ? Math.sqrt(Math.max(0, 1 - ((az - 0.21) / 0.025) ** 2)) : 1; // 端蓋收圓
    return {
      cx: lerp(0.338, 0.3, k), cy: lerp(0.952, 0.996, k),
      af: lerp(0.135, 0.08, k) * (0.45 + 0.55 * end), ab: lerp(0.1, 0.07, k) * (0.5 + 0.5 * end),
      at: lerp(0.037, 0.046, k) * (0.5 + 0.5 * end), abot: lerp(0.04, 0.058, k) * (0.5 + 0.5 * end),
      tip: lerp(-0.018, -0.004, k),
    };
  }
  // t：0 = 前尖、π/2 = 頂、π = 後（面向騎士）、3π/2 = 底
  function hcPt(z, t) {
    const S = hcSection(z);
    const c = Math.cos(t), s = Math.sin(t);
    const front = c >= 0;
    const x = S.cx + (front ? S.af : S.ab) * Math.sign(c) * Math.pow(Math.abs(c), front ? 2 / 1.7 : 2 / 3.4);
    const y = S.cy + (s >= 0 ? S.at : S.abot) * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3) + (front ? S.tip * c * c : 0);
    return V(x, y, z);
  }
  function hcNormal(z, t) {
    const e = 0.004;
    const dz = hcPt(z + e, t).sub(hcPt(z - e, t));
    const dt = hcPt(z, t + e).sub(hcPt(z, t - e));
    const n = new THREE.Vector3().crossVectors(dt, dz).normalize();
    const S = hcSection(z);
    const p = hcPt(z, t);
    if (n.dot(V(p.x - S.cx, p.y - S.cy, 0)) < 0) n.negate();
    return n;
  }
  B.handle_cover = () => {
    const g = grp('handle_cover');
    const M = CY.M;
    const N = 44, NZ = 34;
    const zs = [];
    for (let i = 0; i <= NZ; i++) zs.push(-HC_Z + (2 * HC_Z * i) / NZ);
    const rings = zs.map((z) => { const r = []; for (let j = 0; j < N; j++) r.push(hcPt(z, (j / N) * Math.PI * 2)); return r; });
    const geo = CY.G.skin(rings, {
      capStart: true, capEnd: true, capGroup: 1,
      groups: (i, j) => {
        const t = ((j + 0.5) / N) * Math.PI * 2;
        if (Math.cos(t) < -0.05) return 1;
        const zm = Math.abs((zs[i] + zs[i + 1]) / 2);
        if (t > 0.04 && t < 1.35 && zm < 0.035 + 0.085 * (t / 1.35)) return 2;
        return 0;
      },
    });
    g.add(new THREE.Mesh(geo, [M.paint, M.plasticSolid, M.gloss]));
    // 兩端的方向燈：沿著翼尖前緣、往外上揚的長水滴形
    [-1, 1].forEach((s) => {
      const lens = (off, grow) => {
        const rows = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8, z = s * lerp(0.13, 0.222, u);
          const t0 = lerp(-0.12, -0.45, u) - grow, t1 = lerp(0.1, 0.42, u) + grow;
          const row = [];
          for (let j = 0; j <= 8; j++) { const t = lerp(t0, t1, j / 8); row.push(hcPt(z, t).addScaledVector(hcNormal(z, t), off)); }
          rows.push(row);
        }
        return CY.G.skin(rows, { closed: false });
      };
      g.add(new THREE.Mesh(lens(0.0015, 0.04), M.gloss));
      g.add(new THREE.Mesh(lens(0.0025, 0), M.reflector));
      g.add(new THREE.Mesh(lens(0.0055, 0), M.lensClear));
      const bz = s * 0.196, bp = hcPt(bz, 0), bn = hcNormal(bz, 0);
      const bulb = add(g, new THREE.CircleGeometry(0.009, 16), M.lensAmber);
      bulb.position.copy(bp).addScaledVector(bn, 0.0035);
      bulb.quaternion.setFromUnitVectors(V(0, 0, 1), bn);
    });
    return g;
  };

  B.meter = () => {
    const g = grp('meter');
    const m = new THREE.Group();
    m.position.set(0.268, 0.984, 0);
    m.rotation.z = CY.U.deg(-56); // 面板朝騎士（往後上方）
    add(m, CY.G.rbox(0.012, 0.062, 0.158, 0.006), CY.M.gloss, -0.004, 0, 0);
    // LCD：用 canvas 貼圖，發動時由 run.js 更新
    const c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const lcdMat = CY.M.lcd.clone();
    lcdMat.map = tex;
    lcdMat.userData.selfLit = true;
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.138, 0.05), lcdMat);
    lcd.position.set(-0.0105, 0, 0);
    lcd.rotation.set(0, -Math.PI / 2, 0); // 平面 +z → 車體 -x，寬度沿車體 z
    lcd.userData.noMerge = true;
    m.add(lcd);
    CY.anim.lcd = { canvas: c, tex, mat: lcdMat };
    g.add(m);
    return g;
  };

  // ---------- 後照鏡 ----------
  B.mirrors = () => {
    const g = grp('mirrors');
    [-1, 1].forEach((s) => {
      const side = grp('mirror' + s); side.userData.side = s;
      const a = V(0.29, 0.962, s * 0.205), b = V(0.262, 1.07, s * 0.252);
      side.add(CY.G.cylBetween(a, b, 0.0055, CY.M.blackMetal));
      add(side, CY.G.hexNut(0.014, 0.008), CY.M.steel, a.x, a.y + 0.004, a.z);
      const head = new THREE.Group();
      head.position.set(0.25, 1.088, s * 0.285);
      head.rotation.set(s * 0.12, s * -0.25, 0);
      const rings = [];
      [-0.012, -0.004, 0.006, 0.012].forEach((x, i) => rings.push(CY.G.sring(x, 0, 0, [0.058, 0.064, 0.064, 0.058][i], [0.034, 0.038, 0.038, 0.034][i], 32, 3.2, 'zy')));
      head.add(new THREE.Mesh(CY.G.skin(rings, { capStart: true, capEnd: true }), CY.M.gloss));
      const glass = add(head, new THREE.PlaneGeometry(0.11, 0.064), CY.M.mirror, -0.0125, 0, 0, 0, -Math.PI / 2, 0);
      glass.scale.set(1, 1, 1);
      side.add(head);
      g.add(side);
    });
    return g;
  };
})();
