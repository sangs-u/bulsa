// core/excavator.js — 직접 조작 굴착기 시스템 (v4 Phase 1)
// WASD 트랙 이동 · 마우스 상부선회 · Q/E 붐 · R/F 아암 · Space 버킷 파기
// X 버킷 덤프 · T 덤프트럭 호출 · V 하차
// 표준시방서 KCS 11 10 05 (흙막이 공사) · 산안규칙 별표 3-39

const EXC = {
  boarded:   false,
  // 3D 피벗 참조 (initExcavator 에서 구성)
  root:     null,  // 전체 이동
  upper:    null,  // 상부체 (Y 선회)
  boomPvt:  null,  // 붐 (X 회전)
  armPvt:   null,  // 아암 (X 회전)
  bktPvt:   null,  // 버킷 (X 회전)
  // 관절 각도
  boomAng:  -0.30,
  armAng:    0.80,
  bktAng:   -0.50,
  slewYaw:   0,    // 상부체 추가 Y (마우스)
  // 이동
  _trackFwd:  0,
  _trackTurn: 0,
  // 굴착 상태
  soilFill:     0,     // 0-1 버킷 적재량
  totalScoops:  0,     // 누적 삽 수
  excavDepth:   0,     // 달성 굴착 깊이 m
  targetDepth:  2.0,   // 목표 깊이 (작업계획서에서 읽음)
  soilChunks:   [],
  SOIL_PILE:    null,  // THREE.Vector3 — 흙더미 위치
  _justFilled:  false,
  // 덤프트럭
  truck: {
    group:    null,
    state:    'idle',   // idle|coming|waiting|leaving
    scoops:   0,
    CAPACITY: 4,
  },
  // 내부
  _mouseDX:       0,
  _mouseHandler:  null,
  _keyHandler:    null,
  _hud:           null,
};

// ── init ──────────────────────────────────────────────────────
function initExcavator() {
  // 굴착 시나리오 또는 v4 mode 에서만 활성화
  if (typeof GAME._excavator === 'undefined') return;
  EXC.SOIL_PILE = new THREE.Vector3(14, 0, -13);
  _rebuildExcavJoints();
  _buildDumpTruckMesh();
  _buildExcavHUD();

  // 인터랙터블 레이블 업데이트 (운전원 호출 → 직접 탑승)
  (GAME.interactables || []).forEach(it => {
    if (it.type === 'excav_cab') it.label = '굴착기 탑승 (E)';
  });
}

