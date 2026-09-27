// 遊戲流程：標題 → 拆解 → 組裝 → 發動 → 結算；另有零件爆炸圖（自由檢視）。
(function () {
  const U = CY.U;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SAVE_KEY = 'cygnus4-apprentice-v1';
  const G = {
    phase: 'boot', mode: 'normal', paint: 'blue', tool: 'hand',
    removed: new Set(), installed: new Set(), discovered: new Set(), quizDone: new Set(),
    stats: null, busy: false, held: null, hoverId: null, xray: false, anims: [], pulses: [], time: 0,
  };
  CY.game = G;
  const S = () => CY.scooter;
  const PART = (id) => CY.PART[id];
  const total = () => CY.PARTS.length;
  const names = (ids) => ids.map((i) => '「' + PART(i).name + '」').join('、');
  const XRAY_IDS = () => CY.PARTS.filter((p) => p.group === 'body').map((p) => p.id).concat(['shroud', 'cvt_cover', 'air_cleaner']);

  function newStats() { return { elapsed: 0, wrongTool: 0, wrongOrder: 0, hints: 0, demos: 0, quizRight: 0, quizTotal: 0 }; }

  // ---------- 初始化 ----------
  G.init = () => {
    CY.ui.buildTools((id) => G.selectTool(id));
    CY.ui.buildOrder();
    const $ = U.$;
    $('#btn-hint').addEventListener('click', () => G.hint());
    $('#btn-demo').addEventListener('click', () => G.demo());
    $('#btn-xray').addEventListener('click', () => G.setXray(!G.xray));
    $('#btn-view').addEventListener('click', (e) => {
      CY.ui.toggleViewMenu(e.currentTarget, Object.entries(CY.cam.PRESETS).map(([id, p]) => ({ id, label: p.label })), (id) => CY.cam.preset(id));
    });
    $('#btn-order').addEventListener('click', () => $('#order').classList.toggle('open'));
    $('#btn-book').addEventListener('click', () => CY.ui.showBook({ discovered: G.discovered, all: G.phase === 'free', onLocate: (id) => G.locate(id) }));
    $('#btn-sound').addEventListener('click', (e) => {
      CY.audio.unlock();
      const on = !CY.audio.enabled;
      CY.audio.setEnabled(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      U.store.set('cygnus4-sound', on);
    });
    $('#btn-menu').addEventListener('click', () => G.menu());
    document.addEventListener('pointerdown', (e) => {
      const vm = $('#viewmenu');
      if (!vm.hidden && !vm.contains(e.target) && e.target.id !== 'btn-view') vm.hidden = true;
    });
    const snd = U.store.get('cygnus4-sound', true);
    CY.audio.enabled = snd;
    $('#btn-sound').setAttribute('aria-pressed', String(snd));
    const save = U.store.get(SAVE_KEY, null);
    G.paint = (save && save.paint) || U.store.get('cygnus4-paint', 'blue');
    CY.G.applyPaint(G.paint);
    // 重新發佈時保留進度（Artifact 熱更新）
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) { try { hot.snapshot(() => G.serialize()); } catch (e) { /* 忽略 */ } }
    let booted = false;
    const boot = (data) => {
      if (booted) return;
      booted = true;
      if (data && ['dis', 'asm', 'run'].includes(data.phase)) { U.store.set(SAVE_KEY, data); G.resume(); } else G.toTitle();
    };
    if (hot && hot.ready) {
      try { hot.ready(boot); } catch (e) { boot(null); }
      setTimeout(() => boot(null), 1500);
    } else boot(hot && hot.data);
  };

  // ---------- 存檔 ----------
  G.serialize = () => ({
    v: 1, phase: G.phase, mode: G.mode, paint: G.paint,
    removed: [...G.removed], installed: [...G.installed], discovered: [...G.discovered], quizDone: [...G.quizDone], stats: G.stats,
  });
  G.save = () => { if (['dis', 'asm', 'run'].includes(G.phase)) U.store.set(SAVE_KEY, G.serialize()); };

  // ---------- 標題 ----------
  function clearLabels() {
    S().list.forEach((p) => { if (p.label) { p.label.parent.remove(p.label); p.label = null; } });
  }
  function showHud(kind) {
    const $ = U.$;
    $('#hud').hidden = false;
    $('#hud').dataset.phase = kind;
    const work = kind === 'dis' || kind === 'asm';
    $('#drawer').hidden = !work;
    $('#order').hidden = false;
    $('#btn-hint').hidden = !work;
    $('#btn-demo').hidden = !work;
    $('#btn-xray').hidden = false;
    $('#btn-xray').textContent = kind === 'run' ? '剖面' : '透視';
    $('#btn-book').hidden = kind === 'run';
    $('#runpanel').hidden = kind !== 'run';
    $('#stroke').hidden = true;
    if (kind !== 'free') CY.ui.hideFreeBar();
  }
  G.toTitle = () => {
    G.phase = 'title';
    CY.run.reset();
    G.setXray(false);
    S().removeGhost();
    G.held = null;
    S().resetAll();
    clearLabels();
    CY.view.shadowDirty = true;
    U.$('#hud').hidden = true;
    CY.ui.tag(false);
    CY.cam.preset('front3q', 1.2);
    CY.view.controls.autoRotate = true;
    CY.view.controls.autoRotateSpeed = 0.5;
    const save = U.store.get(SAVE_KEY, null);
    CY.ui.showTitle({
      hasSave: !!(save && ['dis', 'asm', 'run'].includes(save.phase)),
      paint: G.paint, mode: G.mode === 'free' ? 'normal' : G.mode,
      onPaint: (id) => { G.paint = id; CY.G.applyPaint(id); U.store.set('cygnus4-paint', id); },
      onStart: (o) => G.start(o),
      onResume: () => G.resume(),
      onFree: () => G.startFree(),
    });
  };

  // ---------- 開始新的一局 ----------
  G.start = (o) => {
    CY.ui.clearOverlay();
    G.paint = o.paint; G.mode = o.mode;
    CY.G.applyPaint(G.paint);
    G.removed = new Set(); G.installed = new Set(CY.PARTS.map((p) => p.id)); G.discovered = new Set(); G.quizDone = new Set();
    G.stats = newStats();
    S().resetAll(); clearLabels();
    G.enterDis(true);
    G.save();
  };
  G.enterDis = (fresh) => {
    G.phase = 'dis';
    CY.view.controls.autoRotate = false;
    showHud('dis');
    CY.ui.setPhase('dis');
    CY.ui.showTorqueTool(false);
    CY.ui.toolHidden = G.mode === 'hard';
    G.selectTool('hand', true);
    CY.cam.preset('front3q', 1.2);
    if (fresh) CY.ui.say('歡迎來到阿德機車行！做任何事之前，安全第一：先拆坐墊、打開電瓶蓋，把電瓶「負極」拔掉，全車斷電後才能動其他地方。');
    else CY.ui.say('回來啦，我們繼續拆。');
    G.refresh();
  };
  G.resume = () => {
    const s = U.store.get(SAVE_KEY, null);
    if (!s) { G.toTitle(); return; }
    CY.ui.clearOverlay();
    G.mode = s.mode || 'normal'; G.paint = s.paint || 'blue';
    CY.G.applyPaint(G.paint);
    G.stats = Object.assign(newStats(), s.stats || {});
    G.discovered = new Set(s.discovered || []);
    G.quizDone = new Set(s.quizDone || []);
    S().resetAll(); clearLabels();
    if (s.phase === 'dis') {
      G.removed = new Set(s.removed || []);
      G.installed = new Set(CY.PARTS.map((p) => p.id).filter((id) => !G.removed.has(id)));
      G.removed.forEach((id) => S().snapToMat(id));
      CY.view.shadowDirty = true;
      G.enterDis(false);
    } else {
      G.removed = new Set(CY.PARTS.map((p) => p.id));
      CY.PARTS.forEach((p) => S().snapToMat(p.id));
      G.installed = new Set();
      const want = new Set(s.phase === 'run' ? CY.PARTS.map((p) => p.id) : s.installed || []);
      CY.PARTS.slice().reverse().forEach((p) => { if (want.has(p.id)) { S().snapInstall(p.id); G.installed.add(p.id); G.removed.delete(p.id); } });
      CY.view.shadowDirty = true;
      if (G.installed.size === total()) { G.enterRun(); } else G.enterAsm(false);
    }
  };

  // ---------- 零件爆炸圖（自由檢視） ----------
  G.startFree = () => {
    CY.ui.clearOverlay();
    G.phase = 'free';
    G.discovered = new Set(CY.PARTS.map((p) => p.id));
    S().resetAll(); clearLabels();
    CY.view.controls.autoRotate = false;
    showHud('free');
    U.$('#drawer').hidden = true;
    CY.ui.setPhase('none');
    CY.ui.updateOrder(groupCounts(() => true), '參觀', '自由檢視');
    CY.ui.stats(0, total() + ' 件', 0);
    CY.ui.showFreeBar({ value: 0, onExplode: (f) => { S().setExplode(f); CY.view.shadowDirty = true; }, onExit: () => G.toTitle() });
    CY.cam.preset('front3q', 1.2);
    CY.ui.say('這是零件爆炸圖：拉動下面的滑桿，整台車會沿著拆裝方向展開。點零件就能看它的名稱、功能和拆法。');
  };

  // ---------- 工具 ----------
  G.selectTool = (id, silent) => {
    if (id === 'torque' && G.phase !== 'asm') { CY.ui.toast('扭力扳手是組裝時才用的'); return; }
    G.tool = id;
    CY.ui.setTool(id);
    if (!silent) CY.audio.click();
  };

  // ---------- 規則 ----------
  G.missingRemove = (id) => PART(id).req.filter((r) => !G.removed.has(r));
  G.missingInstall = (id) => PART(id).covers.filter((c) => !G.installed.has(c));
  G.available = () => {
    if (G.phase === 'dis') return CY.PARTS.filter((p) => !G.removed.has(p.id) && !G.missingRemove(p.id).length);
    if (G.phase === 'asm') return CY.PARTS.slice().reverse().filter((p) => !G.installed.has(p.id) && !G.missingInstall(p.id).length);
    return [];
  };
  G.skipPick = (id) => {
    if (!G.xray && !CY.run.cut) return false;
    if (G.phase === 'run') return CY.run.cutIds.includes(id);
    return XRAY_IDS().includes(id) && G.installed.has(id);
  };
  G.miss = (kind) => {
    if (!G.stats) return;
    if (kind === 'order') G.stats.wrongOrder++; else G.stats.wrongTool++;
    G.refresh();
  };

  // ---------- 高亮 ----------
  G.glowFor = (id) => {
    if (G.held === id) return [0x2e8bff, 0.55];
    if (G.hoverId === id) {
      if (G.phase === 'dis' && !G.removed.has(id)) {
        const ok = !G.missingRemove(id).length;
        if (ok) return [0xffb300, 0.5];
        return G.mode === 'easy' ? [0xff3b30, 0.35] : [0x6fa8ff, 0.25];
      }
      if (G.phase === 'asm' && !G.installed.has(id)) {
        const ok = !G.missingInstall(id).length;
        if (ok) return G.mode === 'hard' ? [0x6fa8ff, 0.35] : [0x2ecc71, 0.5];
        return G.mode === 'easy' ? [0xff3b30, 0.35] : [0x6fa8ff, 0.25];
      }
      return [0x6fa8ff, 0.3];
    }
    return null;
  };
  G.applyGlow = (id) => {
    if (!id) return;
    const g = G.glowFor(id);
    if (g) S().setGlow(id, g[0], g[1]); else S().clearGlow(id);
  };
  G.pulse = (ids, sec, hex) => { G.pulses.push({ ids, until: G.time + (sec || 3), hex: hex || 0xffc400 }); };

  // ---------- 滑鼠 ----------
  function stateText(id) {
    if (G.phase === 'dis') {
      if (G.removed.has(id)) return ['在零件墊上', 'mat'];
      return G.missingRemove(id).length ? ['還拆不下來', 'no'] : ['可以拆', 'ok'];
    }
    if (G.phase === 'asm') {
      if (G.installed.has(id)) return ['已經裝好', 'ok'];
      return G.missingInstall(id).length ? ['還不能裝', 'no'] : ['可以裝', 'ok'];
    }
    if (G.phase === 'run') return ['', ''];
    return [CY.GROUPS[PART(id).group].name, 'mat'];
  }
  G.onHover = (hit, ev) => {
    if (!['dis', 'asm', 'free', 'run'].includes(G.phase)) { CY.ui.tag(false); return; }
    const id = hit ? hit.id : null;
    if (id !== G.hoverId) {
      const prev = G.hoverId;
      G.hoverId = id;
      G.applyGlow(prev);
      G.applyGlow(id);
      if (id) {
        const [t, c] = stateText(id);
        const hard = G.mode === 'hard' && G.phase !== 'free';
        CY.ui.showCard(id, hard && c === 'no' ? '' : t, c);
      }
    }
    if (!id) { CY.ui.tag(false); return; }
    const [t, c] = stateText(id);
    CY.ui.tag(true, ev.x, ev.y, id, hit.ghost ? '點一下安裝' : (G.mode === 'hard' && c === 'no' ? '' : t), hit.ghost ? 'ok' : c);
    U.$('#stage').style.cursor = 'pointer';
    clearTimeout(G._cur);
    G._cur = setTimeout(() => { if (!G.hoverId) U.$('#stage').style.cursor = ''; }, 100);
  };
  G.clearHover = () => {
    const hv = G.hoverId;
    G.hoverId = null;
    G.applyGlow(hv);
    CY.ui.tag(false);
  };
  G.onClick = (hit) => {
    if (!hit) {
      if (G.phase === 'asm' && G.held && !G.busy) G.drop();
      return;
    }
    if (G.busy) return;
    CY.audio.unlock();
    if (G.phase === 'dis') G.tryRemove(hit.id);
    else if (G.phase === 'asm') {
      if (hit.ghost) G.tryInstall(hit.id);
      else if (G.installed.has(hit.id)) { CY.ui.showCard(hit.id, '已經裝好', 'ok'); CY.ui.say('「' + PART(hit.id).name + '」已經裝好了。去零件墊上找下一個。'); }
      else G.hold(hit.id);
    } else if (G.phase === 'free' || G.phase === 'run') {
      CY.ui.showCard(hit.id, G.phase === 'free' ? CY.GROUPS[PART(hit.id).group].name : '', 'mat');
      U.$('#order').classList.add('open');
    }
  };
  G.onKey = (e, down) => {
    if (G.phase === 'run') { CY.run.onKey(e, down); return; }
    if (!down) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (G.phase === 'dis' || G.phase === 'asm') {
      const tool = Object.keys(CY.ui.TOOL_KEYS).find((t) => CY.ui.TOOL_KEYS[t] === k);
      if (tool) { G.selectTool(tool); e.preventDefault(); return; }
      if (k === 'Escape' && G.held) G.drop();
    }
    if (k === 'X' && G.phase !== 'title') G.setXray(!G.xray);
  };
  G.locate = (id) => {
    CY.cam.focus(S().worldCenterOf(id), 1.0);
    G.pulse([id], 2.5, 0x2e8bff);
    CY.ui.showCard(id, '', '');
  };

  // ---------- 透視 ----------
  G.setXray = (on) => {
    if (G.phase === 'run') { CY.run.setCut(on); G.xray = false; U.$('#btn-xray').setAttribute('aria-pressed', String(CY.run.cut)); return; }
    G.xray = on;
    XRAY_IDS().forEach((id) => S().setOpacity(id, on && S().parts[id].state === 'installed' ? 0.13 : 1));
    U.$('#btn-xray').setAttribute('aria-pressed', String(on));
    CY.view.shadowDirty = true;
  };

  // ---------- 動畫 ----------
  function animate(dur, fn) {
    return new Promise((resolve) => G.anims.push({ t: 0, dur, fn, resolve }));
  }
  const bez = (a, b, c, t) => a.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(c, t * t);
  G.animRemove = async (id) => {
    const p = S().parts[id];
    const g = p.group;
    S().matRoot.attach(g);
    const start = g.position.clone();
    const q0 = g.quaternion.clone();
    const e = PART(id).explode || [0, 0.2, 0];
    const dir = V(e[0], e[1], e[2]);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    dir.normalize();
    const pull = start.clone().addScaledVector(dir, 0.1);
    await animate(0.35, (k) => {
      g.position.lerpVectors(start, pull, U.easeOut(k));
      g.rotation.z = Math.sin(k * Math.PI * 3) * 0.006;
    });
    const end = p.matPos.clone();
    const mid = pull.clone().lerp(end, 0.5);
    mid.y = Math.max(pull.y, end.y) + 0.55;
    await animate(0.8, (k) => {
      g.position.copy(bez(pull, mid, end, U.easeInOut(k)));
      g.quaternion.slerpQuaternions(q0, new THREE.Quaternion(), k);
    });
    g.position.copy(end);
    g.quaternion.identity();
    p.state = 'removed';
    CY.fx.dust(S().worldCenterOf(id).setY(0.01));
    CY.audio.clunk();
  };
  G.animInstall = async (id) => {
    const p = S().parts[id];
    const g = p.group;
    const t = S().installTarget(id);
    if (g.parent !== S().matRoot) S().matRoot.attach(g);
    const start = g.position.clone();
    const e = PART(id).explode || [0, 0.2, 0];
    const dir = V(e[0], e[1], e[2]);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    dir.normalize();
    const pre = t.pos.clone().addScaledVector(dir, 0.12);
    const mid = start.clone().lerp(pre, 0.5);
    mid.y = Math.max(start.y, pre.y) + 0.55;
    await animate(0.8, (k) => g.position.copy(bez(start, mid, pre, U.easeInOut(k))));
    await animate(0.35, (k) => {
      g.position.lerpVectors(pre, t.pos, U.easeOut(k));
      g.rotation.z = Math.sin(k * Math.PI * 3) * 0.006;
    });
    t.parent.attach(g);
    g.position.set(0, 0, 0);
    g.quaternion.identity();
    p.state = 'installed';
  };
  // 放油特效
  G.drain = async (kind) => {
    const W = CY.workshop;
    const id = kind === 'oil' ? 'oil_drain' : 'gear_oil';
    const src = S().parts[id].center.clone().add(S().root.position);
    W.pan.position.set(src.x, CY.K.LIFT + 0.001, src.z + (kind === 'gear' ? 0.02 : 0));
    W.pan.visible = true;
    W.panOil.scale.set(0.01, 0.01, 1);
    CY.audio.pourStart(kind === 'gear');
    CY.ui.say(kind === 'oil' ? '機油嘩啦啦流出來了。舊機油顏色很深，代表真的該換了。' : '齒輪油也放乾淨。它的味道很重，這就是齒輪油的特徵。');
    let acc = 0;
    await animate(2.4, (k, dt) => {
      acc += dt;
      while (acc > 0.025) { acc -= 0.025; CY.fx.drip(src, CY.K.LIFT + 0.01); }
      const s = 0.2 + 0.8 * k;
      W.panOil.scale.set(s, s, 1);
    });
    CY.audio.pourStop();
    setTimeout(() => { W.pan.visible = false; CY.view.shadowDirty = true; }, 1500);
  };

  G.askQuiz = async (qid) => {
    const ok = await CY.ui.quiz(qid);
    G.quizDone.add(qid);
    G.stats.quizTotal++;
    if (ok) G.stats.quizRight++;
    G.refresh();
    return ok;
  };

  // ---------- 拆 ----------
  G.tryRemove = async (id, auto) => {
    const P = PART(id);
    if (G.removed.has(id)) {
      CY.ui.showCard(id, '在零件墊上', 'mat');
      return;
    }
    const miss = G.missingRemove(id);
    if (miss.length) {
      if (!auto) G.miss('order');
      CY.audio.error();
      if (miss.includes('battery_neg')) {
        CY.ui.say('等一下！電瓶負極還沒拔。先斷電，才能動其他地方。', 'warn');
        if (G.mode !== 'hard') G.pulse(['seat', 'battery_cover', 'battery_neg'].filter((x) => !G.removed.has(x)), 3);
      } else if (G.mode === 'hard') {
        CY.ui.say('還拆不下來，有別的零件擋著。', 'warn');
      } else {
        const direct = P.blockers.filter((b) => !G.removed.has(b));
        const show = direct.length ? direct : miss;
        CY.ui.say('「' + P.name + '」還拆不下來，要先拆掉' + names(show.slice(0, 4)) + (show.length > 4 ? '等零件' : '') + '。', 'warn');
        G.pulse(show, 3);
      }
      return;
    }
    if (!auto && G.tool !== P.tool) {
      G.miss('tool');
      CY.audio.error();
      if (G.mode === 'easy') { CY.ui.say('這裡是「' + P.fast + '」，要用「' + CY.toolName(P.tool) + '」。', 'warn'); CY.ui.suggestTool(P.tool); }
      else if (G.mode === 'normal') CY.ui.say('工具不對喔。「' + P.name + '」的固定方式是「' + P.fast + '」，想想看該用什麼工具？', 'warn');
      else CY.ui.say('工具不對。', 'warn');
      return;
    }
    G.busy = true;
    G.clearHover();
    try {
      if (P.quizOut && !G.quizDone.has(P.quizOut)) await G.askQuiz(P.quizOut);
      if (P.special && P.special.out === 'timing') {
        await CY.mg.timing({ install: false, onAngle: (a) => CY.run.setCrankDeg(a), onMiss: () => G.miss('tool') });
        CY.run.setCrankDeg(360);
      }
      if (P.special && P.special.out === 'pattern') await CY.mg.pattern({ tighten: false, onMiss: () => G.miss('order') });
      CY.audio.tool(P.tool);
      if (G.held) G.drop();
      await G.animRemove(id);
      if (G.xray) S().setOpacity(id, 1);
      G.removed.add(id); G.installed.delete(id); G.discovered.add(id);
      S().ensureLabel(id);
      if (P.special && P.special.out === 'drainOil') await G.drain('oil');
      else if (P.special && P.special.out === 'drainGear') await G.drain('gear');
      else CY.ui.say(P.tip, 'good');
      CY.ui.suggestTool(null);
      CY.ui.showCard(id, '在零件墊上', 'mat');
      G.refresh();
      G.save();
    } finally {
      G.busy = false;
    }
    if (G.removed.size === total()) G.finishDis();
  };

  G.finishDis = async () => {
    CY.audio.fanfare();
    CY.cam.preset('mat', 1.6);
    CY.ui.say('全部拆完了！零件墊上這 77 個零件，就是一台勁戰四代的全部。');
    await U.wait(1700);
    const st = G.stats;
    await CY.ui.modal({
      eyebrow: '第一階段完成', title: '拆到只剩零件了',
      body: '<p>你把整台勁戰四代拆成 <b>77 個零件</b>，花了 <b>' + U.fmtTime(st.elapsed) + '</b>，拿錯工具 ' + st.wrongTool + ' 次、順序錯誤 ' + st.wrongOrder + ' 次。</p>' +
        '<p>接下來是組裝：順序要反過來，從車架開始，把零件一個一個裝回去。關鍵螺絲（汽缸頭、火星塞、輪軸、卡鉗…）要換成<b>扭力扳手</b>。</p>',
      buttons: [{ label: '開始組裝', cls: 'primary' }], dismissible: false,
    });
    G.enterAsm(true);
    G.save();
  };

  // ---------- 裝 ----------
  G.enterAsm = (fresh) => {
    G.phase = 'asm';
    G.held = null;
    CY.view.controls.autoRotate = false;
    showHud('asm');
    CY.ui.setPhase('asm');
    CY.ui.showTorqueTool(true);
    CY.ui.toolHidden = G.mode === 'hard';
    G.selectTool('hand', true);
    CY.ui.say(fresh ? '開始組裝！點零件墊上的零件把它拿起來，再點出現的虛影裝上去。第一個要裝的是……當然是車架。' : '回來啦，我們繼續組裝。');
    if (fresh) CY.cam.preset('mat', 1.2);
    G.refresh();
  };
  G.hold = (id) => {
    if (G.held) S().clearGlow(G.held);
    G.held = id;
    G.applyGlow(id);
    const miss = G.missingInstall(id);
    const ok = !miss.length;
    S().makeGhost(id, ok || G.mode === 'hard');
    CY.audio.click();
    const P = PART(id);
    CY.ui.showCard(id, ok ? '可以裝' : (G.mode === 'hard' ? '' : '還不能裝'), ok ? 'ok' : 'no');
    if (!ok && G.mode !== 'hard') {
      CY.ui.say('「' + P.name + '」還不能裝，要先把' + names(miss.slice(0, 4)) + (miss.length > 4 ? '等零件' : '') + '裝好。', 'warn');
    } else {
      const need = P.installTool || P.tool;
      CY.ui.say('拿起「' + P.name + '」了。點虛影把它裝上去' + (G.mode === 'easy' ? '，用「' + CY.toolName(need) + '」。' : '，記得換對工具。'));
      if (G.mode === 'easy') CY.ui.suggestTool(need);
    }
    // 虛影不在畫面內、或離太遠看不清楚，就把相機帶過去
    const v = CY.view;
    if (S().ghost) {
      const box = new THREE.Box3().setFromObject(S().ghost);
      const c = box.getCenter(V());
      const size = box.getSize(V()).length();
      const ndc = c.clone().project(v.camera);
      const far = v.camera.position.distanceTo(c) > Math.max(1.6, size * 4.5);
      if (Math.abs(ndc.x) > 0.8 || Math.abs(ndc.y) > 0.8 || ndc.z > 1 || far) CY.cam.focusPart(c, size);
    }
    G.refreshTray();
  };
  G.drop = () => {
    const id = G.held;
    G.held = null;
    S().removeGhost();
    G.applyGlow(id);
    CY.ui.suggestTool(null);
    G.refreshTray();
  };
  G.tryInstall = async (id, auto) => {
    const P = PART(id);
    if (G.installed.has(id)) return;
    const miss = G.missingInstall(id);
    if (miss.length) {
      if (!auto) G.miss('order');
      CY.audio.error();
      if (G.mode === 'hard') CY.ui.say('還不能裝，順序不對。', 'warn');
      else { CY.ui.say('還不能裝，要先把' + names(miss.slice(0, 4)) + (miss.length > 4 ? '等零件' : '') + '裝好。', 'warn'); G.pulse(miss, 3); }
      return;
    }
    const need = P.installTool || P.tool;
    if (!auto && G.tool !== need) {
      G.miss('tool');
      CY.audio.error();
      if (need === 'torque' && G.mode !== 'hard') CY.ui.say('這是關鍵螺絲！組裝要用「扭力扳手」，依規定扭力鎖緊' + (P.torque ? '（' + P.torque + '）' : '') + '。', 'warn');
      else if (G.mode === 'easy') { CY.ui.say('要用「' + CY.toolName(need) + '」。', 'warn'); CY.ui.suggestTool(need); }
      else if (G.mode === 'normal') CY.ui.say('工具不對喔。「' + P.name + '」的固定方式是「' + P.fast + '」。', 'warn');
      else CY.ui.say('工具不對。', 'warn');
      return;
    }
    G.busy = true;
    G.clearHover();
    try {
      S().removeGhost();
      if (P.special && P.special.in === 'timing') {
        await CY.mg.timing({ install: true, onAngle: (a) => CY.run.setCrankDeg(a), onMiss: () => G.miss('tool') });
        CY.run.setCrankDeg(360);
      }
      if (P.quizIn && !G.quizDone.has(P.quizIn)) await G.askQuiz(P.quizIn);
      if (P.special && P.special.in === 'fillOil') {
        await CY.mg.fill({ kind: 'oil', eyebrow: '加機油', title: '從機油尺孔加入新機油', lo: 800, hi: 900, max: 1100, rate: 170, step: 20, color: '#c8901e', note: '勁戰四代的機油量約 850±50 c.c.。倒到上下限之間就好，不要貪多。', onMiss: () => G.miss('tool') });
      }
      if (P.special && P.special.in === 'pattern') await CY.mg.pattern({ tighten: true, onMiss: () => G.miss('order') });
      CY.audio.tool(need);
      await G.animInstall(id);
      if (P.special && P.special.in === 'fillGear') {
        await CY.mg.fill({ kind: 'gear', eyebrow: '加齒輪油', title: '從加油孔加入齒輪油', lo: 120, hi: 140, max: 200, rate: 32, step: 5, color: '#8a5a12', note: '洩油螺絲鎖好了，接著從加油孔加入齒輪油：勁戰的交換量約 130±10 c.c.。', onMiss: () => G.miss('tool') });
      }
      G.installed.add(id); G.removed.delete(id); G.discovered.add(id);
      if (G.xray && XRAY_IDS().includes(id)) S().setOpacity(id, 0.13);
      G.held = null;
      G.applyGlow(id);
      CY.ui.suggestTool(null);
      CY.ui.say(installLine(P), 'good');
      CY.ui.showCard(id, '已經裝好', 'ok');
      G.refresh();
      G.save();
    } finally {
      G.busy = false;
    }
    if (G.installed.size === total()) G.finishAsm();
  };
  function installLine(P) {
    if (P.id === 'frame') return '車架放好了。接下來的每個零件都會鎖在它上面。';
    if (P.id === 'battery_neg') return '負極接回去了，全車又有電了。';
    if (P.installTool === 'torque') return '「' + P.name + '」用扭力扳手鎖好了' + (P.torque ? '（' + P.torque + '）' : '') + '。關鍵螺絲寧可多確認一次。';
    const lines = ['「' + P.name + '」裝好了，下一個。', '很好，「' + P.name + '」歸位。', '「' + P.name + '」鎖緊了，繼續。'];
    return lines[P.no % lines.length];
  }
  G.finishAsm = async () => {
    CY.audio.fanfare();
    CY.ui.say('全部裝回去了！最後一關：試車。');
    await U.wait(900);
    G.enterRun();
    G.save();
  };

  // ---------- 發動 ----------
  G.enterRun = () => {
    G.phase = 'run';
    if (G.held) G.drop();
    G.setXray(false);
    showHud('run');
    CY.ui.setPhase('run');
    G.refresh();
    CY.run.begin();
  };
  G.finish = async () => {
    const st = G.stats;
    const easy = G.mode === 'easy';
    const mult = G.mode === 'hard' ? 1.4 : 1;
    let score = 1000 - Math.round((st.wrongTool * 20 + st.wrongOrder * 12) * mult) - (easy ? 0 : st.hints * 10) - st.demos * 35 + st.quizRight * 15;
    score = Math.max(0, score);
    const stars = score >= 900 ? 3 : score >= 650 ? 2 : 1;
    const rank = stars === 3 ? '出師了！可以自己開店' : stars === 2 ? '黑手達人' : '認真的學徒';
    const errs = st.wrongTool + st.wrongOrder;
    const say = errs === 0 ? '一次都沒失誤？你以前是不是修過車！' : errs < 10 ? '手腳很俐落，細節再多注意一點，下次就是老師傅了。' : '拆裝一台車不簡單，錯了就記起來，這就是當學徒的意義。';
    CY.ui.say('試車成功！這台勁戰四代交車了。');
    const stamp = U.$('#wo-stamp');
    if (stamp) stamp.textContent = '完工';
    const v = await CY.ui.showResults({ time: st.elapsed, wrongTool: st.wrongTool, wrongOrder: st.wrongOrder, hints: st.hints, demos: st.demos, quizRight: st.quizRight, quizTotal: st.quizTotal, score, stars, rank, say });
    U.store.del(SAVE_KEY);
    G.phase = 'done';
    CY.run.reset();
    if (v === 'free') G.startFree(); else G.toTitle();
  };

  // ---------- 提示與示範 ----------
  G.hint = () => {
    if (G.busy || !['dis', 'asm'].includes(G.phase)) return;
    const av = G.available();
    if (!av.length) return;
    G.stats.hints++;
    G.pulse(av.map((p) => p.id), 3.5);
    const first = av.slice(0, 3).map((p) => p.id);
    if (G.phase === 'dis') CY.ui.say('現在可以拆的有' + names(first) + (av.length > 3 ? '等 ' + av.length + ' 個' : '') + '，發亮的就是。');
    else CY.ui.say('現在可以裝的有' + names(first) + (av.length > 3 ? '等 ' + av.length + ' 個' : '') + '，在零件墊上發亮的就是。');
    if (G.mode === 'easy') CY.ui.suggestTool(G.phase === 'dis' ? av[0].tool : av[0].installTool || av[0].tool);
    G.refresh();
  };
  G.demo = async () => {
    if (G.busy || !['dis', 'asm'].includes(G.phase)) return;
    const next = G.available()[0];
    if (!next) return;
    G.stats.demos++;
    CY.cam.focus(S().worldCenterOf(next.id), 1.3);
    if (G.phase === 'dis') {
      CY.ui.say('看好喔：「' + next.name + '」用「' + CY.toolName(next.tool) + '」拆。');
      G.selectTool(next.tool, true);
      await U.wait(700);
      await G.tryRemove(next.id, true);
    } else {
      const need = next.installTool || next.tool;
      G.hold(next.id);
      CY.ui.say('看好喔：「' + next.name + '」用「' + CY.toolName(need) + '」裝回去。');
      G.selectTool(need, true);
      await U.wait(900);
      await G.tryInstall(next.id, true);
    }
    G.refresh();
  };

  // ---------- 選單 ----------
  G.menu = async () => {
    const inGame = ['dis', 'asm', 'run'].includes(G.phase);
    const v = await CY.ui.modal({
      eyebrow: '選單', title: '暫停一下',
      body: inGame ? '<p>進度會自動存在這個瀏覽器裡，下次打開可以選「繼續上次進度」。</p>' : '<p>回到標題畫面，可以開始拆解或換車色。</p>',
      buttons: inGame ? [{ label: '重新開始', value: 'restart', cls: 'danger' }, { label: '回標題（保留進度）', value: 'title' }, { label: '繼續', value: 'close', cls: 'primary' }]
        : [{ label: '回標題', value: 'title' }, { label: '繼續', value: 'close', cls: 'primary' }],
    });
    if (v === 'title') { G.save(); G.toTitle(); }
    if (v === 'restart') { U.store.del(SAVE_KEY); G.toTitle(); }
  };

  // ---------- 狀態更新 ----------
  function groupCounts(isDone) {
    const c = {};
    CY.GROUP_ORDER.forEach((g) => { c[g] = { done: 0, total: 0 }; });
    CY.PARTS.forEach((p) => { c[p.group].total++; if (isDone(p.id)) c[p.group].done++; });
    return c;
  }
  G.refresh = () => {
    if (!G.stats) return;
    let counts, stamp, prog;
    if (G.phase === 'dis') { counts = groupCounts((id) => G.removed.has(id)); stamp = '拆解中'; prog = G.removed.size + '/' + total(); }
    else if (G.phase === 'asm') { counts = groupCounts((id) => G.installed.has(id)); stamp = '組裝中'; prog = G.installed.size + '/' + total(); }
    else if (G.phase === 'run') { counts = groupCounts(() => true); stamp = '試車中'; prog = '試車'; }
    else return;
    const modeText = { easy: '學徒模式', normal: '黑手模式', hard: '師傅模式' }[G.mode] || '';
    CY.ui.updateOrder(counts, stamp, '你（' + modeText + '）');
    CY.ui.stats(G.stats.elapsed, prog, G.stats.wrongTool + G.stats.wrongOrder);
    G.refreshTray();
  };
  G.refreshTray = () => {
    if (G.phase !== 'asm') { CY.ui.updateTray(null); return; }
    const order = CY.GROUP_ORDER;
    const list = CY.PARTS.filter((p) => !G.installed.has(p.id))
      .sort((a, b) => (order.indexOf(a.group) - order.indexOf(b.group)) || (a.no - b.no));
    CY.ui.updateTray(list.map((p) => ({
      id: p.id, no: p.no, name: p.name, group: p.group, held: G.held === p.id,
      ok: G.mode === 'easy' && !G.missingInstall(p.id).length,
    })), (id) => { if (!G.busy) G.hold(id); });
  };

  G.update = (dt) => {
    G.time += dt;
    // 動畫
    if (G.anims.length) {
      CY.view.shadowDirty = true;
      const a = G.anims[0];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k, dt);
      if (k >= 1) { G.anims.shift(); a.resolve(); }
    }
    // 計時
    if (G.stats && ['dis', 'asm', 'run'].includes(G.phase)) {
      const before = Math.floor(G.stats.elapsed);
      G.stats.elapsed += dt;
      if (Math.floor(G.stats.elapsed) !== before) {
        U.$('#st-time').textContent = U.fmtTime(G.stats.elapsed);
        if (Math.floor(G.stats.elapsed) % 15 === 0) G.save();
      }
    }
    // 提示閃爍
    if (G.pulses.length) {
      const live = new Set();
      G.pulses = G.pulses.filter((p) => p.until > G.time);
      const s = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(G.time * 9));
      G.pulses.forEach((p) => p.ids.forEach((id) => { live.add(id); if (id !== G.hoverId && id !== G.held) S().setGlow(id, p.hex, s); }));
      (G._pulsed || []).forEach((id) => { if (!live.has(id)) G.applyGlow(id); });
      G._pulsed = [...live];
    } else if (G._pulsed && G._pulsed.length) {
      G._pulsed.forEach((id) => G.applyGlow(id));
      G._pulsed = [];
    }
    // 虛影呼吸
    if (S().ghost && S().ghostMats) {
      const o = 0.28 + 0.14 * Math.sin(G.time * 5);
      S().ghostMats.ok.opacity = o; S().ghostMats.bad.opacity = o * 0.85;
    }
  };
})();
