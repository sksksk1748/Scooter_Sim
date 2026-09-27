// 傳動系統：傳動蓋、前後普利盤、皮帶、離合器、齒輪箱。
(function () {
  const B = CY.B;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };
  const zcyl = (r, len, seg) => { const geo = CY.G.cyl(r, r, len, seg || 20); geo.rotateX(Math.PI / 2); return geo; };
  const spinAt = (p) => { const s = new THREE.Group(); s.position.copy(p); s.userData.keep = true; return s; };
  // 旋轉體（封閉輪廓），profile: [[r, z], ...]
  const solidLathe = (prof, segs) => CY.G.latheZ(prof.concat([prof[0]]), segs || 48);

  B.cvt_cover = () => {
    const g = grp('cvt_cover');
    const K = CY.K, M = CY.M;
    const c = [K.C.x, K.C.y, 0.114, -0.6, 0.255, 0.104];
    add(g, CY.G.extrude(CY.G.capsuleShape(...c), 0.032, { bevel: 0.007 }), M.blackMetal, 0, 0, -0.172);
    // 外緣凸稜
    const ridge = CY.G.capsuleShape(K.C.x, K.C.y, 0.1, -0.6, 0.255, 0.09);
    ridge.holes.push(CY.G.capsulePath(K.C.x, K.C.y, 0.092, -0.6, 0.255, 0.082));
    add(g, CY.G.extrude(ridge, 0.004), M.blackMetal, 0, 0, -0.176);
    // 周圍螺栓
    const pts = CY.G.capsuleShape(K.C.x, K.C.y, 0.106, -0.6, 0.255, 0.096).getSpacedPoints(10);
    pts.slice(0, 10).forEach((p) => add(g, CY.G.hexNut(0.009, 0.005), M.steel, p.x, p.y, -0.1745, Math.PI / 2, 0, 0));
    // 腳踩軸座、裝飾銘板、傳動進氣管
    add(g, zcyl(0.018, 0.012, 20), M.blackMetal, -0.43, 0.27, -0.178);
    const plate = CY.G.extrude(CY.G.capsuleShape(-0.3, 0.3, 0.022, -0.2, 0.29, 0.02), 0.003);
    add(g, plate, M.alu, 0, 0, -0.1775);
    g.add(new THREE.Mesh(CY.G.tube([V(-0.235, 0.372, -0.165), V(-0.215, 0.42, -0.17), V(-0.18, 0.455, -0.16), V(-0.14, 0.47, -0.15)], 0.017, 24, 12), M.plastic));
    return g;
  };

  B.kick_lever = () => {
    const g = grp('kick_lever');
    const M = CY.M;
    add(g, zcyl(0.013, 0.02, 16), M.alu, -0.43, 0.27, -0.186);
    const arm = add(g, CY.G.rbox(0.11, 0.018, 0.012, 0.005), M.alu, -0.38, 0.29, -0.192);
    arm.rotation.z = 0.38;
    add(g, CY.G.rbox(0.04, 0.022, 0.03, 0.006), M.rubber, -0.325, 0.312, -0.205);
    return g;
  };

  B.drive_face = () => {
    const g = grp('drive_face');
    const K = CY.K, M = CY.M;
    const rot = spinAt(K.C); g.add(rot);
    add(rot, solidLathe([[0.013, -0.1035], [0.058, -0.11], [0.058, -0.114], [0.013, -0.114]]), M.alu);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      add(rot, CY.G.box(0.036, 0.004, 0.008), M.alu, 0.038 * Math.cos(a), 0.038 * Math.sin(a), -0.118, 0, 0, a + 0.25);
    }
    add(rot, CY.G.hexNut(0.017, 0.008), M.steel, 0, 0, -0.124, Math.PI / 2, 0, 0);
    CY.anim.driveFace = rot;
    return g;
  };

  B.variator = () => {
    const g = grp('variator');
    const K = CY.K, M = CY.M;
    const rot = spinAt(K.C); g.add(rot);
    add(rot, solidLathe([[0.013, -0.0965], [0.056, -0.0905], [0.056, -0.086], [0.05, -0.0785], [0.016, -0.078]]), M.alu);
    add(rot, zcyl(0.014, 0.02, 16), M.steel, 0, 0, -0.09);
    CY.anim.variator = rot;
    return g;
  };

  B.rollers = () => {
    const g = grp('rollers');
    const K = CY.K;
    const rot = spinAt(K.C); g.add(rot);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const r = add(rot, CY.G.cyl(0.0085, 0.0085, 0.012, 16), CY.M.roller, 0.034 * Math.cos(a), 0.034 * Math.sin(a), -0.083);
      r.rotation.z = a; // 軸向沿切線
    }
    CY.anim.rollers = rot;
    return g;
  };

  // 皮帶：可依變速比重建
  B.v_belt = () => {
    const g = grp('v_belt');
    const K = CY.K;
    const mat = CY.M.belt.clone();
    mat.bumpMap = CY.M.belt.bumpMap.clone(); mat.bumpMap.needsUpdate = true;
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.userData.noMerge = true;
    g.add(mesh);
    const belt = {
      mesh, rd: 0, rn: 0,
      set(rd, rn) {
        if (Math.abs(rd - this.rd) < 0.0008 && Math.abs(rn - this.rn) < 0.0008) return;
        this.rd = rd; this.rn = rn;
        const path = CY.G.beltPath({ x: K.C.x, y: K.C.y }, rd, { x: K.CL.x, y: K.CL.y }, rn, K.BELT_Z, 0.006);
        const geo = CY.G.band(path, 0.018, 0.008);
        mesh.geometry.dispose();
        mesh.geometry = geo;
      },
    };
    belt.set(0.028, 0.062);
    CY.anim.belt = belt;
    return g;
  };

  B.clutch_assy = () => {
    const g = grp('clutch_assy');
    const K = CY.K, M = CY.M;
    const rot = spinAt(K.CL); g.add(rot);
    add(rot, solidLathe([[0.02, -0.0965], [0.063, -0.0905], [0.063, -0.087], [0.02, -0.085]]), M.alu);
    add(rot, solidLathe([[0.02, -0.1035], [0.063, -0.1095], [0.063, -0.113], [0.02, -0.114]]), M.alu);
    add(rot, zcyl(0.016, 0.05, 16), M.steel, 0, 0, -0.1);
    const spr = CY.G.helix(0.027, 0.011, 2.6, 0.0028, 20);
    spr.rotateX(-Math.PI / 2);
    add(rot, spr, M.steel, 0, 0, -0.113);
    add(rot, zcyl(0.05, 0.004, 32), M.steel, 0, 0, -0.126);
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + 0.12, a1 = a0 + Math.PI * 2 / 3 - 0.24;
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.061, a0, a1, false);
      s.absarc(0, 0, 0.046, a1, a0, true);
      s.closePath();
      add(rot, CY.G.extrude(s, 0.008), M.pad, 0, 0, -0.131);
    }
    CY.anim.clutch = rot;
    return g;
  };

  B.clutch_bell = () => {
    const g = grp('clutch_bell');
    const K = CY.K, M = CY.M;
    const rot = spinAt(K.CL); g.add(rot);
    const cup = new THREE.CylinderGeometry(0.068, 0.068, 0.02, 48, 1, true); cup.rotateX(Math.PI / 2);
    const cm = add(rot, cup, M.darkSteel, 0, 0, -0.128);
    cm.material = M.blackMetal;
    add(rot, zcyl(0.068, 0.003, 48), M.darkSteel, 0, 0, -0.1385);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      add(rot, CY.G.box(0.04, 0.004, 0.004), M.steel, 0.042 * Math.cos(a), 0.042 * Math.sin(a), -0.141, 0, 0, a);
    }
    add(rot, CY.G.hexNut(0.014, 0.008), M.steel, 0, 0, -0.144, Math.PI / 2, 0, 0);
    CY.anim.bell = rot;
    return g;
  };

  B.gear_case = () => {
    const g = grp('gear_case');
    const K = CY.K, M = CY.M;
    const out = CY.G.capsuleShape(K.CL.x, K.CL.y, 0.046, K.RA.x, K.RA.y, 0.06);
    add(g, CY.G.extrude(out, 0.005, { bevel: 0.002 }), M.case, 0, 0, -0.049);
    const rim = CY.G.capsuleShape(K.CL.x, K.CL.y, 0.046, K.RA.x, K.RA.y, 0.06);
    rim.holes.push(CY.G.capsulePath(K.CL.x, K.CL.y, 0.04, K.RA.x, K.RA.y, 0.054));
    add(g, CY.G.extrude(rim, 0.024), M.case, 0, 0, -0.072);
    // 內部齒輪
    const gear = (x, y, r, t) => add(g, CY.G.extrude(CY.G.gearShape(r - 0.003, r, t, 0.006), 0.008), M.steel, x, y, -0.064);
    gear(K.CL.x, K.CL.y, 0.022, 18);
    gear((K.CL.x + K.RA.x) / 2 + 0.01, (K.CL.y + K.RA.y) / 2 - 0.035, 0.03, 24);
    gear(K.RA.x, K.RA.y, 0.045, 36);
    // 輸出軸（花鍵）
    add(g, zcyl(0.012, 0.075, 16), M.steel, K.RA.x, K.RA.y, -0.008);
    CY.G.capsuleShape(K.CL.x, K.CL.y, 0.04, K.RA.x, K.RA.y, 0.054).getSpacedPoints(7).slice(0, 7)
      .forEach((p) => add(g, CY.G.hexNut(0.009, 0.004), M.steel, p.x, p.y, -0.042, Math.PI / 2, 0, 0));
    return g;
  };

  B.gear_oil = () => {
    const g = grp('gear_oil');
    add(g, CY.G.hexNut(0.012, 0.007), CY.M.steel, -0.62, 0.183, -0.058);
    add(g, CY.G.cyl(0.008, 0.008, 0.002, 12), CY.M.copper, -0.62, 0.188, -0.058);
    return g;
  };
})();
