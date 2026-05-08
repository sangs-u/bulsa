// Hazard definitions — S01 줄걸이/인양
// All 6 KOSHA hazards for this scenario

function registerLiftingHazards() {
  const scene = GAME.scene;
  GAME.hazards = [];
  GAME.interactables = [];

  // ── Hazard meshes helper ───────────────────────────────
  function makeHazardMesh(geo, color, pos, label) {
    const mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.88,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = false;

    // Floating warning marker above
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B, side: THREE.DoubleSide });
    const markerGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(pos[0], pos[1] + 1.2, pos[2]);
    marker.rotation.x = -Math.PI / 2;

    // Pulsing handled in update
    mesh.userData.marker = marker;
    mesh.userData.pulsePhase = Math.random() * Math.PI * 2;

    scene.add(mesh);
    scene.add(marker);
    return mesh;
  }

  // ── 1. 슬링 손상 (킹크) ─────────────────────────────────
  // Red kinked wire near beam left sling attachment
  const slingGeo = new THREE.TorusGeometry(0.18, 0.06, 8, 12, Math.PI * 1.4);
  const slingMesh = makeHazardMesh(slingGeo, 0xDC2626, [-5, 0.6, -8], '슬링');

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
  const pinGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const pinMesh = makeHazardMesh(pinGeo, 0xF59E0B, [-2, 0.5, -6], '안전핀');

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
  const signalGeo = new THREE.CylinderGeometry(0, 0.3, 0.9, 8);
  const signalMesh = makeHazardMesh(signalGeo, 0xFF6600, [7, 0.45, -6], '신호수');

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
  const gaugeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
  const gaugeMesh = makeHazardMesh(gaugeGeo, 0xDC2626, [12, 1.4, -4.2], '과부하');

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
  // Simple worker figure (box body + sphere head) standing in danger zone
  const workerGroup = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 }); // hi-viz vest
  const headMat = new THREE.MeshLambertMaterial({ color: 0xF5D5A0 });
  const helmetMat = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });

  const body   = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.3), bodyMat);
  const head   = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), headMat);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
  const legL   = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.25), bodyMat);
  const legR   = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.25), bodyMat);

  body.position.set(0, 1.23, 0);
  head.position.set(0, 1.87, 0);
  helmet.position.set(0, 1.97, 0);
  legL.position.set(-0.14, 0.38, 0);
  legR.position.set(0.14, 0.38, 0);

  workerGroup.add(body, head, helmet, legL, legR);
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
  const angleGeo = new THREE.CylinderGeometry(0, 0.4, 0.5, 4);
  const angleMesh = makeHazardMesh(angleGeo, 0xF59E0B, [1, 0.6, -9], '인양각도');
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

      // Marker bob
      const marker = haz.mesh.userData.marker;
      if (marker) {
        marker.position.y = haz.mesh.position.y + 1.1 + Math.sin(time * 3 + phase) * 0.12;
        marker.rotation.y = time * 1.5;
      }
    });
  };
}
