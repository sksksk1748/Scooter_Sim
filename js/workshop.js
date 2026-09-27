// 修車廠場景：地板、牆、升降台、零件墊、工具牆、招牌、燈光。
(function () {
  const W = {};
  CY.workshop = W;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (g, geo, mat, x, y, z, rx, ry, rz) => { const m = CY.G.mesh(geo, mat, x, y, z, rx, ry, rz); g.add(m); return m; };

  function signTexture(text, sub, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 1024, 256);
    x.strokeStyle = fg; x.lineWidth = 10; x.strokeRect(14, 14, 996, 228);
    x.fillStyle = fg;
    x.font = '900 128px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 512, 112);
    x.font = '600 40px "Barlow Condensed", "Noto Sans TC", sans-serif';
    x.fillText(sub, 512, 206);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function tileTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#d6d9d3'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#a9ada6'; x.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function plateTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#7a7f86'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#c3c7cc';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.save(); x.translate(16 + i * 32, 16 + j * 32); x.rotate((i + j) % 2 ? 0.8 : -0.8);
      x.fillRect(-10, -2.5, 20, 5); x.restore();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function stripeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 32;
    const x = c.getContext('2d');
    x.fillStyle = '#f2c300'; x.fillRect(0, 0, 256, 32);
    x.fillStyle = '#151515';
    for (let i = -2; i < 12; i++) { x.beginPath(); x.moveTo(i * 32, 32); x.lineTo(i * 32 + 16, 32); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 0); x.closePath(); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  W.build = (scene, renderer) => {
    const g = new THREE.Group();
    g.name = 'workshop';
    scene.add(g);
    const S = (o) => new THREE.MeshStandardMaterial(o);

    // 環境反射
    if (CY.lib.RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new CY.lib.RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
    }
    scene.background = new THREE.Color(0x15171a);
    scene.fog = new THREE.Fog(0x15171a, 9, 20);

    // 燈光
    const hemi = new THREE.HemisphereLight(0xe6eeff, 0x2b2622, 0.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0dc, 2.3);
    key.position.set(3.2, 6.5, -3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -3.2; sc.right = 3.2; sc.top = 4.2; sc.bottom = -2.6; sc.near = 1; sc.far = 16;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.target.position.set(0, 0.4, 0.9);
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xa9c1ff, 0.6);
    fill.position.set(-4, 3.2, 4.5);
    scene.add(fill);
    const rim = new THREE.PointLight(0xffd9a8, 6, 7, 2);
    rim.position.set(-2.4, 2.4, -1.6);
    scene.add(rim);
    W.lights = { hemi, key, fill, rim };

    // 地板
    const floor = add(g, new THREE.PlaneGeometry(16, 16), S({ color: 0xffffff, map: CY.G.TEX.concrete, roughness: 0.86, metalness: 0 }), 0, 0, 0, -Math.PI / 2, 0, 0);
    floor.receiveShadow = true;

    // 牆（L 形角落）
    const wallMat = S({ color: 0xaab2ac, roughness: 0.92 });
    const tiles = tileTexture();
    const back = add(g, new THREE.PlaneGeometry(10, 4), wallMat, 0, 2, 4.4, 0, Math.PI, 0);
    back.receiveShadow = true;
    const t1 = tiles.clone(); t1.repeat.set(20, 2.4); t1.needsUpdate = true;
    add(g, new THREE.PlaneGeometry(10, 1.2), S({ map: t1, roughness: 0.4 }), 0, 0.6, 4.39, 0, Math.PI, 0);
    const left = add(g, new THREE.PlaneGeometry(10, 4), wallMat, -4.4, 2, 0, 0, Math.PI / 2, 0);
    left.receiveShadow = true;
    const t2 = tiles.clone(); t2.repeat.set(20, 2.4); t2.needsUpdate = true;
    add(g, new THREE.PlaneGeometry(10, 1.2), S({ map: t2, roughness: 0.4 }), -4.39, 0.6, 0, 0, Math.PI / 2, 0);

    // 另外兩面牆：-z 側、+x 側是面向騎樓的鐵捲門
    const far = add(g, new THREE.PlaneGeometry(10, 4), wallMat, 0, 2, -4.4, 0, 0, 0);
    far.receiveShadow = true;
    const t3 = tiles.clone(); t3.repeat.set(20, 2.4); t3.needsUpdate = true;
    add(g, new THREE.PlaneGeometry(10, 1.2), S({ map: t3, roughness: 0.4 }), 0, 0.6, -4.39, 0, 0, 0);
    const shutter = document.createElement('canvas');
    shutter.width = 64; shutter.height = 64;
    const sx = shutter.getContext('2d');
    const sg = sx.createLinearGradient(0, 0, 0, 64);
    sg.addColorStop(0, '#9aa1a8'); sg.addColorStop(0.5, '#c9ced3'); sg.addColorStop(1, '#8a9097');
    sx.fillStyle = sg; sx.fillRect(0, 0, 64, 64);
    sx.fillStyle = 'rgba(0,0,0,0.35)'; sx.fillRect(0, 62, 64, 2);
    const shTex = new THREE.CanvasTexture(shutter); shTex.colorSpace = THREE.SRGBColorSpace; shTex.wrapS = shTex.wrapT = THREE.RepeatWrapping; shTex.repeat.set(1, 40);
    add(g, new THREE.PlaneGeometry(10, 4), S({ map: shTex, metalness: 0.6, roughness: 0.45 }), 4.4, 2, 0, 0, -Math.PI / 2, 0);

    // 招牌
    add(g, new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTexture('阿德機車行', 'SCOOTER SERVICE · 保養 · 維修 · 改裝', '#f4efe0', '#b3141d') }), 0.6, 3.05, 4.37, 0, Math.PI, 0);

    // 工具牆（洞洞板）
    const peg = add(g, new THREE.PlaneGeometry(3.2, 1.3), S({ map: CY.G.TEX.peg, roughness: 0.8 }), -4.37, 1.75, -0.6, 0, Math.PI / 2, 0);
    peg.receiveShadow = true;
    const toolMat = S({ color: 0xb8bcc2, metalness: 1, roughness: 0.3 });
    const redMat = S({ color: 0xb3261e, roughness: 0.5 });
    for (let i = 0; i < 9; i++) {
      const z = -1.9 + i * 0.3;
      add(g, CY.G.box(0.012, 0.28 + (i % 3) * 0.05, 0.03), toolMat, -4.35, 1.95, z);
      add(g, CY.G.box(0.02, 0.08, 0.045), redMat, -4.345, 1.78 - (i % 3) * 0.02, z);
    }
    for (let i = 0; i < 7; i++) add(g, CY.G.cyl(0.02 + i * 0.003, 0.02 + i * 0.003, 0.04, 12), toolMat, -4.34, 1.35, -1.6 + i * 0.12, 0, 0, Math.PI / 2);

    // 工作台與虎鉗
    const benchMat = S({ color: 0x4d3a2a, roughness: 0.75 });
    const steelDark = S({ color: 0x2c3034, metalness: 0.7, roughness: 0.45 });
    add(g, CY.G.box(0.7, 0.05, 2.2), benchMat, -3.95, 0.9, -0.6);
    [[-4.2, -1.6], [-4.2, 0.4], [-3.68, -1.6], [-3.68, 0.4]].forEach(([x, z]) => add(g, CY.G.box(0.05, 0.9, 0.05), steelDark, x, 0.45, z));
    add(g, CY.G.box(0.16, 0.12, 0.22), S({ color: 0x2f5f9a, metalness: 0.5, roughness: 0.5 }), -3.8, 0.99, -1.3);

    // 機油架
    const shelf = S({ color: 0x5f6770, metalness: 0.6, roughness: 0.5 });
    [0.3, 0.8, 1.3].forEach((y) => add(g, CY.G.box(1.6, 0.03, 0.4), shelf, 2.4, y, 4.15));
    [[1.62, 0.7], [3.18, 0.7]].forEach(([x]) => add(g, CY.G.box(0.04, 1.5, 0.4), shelf, x, 0.75, 4.15));
    const oilCols = [0x1c62c4, 0xe4b400, 0xc4281c, 0x2b9a4a, 0x111111];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
      const col = oilCols[(i + r) % oilCols.length];
      add(g, CY.G.rbox(0.09, 0.22, 0.07, 0.012), S({ color: col, roughness: 0.35 }), 1.8 + i * 0.16, 0.43 + r * 0.5, 4.1);
    }
    // 輪胎堆
    const tireMat = S({ color: 0x151515, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const t = add(g, new THREE.TorusGeometry(0.19, 0.06, 12, 36), tireMat, 3.7, 0.06 + i * 0.12, 3.3, Math.PI / 2, 0, 0);
      t.castShadow = true;
    }

    // 天花板日光燈
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf6f8ff });
    [[-1, -0.5], [1, -0.5], [-1, 2.2], [1, 2.2]].forEach(([x, z]) => {
      add(g, CY.G.box(1.2, 0.05, 0.08), steelDark, x, 3.6, z);
      add(g, CY.G.cyl(0.018, 0.018, 1.15, 10), tubeMat, x, 3.57, z, 0, 0, Math.PI / 2);
    });

    // 升降台
    const lift = new THREE.Group();
    lift.name = 'lift';
    g.add(lift);
    const plateTex = plateTexture(); plateTex.repeat.set(10, 3);
    const liftMat = S({ color: 0xffffff, map: plateTex, metalness: 0.75, roughness: 0.45 });
    const top = add(lift, CY.G.box(2.4, 0.04, 0.78), liftMat, -0.05, CY.K.LIFT - 0.02, 0);
    top.receiveShadow = true; top.castShadow = true;
    const body = add(lift, CY.G.box(2.2, CY.K.LIFT - 0.04, 0.6), S({ color: 0x23272b, metalness: 0.6, roughness: 0.55 }), -0.05, (CY.K.LIFT - 0.04) / 2, 0);
    body.castShadow = true;
    const st = stripeTexture(); st.repeat.set(9, 1);
    [-1, 1].forEach((s) => add(lift, new THREE.PlaneGeometry(2.4, 0.04), new THREE.MeshBasicMaterial({ map: st }), -0.05, CY.K.LIFT - 0.02, s * 0.391, 0, s > 0 ? 0 : Math.PI, 0));
    // 前輪夾座
    add(lift, CY.G.box(0.05, 0.16, 0.2), steelDark, 0.93, CY.K.LIFT + 0.08, 0);
    // 車架／引擎支撐架
    const jackMat = S({ color: 0x3a3f45, metalness: 0.6, roughness: 0.5 });
    const padMat = S({ color: 0xb8231a, roughness: 0.7 });
    add(lift, CY.G.box(0.06, 0.14, 0.12), jackMat, 0.2, CY.K.LIFT + 0.07, 0);
    add(lift, CY.G.box(0.07, 0.012, 0.13), padMat, 0.2, CY.K.LIFT + 0.146, 0);
    add(lift, CY.G.cyl(0.028, 0.036, 0.15, 16), jackMat, -0.46, CY.K.LIFT + 0.075, -0.1);
    add(lift, CY.G.cyl(0.03, 0.03, 0.01, 16), padMat, -0.46, CY.K.LIFT + 0.153, -0.1);

    // 零件墊
    const M = CY.scooter.MAT;
    const w = M.x1 - M.x0 + 0.2, d = M.z1 - M.z0 + 0.1;
    const matTex = CY.G.TEX.mat.clone(); matTex.repeat.set(w / 1.0, d / 1.0); matTex.needsUpdate = true;
    const mat = add(g, new THREE.PlaneGeometry(w, d), S({ color: 0xffffff, map: matTex, roughness: 0.95 }), (M.x0 + M.x1) / 2, 0.003, M.z0 + d / 2 - 0.05, -Math.PI / 2, 0, 0);
    mat.receiveShadow = true;
    W.matCenter = V((M.x0 + M.x1) / 2, 0, M.z0 + d / 2 - 0.05);
    W.matSize = { w, d };

    // 接油盤（放機油時出現）
    const pan = new THREE.Group();
    const panMat = S({ color: 0x2c2f33, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide });
    add(pan, CY.G.latheZ([[0.001, 0], [0.11, 0], [0.13, 0.045]], 32), panMat, 0, 0, 0, -Math.PI / 2, 0, 0);
    const oilSurf = add(pan, new THREE.CircleGeometry(0.105, 28), CY.M.oil, 0, 0.012, 0, -Math.PI / 2, 0, 0);
    oilSurf.scale.set(0.01, 0.01, 1);
    pan.visible = false;
    g.add(pan);
    W.pan = pan; W.panOil = oilSurf;
    return g;
  };
})();
