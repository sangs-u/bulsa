// Hazard definitions — S01 줄걸이/인양
// All 6 KOSHA hazards for this scenario

function registerLiftingHazards() {
  const scene = GAME.scene;
  GAME.hazards = [];
  GAME.interactables = [];

  // ── Hazard meshes helper ───────────────────────────────
  function makeHazardMesh(geo, color, pos) {
    const mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.90,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.12,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;

    // Floating indicator: small vertical warning diamond (not flat plane)
    const markerGeo = new THREE.CylinderGeometry(0, 0.18, 0.36, 4);
    markerGeo.translate(0, 0.18, 0);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xD4A010 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(pos[0], pos[1] + 0.85, pos[2]);

    mesh.userData.marker = marker;
    mesh.userData.pulsePhase = Math.random() * Math.PI * 2;

    scene.add(mesh);
    scene.add(marker);
    return mesh;
  }

  // ── 1. 슬링 손상 (킹크) ─────────────────────────────────
  // Red kinked wire near beam left sling attachment
  const slingGeo = new THREE.TorusGeometry(0.18, 0.055, 14, 24, Math.PI * 1.4);
  const slingMesh = makeHazardMesh(slingGeo, 0xA83020, [-5, 0.6, -8]);

  const hazSling = {
    id: 'sling_damage',
    mesh: slingMesh,
    nameKey: 'hazard_sling_name',
    descKey: 'hazard_sling_desc',
    actionKey: 'hazard_sling_action',
    ignoreKey: 'hazard_sling_ignore',
    resolved: false,
    ignored: false,
    critical: true,
    accidentId: 'sling_snap',
    safetyPenalty: 25,
    safetyReward: 10,
  };
  GAME.hazards.push(hazSling);
  GAME.interactables.push({ mesh: slingMesh, type: 'hazard', hazardId: 'sling_damage', nameKey: 'hazard_sling_name' });

  // ── 2. 안전핀 미체결 ────────────────────────────────────
  // Yellow box at crane hook area (accessible via ladder — placed at ground near crane base)
  const pinGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.42, 16);
  const pinMesh = makeHazardMesh(pinGeo, 0xB88A14, [-2, 0.5, -6]);

  const hazPin = {
    id: 'pin_unsecured',
    mesh: pinMesh,
    nameKey: 'hazard_pin_name',
    descKey: 'hazard_pin_desc',
    actionKey: 'hazard_pin_action',
    ignoreKey: 'hazard_pin_ignore',
    resolved: false,
    ignored: false,
    critical: true,
    accidentId: 'pin_drop',
    safetyPenalty: 20,
    safetyReward: 10,
  };
  GAME.hazards.push(hazPin);
  GAME.interactables.push({ mesh: pinMesh, type: 'hazard', hazardId: 'pin_unsecured', nameKey: 'hazard_pin_name' });

  // ── 3. 신호수 미배치 ────────────────────────────────────
  // Orange cone cluster at signaling position
  const signalGeo = new THREE.CylinderGeometry(0, 0.26, 0.82, 18);
  const signalMesh = makeHazardMesh(signalGeo, 0xBB4810, [7, 0.41, -6]);

  const hazSignal = {
    id: 'no_signal',
    mesh: signalMesh,
    nameKey: 'hazard_signal_name',
    descKey: 'hazard_signal_desc',
    actionKey: 'hazard_signal_action',
    ignoreKey: 'hazard_signal_ignore',
    resolved: false,
    ignored: false,
    critical: false,
    accidentId: 'no_signal',
    safetyPenalty: 15,
    safetyReward: 8,
  };
  GAME.hazards.push(hazSignal);
  GAME.interactables.push({ mesh: signalMesh, type: 'hazard', hazardId: 'no_signal', nameKey: 'hazard_signal_name' });

  // ── 4. 크레인 과부하 ────────────────────────────────────
  // Red gauge at crane control panel side
  const gaugeGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24);
  const gaugeMesh = makeHazardMesh(gaugeGeo, 0xA02818, [12, 1.4, -4.2]);

  const hazOverload = {
    id: 'overload',
    mesh: gaugeMesh,
    nameKey: 'hazard_overload_name',
    descKey: 'hazard_overload_desc',
    actionKey: 'hazard_overload_action',
    ignoreKey: 'hazard_overload_ignore',
    resolved: false,
    ignored: false,
    critical: true,
    accidentId: 'overload',
    safetyPenalty: 20,
    safetyReward: 8,
  };
  GAME.hazards.push(hazOverload);
  GAME.interactables.push({ mesh: gaugeMesh, type: 'hazard', hazardId: 'overload', nameKey: 'hazard_overload_name' });

  // ── 5. 작업반경 내 근로자 ─────────────────────────────────
  const workerGroup = new THREE.Group();
  const vestMat   = new THREE.MeshLambertMaterial({ color: 0xCC5018 });
  const skinMat   = new THREE.MeshLambertMaterial({ color: 0xC8845A });
  const helmMat   = new THREE.MeshLambertMaterial({ color: 0xDEBB14 });
  const pantMat   = new THREE.MeshLambertMaterial({ color: 0x2C3A48 });
  const bootMat   = new THREE.MeshLambertMaterial({ color: 0x1C1814 });

  const mkW = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    workerGroup.add(m);
    return m;
  };

  // Boots
  mkW(new THREE.BoxGeometry(0.12, 0.09, 0.24), bootMat, -0.09, 0.045, 0.04);
  mkW(new THREE.BoxGeometry(0.12, 0.09, 0.24), bootMat,  0.09, 0.045, 0.04);

  // Legs (cylinder)
  const wLegGL = new THREE.CylinderGeometry(0.068, 0.054, 0.78, 14);
  wLegGL.translate(0, -0.39, 0);
  mkW(wLegGL, pantMat, -0.09, 0.88, 0);
  const wLegGR = new THREE.CylinderGeometry(0.068, 0.054, 0.78, 14);
  wLegGR.translate(0, -0.39, 0);
  mkW(wLegGR, pantMat,  0.09, 0.88, 0);

  // Torso
  mkW(new THREE.CylinderGeometry(0.155, 0.130, 0.52, 18), vestMat, 0, 1.08, 0);

  // Neck + Head
  mkW(new THREE.CylinderGeometry(0.052, 0.048, 0.09, 12), skinMat, 0, 1.39, 0);
  mkW(new THREE.SphereGeometry(0.115, 24, 18), skinMat, 0, 1.56, 0);

  // Helmet
  mkW(new THREE.SphereGeometry(0.132, 24, 14, 0, Math.PI*2, 0, Math.PI*0.58), helmMat, 0, 1.625, 0);
  mkW(new THREE.CylinderGeometry(0.162, 0.148, 0.024, 24), helmMat, 0, 1.568, 0);

  // Arms
  const wArmGL = new THREE.CylinderGeometry(0.046, 0.036, 0.62, 12);
  wArmGL.translate(0, -0.31, 0);
  mkW(wArmGL, vestMat, -0.21, 1.32, 0);
  const wArmGR = new THREE.CylinderGeometry(0.046, 0.036, 0.62, 12);
  wArmGR.translate(0, -0.31, 0);
  mkW(wArmGR, vestMat,  0.21, 1.32, 0);

  workerGroup.position.set(1, 0, -11);
  scene.add(workerGroup);

  // Invisible interaction sphere at worker position
  const workerTriggerGeo = new THREE.SphereGeometry(0.6, 8, 6);
  const workerTriggerMat = new THREE.MeshBasicMaterial({ visible: false });
  const workerTrigger = new THREE.Mesh(workerTriggerGeo, workerTriggerMat);
  workerTrigger.position.set(1, 1, -11);
  scene.add(workerTrigger);

  workerTrigger.userData.workerGroup = workerGroup;

  const hazWorker = {
    id: 'worker_in_zone',
    mesh: workerTrigger,
    nameKey: 'hazard_worker_name',
    descKey: 'hazard_worker_desc',
    actionKey: 'hazard_worker_action',
    ignoreKey: 'hazard_worker_ignore',
    resolved: false,
    ignored: false,
    critical: true,
    accidentId: 'worker_crush',
    safetyPenalty: 25,
    safetyReward: 10,
    workerGroup,
  };
  GAME.hazards.push(hazWorker);
  GAME.interactables.push({ mesh: workerTrigger, type: 'hazard', hazardId: 'worker_in_zone', nameKey: 'hazard_worker_name' });

  // Override resolve for worker (make worker walk away)
  const origResolveInteraction = resolveHazard;

  // ── 6. 인양각도 초과 ─────────────────────────────────────
  // Angle indicator at sling connection — a wedge shape
  const angleGeo = new THREE.CylinderGeometry(0, 0.34, 0.46, 4);
  const angleMesh = makeHazardMesh(angleGeo, 0xB8900E, [1, 0.6, -9]);
  angleMesh.rotation.y = Math.PI / 4;

  const hazAngle = {
    id: 'angle_exceeded',
    mesh: angleMesh,
    nameKey: 'hazard_angle_name',
    descKey: 'hazard_angle_desc',
    actionKey: 'hazard_angle_action',
    ignoreKey: 'hazard_angle_ignore',
    resolved: false,
    ignored: false,
    critical: true,
    accidentId: 'angle_break',
    safetyPenalty: 15,
    safetyReward: 8,
  };
  GAME.hazards.push(hazAngle);
  GAME.interactables.push({ mesh: angleMesh, type: 'hazard', hazardId: 'angle_exceeded', nameKey: 'hazard_angle_name' });

  // ── Crane Control Panel Trigger ───────────────────────
  if (GAME._cranePanelMesh) {
    GAME.interactables.push({
      mesh: GAME._cranePanelMesh,
      type: 'trigger',
      triggerId: 'start_lift',
      nameKey: 'trigger_panel_name',
    });
  }

  // ── Pulse animation (called from engine loop) ─────────
  GAME._pulseHazards = function(time) {
    GAME.hazards.forEach(haz => {
      if (haz.resolved || haz.ignored || !haz.mesh) return;
      const phase = haz.mesh.userData.pulsePhase || 0;
      const pulse = 0.18 + 0.22 * Math.abs(Math.sin(time * 2 + phase));
      if (haz.mesh.material) haz.mesh.material.emissiveIntensity = pulse;

      // Marker bob + slow spin
      const marker = haz.mesh.userData.marker;
      if (marker) {
        marker.position.y = haz.mesh.position.y + 0.85 + Math.sin(time * 2.5 + phase) * 0.10;
        marker.rotation.y = time * 1.2;
        marker.scale.setScalar(0.88 + 0.14 * Math.abs(Math.sin(time * 2 + phase)));
      }
    });
  };
}
