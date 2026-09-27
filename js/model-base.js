// 車體座標系與共用常數。
// 單位：公尺。原點在前後輪軸中點的地面上；+x 往車頭、+y 往上、+z 往騎士右手邊。
(function () {
  const K = {};
  K.init = () => {
    const T = window.THREE;
    K.FA = new T.Vector3(0.6525, 0.229, 0); // 前輪軸（軸距 1305mm）
    K.FR = 0.229; K.FW = 0.11;               // 110/70-12
    K.RA = new T.Vector3(-0.6525, 0.236, 0); // 後輪軸
    K.RR = 0.236; K.RW = 0.12;               // 120/70-12
    K.RAKE = (26 * Math.PI) / 180;           // 前叉後傾角
    K.C = new T.Vector3(-0.25, 0.28, 0);     // 曲軸中心
    K.CYL = (8 * Math.PI) / 180;             // 汽缸仰角（幾乎水平往前）
    K.CL = new T.Vector3(-0.555, 0.265, 0);  // 後普利／離合器軸
    K.BELT_Z = -0.1;                         // 皮帶平面
    K.STROKE = 0.0579; K.CRANK_R = K.STROKE / 2; K.ROD = 0.095; K.BORE = 0.0524;
    K.LIFT = 0.3;                            // 升降台高度
  };
  // 轉向軸上距前輪軸 s 公尺的點
  K.steer = (s) => new THREE.Vector3(K.FA.x - Math.sin(K.RAKE) * s, K.FA.y + Math.cos(K.RAKE) * s, 0);
  // 引擎座標：X 沿汽缸軸、Y 垂直汽缸（朝上）、Z 同車體 z
  K.eng = (X, Y, Z) => new THREE.Vector3(
    K.C.x + X * Math.cos(K.CYL) - Y * Math.sin(K.CYL),
    K.C.y + X * Math.sin(K.CYL) + Y * Math.cos(K.CYL),
    Z || 0
  );
  K.engGroup = () => { const g = new THREE.Group(); g.position.copy(K.C); g.rotation.z = K.CYL; return g; };
  // 轉向座標：原點在前輪軸，local +Y 沿轉向軸
  K.steerGroup = () => { const g = new THREE.Group(); g.position.copy(K.FA); g.rotation.z = K.RAKE; return g; };
  // 活塞銷位置（引擎座標 X）與連桿角度，theta = 曲軸角（0 = 上死點）
  K.slider = (theta) => {
    const r = K.CRANK_R, L = K.ROD;
    const px = r * Math.cos(theta), py = r * Math.sin(theta);
    const X = px + Math.sqrt(L * L - py * py);
    return { X, px, py, phi: Math.atan2(-py, X - px) };
  };
  CY.K = K;
  CY.B = CY.B || {};   // 零件建模函式 id -> (ctx) => Group
  CY.anim = {};        // 會動的節點（曲軸、輪子…）
})();
