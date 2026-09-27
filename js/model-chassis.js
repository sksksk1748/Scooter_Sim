// 車架與底盤：車架、前叉、把手、輪子、煞車、避震、腳架。
(function () {
  const B = CY.B;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const grp = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };
  const zcyl = (r, len, seg) => { const geo = CY.G.cyl(r, r, len, seg || 20); geo.rotateX(Math.PI / 2); return geo; };

  // ---------- 車架 ----------
  B.frame = () => {
    const g = grp('frame');
    const K = CY.K, M = CY.M;
    const down = [V(0.49, 0.61, 0), V(0.482, 0.52, 0), V(0.462, 0.43, 0), V(0.436, 0.345, 0), V(0.405, 0.272, 0), V(0.365, 0.222, 0), V(0.32, 0.198, 0)];
    g.add(new THREE.Mesh(CY.G.tube(down, 0.021, 60, 12), M.frame));
    [-1, 1].forEach((s) => {
      const pts = [V(0.32, 0.198, 0), V(0.29, 0.182, 0.08 * s), V(0.2, 0.172, 0.118 * s), V(0.08, 0.172, 0.12 * s), V(-0.02, 0.205, 0.124 * s),
        V(-0.09, 0.325, 0.126 * s), V(-0.2, 0.44, 0.126 * s), V(-0.38, 0.555, 0.13 * s), V(-0.6, 0.605, 0.124 * s), V(-0.84, 0.64, 0.1 * s),
        V(-0.94, 0.648, 0.062 * s), V(-0.975, 0.65, 0)];
      g.add(new THREE.Mesh(CY.G.tube(pts, 0.0155, 140, 10), M.frame));
      // 後避震上座
      add(g, CY.G.box(0.04, 0.09, 0.006), M.frame, -0.58, 0.64, s * 0.118);
      add(g, zcyl(0.011, 0.03), M.frame, -0.58, 0.673, s * 0.126);
    });
    // 頭管
    g.add(CY.G.cylBetween(K.steer(0.35), K.steer(0.56), 0.028, M.frame, 20));
    // 頭管補強板
    const gus = CY.G.polyShape([[0, 0], [0.07, 0.05], [0.07, -0.06], [0.01, -0.1]]);
    const gm = add(g, CY.G.extrude(gus, 0.006), M.frame, 0.455, 0.63, -0.003);
    gm.rotation.z = -0.4;
    // 橫管
    g.add(CY.G.cylBetween(V(0.25, 0.176, -0.12), V(0.25, 0.176, 0.12), 0.012, M.frame));
    g.add(CY.G.cylBetween(V(-0.03, 0.212, -0.125), V(-0.03, 0.212, 0.125), 0.014, M.frame));
    g.add(CY.G.cylBetween(V(-0.45, 0.57, -0.13), V(-0.45, 0.57, 0.13), 0.011, M.frame));
    // 引擎吊架座
    [-1, 1].forEach((s) => add(g, CY.G.box(0.035, 0.04, 0.006), M.frame, -0.04, 0.198, s * 0.058));
    // 側柱座
    add(g, CY.G.box(0.05, 0.04, 0.008), M.frame, 0.0, 0.195, -0.128);
    // 電瓶托盤
    add(g, CY.G.box(0.09, 0.006, 0.16), M.frame, -0.805, 0.568, 0);
    // 車架號碼牌（小細節）
    add(g, CY.G.box(0.05, 0.02, 0.002), M.alu, 0.46, 0.5, 0.022, 0, 0, -1.3);
    return g;
  };

  // ---------- 前叉 ----------
  B.front_fork = () => {
    const g = grp('front_fork');
    const M = CY.M;
    const sg = CY.K.steerGroup();
    g.add(sg);
    [-1, 1].forEach((s) => {
      const z = s * 0.085;
      add(sg, CY.G.cyl(0.02, 0.021, 0.215, 20), M.cast, 0, 0.0825, z);
      add(sg, CY.G.rbox(0.05, 0.05, 0.045, 0.012), M.cast, 0, -0.005, z);
      add(sg, CY.G.cyl(0.0205, 0.0205, 0.012, 20), M.rubber, 0, 0.196, z);
      add(sg, CY.G.cyl(0.0135, 0.0135, 0.15, 16), M.chrome, 0, 0.265, z);
    });
    add(sg, CY.G.rbox(0.06, 0.032, 0.23, 0.01), M.blackMetal, 0.004, 0.33, 0);
    add(sg, CY.G.cyl(0.0135, 0.0135, 0.29, 16), M.steel, 0, 0.47, 0);
    add(sg, CY.G.cyl(0.03, 0.03, 0.012, 20), M.steel, 0, 0.345, 0);
    add(sg, CY.G.cyl(0.03, 0.03, 0.012, 20), M.steel, 0, 0.565, 0);
    add(sg, CY.G.hexNut(0.036, 0.014), M.steel, 0, 0.585, 0);
    return g;
  };

  // ---------- 把手 ----------
  B.handlebar = () => {
    const g = grp('handlebar');
    const K = CY.K, M = CY.M;
    g.add(CY.G.cylBetween(K.steer(0.6), K.steer(0.79), 0.017, M.blackMetal, 16));
    const bar = [V(0.262, 0.96, -0.335), V(0.278, 0.956, -0.25), V(0.298, 0.951, -0.12), V(0.302, 0.95, 0), V(0.298, 0.951, 0.12), V(0.278, 0.956, 0.25), V(0.262, 0.96, 0.335)];
    g.add(new THREE.Mesh(CY.G.tube(bar, 0.011, 60, 10), M.steel));
    [-1, 1].forEach((s) => {
      const grip = add(g, zcyl(0.0175, 0.084, 20), M.rubber, 0.266, 0.959, s * 0.298);
      grip.rotation.y = s * -0.12;
      add(g, zcyl(0.014, 0.012, 16), M.chrome, 0.26, 0.96, s * 0.343);
      add(g, CY.G.rbox(0.05, 0.045, 0.034, 0.01), M.gloss, 0.28, 0.955, s * 0.24);
    });
    add(g, CY.G.cyl(0.006, 0.006, 0.006, 12), M.redCap, 0.27, 0.975, 0.247, 0, 0, 0.6); // 啟動鈕
    add(g, CY.G.rbox(0.03, 0.02, 0.03, 0.006), M.gloss, 0.302, 0.955, 0);
    // 油門線（連到節流閥體那段屬於節流閥體）
    g.add(new THREE.Mesh(CY.G.tube([V(0.3, 0.95, 0.2), V(0.35, 0.94, 0.15), V(0.42, 0.9, 0.1)], 0.004, 16, 6), M.hose));
    return g;
  };

  B.brake_levers = () => {
    const g = grp('brake_levers');
    const M = CY.M;
    [-1, 1].forEach((s) => {
      add(g, CY.G.rbox(0.04, 0.03, 0.036, 0.006), M.castDark, 0.3, 0.97, s * 0.185);
      add(g, CY.G.box(0.034, 0.004, 0.028), M.gloss, 0.3, 0.987, s * 0.185);
      const lev = add(g, CY.G.rbox(0.012, 0.008, 0.14, 0.003), M.alu, 0.318, 0.954, s * 0.265);
      lev.rotation.y = s * 0.2;
    });
    // 前煞車油管：右手總泵 → 左前卡鉗
    g.add(new THREE.Mesh(CY.G.tube([V(0.3, 0.955, 0.17), V(0.36, 0.935, 0.12), V(0.44, 0.84, 0.06), V(0.49, 0.66, -0.02), V(0.52, 0.52, -0.07), V(0.55, 0.4, -0.09), V(0.558, 0.3, -0.07)], 0.0045, 70, 6), M.hose));
    // 後煞車油管：左手總泵 → 右後卡鉗（走車殼內側、腳踏板下方）
    g.add(new THREE.Mesh(CY.G.tube([V(0.3, 0.955, -0.17), V(0.37, 0.935, -0.12), V(0.45, 0.8, -0.08), V(0.47, 0.55, -0.06), V(0.43, 0.3, -0.09), V(0.36, 0.2, -0.12),
      V(0.1, 0.18, -0.1), V(-0.12, 0.15, 0.02), V(-0.35, 0.15, 0.07), V(-0.5, 0.2, 0.075), V(-0.57, 0.28, 0.06)], 0.0045, 130, 6), M.hose));
    return g;
  };

  // ---------- 輪子 ----------
  function wheel(R, W, rimR) {
    const spin = new THREE.Group();
    spin.userData.keep = true;
    const hw = W / 2;
    const prof = [
      [rimR, -hw * 0.78], [rimR + 0.012, -hw * 0.9], [rimR + 0.032, -hw], [R - 0.024, -hw * 0.97], [R - 0.01, -hw * 0.8],
      [R - 0.003, -hw * 0.5], [R, -hw * 0.15], [R, hw * 0.15], [R - 0.003, hw * 0.5], [R - 0.01, hw * 0.8],
      [R - 0.024, hw * 0.97], [rimR + 0.032, hw], [rimR + 0.012, hw * 0.9], [rimR, hw * 0.78],
    ];
    spin.add(new THREE.Mesh(CY.G.latheZ(prof, 72), CY.M.tire));
    const rw = hw * 0.85;
    const rimProf = [[rimR + 0.009, -rw], [rimR + 0.004, -rw + 0.004], [rimR - 0.004, -rw + 0.006], [rimR - 0.008, -rw * 0.5], [rimR - 0.01, 0],
      [rimR - 0.008, rw * 0.5], [rimR - 0.004, rw - 0.006], [rimR + 0.004, rw - 0.004], [rimR + 0.009, rw]];
    spin.add(new THREE.Mesh(CY.G.latheZ(rimProf, 64), CY.M.blackMetal));
    [-1, 1].forEach((s) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(rimR + 0.007, 0.0026, 6, 64), CY.M.alu);
      t.position.z = s * (rw - 0.001);
      spin.add(t);
    });
    spin.add(new THREE.Mesh(zcyl(0.042, 0.075, 24), CY.M.blackMetal));
    for (let k = 0; k < 5; k++) {
      [-1, 1].forEach((d) => {
        const a = (k * Math.PI * 2) / 5 + d * 0.12;
        const sp = new THREE.Mesh(CY.G.box(0.108, 0.013, 0.016), CY.M.blackMetal);
        sp.position.set(0.093 * Math.cos(a), 0.093 * Math.sin(a), 0);
        sp.rotation.z = a;
        spin.add(sp);
        [-1, 1].forEach((f) => { // 車削亮面
          const lip = new THREE.Mesh(CY.G.box(0.07, 0.006, 0.0015), CY.M.alu);
          lip.position.set(0.105 * Math.cos(a), 0.105 * Math.sin(a), f * 0.0085);
          lip.rotation.z = a;
          spin.add(lip);
        });
      });
    }
    add(spin, CY.G.cyl(0.003, 0.003, 0.025, 8), CY.M.chrome, 0, rimR - 0.012, 0.012); // 氣嘴
    return spin;
  }
  B.front_wheel = () => {
    const g = grp('front_wheel');
    const K = CY.K;
    const holder = new THREE.Group();
    holder.position.copy(K.FA);
    g.add(holder);
    const spin = wheel(K.FR, K.FW, 0.1524);
    holder.add(spin);
    CY.anim.frontWheel = spin;
    add(holder, zcyl(0.008, 0.21, 12), CY.M.steel);
    add(holder, CY.G.hexNut(0.017, 0.01), CY.M.steel, 0, 0, 0.108, Math.PI / 2, 0, 0);
    add(holder, zcyl(0.014, 0.02, 12), CY.M.steel, 0, 0, -0.1);
    return g;
  };
  B.rear_wheel = () => {
    const g = grp('rear_wheel');
    const K = CY.K;
    const holder = new THREE.Group();
    holder.position.copy(K.RA);
    g.add(holder);
    const spin = wheel(K.RR, K.RW, 0.1524);
    holder.add(spin);
    CY.anim.rearWheel = spin;
    return g;
  };
  function disc(rOut, rIn, z, holes) {
    const spin = new THREE.Group();
    spin.userData.keep = true;
    const geo = CY.G.extrude(CY.G.ringShape(rOut, rIn, holes), 0.004);
    geo.translate(0, 0, -0.002);
    spin.add(new THREE.Mesh(geo, CY.M.steel));
    const car = CY.G.extrude(CY.G.ringShape(rIn + 0.004, 0.03, [{ r: (rIn + 0.03) / 2, count: 5, size: 0.007 }]), 0.006);
    car.translate(0, 0, -0.003);
    spin.add(new THREE.Mesh(car, CY.M.castDark));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      add(spin, zcyl(0.005, 0.008, 10), CY.M.steel, (rIn - 0.004) * Math.cos(a), (rIn - 0.004) * Math.sin(a), 0);
    }
    spin.position.z = z;
    return spin;
  }
  B.front_disc = () => {
    const g = grp('front_disc');
    const holder = new THREE.Group();
    holder.position.copy(CY.K.FA);
    g.add(holder);
    const sp = disc(0.1225, 0.066, -0.052, [{ r: 0.09, count: 18, size: 0.0035 }, { r: 0.105, count: 18, size: 0.0035, phase: 0.17 }]);
    holder.add(sp);
    CY.anim.frontDisc = sp;
    return g;
  };
  B.rear_disc = () => {
    const g = grp('rear_disc');
    const holder = new THREE.Group();
    holder.position.copy(CY.K.RA);
    g.add(holder);
    const sp = disc(0.1, 0.056, 0.052, [{ r: 0.078, count: 14, size: 0.0032 }, { r: 0.09, count: 14, size: 0.0032, phase: 0.22 }]);
    holder.add(sp);
    CY.anim.rearDisc = sp;
    return g;
  };

  // ---------- 卡鉗 ----------
  function caliper(center, angle, zIn, zOut) {
    const c = new THREE.Group();
    c.position.copy(center);
    c.rotation.z = angle + Math.PI / 2;
    const w = Math.abs(zOut - zIn);
    const zc = (zIn + zOut) / 2 - center.z;
    add(c, CY.G.rbox(0.072, 0.034, w, 0.01), CY.M.castDark, 0, 0.006, zc);
    add(c, CY.G.rbox(0.06, 0.026, 0.008, 0.004), CY.M.pad, 0, -0.004, center.z > 0 ? zc - 0.01 : zc + 0.01);
    add(c, CY.G.cyl(0.004, 0.004, 0.012, 8), CY.M.steel, 0.02, 0.026, zc, 0, 0, 0);
    return c;
  }
  B.front_caliper = () => {
    const g = grp('front_caliper');
    const K = CY.K;
    const a = CY.U.deg(160);
    const p = V(K.FA.x + 0.103 * Math.cos(a), K.FA.y + 0.103 * Math.sin(a), -0.052);
    g.add(caliper(p, a, -0.08, -0.028));
    // 卡鉗座（連到左前叉）
    g.add(CY.G.cylBetween(V(p.x + 0.01, p.y + 0.01, -0.08), V(0.6, 0.235, -0.085), 0.009, CY.M.cast));
    return g;
  };
  B.rear_caliper = () => {
    const g = grp('rear_caliper');
    const K = CY.K;
    const a = CY.U.deg(38);
    const p = V(K.RA.x + 0.083 * Math.cos(a), K.RA.y + 0.083 * Math.sin(a), 0.052);
    g.add(caliper(p, a, 0.032, 0.076));
    g.add(CY.G.cylBetween(V(p.x, p.y, 0.076), V(p.x + 0.02, p.y - 0.03, 0.08), 0.008, CY.M.cast));
    return g;
  };

  // ---------- 後避震 ----------
  function shock(bottom, top) {
    const holder = new THREE.Group();
    const len = CY.G.place(holder, bottom, top);
    const M = CY.M;
    const inner = new THREE.Group();
    inner.position.y = -len / 2;
    holder.add(inner);
    add(inner, zcyl(0.012, 0.03, 16), M.gloss, 0, 0, 0);
    add(inner, CY.G.cyl(0.017, 0.017, len * 0.5, 18), M.gloss, 0, len * 0.29, 0);
    add(inner, CY.G.cyl(0.006, 0.006, len * 0.42, 10), M.chrome, 0, len * 0.72, 0);
    const spring = new THREE.Mesh(CY.G.helix(0.025, len * 0.66, 8.5, 0.0038, 18), M.blackMetal);
    spring.position.y = len * 0.16;
    inner.add(spring);
    add(inner, CY.G.cyl(0.03, 0.03, 0.008, 20), M.blackMetal, 0, len * 0.155, 0);
    add(inner, CY.G.cyl(0.03, 0.03, 0.008, 20), M.blackMetal, 0, len * 0.83, 0);
    add(inner, zcyl(0.012, 0.03, 16), M.gloss, 0, len, 0);
    return holder;
  }
  B.rear_shock_l = () => { const g = grp('rear_shock_l'); g.add(shock(V(-0.69, 0.33, -0.125), V(-0.58, 0.673, -0.125))); return g; };
  B.rear_shock_r = () => { const g = grp('rear_shock_r'); g.add(shock(V(-0.69, 0.335, 0.13), V(-0.58, 0.673, 0.13))); return g; };

  // ---------- 後搖臂 ----------
  B.rear_arm = () => {
    const g = grp('rear_arm');
    const s = CY.G.polyShape([
      [-0.22, 0.225], [-0.24, 0.245], [-0.34, 0.25], [-0.5, 0.255], [-0.6, 0.27], [-0.655, 0.305], [-0.672, 0.345], [-0.7, 0.352],
      [-0.716, 0.325], [-0.706, 0.26], [-0.69, 0.215], [-0.655, 0.196], [-0.6, 0.2], [-0.5, 0.214], [-0.34, 0.19], [-0.24, 0.186], [-0.22, 0.2],
    ]);
    const h = new THREE.Path(); h.absarc(-0.6525, 0.236, 0.009, 0, Math.PI * 2, true); s.holes.push(h);
    const geo = CY.G.extrude(s, 0.02, { bevel: 0.003 });
    add(g, geo, CY.M.cast, 0, 0, 0.078);
    [[-0.232, 0.205], [-0.33, 0.22]].forEach(([x, y]) => add(g, CY.G.hexNut(0.014, 0.008), CY.M.steel, x, y, 0.1, Math.PI / 2, 0, 0));
    // 後輪軸螺帽（24mm）
    add(g, CY.G.hexNut(0.024, 0.014), CY.M.steel, -0.6525, 0.236, 0.106, Math.PI / 2, 0, 0);
    add(g, zcyl(0.0075, 0.03, 10), CY.M.steel, -0.6525, 0.236, 0.1);
    return g;
  };

  // ---------- 中柱、側柱 ----------
  B.center_stand = () => {
    const g = grp('center_stand');
    const M = CY.M;
    g.add(CY.G.cylBetween(V(-0.31, 0.165, -0.1), V(-0.31, 0.165, 0.1), 0.011, M.blackMetal));
    [-1, 1].forEach((s) => {
      g.add(CY.G.cylBetween(V(-0.31, 0.165, s * 0.095), V(-0.335, 0.02, s * 0.13), 0.013, M.blackMetal));
      add(g, CY.G.box(0.05, 0.012, 0.03), M.rubber, -0.338, 0.008, s * 0.13);
      const spr = new THREE.Mesh(CY.G.helix(0.006, 0.07, 9, 0.0016), M.steel);
      CY.G.place(spr, V(-0.3, 0.12, s * 0.07), V(-0.25, 0.17, s * 0.06));
      spr.position.set(-0.3, 0.12, s * 0.07);
      g.add(spr);
    });
    g.add(CY.G.cylBetween(V(-0.335, 0.035, -0.12), V(-0.335, 0.035, 0.12), 0.01, M.blackMetal));
    g.add(CY.G.cylBetween(V(-0.33, 0.06, -0.12), V(-0.37, 0.085, -0.2), 0.009, M.blackMetal));
    return g;
  };
  B.kickstand = () => {
    const g = grp('kickstand');
    const M = CY.M;
    g.add(CY.G.cylBetween(V(0.0, 0.19, -0.14), V(-0.24, 0.205, -0.152), 0.012, M.blackMetal));
    add(g, CY.G.box(0.04, 0.008, 0.035), M.blackMetal, -0.25, 0.2, -0.155);
    add(g, zcyl(0.014, 0.025, 12), M.blackMetal, 0.0, 0.19, -0.14);
    const spr = new THREE.Mesh(CY.G.helix(0.005, 0.08, 10, 0.0014), M.steel);
    CY.G.place(spr, V(-0.02, 0.185, -0.15), V(-0.1, 0.17, -0.145));
    spr.position.set(-0.02, 0.185, -0.15);
    g.add(spr);
    return g;
  };

  B.engine_hanger = () => {
    const g = grp('engine_hanger');
    [-1, 1].forEach((s) => {
      const pl = add(g, CY.G.rbox(0.12, 0.032, 0.006, 0.006), CY.M.blackMetal, -0.095, 0.194, s * 0.05);
      pl.rotation.z = 0.02;
    });
    add(g, zcyl(0.016, 0.12, 16), CY.M.rubber, -0.045, 0.192, 0);
    add(g, zcyl(0.016, 0.12, 16), CY.M.rubber, -0.145, 0.196, 0);
    add(g, zcyl(0.006, 0.14, 10), CY.M.steel, -0.045, 0.192, 0);
    return g;
  };
})();
