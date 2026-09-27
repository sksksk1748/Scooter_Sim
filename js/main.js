// 啟動、渲染器、相機、點選與主迴圈。
(function () {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- 相機動畫 ----------
  const cam = { tween: null };
  CY.cam = cam;
  cam.PRESETS = {
    front3q: { label: '左前方（預設）', pos: [2.05, 1.5, -2.1], tgt: [-0.05, 0.78, 0] },
    left: { label: '左側（傳動）', pos: [-0.1, 1.05, -2.55], tgt: [-0.1, 0.72, 0] },
    right: { label: '右側（排氣管）', pos: [-0.1, 1.1, 2.45], tgt: [-0.1, 0.72, 0] },
    front: { label: '正前方', pos: [2.8, 1.25, 0.02], tgt: [0.2, 0.78, 0] },
    rear: { label: '正後方', pos: [-2.9, 1.3, 0.25], tgt: [-0.3, 0.72, 0] },
    top: { label: '俯視', pos: [0.02, 3.7, 0.25], tgt: [0, 0.5, 0.25] },
    engine: { label: '引擎特寫（右）', pos: [0.05, 0.98, 1.0], tgt: [-0.14, 0.6, 0.0] },
    cvt: { label: '傳動特寫（左）', pos: [-0.38, 0.9, -1.12], tgt: [-0.4, 0.58, -0.05] },
    bars: { label: '儀表與把手', pos: [-0.35, 1.62, -0.05], tgt: [0.3, 1.2, 0] },
    mat: { label: '零件墊', pos: [0.02, 4.3, 0.2], tgt: [0, 0, 2.4] },
  };
  cam.flyTo = (pos, tgt, dur) => {
    const v = CY.view;
    cam.tween = { t: 0, dur: dur || 1.1, p0: v.camera.position.clone(), t0: v.controls.target.clone(), p1: pos.clone(), t1: tgt.clone() };
  };
  cam.preset = (id, dur) => {
    const p = cam.PRESETS[id];
    if (!p) return;
    cam.flyTo(V(...p.pos), V(...p.tgt), dur);
  };
  // 對準某個世界座標點，保持目前的觀看方向
  cam.focus = (point, dist) => {
    const v = CY.view;
    const dir = v.camera.position.clone().sub(v.controls.target).normalize();
    if (dir.y < 0.15) { dir.y = 0.35; dir.normalize(); }
    cam.flyTo(point.clone().addScaledVector(dir, dist || 1.1), point, 0.9);
  };
  // 依零件位置與大小，從它所在的那一側斜上方看過去
  cam.focusPart = (point, size) => {
    const v = CY.view;
    const rootZ = point.z;
    const side = Math.abs(rootZ) > 0.03 ? Math.sign(rootZ) : (v.camera.position.z >= 0 ? 1 : -1);
    const dir = new THREE.Vector3(0.35, 0.55, side).normalize();
    const dist = CY.U.clamp(size * 3.4, 0.6, 2.0);
    cam.flyTo(point.clone().addScaledVector(dir, dist), point, 0.9);
  };
  cam.update = (dt) => {
    const tw = cam.tween;
    if (!tw) return;
    tw.t += dt;
    const k = CY.U.easeInOut(Math.min(1, tw.t / tw.dur));
    const v = CY.view;
    v.camera.position.lerpVectors(tw.p0, tw.p1, k);
    v.controls.target.lerpVectors(tw.t0, tw.t1, k);
    if (tw.t >= tw.dur) cam.tween = null;
  };

  // ---------- 點選 ----------
  const pick = { ray: null, ndc: null, list: [] };
  function pickAt(clientX, clientY) {
    const v = CY.view;
    const r = v.renderer.domElement.getBoundingClientRect();
    pick.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    pick.ray.setFromCamera(pick.ndc, v.camera);
    const list = CY.scooter.pickables();
    const hits = pick.ray.intersectObjects(list, false);
    for (const h of hits) {
      const o = h.object;
      if (!o.visible) continue;
      if (o.userData.ghostOf) return { id: o.userData.ghostOf, ghost: true, point: h.point };
      const id = o.userData.partId;
      if (!id) continue;
      if (CY.game.skipPick(id)) continue;
      return { id, ghost: false, point: h.point };
    }
    return null;
  }

  CY.scooter.pickables = () => {
    const S = CY.scooter;
    if (!S._pick) {
      S._pick = [];
      S.list.forEach((p) => p.group.traverse((o) => { if (o.isMesh && o.userData.partId === p.id) S._pick.push(o); }));
    }
    return S.ghost ? S._pick.concat(S.ghost.children) : S._pick;
  };

  CY.main = async () => {
    document.documentElement.lang = 'zh-Hant';
    const status = document.getElementById('boot-status');
    try {
      CY.G.init();
      CY.K.init();
      status.textContent = '正在準備字型…';
      if (document.fonts && document.fonts.load) {
        await Promise.race([
          Promise.all(['700 20px "LXGW WenKai TC"', '400 20px "LXGW WenKai TC"', '900 20px "Noto Sans TC"', '600 20px "Barlow Condensed"'].map((f) => document.fonts.load(f, '勁戰四代#0123'))),
          CY.U.wait(3000),
        ]).catch(() => {});
      }
      status.textContent = '正在組裝 77 個零件…';
      await CY.U.wait(20);
      const stage = document.getElementById('stage');
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(stage.clientWidth, stage.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      stage.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, stage.clientWidth / stage.clientHeight, 0.03, 60);
      CY.G.makeTextures();
      CY.G.makeMaterials();
      CY.scooter.build(scene);
      CY.workshop.build(scene, renderer);
      CY.scooter.makeLabelAtlas();
      CY.fx.init(scene);
      CY.run.init(scene);
      const controls = new CY.lib.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.35;
      controls.maxDistance = 7.5;
      controls.maxPolarAngle = Math.PI * 0.495;
      controls.target.set(-0.05, 0.78, 0);
      camera.position.set(2.05, 1.5, -2.1);
      controls.update();
      CY.view = { renderer, scene, camera, controls, stage, shadowDirty: true };
      pick.ray = new THREE.Raycaster();
      pick.ndc = new THREE.Vector2();

      // 滑鼠／觸控
      const el = renderer.domElement;
      let down = null, hoverQueued = null;
      el.addEventListener('pointerdown', (e) => {
        down = { x: e.clientX, y: e.clientY, t: performance.now() };
        cam.tween = null;
        controls.autoRotate = false;
      });
      el.addEventListener('pointerup', (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const dt = performance.now() - down.t;
        down = null;
        if (moved < 7 && dt < 600 && e.button === 0) {
          const hit = pickAt(e.clientX, e.clientY);
          CY.game.onClick(hit, e);
        }
      });
      el.addEventListener('dblclick', (e) => {
        const hit = pickAt(e.clientX, e.clientY);
        if (hit && !hit.ghost) cam.focus(CY.scooter.worldCenterOf(hit.id), 0.9);
      });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        hoverQueued = { x: e.clientX, y: e.clientY };
      });
      el.addEventListener('pointerleave', () => { hoverQueued = null; CY.game.onHover(null); });
      el.addEventListener('contextmenu', (e) => e.preventDefault());

      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (document.querySelector('.modal-back')) return;
        CY.game.onKey(e, true);
      });
      window.addEventListener('keyup', (e) => CY.game.onKey(e, false));

      const onResize = () => {
        const w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      CY.game.init();

      let last = performance.now();
      const frame = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        if (hoverQueued) {
          const hq = hoverQueued; hoverQueued = null;
          const hit = pickAt(hq.x, hq.y);
          CY.game.onHover(hit, hq);
        }
        cam.update(dt);
        controls.update();
        CY.game.update(dt);
        CY.run.update(dt);
        CY.fx.update(dt);
        if (CY.view.shadowDirty) { renderer.shadowMap.needsUpdate = true; CY.view.shadowDirty = false; }
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      document.getElementById('boot').classList.add('done');
    } catch (err) {
      console.error(err);
      status.textContent = '啟動失敗：' + (err && err.message ? err.message : err);
    }
  };
})();
