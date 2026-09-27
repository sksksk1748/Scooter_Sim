// 小遊戲：對正時、加機油／齒輪油、汽缸頭對角鎖緊、選汽油。
(function () {
  const U = CY.U, h = U.h;
  const mg = {};
  CY.mg = mg;
  const NS = 'http://www.w3.org/2000/svg';
  const s = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    kids.forEach((c) => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  };
  // 按住按鈕：按著時每幀呼叫 onHold(dt)
  function holdButton(label, onHold, onEnd) {
    const b = h('button', { class: 'btn primary hold', type: 'button' }, label);
    let raf = 0, last = 0, holding = false;
    const loop = (t) => { if (!holding) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; onHold(dt); raf = requestAnimationFrame(loop); };
    const start = (e) => { e.preventDefault(); if (holding) return; holding = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { if (!holding) return; holding = false; cancelAnimationFrame(raf); if (onEnd) onEnd(); };
    b.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    return b;
  }

  // ---------- 對正時（T 記號對上死點） ----------
  mg.timing = (o) => new Promise((resolve) => {
    let a = 70 + Math.random() * 220; // T 記號離指針的角度（順時針）
    const wheel = s('g', {});
    wheel.appendChild(s('circle', { cx: 0, cy: 0, r: 96, fill: '#23262a', stroke: '#6b737c', 'stroke-width': 4 }));
    wheel.appendChild(s('circle', { cx: 0, cy: 0, r: 20, fill: '#3a3f45' }));
    for (let i = 0; i < 12; i++) wheel.appendChild(s('rect', { x: -2, y: -92, width: 4, height: 10, fill: '#50575f', transform: `rotate(${i * 30})` }));
    wheel.appendChild(s('text', { x: 0, y: -50, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 900, fill: '#f2c300', 'font-family': 'Barlow Condensed, sans-serif' }, 'T'));
    wheel.appendChild(s('rect', { x: -2.5, y: -96, width: 5, height: 13, fill: '#f2c300' }));
    const svg = s('svg', { viewBox: '-120 -140 240 252' },
      wheel,
      s('path', { d: 'M-11 -124 L11 -124 L0 -100 Z', fill: '#e2493b' }),
      s('text', { x: 16, y: -118, 'font-size': 12, fill: '#a9b2bb' }, '← 曲軸箱上的指針'));
    const read = h('div', { class: 'readout' }, '');
    const paint = () => {
      wheel.setAttribute('transform', `rotate(${a})`);
      const off = ((a % 360) + 360) % 360;
      const d = Math.min(off, 360 - off);
      read.textContent = d < 1.5 ? '對齊！' : '差 ' + Math.round(d) + '°';
      read.style.color = d <= 7 ? '#3cb371' : '#eef1f3';
    };
    paint();
    if (o.onAngle) o.onAngle(a);
    const turn = holdButton('按住轉動曲軸', (dt) => {
      a = (a + dt * 95) % 360;
      paint();
      if (o.onAngle) o.onAngle(a);
    });
    const nudge = h('button', { class: 'btn', type: 'button', onclick: () => { a = (a + 2) % 360; paint(); if (o.onAngle) o.onAngle(a); } }, '微調 +2°');
    const note = h('p', { class: 'note' }, o.install
      ? '裝正時齒輪前，先把曲軸轉到壓縮上死點：飛輪上的 T 記號要對準曲軸箱上的指針。'
      : '拆正時齒輪之前，要先把曲軸轉到壓縮上死點：讓飛輪上的 T 記號對準曲軸箱上的指針。');
    const msg = h('p', { class: 'note' }, '');
    let closeFn;
    const ok = h('button', {
      class: 'btn', type: 'button', onclick: () => {
        const off = ((a % 360) + 360) % 360;
        const d = Math.min(off, 360 - off);
        if (d <= 7) { CY.audio.success(); closeFn(true); }
        else { CY.audio.error(); msg.textContent = '還沒對準喔，T 記號要剛好在指針下面。'; msg.style.color = '#ffb3aa'; if (o.onMiss) o.onMiss(); }
      },
    }, '確認對齊');
    const body = h('div', { class: 'mg' }, note, svg, read, h('div', { class: 'foot', style: { justifyContent: 'center', marginTop: 0 } }, turn, nudge, ok), msg);
    CY.ui.modal({ eyebrow: '對正時', title: '把 T 記號對到上死點', body, dismissible: false, autofocus: false, onMount: (box, close) => { closeFn = close; } }).then(() => resolve(true));
  });

  // ---------- 加油（機油／齒輪油） ----------
  mg.fill = (o) => new Promise((resolve) => {
    const max = o.max, lo = o.lo, hi = o.hi;
    let amt = 0;
    const H = 200, W = 44;
    const y = (v) => 10 + H - (v / max) * H;
    const level = s('rect', { x: 8, y: y(0), width: W - 16, height: 0, fill: o.color || '#b8791f', rx: 3 });
    const svg = s('svg', { viewBox: '-70 0 190 222' },
      s('rect', { x: 0, y: 10, width: W, height: H, rx: 8, fill: '#16181b', stroke: '#6b737c', 'stroke-width': 2 }),
      level,
      s('rect', { x: -6, y: y(hi), width: W + 12, height: y(lo) - y(hi), fill: 'rgba(60,179,113,0.18)', stroke: '#3cb371', 'stroke-dasharray': '4 3' }),
      s('text', { x: W + 12, y: y(hi) + 4, 'font-size': 12, fill: '#3cb371' }, '上限 ' + hi),
      s('text', { x: W + 12, y: y(lo) + 4, 'font-size': 12, fill: '#3cb371' }, '下限 ' + lo),
      s('text', { x: -8, y: y(max) + 10, 'font-size': 11, fill: '#737c86', 'text-anchor': 'end' }, max + ' c.c.'),
      s('text', { x: -8, y: y(0), 'font-size': 11, fill: '#737c86', 'text-anchor': 'end' }, '0'));
    const read = h('div', { class: 'readout' }, '0 c.c.');
    const paint = () => {
      level.setAttribute('y', y(amt));
      level.setAttribute('height', (amt / max) * H);
      read.textContent = Math.round(amt) + ' c.c.';
      read.style.color = amt > hi ? '#ffb3aa' : amt >= lo ? '#3cb371' : '#eef1f3';
    };
    const pour = holdButton('按住倒油', (dt) => { amt = Math.min(max, amt + dt * o.rate); paint(); if (o.onPour) o.onPour(true); }, () => { CY.audio.pourStop(); if (o.onPour) o.onPour(false); });
    pour.addEventListener('pointerdown', () => CY.audio.pourStart(o.kind === 'gear'));
    const suck = h('button', { class: 'btn', type: 'button', onclick: () => { amt = Math.max(0, amt - o.step); paint(); CY.audio.click(); } }, '抽出 ' + o.step + ' c.c.');
    const msg = h('p', { class: 'note' }, '');
    let closeFn;
    const done = h('button', {
      class: 'btn', type: 'button', onclick: () => {
        if (amt < lo) { msg.textContent = '還不夠喔，油量要在上下限之間。'; msg.style.color = '#ffb3aa'; CY.audio.error(); return; }
        if (amt > hi) { msg.textContent = '加太多了！機油過多會讓油封受壓漏油，抽掉一點。'; msg.style.color = '#ffb3aa'; CY.audio.error(); if (o.onMiss) o.onMiss(); return; }
        CY.audio.success(); closeFn(amt);
      },
    }, '油量 OK');
    const body = h('div', { class: 'mg' }, h('p', { class: 'note' }, o.note), svg, read, h('div', { class: 'foot', style: { justifyContent: 'center', marginTop: 0 } }, pour, suck, done), msg);
    CY.ui.modal({ eyebrow: o.eyebrow, title: o.title, body, dismissible: false, autofocus: false, onMount: (box, close) => { closeFn = close; } }).then((v) => { CY.audio.pourStop(); resolve(v); });
  });

  // ---------- 汽缸頭螺帽：對角交叉 ----------
  mg.pattern = (o) => new Promise((resolve) => {
    const pos = [[-60, -60], [60, -60], [60, 60], [-60, 60]];
    const diag = [2, 3, 0, 1];
    const passes = o.tighten ? ['第一輪：先預鎖（手感鎖緊）', '第二輪：用扭力扳手鎖到規定扭力'] : ['第一輪：每顆先鬆 1/4 圈', '第二輪：全部鬆開'];
    let pass = 0, seq = [];
    const nuts = [];
    const svg = s('svg', { viewBox: '-110 -110 220 220' },
      s('rect', { x: -95, y: -95, width: 190, height: 190, rx: 18, fill: '#2a2e33', stroke: '#6b737c', 'stroke-width': 3 }),
      s('circle', { cx: 0, cy: 0, r: 34, fill: '#1b1d20', stroke: '#50575f', 'stroke-width': 2 }),
      s('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 12, fill: '#737c86' }, '燃燒室'));
    pos.forEach(([x, y], i) => {
      const g = s('g', { class: 'nut-btn', transform: `translate(${x} ${y})`, tabindex: 0, role: 'button', 'aria-label': '螺帽 ' + (i + 1) });
      const poly = s('polygon', { points: '-17,0 -8.5,-14.7 8.5,-14.7 17,0 8.5,14.7 -8.5,14.7', fill: '#8c9197', stroke: '#c9ced4', 'stroke-width': 2 });
      const t = s('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#16181b' }, '');
      g.appendChild(poly); g.appendChild(t);
      const click = () => press(i);
      g.addEventListener('click', click);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } });
      svg.appendChild(g);
      nuts.push({ poly, t });
    });
    const title = h('div', { class: 'readout', style: { fontSize: '17px' } }, passes[0]);
    const msg = h('p', { class: 'note' }, '點螺帽的順序要「對角交叉」：點一顆之後，下一顆要點它斜對角那顆。');
    let closeFn;
    const reset = () => { seq = []; nuts.forEach((n) => { n.poly.setAttribute('fill', '#8c9197'); n.t.textContent = ''; }); };
    function press(i) {
      if (seq.includes(i)) return;
      const k = seq.length;
      const okMove = k === 0 || k === 2 || (k % 2 === 1 && diag[seq[k - 1]] === i);
      if (!okMove) {
        CY.audio.error();
        msg.textContent = '不對喔！要點剛剛那顆的「斜對角」，這樣受力才會平均。重來這一輪。';
        msg.style.color = '#ffb3aa';
        if (o.onMiss) o.onMiss();
        reset();
        return;
      }
      CY.audio.ratchet(3);
      if (msg.style.color) { msg.textContent = '對，就是這樣：一顆之後接它的斜對角。'; msg.style.color = ''; }
      seq.push(i);
      nuts[i].poly.setAttribute('fill', pass === 0 ? '#f2c300' : '#3cb371');
      nuts[i].t.textContent = String(seq.length);
      if (seq.length === 4) {
        pass++;
        if (pass >= passes.length) { CY.audio.success(); setTimeout(() => closeFn(true), 450); return; }
        setTimeout(() => { reset(); title.textContent = passes[pass]; msg.textContent = '很好，再來一輪，一樣對角交叉。'; msg.style.color = ''; }, 500);
      }
    }
    const body = h('div', { class: 'mg' }, title, svg, msg);
    CY.ui.modal({ eyebrow: o.tighten ? '鎖緊汽缸頭' : '拆汽缸頭', title: '對角交叉、分次進行', body, dismissible: false, autofocus: false, onMount: (box, close) => { closeFn = close; } }).then(() => resolve(true));
  });

  // ---------- 加汽油 ----------
  mg.fuel = (o) => new Promise((resolve) => {
    let closeFn;
    const msg = h('p', { class: 'note' }, '勁戰四代用一般無鉛汽油就可以。');
    const pick = (id) => {
      if (id === 'diesel') {
        CY.audio.error();
        msg.textContent = '停！柴油不能加進汽油引擎，會發不動、還要整個油路清洗。換一支油槍。';
        msg.style.color = '#ffb3aa';
        if (o.onMiss) o.onMiss();
        return;
      }
      CY.audio.pourStart(false);
      setTimeout(() => { CY.audio.pourStop(); closeFn(id); }, 900);
    };
    const grid = h('div', { class: 'fuel-grid' },
      ...[['92', '無鉛汽油'], ['95', '無鉛汽油'], ['98', '無鉛汽油'], ['柴油', 'Diesel']].map(([n, t]) => h('button', { class: 'fuel', type: 'button', onclick: () => pick(n === '柴油' ? 'diesel' : n) }, h('b', null, n), h('span', null, t))));
    const body = h('div', { class: 'mg' }, h('p', { class: 'note' }, '油箱是空的，先去加油。選一支油槍：'), grid, msg);
    CY.ui.modal({ eyebrow: '發動前準備', title: '加汽油', body, dismissible: false, autofocus: false, onMount: (box, close) => { closeFn = close; } }).then(resolve);
  });
})();
