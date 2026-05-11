// 물리엔진 — cannon.js 0.6.2 (UMD, 글로벌 CANNON).
// 목적: 안전 시뮬레이터 정체성 유지하면서 "낙하물·자재 흔들림" 표현.
// 룰: 항상 옵션. CANNON 미로딩 / GAME.physics 비활성이면 모든 함수는 no-op.

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // ── World & state ────────────────────────────────────────────
  const PHY = {
    enabled:  false,
    world:    null,
    bodies:   [],     // { body, mesh, opts }
    ground:   null,
    onHitFns: [],     // collision callback (낙하물 → 작업자/지면)
    fixedDt:  1 / 60,
    accumulator: 0,
  };

  window.PHYSICS = PHY;

  function initPhysics() {
    if (typeof CANNON === 'undefined') {
      console.info('[physics] CANNON 미로딩 — 물리 비활성');
      return false;
    }
    if (PHY.enabled) return true;

    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 8;
    world.defaultContactMaterial.contactEquationStiffness  = 1e7;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    world.defaultContactMaterial.friction    = 0.4;
    world.defaultContactMaterial.restitution = 0.25;

    // 무한 평면 지면 (y=0)
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);

    PHY.world  = world;
    PHY.ground = groundBody;
    PHY.enabled = true;

    return true;
  }

  // ── Step + Mesh sync ─────────────────────────────────────────
  function updatePhysics(delta) {
    if (!PHY.enabled || !PHY.world) return;

    // Fixed-step integration
    PHY.accumulator += Math.min(delta, 0.1);
    while (PHY.accumulator >= PHY.fixedDt) {
      PHY.world.step(PHY.fixedDt);
      PHY.accumulator -= PHY.fixedDt;
    }

    // Sync mesh transforms + 정지/슬립 후 제거 후보 정리
    const remove = [];
    PHY.bodies.forEach((entry, idx) => {
      const { body, mesh, opts } = entry;
      if (!mesh) return;
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

      if (opts && opts.removeBelowY !== undefined && mesh.position.y < opts.removeBelowY) {
        remove.push(idx);
      }
      // hit detection — y < impactY 이고 한 번 콜백 실행
      if (opts && opts.onLand && !entry._landed) {
        const speed = body.velocity.length();
        if (body.position.y < (opts.landY ?? 0.5) && speed < 1.5) {
          entry._landed = true;
          try { opts.onLand(mesh, body); } catch (e) { console.warn('[physics] onLand err', e); }
        }
      }
    });
    if (remove.length) {
      for (let i = remove.length - 1; i >= 0; i--) removePhysicsBody(remove[i]);
    }
  }

  // ── Body factory: Box / Sphere ───────────────────────────────
  function addPhysicsBox(mesh, opts = {}) {
    if (!PHY.enabled || !mesh) return null;
    const size = opts.size || _meshHalfExtent(mesh);
    const body = new CANNON.Body({
      mass: opts.mass ?? 1.0,
      shape: new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z)),
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    });
    if (opts.velocity) body.velocity.set(opts.velocity.x, opts.velocity.y, opts.velocity.z);
    if (opts.angularVelocity) body.angularVelocity.set(opts.angularVelocity.x, opts.angularVelocity.y, opts.angularVelocity.z);
    body.linearDamping  = opts.linearDamping  ?? 0.01;
    body.angularDamping = opts.angularDamping ?? 0.05;
    PHY.world.add(body);
    PHY.bodies.push({ body, mesh, opts });
    return body;
  }

  function addPhysicsSphere(mesh, opts = {}) {
    if (!PHY.enabled || !mesh) return null;
    const r = opts.radius || _meshRadius(mesh) || 0.5;
    const body = new CANNON.Body({
      mass: opts.mass ?? 1.0,
      shape: new CANNON.Sphere(r),
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    });
    if (opts.velocity) body.velocity.set(opts.velocity.x, opts.velocity.y, opts.velocity.z);
    PHY.world.add(body);
    PHY.bodies.push({ body, mesh, opts });
    return body;
  }

  function removePhysicsBody(idx) {
    const entry = PHY.bodies[idx];
    if (!entry) return;
    if (entry.body) PHY.world.remove(entry.body);
    if (entry.mesh && entry.mesh.parent) entry.mesh.parent.remove(entry.mesh);
    PHY.bodies.splice(idx, 1);
  }

  function clearPhysicsBodies() {
    while (PHY.bodies.length) removePhysicsBody(0);
  }

  // ── 낙하물 데모: 도구상자/벽돌이 비계 위에서 떨어짐 ───────────
  // BULSA 정체성: 낙하물 사고 — 작업자 위로 떨어지면 위험.
  function spawnFallHazard(scene, position, opts = {}) {
    if (!PHY.enabled || !scene) return null;
    const sz = opts.size || { x: 0.25, y: 0.18, z: 0.35 };
    const color = opts.color ?? 0xC04020;
    const geo = new THREE.BoxGeometry(sz.x * 2, sz.y * 2, sz.z * 2);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    const body = addPhysicsBox(mesh, {
      size: sz,
      mass: opts.mass ?? 1.0,
      velocity: opts.velocity,
      angularVelocity: opts.angularVelocity || { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 },
      linearDamping: 0.01,
      angularDamping: 0.04,
      landY: 0.35,
      onLand: opts.onLand,
      removeBelowY: -8,
    });
    return { mesh, body };
  }

  function _meshHalfExtent(mesh) {
    if (mesh.geometry && mesh.geometry.boundingBox) {
      const b = mesh.geometry.boundingBox;
      return { x: (b.max.x - b.min.x) / 2, y: (b.max.y - b.min.y) / 2, z: (b.max.z - b.min.z) / 2 };
    }
    if (mesh.geometry) mesh.geometry.computeBoundingBox();
    const b = mesh.geometry && mesh.geometry.boundingBox;
    return b ? { x: (b.max.x - b.min.x) / 2, y: (b.max.y - b.min.y) / 2, z: (b.max.z - b.min.z) / 2 }
             : { x: 0.5, y: 0.5, z: 0.5 };
  }

  function _meshRadius(mesh) {
    if (mesh.geometry) { mesh.geometry.computeBoundingSphere(); return mesh.geometry.boundingSphere ? mesh.geometry.boundingSphere.radius : 0.5; }
    return 0.5;
  }

  // ── 시나리오별 안전 데모 — 정체성 유지: 낙하물 위험 시각화 ─────
  // 각 시나리오마다 적합한 위치에서 도구·자재가 떨어지는 가벼운 데모.
  // 게임플레이엔 영향 없음. PHY 비활성이면 no-op.
  function spawnDemoHazards(scene, scenarioId) {
    if (!PHY.enabled || !scene) return;
    const presets = {
      excavation: [ // 흙더미 위 작은 자갈 떨어짐
        { pos: { x:  6, y: 6, z: -10 }, color: 0x8B7355, size: { x:0.25,y:0.18,z:0.25 } },
        { pos: { x: -6, y: 7, z:  -8 }, color: 0x6B5B3F, size: { x:0.18,y:0.15,z:0.22 } },
      ],
      foundation: [ // 거푸집 상단 못/공구
        { pos: { x: -3, y: 4, z:  -5 }, color: 0x8C8C8C, size: { x:0.15,y:0.08,z:0.4 } },
        { pos: { x:  4, y: 5, z:  -3 }, color: 0xB87333, size: { x:0.22,y:0.18,z:0.22 } },
      ],
      lifting: [], // 양중 중에는 빔 외 낙하물 회피 — 미배치
      envelope: [ // 비계 상부 도구상자/패널 파편
        { pos: { x: -5, y: 9, z:  -8 }, color: 0xC04020, size: { x:0.3,y:0.15,z:0.45 } },
        { pos: { x:  6, y:11, z: -12 }, color: 0x707075, size: { x:0.28,y:0.04,z:0.28 } },
      ],
      mep_finish: [ // 천장 작업 — 렌치/배선 spool
        { pos: { x:  2, y: 4, z:  -3 }, color: 0x303030, size: { x:0.1,y:0.06,z:0.35 } },
      ],
    };
    const list = presets[scenarioId] || [];
    list.forEach(p => spawnFallHazard(scene, new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
      { size: p.size, color: p.color, mass: 1.0 }));
  }

  // ── 글로벌 export ────────────────────────────────────────────
  window.initPhysics       = initPhysics;
  window.updatePhysics     = updatePhysics;
  window.addPhysicsBox     = addPhysicsBox;
  window.addPhysicsSphere  = addPhysicsSphere;
  window.spawnFallHazard   = spawnFallHazard;
  window.clearPhysicsBodies= clearPhysicsBodies;
  window.spawnDemoHazards  = spawnDemoHazards;
})();
