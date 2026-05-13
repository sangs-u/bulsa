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

// ── 관절 재구성 (상세 버전) ────────────────────────────────────
function _rebuildExcavJoints() {
  const root = GAME._excavator;
  while (root.children.length) root.remove(root.children[0]);
  EXC.root = root;

  // 재질
  const YELLOW = new THREE.MeshStandardMaterial({ color: 0xD4A818, roughness: 0.55, metalness: 0.30 });
  const STEEL  = new THREE.MeshStandardMaterial({ color: 0x545250, roughness: 0.68, metalness: 0.65 });
  const CHROME = new THREE.MeshStandardMaterial({ color: 0xBCBCBC, roughness: 0.06, metalness: 0.96 });
  const BLACK  = new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.88, metalness: 0.06 });
  const GLASS  = new THREE.MeshStandardMaterial({ color: 0x90C8DC, transparent: true, opacity: 0.38, roughness: 0.04, metalness: 0.10 });
  const STRIPE = new THREE.MeshStandardMaterial({ color: 0xCC3D08, roughness: 0.65, metalness: 0.15 });
  const HVAC   = new THREE.MeshStandardMaterial({ color: 0x3A4850, roughness: 0.82, metalness: 0.35 });

  function box(w, h, d, mat, px, py, pz, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cyl(rt, rb, h, seg, mat, px, py, pz, rx, rz, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(px, py, pz);
    if (rx !== undefined) m.rotation.x = rx;
    if (rz !== undefined) m.rotation.z = rz;
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  // ── 트랙 시스템 ───────────────────────────────────────────────
  [-0.95, 0.95].forEach(dx => {
    // 트랙 프레임 빔
    box(0.32, 0.52, 3.80, STEEL, dx, 0.30, 0, root);
    // 트랙 슈 (발판 — 더 넓음)
    box(0.74, 0.10, 3.82, BLACK, dx, 0.055, 0, root);
    // 상단 트랙 패드
    box(0.62, 0.07, 3.78, BLACK, dx, 0.565, 0, root);

    // 하부 로드 휠 6개
    for (let i = 0; i < 6; i++) {
      const zPos = -1.50 + i * 0.60;
      cyl(0.22, 0.22, 0.62, 12, STEEL, dx, 0.22, zPos, undefined, Math.PI/2, root);
      // 휠 플랜지 링
      [-0.32, 0.32].forEach(off => {
        cyl(0.24, 0.24, 0.05, 12, BLACK, dx + off * Math.sign(dx), 0.22, zPos, undefined, Math.PI/2, root);
      });
    }
    // 전방 아이들러
    cyl(0.28, 0.28, 0.64, 14, STEEL, dx, 0.30, 1.82, undefined, Math.PI/2, root);
    // 후방 구동 스프로킷
    cyl(0.30, 0.30, 0.64, 10, STEEL, dx, 0.32, -1.82, undefined, Math.PI/2, root);
    // 스프로킷 이빨 8개
    for (let t = 0; t < 8; t++) {
      const ang = (t / 8) * Math.PI * 2;
      const m = box(0.07, 0.10, 0.66, STEEL, dx, 0.32 + Math.sin(ang)*0.32, -1.82 + Math.cos(ang)*0.32, root);
      m.rotation.z = ang;
    }
    // 상단 캐리어 롤러 2개
    cyl(0.14, 0.14, 0.50, 10, STEEL, dx, 0.56, -0.55, undefined, Math.PI/2, root);
    cyl(0.14, 0.14, 0.50, 10, STEEL, dx, 0.56,  0.55, undefined, Math.PI/2, root);
  });

  // 하부 센터 프레임 (X-frame)
  box(1.78, 0.26, 3.20, STEEL, 0, 0.54, 0, root);
  // 선회 베어링 링
  cyl(0.60, 0.60, 0.14, 20, STEEL, 0, 0.68, 0, undefined, undefined, root);

  // ── 상부체 그룹 (선회) ────────────────────────────────────────
  const upper = new THREE.Group();
  upper.position.set(0, 0.76, 0);
  root.add(upper);
  EXC.upper = upper;

  // 상부 메인 덱
  box(2.58, 0.11, 2.62, YELLOW, 0, 0, 0, upper);

  // 엔진 커버 (후방)
  const engCover = box(2.55, 0.94, 1.52, YELLOW, 0, 0.52, -0.55, upper);
  // 엔진 환기구 슬릿
  for (let i = -0.50; i <= 0.50; i += 0.25) {
    box(1.60, 0.02, 0.07, BLACK, 0, 0.99, -0.55 + i, upper);
  }

  // 배기관
  cyl(0.09, 0.09, 0.92, 10, HVAC, 0.62, 1.46, -0.98, undefined, undefined, upper);
  cyl(0.12, 0.09, 0.09, 10, HVAC, 0.62, 1.93, -0.98, undefined, undefined, upper);

  // 유압 오일 탱크 (우측 전방)
  box(0.48, 0.98, 0.82,
    new THREE.MeshStandardMaterial({ color: 0x1C4E6A, roughness: 0.68, metalness: 0.28 }),
    0.88, 0.53, 0.80, upper);

  // 카운터웨이트 (주물 리브)
  const cw = box(2.58, 0.98, 0.86, STEEL, 0, 0.54, -1.48, upper);
  for (let i = -0.84; i <= 0.84; i += 0.42) {
    box(0.07, 0.94, 0.88, BLACK, i, 0.54, -1.48, upper);
  }

  // ── 운전실 ───────────────────────────────────────────────────
  const cx = -0.64, cz = 0.64;

  // 캐빈 바닥판
  box(1.38, 0.10, 1.46, YELLOW, cx, 0.05, cz, upper);
  // 캐빈 후벽
  box(1.38, 1.68, 0.10, YELLOW, cx, 0.88, cz - 0.72, upper);
  // 캐빈 상단 루프
  box(1.45, 0.10, 1.52, YELLOW, cx, 1.72, cz, upper);
  // A 필러 (전방 좌우)
  box(0.09, 1.70, 0.09, YELLOW, cx - 0.68, 0.88, cz + 0.70, upper);
  box(0.09, 1.70, 0.09, YELLOW, cx + 0.08, 0.88, cz + 0.70, upper);
  // B 필러 (후방)
  box(0.09, 1.70, 0.09, YELLOW, cx - 0.68, 0.88, cz - 0.70, upper);
  box(0.09, 1.70, 0.09, YELLOW, cx + 0.08, 0.88, cz - 0.70, upper);

  // 앞 유리 (windshield)
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.10, 1.48), GLASS);
  ws.position.set(cx, 0.90, cz + 0.73);
  upper.add(ws);
  // 좌측 창문
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.38), GLASS);
  sw.rotation.y = Math.PI / 2;
  sw.position.set(cx - 0.70, 0.90, cz);
  upper.add(sw);
  // 우측 창문 (좁음)
  const rwi = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.10), GLASS);
  rwi.rotation.y = -Math.PI / 2;
  rwi.position.set(cx + 0.11, 0.90, cz);
  upper.add(rwi);

  // 바이저 (앞유리 위 차양)
  box(1.46, 0.06, 0.22, YELLOW, cx, 1.68, cz + 0.64, upper);
  // 안전 스트라이프 (전면 하단)
  box(1.42, 0.12, 0.04, STRIPE, cx, 0.18, cz + 0.74, upper);
  // 그랩 레일
  cyl(0.025, 0.025, 1.44, 8, STEEL, cx, 1.14, cz + 0.82, undefined, Math.PI/2, upper);

  // ── 붐 피벗 ──────────────────────────────────────────────────
  const boomPvt = new THREE.Group();
  boomPvt.position.set(0.28, 1.10, 1.00);
  upper.add(boomPvt);
  EXC.boomPvt = boomPvt;
  boomPvt.rotation.x = EXC.boomAng;

  // 붐 (3단 테이퍼)
  box(0.58, 0.56, 1.55, YELLOW, 0, 0, 0.78, boomPvt);
  box(0.48, 0.48, 1.65, YELLOW, 0, 0, 2.42, boomPvt);
  box(0.38, 0.38, 0.82, YELLOW, 0, 0, 3.65, boomPvt);

  // 붐 풋 핀 (좌우)
  cyl(0.09, 0.09, 0.70, 10, STEEL, -0.32, -0.24, 0.10, undefined, Math.PI/2, boomPvt);
  cyl(0.09, 0.09, 0.70, 10, STEEL,  0.32, -0.24, 0.10, undefined, Math.PI/2, boomPvt);

  // 붐 유압 실린더 — 배럴 + 크롬 피스톤 로드
  cyl(0.10, 0.10, 2.45, 10, STEEL, -0.22, -0.44, 1.38, -0.28, undefined, boomPvt);
  cyl(0.055, 0.055, 1.50, 8, CHROME, -0.22, -0.32, 2.44, -0.28, undefined, boomPvt);

  // ── 아암 피벗 ────────────────────────────────────────────────
  const armPvt = new THREE.Group();
  armPvt.position.set(0, 0, 4.06);
  boomPvt.add(armPvt);
  EXC.armPvt = armPvt;
  armPvt.rotation.x = EXC.armAng;

  // 아암 몸체 (테이퍼)
  box(0.40, 0.40, 2.20, YELLOW, 0, 0, 1.10, armPvt);
  box(0.30, 0.32, 0.65, YELLOW, 0, 0, 2.52, armPvt);

  // 아암 실린더 배럴 + 크롬 로드
  cyl(0.082, 0.082, 1.65, 10, STEEL, 0.17, -0.33, 0.88, -0.18, undefined, armPvt);
  cyl(0.046, 0.046, 1.05, 8,  CHROME, 0.17, -0.22, 1.76, -0.18, undefined, armPvt);

  // ── 버킷 피벗 ────────────────────────────────────────────────
  const bktPvt = new THREE.Group();
  bktPvt.position.set(0, 0, 2.84);
  armPvt.add(bktPvt);
  EXC.bktPvt = bktPvt;
  bktPvt.rotation.x = EXC.bktAng;

  // 버킷 C-형 (후벽 + 바닥 + 측벽)
  box(1.14, 0.72, 0.12, STEEL, 0, -0.18,  0.00, bktPvt); // 후벽
  box(1.14, 0.12, 0.82, STEEL, 0, -0.58,  0.38, bktPvt); // 바닥 (앞쪽)
  box(0.10, 0.72, 0.90, STEEL, -0.54, -0.22, 0.42, bktPvt); // 좌 측벽
  box(0.10, 0.72, 0.90, STEEL,  0.54, -0.22, 0.42, bktPvt); // 우 측벽
  box(1.18, 0.09, 0.10, BLACK, 0, -0.60, 0.80, bktPvt); // 커팅엣지

  // 버킷 이빨 6개 (베이스 + 팁)
  for (let i = -2; i <= 2; i++) {
    box(0.09, 0.13, 0.22, STEEL, i * 0.20, -0.66, 0.82, bktPvt);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.17, 4), BLACK);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(i * 0.20, -0.66, 1.01);
    bktPvt.add(tip);
  }

  // 버킷 링크 로드 (아암-버킷 연결 시각)
  cyl(0.038, 0.038, 0.82, 8, CHROME, 0, 0.24, 0.44, 0.60, undefined, bktPvt);

  // 콜라이더
  GAME.colliders = GAME.colliders || [];
  GAME.colliders.push(engCover, cw);
}

