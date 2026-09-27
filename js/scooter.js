// 組車：建立全部零件、巢狀掛載、材質分離、網格合併、零件墊排位、高亮／透視／爆炸圖／虛影。
(function () {
  const S = {};
  CY.scooter = S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  S.parts = {};
  S.list = [];

  function flipWinding(geo) {
    for (const key of ['position', 'normal', 'uv']) {
      const a = geo.attributes[key];
      if (!a) continue;
      const n = a.itemSize, arr = a.array;
      for (let i = 0; i < a.count; i += 3) {
        for (let k = 0; k < n; k++) {
          const i1 = (i + 1) * n + k, i2 = (i + 2) * n + k;
          const t = arr[i1]; arr[i1] = arr[i2]; arr[i2] = t;
        }
      }
      a.needsUpdate = true;
    }
  }

  // 把零件內不會動的網格依材質合併，降低 draw call
  function mergePart(g) {
    const mergeFn = CY.lib && CY.lib.mergeGeometries;
    if (!mergeFn) return;
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const buckets = new Map();
    const victims = [];
    g.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || o.userData.noMerge) return;
      for (let p = o.parent; p && p !== g; p = p.parent) if (p.userData.keep) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(m);
      if (m.determinant() < 0) flipWinding(geo);
      for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      geo.clearGroups();
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(geo);
      victims.push(o);
    });
    if (victims.length < 2) return;
    victims.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
    for (const [mat, list] of buckets) {
      const merged = list.length === 1 ? list[0] : mergeFn(list, false);
      if (!merged) continue;
      g.add(new THREE.Mesh(merged, mat));
    }
  }

  S.build = (scene) => {
    const K = CY.K;
    S.root = new THREE.Group();
    S.root.name = 'scooterRoot';
    S.root.position.set(0, K.LIFT, 0);
    scene.add(S.root);
    S.matRoot = new THREE.Group();
    S.matRoot.name = 'matRoot';
    scene.add(S.matRoot);
    CY.paintClones = [];

    for (const meta of CY.PARTS) {
      let g;
      try {
        g = CY.B[meta.id] ? CY.B[meta.id]() : null;
      } catch (e) {
        console.error('建模失敗', meta.id, e);
        g = null;
      }
      if (!g) {
        g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), CY.M.grey));
      }
      g.name = meta.id;
      mergePart(g);
      // 每個零件獨立材質（才能個別高亮／透視）
      const cache = new Map();
      const mats = [];
      const cloneMat = (m) => {
        if (m.userData.selfLit) return m;
        if (!cache.has(m)) {
          const c = m.clone();
          c.userData = Object.assign({}, m.userData, { base: { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite } });
          cache.set(m, c);
          mats.push(c);
          if (m.userData.paint) CY.paintClones.push(c);
        }
        return cache.get(m);
      };
      g.traverse((o) => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(cloneMat) : cloneMat(o.material);
        o.userData.partId = meta.id;
        o.castShadow = true;
        o.receiveShadow = true;
      });
      g.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(g);
      if (bbox.isEmpty()) bbox.setFromCenterAndSize(V(0, 0.3, 0), V(0.05, 0.05, 0.05));
      const p = { id: meta.id, meta, group: g, mats, bbox, center: bbox.getCenter(V()), mount: meta.mount || null, state: 'installed' };
      S.parts[meta.id] = p;
      S.list.push(p);
    }
    // 掛載（巢狀零件跟著母件一起移動）
    for (const p of S.list) {
      const parent = p.mount ? S.parts[p.mount].group : S.root;
      parent.add(p.group);
    }
    // 車身中心（高亮提示、特效用）
    S.list.forEach((p) => { p.worldCenter = p.center.clone().add(S.root.position); });
    packMat();
    S.root.updateMatrixWorld(true);
  };

  // ---------- 零件墊排位 ----------
  S.MAT = { x0: -3.0, x1: 3.0, z0: 1.12, gap: 0.08, label: 0.07 };
  function packMat() {
    // 層架式排列：依深度由大到小，同一排高度接近，比較省空間
    const depth = (p) => p.bbox.max.z - p.bbox.min.z;
    const width = (p) => p.bbox.max.x - p.bbox.min.x;
    const items = S.list.slice().sort((a, b) => (depth(b) - depth(a)) || (width(b) - width(a)));
    const M = S.MAT;
    let x = M.x0, z = M.z0 + M.label, rowD = 0;
    for (const p of items) {
      const w = Math.max(0.12, p.bbox.max.x - p.bbox.min.x);
      const d = Math.max(0.06, p.bbox.max.z - p.bbox.min.z);
      if (x + w > M.x1 && x > M.x0) { x = M.x0; z += rowD + M.gap + M.label; rowD = 0; }
      p.slot = { cx: x + w / 2, cz: z + d / 2, w, d };
      x += w + M.gap;
      rowD = Math.max(rowD, d);
    }
    M.z1 = z + rowD + 0.06;
    const bc = V();
    for (const p of S.list) {
      p.bbox.getCenter(bc);
      p.matPos = V(p.slot.cx - bc.x, 0.012 - p.bbox.min.y, p.slot.cz - bc.z);
    }
  }

  // ---------- 位置 ----------
  S.installTarget = (id) => {
    const p = S.parts[id];
    const parent = p.mount ? S.parts[p.mount].group : S.root;
    parent.updateMatrixWorld(true);
    const pos = V(), quat = new THREE.Quaternion(), scl = V();
    parent.matrixWorld.decompose(pos, quat, scl);
    return { pos, quat, parent };
  };
  S.snapToMat = (id) => {
    const p = S.parts[id];
    S.matRoot.attach(p.group);
    p.group.position.copy(p.matPos);
    p.group.quaternion.identity();
    p.state = 'removed';
    S.ensureLabel(id);
  };
  S.snapInstall = (id) => {
    const p = S.parts[id];
    const { parent } = S.installTarget(id);
    parent.add(p.group);
    p.group.position.set(0, 0, 0);
    p.group.quaternion.identity();
    p.state = 'installed';
  };
  S.resetAll = () => {
    // 先全部裝回（母件先）
    for (const p of S.list) if (!p.mount) S.snapInstall(p.id);
    for (const p of S.list) if (p.mount) S.snapInstall(p.id);
    S.setExplode(0);
  };
  // 零件目前的世界中心（相機、特效用）
  S.worldCenterOf = (id) => {
    const p = S.parts[id];
    p.group.updateMatrixWorld(true);
    return p.center.clone().applyMatrix4(p.group.matrixWorld);
  };

  // ---------- 高亮 ----------
  S.setGlow = (id, hex, intensity) => {
    const p = S.parts[id];
    if (!p) return;
    for (const m of p.mats) {
      if (!m.emissive) continue;
      m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  };
  S.clearGlow = (id) => S.setGlow(id, 0x000000, 1);

  // ---------- 透視（X 光） ----------
  S.setOpacity = (id, op) => {
    const p = S.parts[id];
    if (!p) return;
    for (const m of p.mats) {
      const b = m.userData.base;
      if (op >= 1) {
        m.transparent = b.transparent; m.opacity = b.opacity; m.depthWrite = b.depthWrite;
      } else {
        m.transparent = true; m.opacity = Math.min(b.opacity, op); m.depthWrite = false;
      }
      m.needsUpdate = true;
    }
    p.group.traverse((o) => { if (o.isMesh && o.userData.partId === id) o.castShadow = op >= 1; });
  };

  // ---------- 爆炸圖 ----------
  S.explodeF = 0;
  S.setExplode = (f) => {
    S.explodeF = f;
    for (const p of S.list) {
      if (p.state !== 'installed') continue;
      const e = p.meta.explode || [0, 0, 0];
      p.group.position.set(e[0] * f, e[1] * f, e[2] * f);
      if (p.meta.split) {
        p.group.children.forEach((c) => { if (c.userData.side) c.position.z = c.userData.side * p.meta.split * f; });
      }
    }
  };

  // ---------- 虛影（組裝時顯示安裝位置） ----------
  S.ghostMats = null;
  S.makeGhost = (id, ok) => {
    S.removeGhost();
    if (!S.ghostMats) {
      S.ghostMats = {
        ok: new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.38, depthWrite: false }),
        bad: new THREE.MeshBasicMaterial({ color: 0xff5a4f, transparent: true, opacity: 0.32, depthWrite: false }),
      };
    }
    const p = S.parts[id];
    const ghost = new THREE.Group();
    ghost.name = 'ghost';
    p.group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(p.group.matrixWorld).invert();
    const mat = ok ? S.ghostMats.ok : S.ghostMats.bad;
    p.group.traverse((o) => {
      if (!o.isMesh || o.userData.partId !== id) return;
      const gm = new THREE.Mesh(o.geometry, mat);
      new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).decompose(gm.position, gm.quaternion, gm.scale);
      gm.userData.ghostOf = id;
      gm.renderOrder = 5;
      ghost.add(gm);
    });
    const t = S.installTarget(id);
    ghost.position.copy(t.pos);
    ghost.quaternion.copy(t.quat);
    S.root.parent.add(ghost);
    S.ghost = ghost;
    S.ghostId = id;
    return ghost;
  };
  S.removeGhost = () => {
    if (S.ghost) { S.ghost.parent.remove(S.ghost); S.ghost = null; S.ghostId = null; }
  };

  // ---------- 零件墊上的膠帶標籤 ----------
  let atlas = null;
  const CELL_W = 256, CELL_H = 64, COLS = 4;
  S.makeLabelAtlas = () => {
    const rows = Math.ceil(S.list.length / COLS);
    const c = document.createElement('canvas');
    c.width = CELL_W * COLS; c.height = CELL_H * rows;
    const x = c.getContext('2d');
    S.list.forEach((p, i) => {
      const cx = (i % COLS) * CELL_W, cy = Math.floor(i / COLS) * CELL_H;
      x.fillStyle = '#e8dcb4';
      x.beginPath();
      x.moveTo(cx + 4, cy + 6); x.lineTo(cx + CELL_W - 6, cy + 3); x.lineTo(cx + CELL_W - 3, cy + CELL_H - 6); x.lineTo(cx + 6, cy + CELL_H - 3); x.closePath();
      x.fill();
      x.fillStyle = 'rgba(120,100,60,0.12)';
      for (let k = 0; k < 40; k++) x.fillRect(cx + 6 + Math.random() * (CELL_W - 14), cy + 8 + Math.random() * (CELL_H - 16), 2, 1);
      x.fillStyle = CY.GROUPS[p.meta.group].color;
      x.fillRect(cx + 10, cy + 16, 8, CELL_H - 32);
      x.fillStyle = '#1f2a6b';
      x.font = '600 26px "Barlow Condensed", sans-serif';
      x.textBaseline = 'middle';
      x.fillText('#' + String(p.meta.no).padStart(2, '0'), cx + 24, cy + CELL_H / 2 + 1);
      x.font = '28px "LXGW WenKai TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      const name = p.meta.name.replace(/（.*?）/g, '');
      x.fillText(name, cx + 66, cy + CELL_H / 2 + 2, CELL_W - 76);
    });
    atlas = new THREE.CanvasTexture(c);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = 4;
    S.labelMat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true });
    S.atlasRows = rows;
  };
  S.ensureLabel = (id) => {
    const p = S.parts[id];
    if (p.label || !atlas) return;
    const i = S.list.indexOf(p);
    const col = i % COLS, row = Math.floor(i / COLS);
    const geo = new THREE.PlaneGeometry(0.2, 0.05);
    const uv = geo.attributes.uv;
    const u0 = col / COLS, u1 = (col + 1) / COLS;
    const v1 = 1 - row / S.atlasRows, v0 = 1 - (row + 1) / S.atlasRows;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
    const m = new THREE.Mesh(geo, S.labelMat);
    m.rotation.set(-Math.PI / 2, 0, Math.PI);
    m.position.set(p.slot.cx, 0.006, p.slot.cz - p.slot.d / 2 - 0.042);
    m.userData.labelOf = id;
    S.matRoot.add(m);
    p.label = m;
  };
})();