// ── 관절 재구성 ───────────────────────────────────────────────
function _rebuildExcavJoints() {
  const root = GAME._excavator;
  while (root.children.length) root.remove(root.children[0]);
  EXC.root = root;

  const yellow = typeof matMetal === 'function'
    ? matMetal({ color: 0xCFA418, roughness: 0.65, metalness: 0.5 })
    : new THREE.MeshLambertMaterial({ color: 0xCFA418 });
  const dark   = new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.85, metalness: 0.5 });
  const grey   = new THREE.MeshStandardMaterial({ color: 0x6A6860, roughness: 0.7,  metalness: 0.45 });
  const glass  = new THREE.MeshLambertMaterial({ color: 0x88BBCC, transparent: true, opacity: 0.6 });

  // — 트랙 좌우 —
  [-0.84, 0.84].forEach(dx => {
    const geo = new THREE.BoxGeometry(0.68, 0.50, 3.5);
    const m   = new THREE.Mesh(geo, dark);
    m.position.set(dx, 0.25, 0);
    m.castShadow = true;
    root.add(m);
    // 트랙 휠 표현
    [-1.4, 0, 1.4].forEach(dz => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.72, 10), grey);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(dx, 0.25, dz);
      root.add(wh);
    });
  });

  // — 하부 프레임 —
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.30, 2.8), dark);
  frame.position.set(0, 0.55, 0);
  root.add(frame);

  // — 상부체 그룹 (선회) —
  const upper = new THREE.Group();
  upper.position.set(0, 0.70, 0);
  root.add(upper);
  EXC.upper = upper;

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.0, 2.25), yellow);
  body.position.set(0, 0.50, -0.18);
  body.castShadow = true;
  upper.add(body);

  // 운전실
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.20, 1.18), yellow);
  cab.position.set(-0.52, 1.45, 0.48);
  cab.castShadow = true;
  upper.add(cab);

  // 창문 (앞·좌·우)
  const winFront = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.80), glass);
  winFront.position.set(-0.52, 1.45, 1.07);
  upper.add(winFront);
  const winSide = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.80), glass);
  winSide.position.set(-1.12, 1.45, 0.48);
  winSide.rotation.y = Math.PI / 2;
  upper.add(winSide);

  // 카운터웨이트
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.92, 0.75), dark);
  cw.position.set(0, 0.72, -1.52);
  upper.add(cw);

  // — 붐 피벗 —
  const boomPvt = new THREE.Group();
  boomPvt.position.set(0.30, 1.15, 1.0);
  upper.add(boomPvt);
  EXC.boomPvt = boomPvt;
  boomPvt.rotation.x = EXC.boomAng;

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 3.8), yellow);
  boom.position.set(0, 0, 1.9);
  boom.castShadow = true;
  boomPvt.add(boom);

  // 붐 유압 실린더 (시각)
  const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.8, 8), grey);
  bCyl.rotation.z = Math.PI / 2;
  bCyl.position.set(0, -0.32, 1.0);
  boomPvt.add(bCyl);

  // — 아암 피벗 (붐 끝) —
  const armPvt = new THREE.Group();
  armPvt.position.set(0, 0, 3.8);
  boomPvt.add(armPvt);
  EXC.armPvt = armPvt;
  armPvt.rotation.x = EXC.armAng;

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 2.6), yellow);
  arm.position.set(0, 0, 1.3);
  arm.castShadow = true;
  armPvt.add(arm);

  const aCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8), grey);
  aCyl.rotation.z = Math.PI / 2;
  aCyl.position.set(0, -0.28, 0.8);
  armPvt.add(aCyl);

  // — 버킷 피벗 (아암 끝) —
  const bktPvt = new THREE.Group();
  bktPvt.position.set(0, 0, 2.6);
  armPvt.add(bktPvt);
  EXC.bktPvt = bktPvt;
  bktPvt.rotation.x = EXC.bktAng;

  const bkt = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.75, 0.88), grey);
  bkt.position.set(0, -0.30, 0.44);
  bkt.castShadow = true;
  bktPvt.add(bkt);

  // 버킷 이빨
  for (let i = -3; i <= 3; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.19, 4), dark);
    tooth.position.set(i * 0.15, -0.62, 0.86);
    tooth.rotation.x = Math.PI / 2;
    bktPvt.add(tooth);
  }

  // 콜라이더 등록
  GAME.colliders = GAME.colliders || [];
  GAME.colliders.push(body, cab, cw);
}

// ── 덤프트럭 메시 ─────────────────────────────────────────────
function _buildDumpTruckMesh() {
  const orange = typeof matMetal === 'function'
    ? matMetal({ color: 0xD05410, roughness: 0.6, metalness: 0.4 })
    : new THREE.MeshLambertMaterial({ color: 0xD05410 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.85, metalness: 0.5 });
  const grey  = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.7,  metalness: 0.5 });

  const g = new THREE.Group();

  // 캡 (cab)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 2.3), orange);
  cab.position.set(-2.4, 1.2, 0);
  cab.castShadow = true;
  g.add(cab);

  // 덤프 베드
  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 2.3), dark);
  bed.position.set(0.9, 0.5, 0);
  bed.castShadow = true;
  g.add(bed);

  // 베드 벽
  [[0.9, 1.1, 1.15, [4.8, 0.8, 0.1], 0],
   [0.9, 1.1,-1.15, [4.8, 0.8, 0.1], 0],
   [3.3, 1.1, 0,   [0.1, 0.8, 2.3], 0]].forEach(([x,y,z,s]) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(...s), dark);
    w.position.set(x, y, z);
    g.add(w);
  });

  // 바퀴 4개
  [[-1.5,-1.25],[-1.5,1.25],[1.8,-1.25],[1.8,1.25]].forEach(([x,z]) => {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.36, 14), grey);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.52, z);
    wh.castShadow = true;
    g.add(wh);
  });

  g.position.set(28, 0, -13);
  g.rotation.y = Math.PI;  // 왼쪽을 향해 진입
  g.visible = false;
  GAME.scene.add(g);
  EXC.truck.group = g;
}

