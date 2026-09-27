// 燃油、進排氣與電系零件。
(function () {
  const B = CY.B;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };
  const tube = (g, pts, r, mat, radial) => { const m = new THREE.Mesh(CY.G.tube(pts, r, Math.max(16, pts.length * 12), radial || 8), mat); g.add(m); return m; };

  // ---------- 排氣管 ----------
  B.muffler = () => {
    const g = grp('muffler');
    const K = CY.K, M = CY.M;
    const port = K.eng(0.183, -0.07, 0);
    tube(g, [port, V(-0.05, 0.19, 0.01), V(-0.08, 0.135, 0.05), V(-0.18, 0.12, 0.12), V(-0.3, 0.135, 0.16), V(-0.38, 0.17, 0.18), V(-0.435, 0.205, 0.18)], 0.016, M.darkSteel, 12);
    add(g, CY.G.rbox(0.05, 0.008, 0.05, 0.004), M.steel, port.x, port.y - 0.004, 0);
    [-1, 1].forEach((s) => add(g, CY.G.hexNut(0.012, 0.007), M.steel, port.x, port.y - 0.01, s * 0.019));
    // 含氧感知器
    add(g, CY.G.hexNut(0.014, 0.01), M.steel, -0.047, 0.2, 0.025, 0.4, 0, 1.2);
    tube(g, [V(-0.04, 0.205, 0.035), V(-0.03, 0.24, 0.07), V(-0.06, 0.3, 0.1)], 0.003, M.wire);
    // 本體（沿斜軸的截面）
    const P0 = V(-0.42, 0.2, 0.18), P1 = V(-0.885, 0.305, 0.18);
    const rings = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const c = P0.clone().lerp(P1, u);
      const taper = u < 0.14 ? 0.35 + 0.65 * Math.sin((u / 0.14) * Math.PI / 2) : u > 0.93 ? 1 - (u - 0.93) * 3 : 1;
      rings.push(CY.G.sring(c.x, c.y, c.z, 0.058 * taper, 0.066 * taper, 32, 2.6, 'zy'));
    }
    g.add(new THREE.Mesh(CY.G.skin(rings, { capStart: true, capEnd: true }), M.darkSteel));
    // 外側隔熱護片
    const rows = [];
    for (let i = 0; i <= 14; i++) {
      const u = 0.12 + (0.7 * i) / 14;
      const c = P0.clone().lerp(P1, u), row = [];
      for (let j = 0; j <= 10; j++) {
        const a = CY.U.deg(-55 + (120 * j) / 10);
        row.push(V(c.x, c.y + 0.074 * Math.sin(a), c.z + 0.066 * Math.cos(a)));
      }
      rows.push(row);
    }
    g.add(new THREE.Mesh(CY.G.skin(rows, { closed: false }), M.plastic));
    // 尾端蓋與尾管
    const dir = P1.clone().sub(P0).normalize();
    const cap = add(g, CY.G.cyl(0.05, 0.056, 0.02, 32), M.chrome);
    CY.G.place(cap, P1.clone().addScaledVector(dir, -0.03), P1.clone().addScaledVector(dir, -0.01));
    g.add(CY.G.cylBetween(P1.clone().addScaledVector(dir, -0.02), P1.clone().addScaledVector(dir, 0.045), 0.017, M.chrome, 20));
    CY.anim.exhaustTip = P1.clone().addScaledVector(dir, 0.05);
    CY.anim.exhaustDir = dir.clone();
    // 固定座
    add(g, CY.G.box(0.05, 0.03, 0.06), M.darkSteel, -0.62, 0.265, 0.13);
    return g;
  };

  // ---------- 空氣濾清器 ----------
  B.air_cleaner = () => {
    const g = grp('air_cleaner');
    const M = CY.M;
    add(g, CY.G.rbox(0.27, 0.13, 0.115, 0.02), M.plasticSolid, -0.36, 0.467, -0.157);
    add(g, CY.G.rbox(0.25, 0.115, 0.012, 0.01), M.gloss, -0.36, 0.467, -0.218);
    [[-0.47, 0.515], [-0.36, 0.52], [-0.25, 0.515], [-0.47, 0.418], [-0.36, 0.414], [-0.25, 0.418]].forEach(([x, y]) => add(g, CY.G.cyl(0.005, 0.005, 0.004, 10), M.steel, x, y, -0.225, Math.PI / 2, 0, 0));
    tube(g, [V(-0.235, 0.52, -0.16), V(-0.22, 0.56, -0.15), V(-0.19, 0.585, -0.13)], 0.02, M.plasticSolid, 12);
    tube(g, [V(-0.235, 0.46, -0.115), V(-0.19, 0.445, -0.055), V(-0.162, 0.437, -0.005)], 0.02, M.rubber, 12);
    return g;
  };

  // ---------- 節流閥體、噴油嘴、進氣歧管 ----------
  B.throttle_body = () => {
    const g = grp('throttle_body');
    const M = CY.M;
    g.add(CY.G.cylBetween(V(-0.105, 0.437, 0), V(-0.16, 0.437, 0), 0.021, M.cast, 24));
    add(g, CY.G.cyl(0.017, 0.017, 0.006, 20), M.alu, -0.13, 0.44, 0.026, Math.PI / 2, 0, 0);
    add(g, CY.G.rbox(0.03, 0.03, 0.012, 0.004), M.gloss, -0.13, 0.44, -0.027);
    // 油門線：沿車架下管、腳踏板下方繞到節流閥（藏在車殼內）
    tube(g, [V(-0.13, 0.456, 0.03), V(-0.08, 0.4, 0.08), V(0.0, 0.3, 0.1), V(0.2, 0.235, 0.1), V(0.42, 0.3, 0.08), V(0.47, 0.5, 0.06), V(0.45, 0.72, 0.08), V(0.42, 0.9, 0.1)], 0.004, M.hose, 6);
    return g;
  };
  B.intake_manifold = () => {
    const g = grp('intake_manifold');
    const K = CY.K, M = CY.M;
    const port = K.eng(0.183, 0.07, 0);
    tube(g, [K.eng(0.183, 0.066, 0), V(port.x + 0.001, 0.405, 0), V(-0.09, 0.428, 0), V(-0.105, 0.437, 0)], 0.018, M.cast, 16);
    const fl = add(g, CY.G.rbox(0.04, 0.008, 0.05, 0.004), M.cast, port.x, port.y + 0.002, 0);
    fl.rotation.z = K.CYL;
    [-1, 1].forEach((s) => add(g, CY.G.cyl(0.005, 0.005, 0.006, 6), M.steel, port.x, port.y + 0.008, s * 0.018));
    return g;
  };
  B.injector = () => {
    const g = grp('injector');
    const M = CY.M;
    g.add(CY.G.cylBetween(V(-0.066, 0.448, 0.022), V(-0.077, 0.41, 0.008), 0.0075, M.gloss, 14));
    add(g, CY.G.rbox(0.016, 0.014, 0.022, 0.003), M.grey, -0.064, 0.455, 0.024);
    add(g, CY.G.hexNut(0.01, 0.006), M.steel, -0.07, 0.43, 0.024);
    tube(g, [V(-0.063, 0.458, 0.03), V(0.0, 0.47, 0.055), V(0.06, 0.41, 0.07), V(0.14, 0.34, 0.065), V(0.22, 0.33, 0.055), V(0.29, 0.325, 0.045)], 0.005, M.hose, 8);
    return g;
  };

  // ---------- 油箱與汽油泵 ----------
  B.fuel_tank = () => {
    const g = grp('fuel_tank');
    const M = CY.M;
    add(g, CY.G.rbox(0.33, 0.12, 0.17, 0.03), M.grey, 0.245, 0.245, 0);
    tube(g, [V(0.1, 0.298, 0), V(0.075, 0.39, 0), V(0.04, 0.472, 0)], 0.02, M.grey, 14);
    const cap = add(g, CY.G.cyl(0.026, 0.026, 0.014, 24), M.chrome);
    CY.G.place(cap, V(0.043, 0.465, 0), V(0.034, 0.49, 0));
    [[0.1, 0.09], [0.1, -0.09], [0.39, 0.09], [0.39, -0.09]].forEach(([x, z]) => add(g, CY.G.box(0.03, 0.006, 0.03), M.grey, x, 0.3, z));
    return g;
  };
  B.fuel_pump = () => {
    const g = grp('fuel_pump');
    const M = CY.M;
    add(g, CY.G.cyl(0.036, 0.036, 0.006, 28), M.gloss, 0.3, 0.308, 0.03);
    add(g, CY.G.rbox(0.022, 0.014, 0.02, 0.004), M.grey, 0.3, 0.318, 0.012);
    add(g, CY.G.cyl(0.005, 0.005, 0.016, 10), M.steel, 0.29, 0.318, 0.045);
    add(g, CY.G.cyl(0.02, 0.02, 0.09, 20), M.grey, 0.3, 0.26, 0.03);
    [0, 1, 2, 3].forEach((k) => { const a = (k / 4) * Math.PI * 2 + 0.4; add(g, CY.G.hexNut(0.007, 0.004), M.steel, 0.3 + 0.03 * Math.cos(a), 0.313, 0.03 + 0.03 * Math.sin(a)); });
    return g;
  };

  // ---------- 電瓶 ----------
  B.battery = () => {
    const g = grp('battery');
    const M = CY.M;
    add(g, CY.G.rbox(0.07, 0.105, 0.113, 0.004), M.gloss, -0.805, 0.625, 0);
    add(g, CY.G.box(0.05, 0.06, 0.001), M.yellowCap, -0.805, 0.63, 0.057);
    add(g, CY.G.box(0.05, 0.06, 0.001), M.yellowCap, -0.805, 0.63, -0.057);
    add(g, CY.G.rbox(0.014, 0.012, 0.016, 0.003), M.redCap, -0.805, 0.683, 0.04);
    tube(g, [V(-0.805, 0.69, 0.04), V(-0.785, 0.705, 0.07), V(-0.745, 0.66, 0.09), V(-0.735, 0.645, 0.095)], 0.005, M.wireRed);
    add(g, CY.G.rbox(0.03, 0.025, 0.02, 0.004), M.gloss, -0.73, 0.64, 0.1);
    return g;
  };
  B.battery_neg = () => {
    const g = grp('battery_neg');
    const M = CY.M;
    add(g, CY.G.rbox(0.014, 0.01, 0.016, 0.003), M.gloss, -0.805, 0.682, -0.04);
    add(g, CY.G.cyl(0.004, 0.004, 0.006, 8), M.steel, -0.805, 0.69, -0.04);
    tube(g, [V(-0.805, 0.69, -0.04), V(-0.785, 0.706, -0.07), V(-0.75, 0.66, -0.095), V(-0.735, 0.64, -0.105)], 0.005, M.wire);
    add(g, CY.G.cyl(0.008, 0.008, 0.003, 12), M.copper, -0.733, 0.636, -0.106, Math.PI / 2, 0, 0);
    return g;
  };
  B.ecu = () => {
    const g = grp('ecu');
    const M = CY.M;
    add(g, CY.G.rbox(0.03, 0.085, 0.065, 0.004), M.gloss, -0.742, 0.62, -0.09);
    add(g, CY.G.rbox(0.02, 0.02, 0.05, 0.004), M.grey, -0.742, 0.67, -0.09);
    return g;
  };
  B.regulator = () => {
    const g = grp('regulator');
    const M = CY.M;
    add(g, CY.G.box(0.06, 0.05, 0.012), M.alu, -0.3, 0.5, 0.162);
    for (let k = -2; k <= 2; k++) add(g, CY.G.box(0.06, 0.004, 0.01), M.alu, -0.3, 0.5 + k * 0.01, 0.172);
    add(g, CY.G.rbox(0.02, 0.018, 0.012, 0.003), M.gloss, -0.26, 0.515, 0.158);
    return g;
  };
  B.ignition_coil = () => {
    const g = grp('ignition_coil');
    const M = CY.M;
    add(g, CY.G.rbox(0.05, 0.035, 0.03, 0.006), M.gloss, -0.1, 0.476, 0.125);
    add(g, CY.G.box(0.02, 0.006, 0.03), M.steel, -0.13, 0.476, 0.125);
    const { base, dir } = CY.plugFrame();
    const capStart = base.clone().addScaledVector(dir, 0.042);
    const capEnd = base.clone().addScaledVector(dir, 0.08);
    g.add(CY.G.cylBetween(capStart, capEnd, 0.011, M.rubber, 16));
    tube(g, [V(-0.078, 0.476, 0.125), V(-0.06, 0.45, 0.12), capEnd.clone().addScaledVector(dir, 0.012), capEnd], 0.0045, M.wire);
    return g;
  };
  B.horn = () => {
    const g = grp('horn');
    const M = CY.M;
    add(g, CY.G.cyl(0.036, 0.034, 0.022, 28), M.gloss, 0.605, 0.565, 0.055, 0, 0, -Math.PI / 2 + 0.3);
    add(g, CY.G.cyl(0.012, 0.012, 0.024, 16), M.steel, 0.607, 0.565, 0.055, 0, 0, -Math.PI / 2 + 0.3);
    add(g, CY.G.box(0.1, 0.012, 0.004), M.steel, 0.545, 0.57, 0.03, 0, 0.3, 0);
    return g;
  };

  // ---------- 主線組 ----------
  B.wire_harness = () => {
    const g = grp('wire_harness');
    const M = CY.M;
    tube(g, [V(0.36, 0.84, -0.05), V(0.44, 0.7, -0.035), V(0.47, 0.55, -0.035), V(0.44, 0.36, -0.05), V(0.36, 0.23, -0.08), V(0.15, 0.2, -0.1),
      V(-0.03, 0.24, -0.11), V(-0.12, 0.37, -0.11), V(-0.3, 0.52, -0.115), V(-0.6, 0.595, -0.1), V(-0.72, 0.62, -0.08), V(-0.9, 0.655, -0.03), V(-0.94, 0.672, 0)], 0.008, M.wire, 8);
    tube(g, [V(-0.12, 0.37, -0.11), V(-0.12, 0.46, -0.02), V(-0.1, 0.47, 0.09), V(-0.1, 0.472, 0.108)], 0.005, M.wire);
    tube(g, [V(-0.3, 0.52, -0.115), V(-0.3, 0.535, 0.0), V(-0.28, 0.52, 0.14), V(-0.265, 0.515, 0.152)], 0.005, M.wire);
    tube(g, [V(-0.2, 0.44, -0.11), V(-0.21, 0.46, -0.06), V(-0.215, 0.458, -0.045)], 0.005, M.wire);
    tube(g, [V(0.47, 0.55, -0.035), V(0.54, 0.57, 0.0), V(0.59, 0.566, 0.05)], 0.004, M.wire);
    tube(g, [V(0.44, 0.7, -0.035), V(0.4, 0.76, 0.06), V(0.39, 0.78, 0.1)], 0.004, M.wire);
    tube(g, [V(0.15, 0.2, -0.1), V(0.22, 0.29, 0.0), V(0.3, 0.318, 0.012)], 0.004, M.wire);
    [V(0.44, 0.7, -0.035), V(-0.3, 0.52, -0.115), V(-0.72, 0.62, -0.08)].forEach((p) => add(g, CY.G.rbox(0.03, 0.02, 0.02, 0.004), M.lightGrey, p.x, p.y, p.z));
    return g;
  };
})();
