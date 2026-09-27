// 引擎：曲軸箱、曲軸連桿、活塞、汽缸、汽缸頭、汽門、凸輪、正時系統、發電機、風扇、導風罩。
// 汽缸相關零件建在「引擎座標」（X 沿汽缸軸、仰角 8°）裡。
(function () {
  const B = CY.B;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };
  const zcyl = (r, len, seg) => { const geo = CY.G.cyl(r, r, len, seg || 20); geo.rotateX(Math.PI / 2); return geo; };
  const xcyl = (r, len, seg) => { const geo = CY.G.cyl(r, r, len, seg || 20); geo.rotateZ(-Math.PI / 2); return geo; };
  // 圓角方形（可含圓孔）沿引擎 X 擠出
  function xSquare(w, h, depth, r, holeR, bevel) {
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    s.moveTo(-hw + r, -hh);
    s.lineTo(hw - r, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + r);
    s.lineTo(hw, hh - r); s.quadraticCurveTo(hw, hh, hw - r, hh);
    s.lineTo(-hw + r, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - r);
    s.lineTo(-hw, -hh + r); s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    if (holeR) { const p = new THREE.Path(); p.absarc(0, 0, holeR, 0, Math.PI * 2, true); s.holes.push(p); }
    const geo = CY.G.extrude(s, depth, { bevel: bevel || 0, curveSegments: 12 });
    geo.rotateY(Math.PI / 2); // 擠出方向 z → X；形狀 x → -Z、y → Y
    return geo;
  }
  function xFrame(w, h, depth, r, iw, ih) {
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    s.moveTo(-hw + r, -hh); s.lineTo(hw - r, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + r); s.lineTo(hw, hh - r);
    s.quadraticCurveTo(hw, hh, hw - r, hh); s.lineTo(-hw + r, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - r); s.lineTo(-hw, -hh + r); s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    const iwh = iw / 2, ihh = ih / 2, ir = r * 0.6;
    const p = new THREE.Path();
    p.moveTo(-iwh + ir, -ihh); p.lineTo(-iwh, -ihh + ir); p.lineTo(-iwh, ihh - ir); p.lineTo(-iwh + ir, ihh); p.lineTo(iwh - ir, ihh); p.lineTo(iwh, ihh - ir); p.lineTo(iwh, -ihh + ir); p.lineTo(iwh - ir, -ihh); p.closePath();
    s.holes.push(p);
    const geo = CY.G.extrude(s, depth, { curveSegments: 10 });
    geo.rotateY(Math.PI / 2);
    return geo;
  }

  // ---------- 左曲軸箱（含傳動箱） ----------
  B.crankcase_l = () => {
    const g = grp('crankcase_l');
    const K = CY.K, M = CY.M;
    const cx1 = K.C.x, cy1 = K.C.y, cx2 = -0.6, cy2 = 0.255;
    const wall = CY.G.extrude(CY.G.capsuleShape(cx1, cy1, 0.108, cx2, cy2, 0.098), 0.005);
    add(g, wall, M.case, 0, 0, -0.075);
    const rimS = CY.G.capsuleShape(cx1, cy1, 0.108, cx2, cy2, 0.098);
    rimS.holes.push(CY.G.capsulePath(cx1, cy1, 0.1, cx2, cy2, 0.09));
    add(g, CY.G.extrude(rimS, 0.065), M.case, 0, 0, -0.14);
    // 曲軸室左半
    add(g, CY.G.rbox(0.155, 0.22, 0.075, 0.03), M.case, -0.2625, 0.28, -0.0375);
    const eg = K.engGroup(); g.add(eg);
    const mouth = xSquare(0.09, 0.09, 0.03, 0.015, 0, 0);
    const mouthMesh = add(eg, mouth, M.case, 0.03, 0, 0);
    mouthMesh.scale.set(1, 1, 0.5); mouthMesh.position.z = -0.0225;
    // 吊架軸座
    add(g, zcyl(0.019, 0.06, 20), M.case, -0.145, 0.196, -0.03);
    add(g, CY.G.box(0.06, 0.03, 0.05), M.case, -0.18, 0.2, -0.03);
    // 左後避震下座
    add(g, CY.G.box(0.04, 0.06, 0.012), M.case, -0.688, 0.31, -0.122);
    add(g, zcyl(0.011, 0.03, 12), M.case, -0.69, 0.33, -0.125);
    // 中柱座
    add(g, zcyl(0.014, 0.03, 12), M.case, -0.31, 0.168, -0.085);
    // 後輪軸座（齒輪箱背面）
    add(g, zcyl(0.03, 0.01, 20), M.case, K.RA.x, K.RA.y, -0.07);
    // 汽缸基座螺柱
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => add(eg, xcyl(0.003, 0.2, 6), M.steel, 0.1, a * 0.032, b * 0.032 - 0.004));
    return g;
  };

  // ---------- 右曲軸箱 ----------
  B.crankcase_r = () => {
    const g = grp('crankcase_r');
    const K = CY.K, M = CY.M;
    add(g, CY.G.rbox(0.155, 0.22, 0.085, 0.03), M.case, -0.2625, 0.28, 0.0425);
    const eg = K.engGroup(); g.add(eg);
    const mouthMesh = add(eg, xSquare(0.09, 0.09, 0.03, 0.015, 0, 0), M.case, 0.03, 0, 0);
    mouthMesh.scale.set(1, 1, 0.5); mouthMesh.position.z = 0.0225;
    add(g, zcyl(0.019, 0.06, 20), M.case, -0.145, 0.196, 0.03);
    add(g, CY.G.box(0.06, 0.03, 0.05), M.case, -0.18, 0.2, 0.03);
    // 機油濾網蓋
    add(g, CY.G.cyl(0.022, 0.022, 0.012, 24), M.cast, -0.3, 0.166, 0.05);
    add(g, CY.G.hexNut(0.022, 0.006), M.cast, -0.3, 0.157, 0.05);
    // 機油尺座
    add(g, CY.G.cyl(0.013, 0.013, 0.014, 16), M.case, -0.19, 0.39, 0.065);
    // 後搖臂固定座
    [[-0.232, 0.205], [-0.33, 0.22]].forEach(([x, y]) => add(g, zcyl(0.012, 0.03, 12), M.case, x, y, 0.07));
    add(g, CY.G.box(0.12, 0.03, 0.018), M.case, -0.28, 0.21, 0.07);
    // 中柱座
    add(g, zcyl(0.014, 0.03, 12), M.case, -0.31, 0.168, 0.085);
    // 正時指針（對 T 記號用）
    const a = K.CYL;
    add(g, CY.G.box(0.012, 0.004, 0.004), M.yellowCap, K.C.x + 0.07 * Math.cos(a), K.C.y + 0.07 * Math.sin(a), 0.088, 0, 0, a);
    return g;
  };

  // ---------- 曲軸連桿組 ----------
  B.crankshaft = () => {
    const g = grp('crankshaft');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    const rot = new THREE.Group(); rot.userData.keep = true; eg.add(rot);
    add(rot, zcyl(0.011, 0.265, 16), M.steel, 0, 0, -0.0025);
    [-1, 1].forEach((s) => {
      const web = new THREE.Shape();
      web.absarc(0, 0, 0.047, CY.U.deg(40), CY.U.deg(320), false);
      web.absarc(0.02, 0, 0.022, CY.U.deg(-60), CY.U.deg(60), false);
      web.closePath();
      // 大半圓在 -X（配重），+X 側收窄成曲柄銷座
      const geo = CY.G.extrude(web, 0.013, { bevel: 0.002 });
      add(rot, geo, M.steel, 0, 0, s > 0 ? 0.0225 : -0.0355);
    });
    add(rot, zcyl(0.0095, 0.046, 16), M.chrome, K.CRANK_R, 0, 0);
    const spr = CY.G.extrude(CY.G.gearShape(0.0115, 0.0135, 14, 0.011), 0.007);
    add(rot, spr, M.steel, 0, 0, 0.0465);
    // 連桿
    const rod = new THREE.Group(); rod.userData.keep = true; eg.add(rod);
    const L = K.ROD;
    add(rod, CY.G.box(L - 0.02, 0.012, 0.011), M.steel, L / 2, 0, 0);
    add(rod, zcyl(0.018, 0.017, 20), M.steel, 0, 0, 0);
    add(rod, zcyl(0.0095, 0.016, 16), M.steel, L, 0, 0);
    CY.anim.crank = rot; CY.anim.conrod = rod;
    return g;
  };

  // ---------- 活塞 ----------
  B.piston = () => {
    const g = grp('piston');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    const p = new THREE.Group(); p.userData.keep = true; eg.add(p);
    add(p, xcyl(0.0259, 0.034, 32), M.alu, 0.001, 0, 0);
    [0.0145, 0.011, 0.0065].forEach((x) => add(p, xcyl(0.02605, 0.0014, 32), M.darkSteel, x, 0, 0));
    add(p, zcyl(0.0065, 0.046, 16), M.chrome, 0, 0, 0);
    add(p, CY.G.cyl(0.024, 0.0255, 0.003, 32), M.alu, 0.0185, 0, 0, 0, 0, -Math.PI / 2);
    p.position.x = K.slider(0).X;
    CY.anim.piston = p;
    return g;
  };

  // ---------- 汽缸 ----------
  B.cylinder = () => {
    const g = grp('cylinder');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    add(eg, xSquare(0.078, 0.078, 0.085, 0.012, 0.0262), M.cast, 0.06, 0, 0);
    for (let k = 0; k < 8; k++) add(eg, xSquare(0.112, 0.11, 0.0032, 0.02, 0.03), M.fins, 0.066 + k * 0.0105, 0, 0);
    add(eg, CY.G.box(0.085, 0.036, 0.022), M.cast, 0.1025, 0, 0.047); // 正時鏈條通道
    return g;
  };

  // ---------- 汽缸頭 ----------
  B.cyl_head = () => {
    const g = grp('cyl_head');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    add(eg, xSquare(0.13, 0.11, 0.05, 0.016, 0, 0.003), M.cast, 0.145, 0, 0.004);
    for (let k = 0; k < 4; k++) add(eg, xSquare(0.146, 0.126, 0.003, 0.02, 0), M.fins, 0.151 + k * 0.011, 0, 0.004);
    add(eg, xFrame(0.13, 0.115, 0.025, 0.016, 0.11, 0.086), M.cast, 0.195, 0, 0.004);
    // 進氣口（上）、排氣口（下）
    add(eg, CY.G.cyl(0.017, 0.017, 0.024, 20), M.cast, 0.183, 0.064, 0);
    add(eg, CY.G.rbox(0.04, 0.008, 0.05, 0.004), M.cast, 0.183, 0.074, 0);
    add(eg, CY.G.cyl(0.016, 0.016, 0.02, 20), M.cast, 0.183, -0.062, 0);
    add(eg, CY.G.rbox(0.036, 0.008, 0.05, 0.004), M.cast, 0.183, -0.072, 0);
    [-1, 1].forEach((s) => add(eg, CY.G.cyl(0.003, 0.003, 0.02, 6), M.steel, 0.183, -0.078, s * 0.019));
    // 火星塞座
    const boss = add(eg, CY.G.cyl(0.013, 0.013, 0.03, 16), M.cast, 0.172, 0.016, 0.07);
    boss.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0.3, 1).normalize());
    // 汽缸頭螺帽（在汽門室四角）
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => add(eg, CY.G.hexNut(0.012, 0.007), M.steel, 0.198, a * 0.036, b * 0.044 + 0.004, 0, 0, -Math.PI / 2));
    return g;
  };

  // ---------- 汽門組（掛在汽缸頭裡） ----------
  B.valves = () => {
    const g = grp('valves');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    CY.anim.valves = [];
    const mk = (type, base, dir, z, headR) => {
      const vg = new THREE.Group(); vg.userData.keep = true;
      const b = V(base[0], base[1], z);
      vg.position.copy(b);
      vg.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      add(vg, CY.G.cyl(headR, headR, 0.0022, 24), M.steel, 0, 0, 0);
      add(vg, CY.G.cyl(0.003, headR * 0.8, 0.008, 16), M.steel, 0, 0.005, 0);
      add(vg, CY.G.cyl(0.0025, 0.0025, 0.062, 8), M.steel, 0, 0.034, 0);
      const spring = new THREE.Mesh(CY.G.helix(0.0075, 0.024, 6, 0.0011, 12), M.darkSteel);
      spring.position.y = 0.034;
      vg.add(spring);
      add(vg, CY.G.cyl(0.0085, 0.006, 0.004, 16), M.steel, 0, 0.06, 0);
      eg.add(vg);
      CY.anim.valves.push({ g: vg, base: b.clone(), dir: dir.clone(), type });
    };
    const dIn = V(0.057, 0.017, 0).normalize(), dEx = V(0.057, -0.017, 0).normalize();
    [-1, 1].forEach((s) => {
      mk('in', [0.1456, 0.0135], dIn, s * 0.0115, 0.0105);
      mk('ex', [0.1456, -0.0135], dEx, s * 0.0105, 0.009);
    });
    return g;
  };

  // ---------- 汽門室蓋 ----------
  B.head_cover = () => {
    const g = grp('head_cover');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    add(eg, CY.G.rbox(0.035, 0.118, 0.13, 0.012), M.cast, 0.2375, 0, 0.004);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => add(eg, CY.G.hexNut(0.01, 0.005), M.steel, 0.256, a * 0.044, b * 0.044 + 0.004, 0, 0, -Math.PI / 2));
    [-1, 1].forEach((s) => add(eg, CY.G.cyl(0.013, 0.013, 0.008, 20), M.alu, 0.236, s * 0.061, 0.004));
    return g;
  };

  // ---------- 凸輪軸與搖臂 ----------
  B.camshaft = () => {
    const g = grp('camshaft');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    const rot = new THREE.Group(); rot.userData.keep = true;
    rot.position.set(0.207, 0, 0);
    eg.add(rot);
    add(rot, zcyl(0.008, 0.085, 14), M.steel, 0, 0, 0.003);
    const lobe = () => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.0105, CY.U.deg(50), CY.U.deg(310), false);
      s.absarc(0.0085, 0, 0.0045, CY.U.deg(-55), CY.U.deg(55), false);
      s.closePath();
      return CY.G.extrude(s, 0.008);
    };
    const li = add(rot, lobe(), M.steel, 0, 0, 0.004); li.rotation.z = 0;
    const le = add(rot, lobe(), M.steel, 0, 0, -0.014); le.rotation.z = Math.PI * 0.72;
    [-1, 1].forEach((s) => {
      add(eg, CY.G.rbox(0.012, 0.009, 0.034, 0.003), M.steel, 0.214, s * 0.03, 0);
      add(eg, zcyl(0.004, 0.06, 10), M.steel, 0.214, s * 0.036, 0.004);
    });
    CY.anim.cam = rot;
    return g;
  };

  B.cam_sprocket = () => {
    const g = grp('cam_sprocket');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    const rot = new THREE.Group(); rot.userData.keep = true;
    rot.position.set(0.207, 0, 0.05);
    eg.add(rot);
    add(rot, CY.G.extrude(CY.G.gearShape(0.0265, 0.0292, 28, 0.006), 0.006), M.steel, 0, 0, -0.003);
    add(rot, CY.G.hexNut(0.01, 0.005), M.steel, 0, 0, 0.006, Math.PI / 2, 0, 0);
    add(rot, CY.G.box(0.012, 0.002, 0.001), M.ceramic, 0.018, 0, 0.0035); // 正時記號
    CY.anim.camSprocket = rot;
    return g;
  };

  B.cam_chain = () => {
    const g = grp('cam_chain');
    const K = CY.K;
    const eg = K.engGroup(); g.add(eg);
    const path = CY.G.beltPath({ x: 0, y: 0 }, 0.0135, { x: 0.207, y: 0 }, 0.0292, 0.05, 0.004);
    const mat = CY.M.chain.clone();
    mat.map = CY.M.chain.map.clone(); mat.map.needsUpdate = true;
    mat.map.repeat.set(1, 52);
    const m = new THREE.Mesh(CY.G.band(path, 0.0075, 0.0045), mat);
    eg.add(m);
    CY.anim.camChainTex = mat.map;
    return g;
  };

  B.tensioner = () => {
    const g = grp('tensioner');
    const K = CY.K, M = CY.M;
    const eg = K.engGroup(); g.add(eg);
    add(eg, CY.G.cyl(0.009, 0.009, 0.036, 16), M.cast, 0.11, 0.058, 0.05);
    add(eg, CY.G.rbox(0.036, 0.006, 0.024, 0.004), M.cast, 0.11, 0.04, 0.05);
    [-1, 1].forEach((s) => add(eg, CY.G.hexNut(0.008, 0.004), M.steel, 0.11 + s * 0.014, 0.044, 0.05));
    add(eg, CY.G.hexNut(0.01, 0.005), M.steel, 0.11, 0.078, 0.05);
    return g;
  };

  // ---------- 飛輪、定子、風扇 ----------
  B.flywheel = () => {
    const g = grp('flywheel');
    const K = CY.K, M = CY.M;
    const rot = new THREE.Group(); rot.userData.keep = true;
    rot.position.copy(K.C);
    g.add(rot);
    const rim = new THREE.CylinderGeometry(0.062, 0.062, 0.036, 48, 1, true); rim.rotateX(Math.PI / 2);
    add(rot, rim, M.blackMetal, 0, 0, 0.105);
    add(rot, zcyl(0.062, 0.004, 48), M.darkSteel, 0, 0, 0.123);
    add(rot, zcyl(0.02, 0.012, 20), M.steel, 0, 0, 0.13);
    add(rot, CY.G.hexNut(0.017, 0.008), M.steel, 0, 0, 0.139, Math.PI / 2, 0, 0);
    // T 記號（上死點）
    const a = K.CYL;
    add(rot, CY.G.box(0.004, 0.004, 0.02), M.ceramic, 0.0628 * Math.cos(a), 0.0628 * Math.sin(a), 0.1, 0, 0, a);
    CY.anim.flywheel = rot;
    return g;
  };

  B.stator = () => {
    const g = grp('stator');
    const K = CY.K, M = CY.M;
    const h = new THREE.Group(); h.position.copy(K.C); g.add(h);
    add(h, CY.G.extrude(CY.G.ringShape(0.027, 0.017), 0.016), M.darkSteel, 0, 0, 0.088);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      add(h, CY.G.box(0.021, 0.008, 0.016), M.darkSteel, 0.037 * Math.cos(a), 0.037 * Math.sin(a), 0.096, 0, 0, a);
      add(h, CY.G.box(0.013, 0.014, 0.019), M.copper, 0.035 * Math.cos(a), 0.035 * Math.sin(a), 0.096, 0, 0, a);
    }
    add(h, CY.G.rbox(0.014, 0.01, 0.016, 0.003), M.gloss, 0.068 * Math.cos(1.7), 0.068 * Math.sin(1.7), 0.096);
    g.add(new THREE.Mesh(CY.G.tube([V(K.C.x + 0.02, K.C.y + 0.03, 0.096), V(K.C.x + 0.05, K.C.y + 0.075, 0.09), V(-0.17, 0.395, 0.07)], 0.005, 16, 6), M.wire));
    return g;
  };

  B.cooling_fan = () => {
    const g = grp('cooling_fan');
    const K = CY.K, M = CY.M;
    const rot = new THREE.Group(); rot.userData.keep = true;
    rot.position.copy(K.C);
    g.add(rot);
    add(rot, zcyl(0.03, 0.02, 24), M.fanPlastic, 0, 0, 0.136);
    const ring = new THREE.CylinderGeometry(0.074, 0.074, 0.02, 48, 1, true); ring.rotateX(Math.PI / 2);
    add(rot, ring, M.fanPlastic, 0, 0, 0.136).material.side = THREE.DoubleSide;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const b = new THREE.Group(); b.rotation.z = a; rot.add(b);
      add(b, CY.G.box(0.046, 0.003, 0.018), M.fanPlastic, 0.052, 0, 0.136, 0.55, 0, 0);
    }
    [0, 1, 2, 3].forEach((k) => { const a = (k / 4) * Math.PI * 2 + 0.4; add(rot, zcyl(0.005, 0.006, 8), M.steel, 0.022 * Math.cos(a), 0.022 * Math.sin(a), 0.147); });
    CY.anim.fan = rot;
    return g;
  };

  // ---------- 導風罩 ----------
  B.shroud = () => {
    const g = grp('shroud');
    const K = CY.K, M = CY.M;
    const h = new THREE.Group(); h.position.copy(K.C); g.add(h);
    const shell = new THREE.CylinderGeometry(0.088, 0.088, 0.075, 44, 1, true); shell.rotateX(Math.PI / 2);
    add(h, shell, M.plastic, 0, 0, 0.1225);
    add(h, new THREE.RingGeometry(0.03, 0.088, 44), M.grilleMat, 0, 0, 0.16);
    const eg = K.engGroup(); g.add(eg);
    add(eg, CY.G.rbox(0.155, 0.155, 0.165, 0.03), M.plasticSolid, 0.125, 0, 0.01);
    add(g, CY.G.rbox(0.13, 0.16, 0.09, 0.03), M.plasticSolid, -0.185, 0.28, 0.115);
    [[0.08, 0.075, 0.07], [0.17, 0.075, 0.07], [0.08, -0.075, 0.07], [0.17, -0.075, 0.07]].forEach(([x, y, z]) => add(eg, CY.G.cyl(0.005, 0.005, 0.004, 10), M.steel, x, y + Math.sign(y) * 0.003, z));
    return g;
  };

  // ---------- 火星塞 ----------
  CY.plugFrame = () => {
    const K = CY.K;
    const base = K.eng(0.172, 0.012, 0.05);
    const dLocal = V(0, 0.3, 1).normalize();
    const dir = dLocal.clone().applyAxisAngle(V(0, 0, 1), K.CYL);
    return { base, dir };
  };
  B.spark_plug = () => {
    const g = grp('spark_plug');
    const M = CY.M;
    const { base, dir } = CY.plugFrame();
    const p = new THREE.Group();
    p.position.copy(base);
    p.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    g.add(p);
    add(p, CY.G.cyl(0.005, 0.005, 0.019, 12), M.steel, 0, 0.0095, 0);
    add(p, CY.G.hexNut(0.016, 0.009), M.zinc, 0, 0.0235, 0);
    add(p, CY.G.cyl(0.0055, 0.0065, 0.024, 14), M.ceramic, 0, 0.04, 0);
    add(p, CY.G.cyl(0.0022, 0.0022, 0.008, 8), M.steel, 0, 0.056, 0);
    return g;
  };

  B.dipstick = () => {
    const g = grp('dipstick');
    add(g, CY.G.cyl(0.012, 0.012, 0.014, 18), CY.M.yellowCap, -0.19, 0.404, 0.065);
    add(g, CY.G.box(0.03, 0.012, 0.007), CY.M.yellowCap, -0.19, 0.416, 0.065);
    return g;
  };
  B.oil_drain = () => {
    const g = grp('oil_drain');
    add(g, CY.G.hexNut(0.017, 0.008), CY.M.steel, -0.265, 0.163, 0.03);
    add(g, CY.G.cyl(0.011, 0.011, 0.002, 16), CY.M.copper, -0.265, 0.168, 0.03);
    return g;
  };

  B.starter_motor = () => {
    const g = grp('starter_motor');
    const M = CY.M;
    add(g, zcyl(0.028, 0.09, 24), M.gloss, -0.215, 0.426, -0.025);
    add(g, zcyl(0.024, 0.01, 24), M.alu, -0.215, 0.426, -0.074);
    add(g, CY.G.rbox(0.07, 0.02, 0.012, 0.004), M.alu, -0.215, 0.41, 0.024);
    add(g, CY.G.cyl(0.006, 0.006, 0.014, 10), M.redCap, -0.215, 0.458, -0.04);
    return g;
  };
})();