// ── HUD ───────────────────────────────────────────────────────
function _buildExcavHUD() {
  const hud = document.createElement('div');
  hud.id = 'excav-drive-hud';
  hud.style.cssText = [
    'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(8,12,18,0.85)', 'color:#D8E0EE', 'padding:10px 18px',
    'border-radius:8px', 'font:13px/1.5 monospace', 'display:none',
    'text-align:center', 'pointer-events:none', 'z-index:190',
    'border:1px solid rgba(240,200,60,0.35)', 'min-width:360px', 'max-width:520px',
  ].join(';');
  hud.innerHTML = `
    <div style="font-weight:bold;color:#F0C840;margin-bottom:6px">🚜 굴착기 직접 조작</div>
    <div style="margin-bottom:4px">
      굴착 깊이:
      <span id="exc-depth" style="color:#4DE;font-weight:bold">0.0</span>
      / <span id="exc-target">2.0</span> m &nbsp;
      <span style="display:inline-block;background:#1a1a1a;width:90px;height:9px;border-radius:4px;vertical-align:middle;border:1px solid #333">
        <span id="exc-depth-bar" style="display:block;height:100%;background:#4CAF50;width:0%;border-radius:4px;transition:width .3s"></span>
      </span>
    </div>
    <div style="margin-bottom:3px">버킷: <span id="exc-bucket" style="font-weight:bold">비어있음</span></div>
    <div style="margin-bottom:3px">덤프트럭: <span id="exc-truck-st">대기 — T 키로 호출</span></div>
    <div style="font-size:11px;color:#808898;margin-top:5px">
      WASD 이동 &middot; 마우스 선회 &middot; Q/E 붐 &middot; R/F 아암 &middot; Space 굴착 &middot; X 덤프 &middot; T 트럭 &middot; V 하차
    </div>
  `;
  document.body.appendChild(hud);
  EXC._hud = hud;
}

// ── 탑승 / 하차 ───────────────────────────────────────────────
// 이 함수는 interaction.js 의 boardExcavator() 를 오버라이드함
function boardExcavator() {
  if (EXC.boarded || !EXC.root) return;
  if (GAME.state.liftStarted) return;

  // 전제조건 확인 (기존 interaction.js 헬퍼 재사용)
  const missing = (typeof _getExcavRefusal === 'function') ? _getExcavRefusal() : [];
  if (missing.length > 0) {
    if (typeof showOperatorRefusal === 'function') showOperatorRefusal(missing);
    return;
  }

  EXC.boarded = true;
  GAME.state.craneBoarded = true;   // 플레이어 이동 멈춤
  INTERACTION.popupOpen   = false;

  // 작업계획서에서 목표 깊이 읽기
  if (typeof EXCAV_STATE !== 'undefined' && EXCAV_STATE.planDepth) {
    EXC.targetDepth = parseFloat(EXCAV_STATE.planDepth) || 2.0;
  }

  GAME._prevCamMode  = PLAYER.camMode;
  GAME._prevWorldPos = PLAYER.worldPos.clone();
  PLAYER.camMode = 'fixed';

  // 포인터 락 (마우스 선회용)
  GAME.renderer.domElement.requestPointerLock && GAME.renderer.domElement.requestPointerLock();

  // 마우스 이벤트 (선회)
  EXC._mouseHandler = e => { if (EXC.boarded) EXC._mouseDX += e.movementX; };
  document.addEventListener('mousemove', EXC._mouseHandler);

  // V 키 하차
  EXC._keyHandler = e => {
    if (e.code === 'KeyV' && EXC.boarded) exitExcavatorDirect();
    if (e.code === 'KeyT' && EXC.boarded && EXC.truck.state === 'idle') _callDumpTruck();
  };
  document.addEventListener('keydown', EXC._keyHandler);

  // 기존 패널 숨김
  const cab = document.getElementById('excav-cab-overlay');
  if (cab) cab.classList.add('hidden');
  if (EXC._hud) EXC._hud.style.display = 'block';
  if (typeof hideInteractPrompt === 'function') hideInteractPrompt();

  if (typeof showActionNotif === 'function') {
    showActionNotif(
      '🚜 탑승 완료 — WASD:이동 · 마우스:선회 · Q/E:붐 · R/F:아암 · Space:굴착 · X:덤프 · T:트럭 · V:하차',
      6000
    );
  }
}

function exitExcavatorDirect() {
  if (!EXC.boarded) return;
  EXC.boarded = false;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;

  if (EXC._mouseHandler) { document.removeEventListener('mousemove', EXC._mouseHandler); EXC._mouseHandler = null; }
  if (EXC._keyHandler)   { document.removeEventListener('keydown',   EXC._keyHandler);   EXC._keyHandler   = null; }

  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) {
    PLAYER.worldPos.copy(GAME._prevWorldPos);
    GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);
  }
  if (EXC._hud) EXC._hud.style.display = 'none';

  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

