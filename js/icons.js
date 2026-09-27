// 工具圖示（剪影，48×48，使用 currentColor）
(function () {
  const svg = (inner) => `<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${inner}</svg>`;
  CY.ICONS = {
    hand: svg('<path d="M16 45c-4-3-7-8-8-13l-2.5-8c-.6-2.2 2.2-3.4 3.4-1.4L13 29V9.5c0-2.4 3.6-2.4 3.6 0V22h1.8V6.5c0-2.4 3.6-2.4 3.6 0V22h1.8V8.5c0-2.4 3.6-2.4 3.6 0V23h1.8V12.5c0-2.4 3.6-2.4 3.6 0V31c0 6.3-2.4 10.6-5.6 14z"/>'),
    phillips: svg('<g transform="rotate(40 24 24)"><rect x="19" y="2" width="10" height="17" rx="4"/><rect x="22.6" y="19" width="2.8" height="19"/><path d="M21.8 38h4.4L24 46z"/></g>'),
    socket: svg('<g transform="rotate(-40 24 24)"><circle cx="24" cy="10" r="7.5"/><circle cx="24" cy="10" r="3" fill="#000" opacity=".35"/><rect x="21" y="16" width="6" height="30" rx="3"/></g>'),
    hex: svg('<path d="M11 6h7v27h20v7H11z"/><path d="M11 6l3.5-2 3.5 2z"/>'),
    plug: svg('<rect x="7" y="5" width="34" height="5.5" rx="2.5"/><rect x="19.5" y="10" width="9" height="34" rx="2"/><rect x="21" y="36" width="6" height="8" fill="#000" opacity=".3"/>'),
    impact: svg('<path d="M4 11h27a7 7 0 0 1 7 7v2a7 7 0 0 1-7 7h-5l2.5 16h-9.5l-3-16H4z"/><rect x="38" y="15.5" width="7" height="7" rx="1"/><rect x="8" y="14" width="12" height="3" fill="#000" opacity=".3"/>'),
    puller: svg('<rect x="5" y="17" width="38" height="6" rx="2"/><rect x="21" y="3" width="6" height="42" rx="2"/><path d="M7 23h5v17l3 3H7zM41 23h-5v17l-3 3h8z"/>'),
    valvecomp: svg('<path d="M9 5h25v6H15.5v26H34v6H9z"/><rect x="29" y="9" width="5" height="11"/><circle cx="31.5" cy="26" r="4.5"/>'),
    pliers: svg('<path d="M21.5 2h5l1.2 19h-7.4z"/><path d="M20.3 21l-7.3 24h5.2l7.3-19zM27.7 21l7.3 24h-5.2l-7.3-19z"/>'),
    mallet: svg('<rect x="6" y="5" width="30" height="15" rx="5"/><rect x="18" y="20" width="6" height="25" rx="2.5"/>'),
    stem: svg('<path d="M24 5a15 15 0 1 1-13 22.5l5.3-3.1A8.8 8.8 0 1 0 24 11.2z"/><rect x="3" y="24" width="11" height="5" rx="1" transform="rotate(-30 8 26)"/><rect x="20.5" y="30" width="7" height="15" rx="2.5"/>'),
    torque: svg('<g transform="rotate(-38 24 24)"><circle cx="24" cy="8" r="6.5"/><rect x="21.3" y="13" width="5.4" height="33" rx="2.7"/><rect x="18.5" y="27" width="11" height="7" rx="1.5"/><rect x="20.5" y="29" width="7" height="3" fill="#000" opacity=".35"/></g>'),
  };
  CY.toolIcon = (id) => {
    if (/^s\d+$/.test(id)) return CY.ICONS.socket;
    return CY.ICONS[id] || CY.ICONS.hand;
  };
})();
