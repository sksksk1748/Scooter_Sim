// 粒子特效：排氣白煙、機油流、零件落地的灰塵。
(function () {
  const F = { list: [] };
  CY.fx = F;
  let smokeMat, oilMat, dustMat, scene;
  const pool = [];

  F.init = (sc) => {
    scene = sc;
    smokeMat = new THREE.SpriteMaterial({ map: CY.G.TEX.puff, color: 0xb9bec6, transparent: true, depthWrite: false, opacity: 0.62 });
    oilMat = new THREE.SpriteMaterial({ map: CY.G.TEX.puff, color: 0x7a4a0c, transparent: true, depthWrite: false, opacity: 0.95 });
    dustMat = new THREE.SpriteMaterial({ map: CY.G.TEX.puff, color: 0xb9b2a5, transparent: true, depthWrite: false, opacity: 0.4 });
  };
  function spawn(mat, pos, vel, life, size, grow, gravity) {
    let sp = pool.pop();
    if (!sp) { sp = new THREE.Sprite(mat); }
    sp.material = mat.clone();
    sp.position.copy(pos);
    sp.scale.setScalar(size);
    sp.visible = true;
    scene.add(sp);
    F.list.push({ sp, vel: vel.clone(), life, max: life, size, grow, gravity: gravity || 0, op: mat.opacity });
  }
  F.update = (dt) => {
    for (let i = F.list.length - 1; i >= 0; i--) {
      const p = F.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.sp); p.sp.material.dispose(); pool.push(p.sp); F.list.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.sp.position.addScaledVector(p.vel, dt);
      const k = 1 - p.life / p.max;
      p.sp.scale.setScalar(p.size + p.grow * k);
      p.sp.material.opacity = p.op * (1 - k) * Math.min(1, k * 6 + 0.2);
      if (p.floorY != null && p.sp.position.y < p.floorY) { p.life = 0; }
    }
  };
  // 排氣白煙（world 座標）
  F.smoke = (pos, dir, strength) => {
    const v = dir.clone().multiplyScalar(0.22 + strength * 0.45);
    v.x += (Math.random() - 0.5) * 0.06; v.y += 0.08 + Math.random() * 0.08; v.z += (Math.random() - 0.5) * 0.06;
    spawn(smokeMat, pos, v, 1.4 + Math.random() * 0.8, 0.06, 0.32 + strength * 0.25, -0.04);
  };
  // 機油滴流：從 from 落到 toY
  F.drip = (from, toY) => {
    const p = from.clone();
    p.x += (Math.random() - 0.5) * 0.006; p.z += (Math.random() - 0.5) * 0.006;
    spawn(oilMat, p, new THREE.Vector3(0, -0.1, 0), 1.2, 0.014, 0.004, 3.2);
    F.list[F.list.length - 1].floorY = toY;
  };
  F.dust = (pos) => {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      spawn(dustMat, pos.clone().setY(pos.y + 0.02), new THREE.Vector3(Math.cos(a) * 0.25, 0.08 + Math.random() * 0.1, Math.sin(a) * 0.25), 0.6, 0.05, 0.12, 0.2);
    }
  };
})();