// exitCraneCab 오버라이드 — 굴착기 탑승 중이면 하차, 아니면 크레인 원본 로직
function exitCraneCab() {
  if (EXC.boarded) { exitExcavatorDirect(); return; }
  // 크레인 원본 로직
  if (!GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;
  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) {
    PLAYER.worldPos.copy(GAME._prevWorldPos);
    GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);
  }
  const cranePnl = document.getElementById('crane-cab-overlay');
  if (cranePnl) cranePnl.classList.add('hidden');
  if (typeof SOUND !== 'undefined') SOUND.craneFadeOut();
  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

// ── 메인 틱 ──────────────────────────────────────────────────
function tickExcavator(delta) {
  if (!EXC.boarded || !EXC.root) return;

  const k = PLAYER.keys;

  // — 트랙 이동 (WASD) —
  const TRACK_SPEED = 4.5;
  const TURN_SPEED  = 1.6;
  const fwd  = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
  const turn = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);

  EXC.root.rotation.y -= turn * TURN_SPEED * delta;
  if (fwd !== 0) {
    const dx = Math.sin(EXC.root.rotation.y) * fwd * TRACK_SPEED * delta;
    const dz = Math.cos(EXC.root.rotation.y) * fwd * TRACK_SPEED * delta;
    EXC.root.position.x += dx;
    EXC.root.position.z += dz;
    EXC.root.position.y  = 0;
  }

  // — 상부체 선회 (마우스 X) —
  const SLEW_SENS = 0.0022;
  EXC.slewYaw    -= EXC._mouseDX * SLEW_SENS;
  EXC._mouseDX    = 0;
  EXC.upper.rotation.y = EXC.slewYaw;

  // — 붐 (Q=올림, E=내림) —
  if (k['KeyQ']) EXC.boomAng = Math.max(-1.15, EXC.boomAng - 0.85 * delta);
  if (k['KeyE']) EXC.boomAng = Math.min( 0.25, EXC.boomAng + 0.85 * delta);
  EXC.boomPvt.rotation.x = EXC.boomAng;

  // — 아암 (R=접기, F=펴기) —
  if (k['KeyR']) EXC.armAng = Math.max( 0.10, EXC.armAng - 0.95 * delta);
  if (k['KeyF']) EXC.armAng = Math.min( 1.90, EXC.armAng + 0.95 * delta);
  EXC.armPvt.rotation.x = EXC.armAng;

  // — 버킷 (Space=감기/파기, X=열기/덤프) —
  if (k['Space']) EXC.bktAng = Math.min( 0.80, EXC.bktAng + 1.3 * delta);
  if (k['KeyX'])  EXC.bktAng = Math.max(-1.30, EXC.bktAng - 1.3 * delta);
  EXC.bktPvt.rotation.x = EXC.bktAng;

  // — 굴착 판정 —
  _checkScooping(k);

  // — 덤프트럭 이동 AI —
  _tickDumpTruck(delta);

  // — 카메라 갱신 —
  _updateExcavCamera();

  // — HUD —
  _updateExcavHUD();
}

// ── 굴착 판정 ─────────────────────────────────────────────────
function _checkScooping(keys) {
  if (!EXC.bktPvt) return;

  // 버킷 이빨 월드 위치
  const tipLocal = new THREE.Vector3(0, -0.65, 0.90);
  EXC.bktPvt.updateWorldMatrix(true, false);
  const tipW = tipLocal.clone().applyMatrix4(EXC.bktPvt.matrixWorld);

  const inPit    = _isPitArea(tipW);
  const digging  = tipW.y < 0.25 && keys['Space'] && EXC.bktAng > -0.1;

  // 굴착 적재
  if (inPit && digging && EXC.soilFill < 1.0) {
    EXC.soilFill += 0.55 * delta;
    if (EXC.soilFill >= 1.0 && !EXC._justFilled) {
      EXC.soilFill   = 1.0;
      EXC._justFilled = true;
      EXC.excavDepth = Math.min(EXC.targetDepth, EXC.excavDepth + (EXC.targetDepth / 8));
      _spawnSoilChunk(tipW, false);
      typeof showActionNotif === 'function' &&
        showActionNotif('💪 버킷 가득! 덤프트럭(T 호출)이나 흙더미로 이동 후 X로 비우세요', 3500);
    }
  } else if (!digging) {
    EXC._justFilled = false;
  }

  // 덤프 판정 (X 키, 버킷이 열리는 방향)
  if (keys['KeyX'] && EXC.soilFill > 0.25 && EXC.bktAng < -0.5) {
    const tk = EXC.truck;
    const overTruck = tk.state === 'waiting' && tk.group &&
      new THREE.Vector2(tipW.x - tk.group.position.x, tipW.z - tk.group.position.z).length() < 7;
    const overPile  = EXC.SOIL_PILE &&
      new THREE.Vector2(tipW.x - EXC.SOIL_PILE.x, tipW.z - EXC.SOIL_PILE.z).length() < 6;

    if (overTruck || overPile) {
      _dumpBucket(tipW, overTruck);
    }
  }
}