// ── 덤프트럭 메시 (상세) ──────────────────────────────────────
function _buildDumpTruckMesh() {
  const ORANGE = new THREE.MeshStandardMaterial({ color: 0xCC4010, roughness: 0.58, metalness: 0.35 });
  const STEEL  = new THREE.MeshStandardMaterial({ color: 0x484440, roughness: 0.70, metalness: 0.58 });
  const BLACK  = new THREE.MeshStandardMaterial({ color: 0x151210, roughness: 0.90, metalness: 0.08 });
  const GLASS  = new THREE.MeshStandardMaterial({ color: 0x90C8E0, transparent: true, opacity: 0.40, roughness: 0.04 });
  const CHROME = new THREE.MeshStandardMaterial({ color: 0xB8B8B8, roughness: 0.06, metalness: 0.96 });

  const g = new THREE.Group();

  // — 캐빈 —
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.60, 2.30, 2.40), ORANGE);
  cabBody.position.set(-2.30, 1.55, 0);
  cabBody.castShadow = true;
  g.add(cabBody);

  // 캐빈 전면 유리
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.20, 1.40), GLASS);
  ws.position.set(-3.62, 1.80, 0);
  ws.rotation.y = -Math.PI / 2;
  g.add(ws);

  // 캐빈 측면 창
  const cws = new THREE.Mesh(new THREE.PlaneGeometry(1.80, 1.20), GLASS);
  cws.position.set(-2.30, 1.80, 1.22);
  g.add(cws);

  // 배기관
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.20, 10), STEEL);
  exhaust.position.set(-1.30, 2.95, -0.80);
  g.add(exhaust);
  const exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 10), STEEL);
  exhaustCap.position.set(-1.30, 3.57, -0.80);
  g.add(exhaustCap);

  // — 섀시 프레임 —
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(9.20, 0.28, 1.20), STEEL);
  chassis.position.set(0.20, 0.50, 0);
  g.add(chassis);

  // — 덤프 베드 —
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(5.20, 0.18, 2.40), STEEL);
  bedFloor.position.set(1.30, 1.00, 0);
  bedFloor.castShadow = true;
  g.add(bedFloor);

  // 베드 측벽 (좌우)
  [-1.22, 1.22].forEach(dz => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(5.20, 0.90, 0.12), STEEL);
    sw.position.set(1.30, 1.50, dz);
    sw.castShadow = true;
    g.add(sw);
  });
  // 베드 전벽
  const fw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.90, 2.44), STEEL);
  fw.position.set(-1.22, 1.50, 0);
  g.add(fw);
  // 베드 후판 (열림 가능) — 닫힌 상태
  const tailgate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.90, 2.44), STEEL);
  tailgate.position.set(3.82, 1.50, 0);
  g.add(tailgate);

  // 유압 리프트 실린더 (베드 아래)
  const liftCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.10, 10), STEEL);
  liftCyl.rotation.x = -0.40;
  liftCyl.position.set(0.80, 0.75, 0);
  g.add(liftCyl);
  const liftRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.70, 8), CHROME);
  liftRod.rotation.x = -0.40;
  liftRod.position.set(0.80, 1.12, 0);
  g.add(liftRod);

  // — 바퀴 6개 (앞 2 + 뒤 4) —
  const TYRE = new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.92, metalness: 0.04 });
  const RIM  = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.30, metalness: 0.70 });

  [[-1.80, 1.25], [-1.80, -1.25],
   [ 1.60, 1.42], [ 1.60, -1.42],
   [ 2.80, 1.42], [ 2.80, -1.42]].forEach(([x, z]) => {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.40, 16), TYRE);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(x, 0.56, z);
    tyre.castShadow = true;
    g.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.44, 14), RIM);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, 0.56, z);
    g.add(rim);
  });

  g.position.set(28, 0, -13);
  g.rotation.y = Math.PI;
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
