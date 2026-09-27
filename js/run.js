// 試車：加油 → 鑰匙 ON → 握煞車 → 按啟動；引擎運轉動畫、CVT 變速、四行程剖面。
(function () {
  const U = CY.U, h = U.h;
  const R = { active: false, cut: false, cutIds: [] };
  CY.run = R;
  const TAU = Math.PI * 2;
  let st = null, spot = null, spark = null;
  const newState = () => ({
    fuel: false, key: false, brake: false, running: false, cranking: false,
    rpm: 0, thr: 0, thrKey: 0, phase: TAU, wheel: 0, driven: 0, bell: 0,
    slow: false, runTime: 0, maxRpm: 0, smokeAcc: 0, meterT: 0, bootT: 0, lastStroke: -1,
  });

  R.init = (scene) => {
    const K = CY.K;
    spot = new THREE.SpotLight(0xfff1d6, 0, 7, 0.45, 0.55, 1.4);
    const hc = CY.anim.headCenter || new THREE.Vector3(0.72, 0.7, 0);
    spot.position.set(hc.x, hc.y + K.LIFT, hc.z);
    spot.target.position.set(hc.x + 4, 0, 0);
    scene.add(spot, spot.target);
    spark = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfe8ff }));
    spark.position.copy(K.eng(0.141, 0, 0));
    spark.visible = false;
    CY.scooter.root.add(spark);
    R.cutIds = CY.PARTS.filter((p) => p.group === 'body').map((p) => p.id)
      .concat(['shroud', 'cvt_cover', 'crankcase_r', 'crankcase_l', 'cylinder', 'cyl_head', 'head_cover', 'clutch_bell', 'air_cleaner', 'gear_case', 'cooling_fan', 'flywheel', 'tail_light', 'headlight', 'meter',
        'frame', 'regulator', 'ignition_coil', 'wire_harness', 'rear_shock_r', 'rear_shock_l', 'stator', 'starter_motor', 'throttle_body', 'intake_manifold', 'injector', 'fuel_tank', 'fuel_pump', 'battery', 'ecu', 'rear_arm', 'muffler']);
    st = newState();
    R.applyCrank();
    drawMeter('off');
  };

  // ---------- 曲軸姿勢 ----------
  // phase：四行程週期角（弧度，遞增）；2π = 壓縮上死點
  R.setCrankDeg = (deg) => { st.phase = (deg * Math.PI) / 180; R.applyCrank(); CY.view.shadowDirty = true; };
  function valveLift(cycDeg, open, close) {
    let d = cycDeg - open;
    if (d < 0) d += 720;
    const span = close - open;
    if (d > span) return 0;
    return Math.sin((Math.PI * d) / span);
  }
  R.applyCrank = () => {
    const A = CY.anim, K = CY.K;
    const th = -st.phase; // 從右側看順時針
    const rot = (o, a) => { if (o) o.rotation.z = a; };
    rot(A.crank, th); rot(A.flywheel, th); rot(A.fan, th); rot(A.driveFace, th); rot(A.variator, th); rot(A.rollers, th);
    rot(A.cam, th / 2); rot(A.camSprocket, th / 2);
    const sl = K.slider(th);
    if (A.conrod) { A.conrod.position.set(sl.px, sl.py, 0); A.conrod.rotation.z = sl.phi; }
    if (A.piston) A.piston.position.x = sl.X;
    const cyc = (((st.phase * 180) / Math.PI) % 720 + 720) % 720;
    const li = valveLift(cyc, 710, 930) * 0.0065; // 進氣：上死點前 10° ～ 下死點後 30°
    const le = valveLift(cyc, 500, 730) * 0.006;  // 排氣：下死點前 40° ～ 上死點後 10°
    if (A.valves) A.valves.forEach((v) => v.g.position.copy(v.base).addScaledVector(v.dir, -(v.type === 'in' ? li : le)));
    return cyc;
  };

  // ---------- 儀表 ----------
  function drawMeter(mode) {
    const L = CY.anim.lcd;
    if (!L) return;
    const x = L.canvas.getContext('2d');
    x.fillStyle = '#04070a'; x.fillRect(0, 0, 512, 192);
    if (mode !== 'off') {
      const glow = '#cdeeff';
      x.fillStyle = 'rgba(80,160,220,0.08)'; x.fillRect(0, 0, 512, 192);
      if (mode === 'boot') {
        const k = Math.min(1, st.bootT / 1.4);
        x.fillStyle = glow; x.textAlign = 'center';
        x.font = '700 70px "Barlow Condensed", sans-serif';
        x.fillText('CYGNUS-X', 256, 110);
        for (let i = 0; i < 20; i++) { x.fillStyle = i / 20 < k ? glow : 'rgba(205,238,255,0.12)'; x.fillRect(40 + i * 22, 140, 16, 22); }
      } else {
        const kmh = Math.round(st.wheel * CY.K.RR * 3.6);
        x.fillStyle = glow; x.textAlign = 'right';
        x.font = '700 104px "Barlow Condensed", sans-serif';
        x.fillText(String(kmh), 230, 118);
        x.font = '600 26px "Barlow Condensed", sans-serif';
        x.fillText('km/h', 230, 150);
        const segs = 24, on = Math.round((Math.min(10000, st.rpm) / 10000) * segs);
        for (let i = 0; i < segs; i++) {
          x.fillStyle = i < on ? (i > 19 ? '#ff6b5e' : glow) : 'rgba(205,238,255,0.10)';
          x.fillRect(262 + i * 10, 96 - i * 2.2, 7, 22 + i * 2.2);
        }
        x.textAlign = 'left'; x.fillStyle = glow;
        x.font = '600 22px "Barlow Condensed", sans-serif';
        x.fillText('x1000 r/min', 262, 150);
        x.fillText('FUEL', 262, 178);
        for (let i = 0; i < 6; i++) { x.fillStyle = st.fuel ? glow : (i === 0 ? '#ff6b5e' : 'rgba(205,238,255,0.10)'); x.fillRect(318 + i * 18, 162, 13, 18); }
        const d = new Date();
        x.fillStyle = glow; x.textAlign = 'right';
        x.fillText(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), 500, 178);
        x.textAlign = 'left';
        x.fillText('ODO 012736', 30, 178);
      }
    }
    L.tex.needsUpdate = true;
  }

  // ---------- 燈光 ----------
  function lights(pos, head, brake) {
    const M = CY.M;
    M.lightGuide.emissive.setHex(pos ? 0xd8eeff : 0x000000); M.lightGuide.emissiveIntensity = 2.2;
    M.bulb.emissive.setHex(head ? 0xfff0cc : 0x000000); M.bulb.emissiveIntensity = 3;
    M.tailGuide.emissive.setHex(pos ? 0xff2020 : 0x000000); M.tailGuide.emissiveIntensity = brake ? 5 : 2;
    M.lensRed.emissive.setHex(pos ? (brake ? 0x7a0000 : 0x2a0000) : 0x000000);
    if (spot) spot.intensity = head ? 22 : 0;
  }

  // ---------- 面板 ----------
  const STROKES = [
    ['進氣', '活塞往下，進氣門打開，把空氣和汽油吸進汽缸。'],
    ['壓縮', '兩個汽門都關閉，活塞往上把油氣壓縮。'],
    ['爆發', '火星塞點火，油氣燃燒膨脹把活塞往下推。這是唯一產生動力的行程。'],
    ['排氣', '排氣門打開，活塞往上把燃燒後的廢氣推出去。'],
  ];
  function buildPanel() {
    const p = U.$('#runpanel');
    p.className = 'foam';
    p.innerHTML = '';
    const step = (id, t) => h('div', { class: 'run-step', id: 'rs-' + id }, t);
    const steps = h('div', { class: 'run-steps' }, step('fuel', '① 加汽油'), step('key', '② 鑰匙轉 ON'), step('brake', '③ 握住煞車'), step('start', '④ 按啟動鈕'), step('rev', '⑤ 催油門試車'));
    const btn = (id, label, cls, fn) => h('button', { class: 'btn ' + (cls || ''), type: 'button', id, onclick: fn }, label);
    const thr = h('input', { type: 'range', min: '0', max: '100', value: '0', id: 'r-thr', 'aria-label': '油門' });
    thr.addEventListener('input', () => { st.thr = thr.value / 100; });
    const horn = btn('r-horn', '喇叭', '', null);
    horn.addEventListener('pointerdown', () => R.horn(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => horn.addEventListener(ev, () => R.horn(false)));
    const controls = h('div', { class: 'run-controls' },
      btn('r-fuel', '加油', '', () => R.refuel()),
      h('button', { class: 'btn toggle', type: 'button', id: 'r-key', 'aria-pressed': 'false', onclick: () => R.setKey(!st.key) }, '鑰匙'),
      h('button', { class: 'btn toggle', type: 'button', id: 'r-brake', 'aria-pressed': 'false', onclick: () => R.setBrake(!st.brake) }, '握住煞車'),
      btn('r-start', '按啟動鈕', 'primary', () => R.pressStart()),
      h('div', { class: 'throttle' }, h('label', { for: 'r-thr' }, '油門'), thr),
      horn,
      h('button', { class: 'btn toggle', type: 'button', id: 'r-slow', 'aria-pressed': 'false', onclick: () => R.setSlow(!st.slow) }, '慢動作'),
      btn('r-done', '完成試車', '', () => CY.game.finish()));
    const gauge = h('div', { class: 'gauge' },
      h('div', { class: 'g' }, h('span', null, '轉速 rpm'), h('b', { id: 'g-rpm' }, '0')),
      h('div', { class: 'g' }, h('span', null, '後輪 km/h'), h('b', { id: 'g-kmh' }, '0')),
      h('div', { class: 'g', style: { flex: '1' } }, h('span', null, 'CVT 變速比'), h('b', { id: 'g-ratio' }, '—')));
    p.appendChild(steps);
    p.appendChild(controls);
    p.appendChild(gauge);
    p.appendChild(h('div', { class: 'rpmbar' }, h('i', { id: 'g-bar' })));
    U.$('#r-done').disabled = true;
    p.hidden = false;
    R.measure();
    const sp = U.$('#stroke');
    sp.className = 'foam';
    sp.innerHTML = '';
    sp.appendChild(h('h4', null, '四行程循環'));
    sp.appendChild(h('div', { class: 'strokes' }, ...STROKES.map((s, i) => h('div', { id: 'sk-' + i }, s[0]))));
    sp.appendChild(h('p', { id: 'sk-desc' }, '打開「剖面」或「慢動作」看看引擎裡面。'));
  }
  function stepState() {
    const set = (id, done, cur) => { const el = U.$('#rs-' + id); if (el) { el.classList.toggle('done', done); el.classList.toggle('cur', !done && cur); } };
    set('fuel', st.fuel, true);
    set('key', st.key, st.fuel);
    set('brake', st.brake || st.running, st.fuel && st.key);
    set('start', st.running, st.fuel && st.key && st.brake);
    set('rev', st.maxRpm > 5500, st.running);
    const k = U.$('#r-key'); if (k) k.setAttribute('aria-pressed', String(st.key));
    const b = U.$('#r-brake'); if (b) b.setAttribute('aria-pressed', String(st.brake));
    const s = U.$('#r-slow'); if (s) s.setAttribute('aria-pressed', String(st.slow));
    const d = U.$('#r-done'); if (d) d.disabled = !(st.runTime > 3 && st.maxRpm > 5500);
  }

  // 師傅對話框要浮在試車面板上方
  R.measure = () => {
    const p = U.$('#runpanel');
    if (p && !p.hidden) document.documentElement.style.setProperty('--runpanel-h', p.offsetHeight + 'px');
  };
  window.addEventListener('resize', () => R.measure());

  // ---------- 流程 ----------
  R.begin = () => {
    R.active = true;
    st = newState();
    R.applyCrank();
    buildPanel();
    stepState();
    lights(false, false, false);
    drawMeter('off');
    CY.cam.flyTo(new THREE.Vector3(-1.75, 1.7, -2.0), new THREE.Vector3(0.0, 0.8, 0), 1.4);
    CY.ui.say('全部裝回去了！最後一關：試車。油箱現在是空的，先去加油，再轉鑰匙、握住煞車、按啟動鈕。');
  };
  R.reset = () => {
    if (!st) return;
    CY.audio.engine.stop();
    CY.audio.hornOff();
    R.setCut(false);
    st = newState();
    R.applyCrank();
    R.active = false;
    lights(false, false, false);
    drawMeter('off');
    if (CY.anim.key) CY.anim.key.rotation.z = 0;
    const root = CY.scooter.root;
    root.position.set(0, CY.K.LIFT, 0);
    if (spark) spark.visible = false;
    U.$('#runpanel').hidden = true;
    U.$('#stroke').hidden = true;
  };
  R.refuel = async () => {
    if (st.fuel) { CY.ui.say('油已經加滿了。'); return; }
    const v = await CY.mg.fuel({ onMiss: () => CY.game.miss('tool') });
    st.fuel = true;
    CY.ui.say(v + ' 無鉛加滿了！接著把鑰匙轉到 ON。', 'good');
    stepState();
    if (st.key) drawMeter('on');
    CY.game.save();
  };
  R.setKey = (on) => {
    CY.audio.unlock();
    st.key = on;
    if (CY.anim.key) CY.anim.key.rotation.z = on ? -Math.PI / 2 : 0;
    CY.audio.clink();
    if (on) {
      st.bootT = 0;
      CY.audio.pumpPrime();
      lights(true, false, st.brake);
      CY.ui.say('鑰匙 ON！儀表會先跑一段自我檢測，燃油泵「嗡」一聲建立油壓。' + (st.fuel ? '接著握住煞車。' : '對了，油箱還是空的。'));
    } else {
      if (st.running) { st.running = false; CY.audio.engine.stop(); CY.ui.say('熄火了。要再發動就再轉一次鑰匙。'); }
      lights(false, false, false);
      drawMeter('off');
    }
    stepState();
  };
  R.setBrake = (on) => {
    st.brake = on;
    CY.audio.click();
    if (st.key) lights(true, st.running, on);
    if (on && !st.running) CY.ui.say('煞車握住了，煞車燈也亮了。現在按啟動鈕。');
    stepState();
  };
  R.pressStart = async () => {
    CY.audio.unlock();
    if (st.running || st.cranking) return;
    if (!st.key) { CY.audio.error(); CY.ui.say('鑰匙還沒轉到 ON，按啟動鈕沒有反應。', 'warn'); return; }
    if (!st.brake) {
      CY.audio.error();
      if (!CY.game.quizDone.has('q_start')) await CY.game.askQuiz('q_start');
      CY.ui.say('要先握住煞車，啟動鈕才會有反應喔。', 'warn');
      return;
    }
    st.cranking = true;
    const dur = st.fuel ? 0.85 : 1.4;
    CY.audio.crank(dur);
    await U.wait(dur * 1000);
    st.cranking = false;
    if (!st.fuel) { CY.ui.say('啟動馬達有在轉，可是沒有油……先去加油吧。', 'warn'); return; }
    st.running = true;
    st.rpm = 3200;
    CY.audio.engine.start();
    lights(true, true, st.brake);
    for (let i = 0; i < 10; i++) setTimeout(() => puff(0.6), i * 40);
    CY.ui.say('一發就發動了！聽聽這個聲音。現在放開煞車，把油門往上推，看看後輪和 CVT 怎麼動。', 'good');
    stepState();
    CY.game.save();
  };
  R.horn = (on) => {
    if (on && !st.key) { CY.ui.say('鑰匙沒開，喇叭不會響。'); return; }
    if (on) CY.audio.hornOn(); else CY.audio.hornOff();
  };
  R.setSlow = (on) => {
    st.slow = on;
    U.$('#stroke').hidden = !(on || R.cut);
    if (on) {
      if (!R.cut) R.setCut(true);
      CY.ui.say('慢動作：曲軸轉兩圈、凸輪軸轉一圈，完成一次四行程循環。看火星塞什麼時候點火。');
    }
    stepState();
  };
  R.setCut = (on) => {
    R.cut = on;
    R.cutIds.forEach((id) => CY.scooter.setOpacity(id, on ? 0.1 : 1));
    const b = U.$('#btn-xray'); if (b) b.setAttribute('aria-pressed', String(on));
    const sp = U.$('#stroke'); if (sp) sp.hidden = !(on || (st && st.slow));
    if (on && R.active) CY.cam.preset('engine', 1.2);
    CY.view.shadowDirty = true;
  };
  R.onKey = (e, down) => {
    if (!R.active) return;
    const k = e.key;
    if (k === 'w' || k === 'W' || k === 'ArrowUp') { st.thrKey = down ? 1 : 0; e.preventDefault(); }
    if (!down || e.repeat) { if ((k === 'h' || k === 'H') && !down) R.horn(false); return; }
    if (k === 'h' || k === 'H') R.horn(true);
    if (k === 'k' || k === 'K') R.setKey(!st.key);
    if (k === 'b' || k === 'B') R.setBrake(!st.brake);
    if (k === 's' || k === 'S') R.pressStart();
    if (k === 'x' || k === 'X') R.setCut(!R.cut);
  };
  function puff(strength) {
    const tip = CY.anim.exhaustTip;
    if (!tip) return;
    const w = tip.clone().add(CY.scooter.root.position);
    CY.fx.smoke(w, CY.anim.exhaustDir, strength);
  }

  // ---------- 每幀 ----------
  R.update = (dt) => {
    if (!R.active || !st) return;
    const A = CY.anim, K = CY.K;
    const thr = Math.max(st.thr, st.thrKey);
    if (st.running) {
      const target = st.slow ? 1700 : 1700 + Math.pow(thr, 1.25) * (9000 - 1700);
      st.rpm += (target - st.rpm) * Math.min(1, dt * (target > st.rpm ? 3.4 : 1.7));
      st.runTime += dt;
      st.maxRpm = Math.max(st.maxRpm, st.rpm);
      CY.audio.engine.set(st.slow ? 1400 : st.rpm, st.slow ? 0 : thr);
    } else if (st.cranking) {
      st.rpm = 320;
    } else {
      st.rpm = Math.max(0, st.rpm - dt * 3500);
    }
    // 曲軸
    const omega = st.slow && st.running ? Math.PI * 0.55 : (st.rpm / 60) * TAU;
    st.phase += omega * dt;
    if (st.phase > TAU * 400) st.phase -= TAU * 200;
    const cyc = R.applyCrank();
    // 點火閃光與行程顯示
    const firing = st.running && cyc > 352 && cyc < 380;
    if (spark) spark.visible = firing && (R.cut || st.slow);
    const sIdx = Math.floor(cyc / 180);
    if (!U.$('#stroke').hidden && sIdx !== st.lastStroke) {
      st.lastStroke = sIdx;
      for (let i = 0; i < 4; i++) U.$('#sk-' + i).classList.toggle('on', i === sIdx);
      U.$('#sk-desc').textContent = STROKES[sIdx][1];
    }
    // CVT
    const rpmUse = st.slow ? 1700 : st.rpm;
    // 低速約 2.2:1，高速約 0.7:1（前普利半徑變大、後普利變小）
    const rd = 0.028 + 0.027 * U.smooth(U.clamp((rpmUse - 3800) / 3700, 0, 1));
    const rn = 0.062 - (rd - 0.028) * 0.89;
    if (A.belt) A.belt.set(rd, rn);
    const wDriven = (omega * rd) / rn;
    st.driven = wDriven;
    if (A.clutch) A.clutch.rotation.z -= wDriven * dt;
    const engage = st.running && !st.slow ? U.smooth(U.clamp((st.rpm - 3000) / 900, 0, 1)) : 0;
    const braking = st.brake;
    const bellTarget = braking ? 0 : engage * wDriven;
    st.bell += (bellTarget - st.bell) * Math.min(1, dt * (braking ? 6 : 2.2));
    if (A.bell) A.bell.rotation.z -= st.bell * dt;
    st.wheel = st.bell / 10.8;
    if (A.rearWheel) A.rearWheel.rotation.z -= st.wheel * dt;
    if (A.rearDisc) A.rearDisc.rotation.z -= st.wheel * dt;
    if (A.belt) { const bm = A.belt.mesh.material.bumpMap; if (bm) bm.offset.y -= (omega * rd * dt) / 0.9 * 60; }
    if (A.camChainTex) A.camChainTex.offset.y -= (omega * 0.0135 * dt) / 0.5 * 52;
    if (braking && st.running && st.rpm > 3600 && !st._brakeTold) { st._brakeTold = true; CY.ui.say('還握著煞車喔！離合器已經咬合了，放開煞車後輪才轉得起來。', 'warn'); }
    // 震動與排氣
    const root = CY.scooter.root;
    if (st.running) {
      const amp = st.slow ? 0.0004 : 0.0011 * (1 - Math.min(0.6, st.rpm / 15000));
      root.position.set((Math.random() - 0.5) * amp, K.LIFT + Math.sin(st.phase * 2) * amp, (Math.random() - 0.5) * amp * 0.6);
      st.smokeAcc += dt * (st.slow ? 2 : 6 + thr * 26);
      while (st.smokeAcc > 1) { st.smokeAcc -= 1; puff(thr); }
      CY.view.shadowDirty = true;
    } else if (root.position.y !== K.LIFT) {
      root.position.set(0, K.LIFT, 0);
      CY.view.shadowDirty = true;
    }
    if (st.cranking || st.rpm > 0) CY.view.shadowDirty = true;
    // 儀表
    st.meterT += dt;
    if (st.key) st.bootT += dt;
    if (st.meterT > 0.08) {
      st.meterT = 0;
      if (st.key) drawMeter(st.bootT < 1.6 ? 'boot' : 'on');
      const r = U.$('#g-rpm'); if (r) r.textContent = String(Math.round(st.slow && st.running ? 0 : st.rpm));
      const kmh = U.$('#g-kmh'); if (kmh) kmh.textContent = String(Math.round(st.wheel * K.RR * 3.6));
      const ra = U.$('#g-ratio'); if (ra) ra.textContent = st.rpm > 0 ? (rn / rd).toFixed(2) + ' : 1' : '—';
      const bar = U.$('#g-bar'); if (bar) bar.style.width = Math.min(100, (st.rpm / 9500) * 100) + '%';
      stepState();
    }
  };
})();