function _isPitArea(w) {
  // 구덩이: center (0, -2, -17), 12×12
  return Math.abs(w.x) < 7.5 && w.z > -24.5 && w.z < -9.5;
}

function _dumpBucket(tipW, intoTruck) {
  EXC.soilFill   = 0;
  EXC.totalScoops++;
  EXC._justFilled = false;

  let dumpPos;
  if (intoTruck && EXC.truck.group) {
    const tp = EXC.truck.group.position;
    dumpPos = new THREE.Vector3(tp.x + (Math.random() - 0.5) * 3, 1.8, tp.z + (Math.random() - 0.5) * 1.5);
    EXC.truck.scoops++;
    if (EXC.truck.scoops >= EXC.truck.CAPACITY) {
      EXC.truck.state = 'leaving';
      typeof showActionNotif === 'function' &&
        showActionNotif('🚛 덤프트럭 적재 완료 — 반출 중...', 3000);
    } else {
      typeof showActionNotif === 'function' &&
        showActionNotif(`덤프 완료 (${EXC.truck.scoops}/${EXC.truck.CAPACITY} 삽)`, 1500);
    }
  } else {
    const h = 0.3 + EXC.soilChunks.length * 0.04;
    dumpPos = EXC.SOIL_PILE.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 3, h, (Math.random() - 0.5) * 2
    ));
    typeof showActionNotif === 'function' &&
      showActionNotif(`흙더미 쌓음 (총 ${EXC.totalScoops} 삽)`, 1200);
  }
  _spawnSoilChunk(dumpPos, true);

  // 완료 체크
  if (EXC.excavDepth >= EXC.targetDepth - 0.05) {
    setTimeout(() => {
      if (typeof showActionNotif === 'function')
        showActionNotif('✅ 굴착 목표 깊이 달성! — 잔토 처리 후 다음 공정으로 진행', 5000);
      if (typeof EXCAV_STATE !== 'undefined') EXCAV_STATE.excavationDone = true;
    }, 800);
  }
}

// ── 토사 청크 스폰 ────────────────────────────────────────────
function _spawnSoilChunk(worldPos, isDump) {
  const r = isDump ? 0.25 + Math.random() * 0.20 : 0.35 + Math.random() * 0.25;
  const geo = new THREE.ConeGeometry(r, r * 0.8, isDump ? 6 : 8);
  const mat = typeof matDirt === 'function'
    ? matDirt({ color: isDump ? 0x7A5A38 : 0x5A3820, repeat: 2 })
    : new THREE.MeshLambertMaterial({ color: isDump ? 0x7A5A38 : 0x5A3820 });
  const chunk = new THREE.Mesh(geo, mat);
  chunk.position.copy(worldPos);
  chunk.position.y = Math.max(0, worldPos.y - r * 0.3);
  chunk.rotation.y = Math.random() * Math.PI * 2;
  chunk.rotation.x = (Math.random() - 0.5) * 0.4;
  chunk.castShadow = true;
  chunk.receiveShadow = true;
  GAME.scene.add(chunk);
  EXC.soilChunks.push(chunk);

  // 성능: 최대 60개
  while (EXC.soilChunks.length > 60) {
    const old = EXC.soilChunks.shift();
    GAME.scene.remove(old);
    old.geometry.dispose();
  }
}

// ── 덤프트럭 AI ───────────────────────────────────────────────
function _callDumpTruck() {
  const tk = EXC.truck;
  if (tk.state !== 'idle') return;
  tk.group.position.set(28, 0, -13);
  tk.group.rotation.y = Math.PI;
  tk.group.visible = true;
  tk.state  = 'coming';
  tk.scoops = 0;
  typeof showActionNotif === 'function' &&
    showActionNotif('🚛 덤프트럭 호출 — 현장 진입 중...', 2000);
}

