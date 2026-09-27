// 介面：工具抽屜、維修工單、師傅對話、對話框、測驗、標題、圖鑑、結算。
(function () {
  const U = CY.U, h = U.h, $ = U.$;
  const ui = {};
  CY.ui = ui;

  // ---------- 師傅對話 ----------
  ui.say = (text, mood) => {
    const m = $('#master'), p = $('#master-text');
    p.textContent = text;
    m.classList.remove('flash', 'warn', 'good');
    void m.offsetWidth;
    m.classList.add('flash');
    if (mood) m.classList.add(mood);
  };
  ui.toast = (text, mood) => {
    const t = h('div', { class: 'toast ' + (mood || '') }, text);
    $('#overlay').appendChild(t);
    setTimeout(() => t.remove(), 2300);
  };

  // ---------- 工具抽屜 ----------
  const TOOL_KEYS = { hand: '1', phillips: '2', hex: '3', plug: '4', impact: '5', puller: '6', valvecomp: '7', pliers: '8', mallet: '9', stem: '0', s8: 'Q', s10: 'W', s12: 'E', s14: 'R', s17: 'T', s24: 'Y', torque: 'U' };
  ui.TOOL_KEYS = TOOL_KEYS;
  ui.buildTools = (onSelect) => {
    const box = $('#tools');
    box.innerHTML = '';
    const tool = (t) => h('button', {
      class: 'tool', type: 'button', 'data-tool': t.id, title: t.name + (t.note ? '：' + t.note : '') + '（快速鍵 ' + TOOL_KEYS[t.id] + '）',
      onclick: () => onSelect(t.id),
    }, h('span', { class: 'key' }, TOOL_KEYS[t.id]), h('span', { html: CY.toolIcon(t.id) }), h('span', null, t.short === '手' ? '徒手' : t.name.replace(' 套筒', '')));
    const order = ['hand', 'phillips', 'hex', 'plug', 'impact', 'puller', 'valvecomp', 'pliers', 'mallet', 'stem', 'torque'];
    const T = (id) => CY.TOOLS.find((t) => t.id === id);
    box.appendChild(tool(T('hand')));
    box.appendChild(tool(T('phillips')));
    const socks = h('div', { class: 'sockets' },
      h('div', { class: 'lbl' }, h('span', { html: CY.ICONS.socket }), '套筒扳手（mm）'),
      h('div', { class: 'row' }, ...CY.TOOLS.filter((t) => t.socket).map((t) => h('button', {
        class: 'sock', type: 'button', 'data-tool': t.id, title: t.name + '（快速鍵 ' + TOOL_KEYS[t.id] + '）', onclick: () => onSelect(t.id),
      }, h('span', null, String(t.socket))))));
    box.appendChild(socks);
    order.slice(2).forEach((id) => box.appendChild(tool(T(id))));
  };
  ui.setTool = (id) => {
    U.$$('[data-tool]').forEach((b) => b.classList.toggle('sel', b.dataset.tool === id));
  };
  ui.suggestTool = (id) => {
    U.$$('[data-tool]').forEach((b) => b.classList.toggle('suggest', !!id && b.dataset.tool === id));
  };
  ui.showTorqueTool = (show) => {
    const b = U.$('[data-tool="torque"]');
    if (b) b.classList.toggle('hide', !show);
  };

  // ---------- 維修工單 ----------
  ui.buildOrder = () => {
    const o = $('#order');
    o.innerHTML = '';
    const d = new Date();
    const no = 'No. ' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-0416';
    o.appendChild(h('button', { class: 'act wo-close', type: 'button', onclick: () => o.classList.remove('open') }, '收起'));
    o.appendChild(h('div', { class: 'wo-head' },
      h('div', null, h('div', { class: 'wo-title' }, '維修工單'), h('div', { class: 'wo-no' }, no)),
      h('div', { class: 'wo-stamp', id: 'wo-stamp' }, '拆解中')));
    o.appendChild(h('dl', { class: 'wo-fields' },
      h('dt', null, '車型'), h('dd', null, 'YAMAHA 勁戰四代（雙碟版）'),
      h('dt', null, '引擎'), h('dd', null, '124cc 單缸 氣冷 SOHC 四氣門'),
      h('dt', null, '作業'), h('dd', null, '全車分解 → 組裝 → 試車'),
      h('dt', null, '學徒'), h('dd', { id: 'wo-mode' }, '你')));
    o.appendChild(h('div', { class: 'wo-sec' }, '分項進度'));
    o.appendChild(h('ul', { class: 'wo-groups', id: 'wo-groups' }));
    o.appendChild(h('div', { class: 'wo-sec', id: 'wo-tray-h', hidden: true }, '零件托盤'));
    o.appendChild(h('div', { class: 'tray', id: 'wo-tray', hidden: true }));
    o.appendChild(h('div', { id: 'wo-card' }, h('div', { class: 'wo-empty' }, '把游標移到零件上看說明；點一下就開始動手。')));
  };
  ui.updateOrder = (counts, stampText, modeText) => {
    const ul = $('#wo-groups');
    if (!ul) return;
    ul.innerHTML = '';
    CY.GROUP_ORDER.forEach((gid) => {
      const g = CY.GROUPS[gid], c = counts[gid];
      ul.appendChild(h('li', null,
        h('i', { class: 'dot', style: { background: g.color } }), h('span', null, g.name), h('span', { class: 'cnt' }, c.done + '/' + c.total),
        h('span', { class: 'bar' }, h('i', { style: { width: (100 * c.done) / c.total + '%' } }))));
    });
    if (stampText) $('#wo-stamp').textContent = stampText;
    if (modeText) $('#wo-mode').textContent = modeText;
  };
  // 組裝用的零件托盤：點一下就拿起那個零件
  ui.updateTray = (items, onPick) => {
    const box = $('#wo-tray'), sec = $('#wo-tray-h');
    if (!box) return;
    if (!items) { box.hidden = true; sec.hidden = true; return; }
    box.hidden = false; sec.hidden = false;
    sec.textContent = '零件托盤・還剩 ' + items.length + ' 件（點一下拿起）';
    const keep = box.scrollTop;
    box.innerHTML = '';
    items.forEach((it) => box.appendChild(h('button', {
      class: 'chip' + (it.ok ? ' ok' : '') + (it.held ? ' held' : ''), type: 'button', title: it.name, onclick: () => onPick(it.id),
    }, h('i', { style: { background: CY.GROUPS[it.group].color } }), '#' + String(it.no).padStart(2, '0') + ' ' + it.name.replace(/（.*?）/g, ''))));
    box.scrollTop = keep;
  };
  ui.showCard = (id, state, stateCls) => {
    const p = CY.PART[id];
    const card = $('#wo-card');
    if (!p || !card) return;
    const tool = CY.toolName(p.tool);
    const inst = p.installTool ? CY.toolName(p.installTool) : null;
    card.innerHTML = '';
    card.appendChild(h('div', { class: 'wo-card' },
      h('div', { class: 'no' }, '#' + String(p.no).padStart(2, '0') + '・' + CY.GROUPS[p.group].name),
      h('h3', null, p.name),
      h('div', { class: 'en' }, p.en),
      state ? h('span', { class: 'state ' + (stateCls || '') }, state) : null,
      h('dl', { class: 'specs' },
        h('dt', null, '拆卸工具'), h('dd', null, ui.toolHidden ? '（自己判斷看看）' : tool),
        inst ? h('dt', null, '組裝工具') : null, inst ? h('dd', null, ui.toolHidden ? '（自己判斷看看）' : inst + (p.torque ? '・' + p.torque : '')) : null,
        h('dt', null, '固定方式'), h('dd', null, p.fast)),
      h('p', { class: 'desc' }, p.desc),
      h('p', { class: 'tip' }, '師傅：' + p.tip)));
  };
  ui.clearCard = () => {
    const card = $('#wo-card');
    if (card) card.innerHTML = '<div class="wo-empty">把游標移到零件上看說明；點一下就開始動手。</div>';
  };

  // ---------- 懸停標籤 ----------
  ui.tag = (show, x, y, id, stateText, cls) => {
    const t = $('#tag');
    if (!show) { t.hidden = true; return; }
    const p = CY.PART[id];
    t.innerHTML = '';
    t.appendChild(h('span', { class: 'n' }, '#' + String(p.no).padStart(2, '0')));
    t.appendChild(document.createTextNode(p.name));
    if (stateText) t.appendChild(h('span', { class: 's ' + (cls || '') }, stateText));
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let px = x + 16, py = y + 14;
    if (px + r.width > window.innerWidth - 8) px = x - r.width - 12;
    if (py + r.height > window.innerHeight - 8) py = y - r.height - 10;
    t.style.left = px + 'px'; t.style.top = py + 'px';
  };

  // ---------- 對話框 ----------
  ui.modal = (o) => new Promise((resolve) => {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal ' + (o.paper ? 'paper-modal' : 'foam') + ' ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true' });
    if (o.eyebrow) box.appendChild(h('div', { class: 'eyebrow' }, o.eyebrow));
    if (o.title) box.appendChild(h('h2', null, o.title));
    const body = h('div', { class: 'body' });
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    box.appendChild(body);
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    if (o.buttons && o.buttons.length) {
      const foot = h('div', { class: 'foot' });
      o.buttons.forEach((b) => foot.appendChild(h('button', { class: 'btn ' + (b.cls || ''), type: 'button', onclick: () => { CY.audio.click(); close(b.value); } }, b.label)));
      box.appendChild(foot);
    }
    const onKey = (e) => { if (e.key === 'Escape' && o.dismissible !== false) close(o.escValue); };
    document.addEventListener('keydown', onKey);
    if (o.dismissible !== false) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(o.escValue); });
    back.appendChild(box);
    $('#overlay').appendChild(back);
    if (o.onMount) o.onMount(box, close);
    const f = box.querySelector('.btn.primary') || box.querySelector('button');
    if (f && o.autofocus !== false) setTimeout(() => f.focus({ preventScroll: true }), 30);
  });

  ui.quiz = (qid) => {
    const q = CY.QUIZ[qid];
    return new Promise((resolve) => {
      const opts = h('div', { class: 'quiz-opts' });
      const exp = h('div', { class: 'quiz-exp', hidden: true });
      let answered = false, correct = false, closeFn = null;
      const next = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => closeFn(correct) }, '知道了，繼續');
      q.opts.forEach((t, i) => {
        const b = h('button', {
          class: 'quiz-opt', type: 'button', onclick: () => {
            if (answered) return;
            answered = true;
            correct = i === q.a;
            U.$$('.quiz-opt', opts).forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('right'); });
            if (!correct) b.classList.add('wrong');
            exp.hidden = false;
            exp.textContent = (correct ? '答對了！' : '不對喔。') + q.exp;
            next.hidden = false; next.focus();
            if (correct) CY.audio.success(); else CY.audio.error();
          },
        }, String.fromCharCode(65 + i) + '．' + t);
        opts.appendChild(b);
      });
      const body = h('div', null, h('p', { class: 'quiz-q' }, q.q), opts, exp, h('div', { class: 'foot' }, next));
      ui.modal({ eyebrow: '阿德師考你', paper: true, body, dismissible: false, autofocus: false, onMount: (box, close) => { closeFn = close; } }).then(resolve);
    });
  };

  // ---------- 視角選單 ----------
  ui.toggleViewMenu = (btn, presets, onPick) => {
    const m = $('#viewmenu');
    if (!m.hidden) { m.hidden = true; return; }
    m.innerHTML = '';
    m.className = 'pop foam';
    presets.forEach((p) => m.appendChild(h('button', { type: 'button', onclick: () => { m.hidden = true; onPick(p.id); } }, p.label)));
    const r = btn.getBoundingClientRect();
    m.style.top = r.bottom + 6 + 'px';
    m.style.left = Math.min(r.left, window.innerWidth - 170) + 'px';
    m.hidden = false;
  };

  // ---------- 標題畫面 ----------
  ui.showTitle = (o) => {
    const ov = $('#overlay');
    ov.innerHTML = '';
    let paint = o.paint, mode = o.mode;
    const sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': '車色' });
    CY.PAINTS.forEach((p) => {
      const b = h('button', {
        class: 'swatch' + (p.id === paint ? ' sel' : ''), type: 'button', title: p.name, 'aria-label': p.name, style: { background: p.hex },
        onclick: () => { paint = p.id; U.$$('.swatch', sw).forEach((x) => x.classList.toggle('sel', x === b)); pl.textContent = '車色：' + p.name; o.onPaint(p.id); CY.audio.click(); },
      });
      sw.appendChild(b);
    });
    const pl = h('span', { class: 'lab' }, '車色：' + CY.PAINTS.find((p) => p.id === paint).name);
    const modes = [
      { id: 'easy', t: '學徒', d: '提示工具與順序' },
      { id: 'normal', t: '黑手', d: '自己選工具' },
      { id: 'hard', t: '師傅', d: '沒有提示，失誤加重' },
    ];
    const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': '難度' });
    modes.forEach((m) => {
      const b = h('button', {
        type: 'button', class: m.id === mode ? 'sel' : '', onclick: () => { mode = m.id; U.$$('button', seg).forEach((x) => x.classList.toggle('sel', x === b)); CY.audio.click(); },
      }, h('b', null, m.t), h('small', null, m.d));
      seg.appendChild(b);
    });
    const card = h('div', { class: 'title-card' },
      h('div', { class: 't-eyebrow' }, 'YAMAHA CYGNUS-X · 4TH GEN · 2015–2018'),
      h('h1', { class: 't-h1' }, '勁戰四代', h('span', { class: 'hand' }, '拆裝學徒')),
      h('p', { class: 't-story' }, '你是阿德機車行新來的學徒。今天阿德師交給你一台勁戰四代：先把它拆到只剩一副車架，再把 77 個零件一個一個裝回去，最後要一發就發動。'),
      h('ul', { class: 't-specs' }, ...['124cc 單缸', '氣冷 SOHC 4 汽門', '52.4 × 57.9 mm', 'CVT 無段變速', '前 110/70-12', '後 120/70-12', '雙槍後避震'].map((s) => h('li', null, s))),
      h('div', { class: 't-opt' }, pl, sw),
      h('div', { class: 't-opt' }, h('span', { class: 'lab' }, '難度'), seg),
      h('div', { class: 't-actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { CY.audio.unlock(); o.onStart({ paint, mode }); } }, '開始拆解'),
        o.hasSave ? h('button', { class: 'btn', type: 'button', onclick: () => { CY.audio.unlock(); o.onResume(); } }, '繼續上次進度') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => { CY.audio.unlock(); o.onFree({ paint }); } }, '零件爆炸圖')),
      h('div', { class: 't-help' }, '操作：左鍵拖曳旋轉・右鍵拖曳平移・滾輪縮放・點零件動手・', h('kbd', null, '1'), '–', h('kbd', null, '0'), '／', h('kbd', null, 'Q'), '–', h('kbd', null, 'U'), ' 切換工具'),
      h('div', { class: 't-disclaimer' }, '粉絲自製的教學遊戲，與 Yamaha 無關。模型與拆裝流程經過簡化，實際維修請依原廠維修手冊與專業技師指導。'));
    ov.appendChild(h('div', { class: 'title-wrap' }, card, h('div')));
  };
  ui.clearOverlay = () => { $('#overlay').innerHTML = ''; };

  // ---------- 零件圖鑑 ----------
  ui.showBook = (o) => {
    const grid = h('div', { class: 'book-grid' });
    const detail = h('div', { class: 'book-detail' });
    CY.GROUP_ORDER.forEach((gid) => {
      const g = CY.GROUPS[gid];
      const items = CY.PARTS.filter((p) => p.group === gid);
      const seen = items.filter((p) => o.all || o.discovered.has(p.id)).length;
      const box = h('div', { class: 'book-items' });
      items.forEach((p) => {
        const known = o.all || o.discovered.has(p.id);
        box.appendChild(h('button', {
          class: 'book-item' + (known ? '' : ' locked'), type: 'button',
          onclick: () => {
            detail.innerHTML = '';
            if (!known) { detail.appendChild(h('p', { class: 'body' }, '還沒拆到這個零件。拆下來之後就會登錄到圖鑑。')); return; }
            detail.appendChild(h('div', { class: 'wo-card', style: { background: 'var(--paper)', color: '#3b3526', padding: '12px 14px', borderRadius: '4px' } },
              h('div', { class: 'no' }, '#' + String(p.no).padStart(2, '0') + '・' + g.name),
              h('h3', null, p.name), h('div', { class: 'en' }, p.en),
              h('dl', { class: 'specs' }, h('dt', null, '工具'), h('dd', null, CY.toolName(p.tool) + (p.installTool ? '（組裝：' + CY.toolName(p.installTool) + '）' : '')), h('dt', null, '固定'), h('dd', null, p.fast)),
              h('p', { class: 'desc' }, p.desc), h('p', { class: 'tip' }, '師傅：' + p.tip),
              h('div', { class: 'foot', style: { justifyContent: 'flex-start' } }, h('button', { class: 'btn primary', type: 'button', onclick: () => { closeBook(); o.onLocate(p.id); } }, '在場景中找到它'))));
            detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          },
        }, h('span', { class: 'n' }, '#' + String(p.no).padStart(2, '0')), h('b', null, known ? p.name : '？？？'), h('small', null, known ? p.en : '尚未拆下')));
      });
      grid.appendChild(h('section', { class: 'book-sec' }, h('h3', null, h('i', { style: { background: g.color } }), g.name, h('span', null, seen + '/' + items.length)), box));
    });
    let closeBook = () => {};
    const total = o.all ? CY.PARTS.length : o.discovered.size;
    ui.modal({
      eyebrow: '零件圖鑑・已登錄 ' + total + '/' + CY.PARTS.length, title: '勁戰四代的全部零件', cls: 'book',
      body: h('div', null, h('p', null, '按照原廠零件手冊的方式分類。點選零件看說明，也可以在場景裡找到它。'), grid, detail),
      buttons: [{ label: '關閉', cls: 'primary' }],
      onMount: (box, close) => { closeBook = close; },
    });
  };

  // ---------- 結算 ----------
  ui.showResults = (r) => {
    const grid = h('div', { class: 'res-grid' },
      ...[['總時間', U.fmtTime(r.time)], ['拿錯工具', r.wrongTool], ['順序錯誤', r.wrongOrder], ['提示／示範', r.hints + '／' + r.demos], ['測驗答對', r.quizRight + '/' + r.quizTotal], ['分數', r.score]]
        .map(([k, v]) => h('div', null, h('span', null, k), h('b', null, String(v)))));
    return ui.modal({
      eyebrow: '試車完成・工單結案', title: null, dismissible: false,
      body: h('div', null, h('div', { class: 'res-stars' }, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars)), h('div', { class: 'res-rank' }, r.rank), grid, h('p', { class: 'res-say' }, '阿德師：' + r.say)),
      buttons: [{ label: '零件爆炸圖', value: 'free' }, { label: '再拆一次', value: 'again', cls: 'primary' }],
    });
  };

  // ---------- 自由檢視列 ----------
  ui.showFreeBar = (o) => {
    const bar = $('#freebar');
    bar.className = 'foam';
    bar.innerHTML = '';
    const range = h('input', { type: 'range', min: '0', max: '100', value: String(o.value || 0), id: 'explode-range', 'aria-label': '爆炸圖展開程度' });
    range.addEventListener('input', () => o.onExplode(range.value / 100));
    bar.appendChild(h('label', { for: 'explode-range' }, '爆炸圖'));
    bar.appendChild(range);
    bar.appendChild(h('button', { class: 'btn', type: 'button', onclick: o.onExit }, '回標題'));
    bar.hidden = false;
  };
  ui.hideFreeBar = () => { $('#freebar').hidden = true; };

  ui.setPhase = (phase) => {
    const order = ['dis', 'asm', 'run'];
    const i = order.indexOf(phase);
    U.$$('.phases li').forEach((li) => {
      const j = order.indexOf(li.dataset.phase);
      li.classList.toggle('on', j === i);
      li.classList.toggle('done', i > j || phase === 'done');
    });
  };
  ui.stats = (time, prog, errors) => {
    $('#st-time').textContent = U.fmtTime(time);
    $('#st-prog').textContent = prog;
    $('#st-err').textContent = String(errors);
  };
})();