function _tickDumpTruck(delta) {
  const tk = EXC.truck;
  if (!tk.group) return;

  if (tk.state === 'coming') {
    const target = new THREE.Vector3(6, 0, -13);
    const diff   = target.clone().sub(tk.group.position);
    if (diff.length() < 0.6) {
      tk.group.position.copy(target);
      tk.group.rotation.y = Math.PI;
      tk.state = 'waiting';
      typeof showActionNotif === 'function' &&
        showActionNotif('🚛 덤프트럭 도착! 버킷을 트럭 위로 선회 후 X 키로 토사 방출', 4500);
    } else {
      diff.normalize();
      tk.group.position.addScaledVector(diff, 7.5 * delta);
    }

  } else if (tk.state === 'leaving') {
    const target = new THREE.Vector3(28, 0, -13);
    const diff   = target.clone().sub(tk.group.position);
    if (diff.length() < 0.6) {
      tk.group.visible = false;
      tk.group.position.set(28, 0, -13);
      tk.state  = 'idle';
      tk.scoops = 0;
      typeof showActionNotif === 'function' &&
        showActionNotif('🚛 덤프트럭 반출 완료 — T 키로 재호출 가능', 3000);
    } else {
      diff.normalize();
      tk.group.position.addScaledVector(diff, 7.5 * delta);
    }
  }
}

// ── 카메라 ────────────────────────────────────────────────────
function _updateExcavCamera() {
  if (!EXC.root || !EXC.upper || !EXC.bktPvt) return;

  EXC.upper.updateWorldMatrix(true, false);
  const upperW = new THREE.Vector3();
  EXC.upper.getWorldPosition(upperW);

  // 카메라: 상부체 뒤 + 위
  const worldYaw  = EXC.root.rotation.y + EXC.slewYaw;
  const camOffset = new THREE.Vector3(
    -Math.sin(worldYaw) * 5.5,
    4.0,
    -Math.cos(worldYaw) * 5.5
  );
  const desiredPos = upperW.clone().add(camOffset);
  GAME.camera.position.lerp(desiredPos, 0.12);

  // 시선: 버킷 방향
  EXC.bktPvt.updateWorldMatrix(true, false);
  const bktW = new THREE.Vector3();
  EXC.bktPvt.getWorldPosition(bktW);

  const lookTarget = upperW.clone().lerp(bktW, 0.55);
  lookTarget.y = Math.max(lookTarget.y, 0);
  GAME.camera.lookAt(lookTarget);
}

// ── HUD 갱신 ─────────────────────────────────────────────────
function _updateExcavHUD() {
  if (!EXC._hud) return;
  const depthEl   = document.getElementById('exc-depth');
  const targetEl  = document.getElementById('exc-target');
  const barEl     = document.getElementById('exc-depth-bar');
  const bucketEl  = document.getElementById('exc-bucket');
  const truckStEl = document.getElementById('exc-truck-st');

  if (depthEl)  depthEl.textContent  = EXC.excavDepth.toFixed(1);
  if (targetEl) targetEl.textContent = EXC.targetDepth.toFixed(1);
  if (barEl) {
    const pct = Math.min(100, Math.round((EXC.excavDepth / EXC.targetDepth) * 100));
    barEl.style.width     = pct + '%';
    barEl.style.background = pct >= 100 ? '#FF9800' : pct > 50 ? '#4CAF50' : '#2196F3';
  }
  if (bucketEl) {
    const pct = Math.round(EXC.soilFill * 100);
    bucketEl.textContent = EXC.soilFill > 0.95 ? '가득! (X로 덤프)' : pct > 20 ? pct + '%' : '비어있음';
    bucketEl.style.color = EXC.soilFill > 0.95 ? '#FF9800' : EXC.soilFill > 0.3 ? '#8BC34A' : '#D8E0EE';
  }
  if (truckStEl) {
    const tk = EXC.truck;
    const stMap = {
      idle:    '대기 (T 키로 호출)',
      coming:  '🚛 도착 중...',
      waiting: `🚛 준비완료 ${tk.scoops}/${tk.CAPACITY} 삽`,
      leaving: '🚛 반출 중...',
    };
    truckStEl.textContent = stMap[tk.state] || tk.state;
  }
}

// ── 전역 등록 ─────────────────────────────────────────────────
window.EXC                  = EXC;
window.initExcavator        = initExcavator;
window.boardExcavator       = boardExcavator;
window.exitExcavatorDirect  = exitExcavatorDirect;
window.exitCraneCab         = exitCraneCab;
window.tickExcavator        = tickExcavator;
