// Player avatar — 기하학 캐릭터 (안전모·조끼·팔다리) + 들고 있는 도구
// TPS 모드에서 가시화, FPS 모드에서는 도구만 카메라 앞에 표시.

const AVATAR = {
  group:       null,
  body:        null,
  head:        null,
  rightHand:   null,
  detector:    null,   // 매설물 탐지기 메시
  vmDetector:  null,   // FPS 뷰모델 (카메라에 부착)
};

function initAvatar() {
  const helmetMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
  const skinMat   = new THREE.MeshLambertMaterial({ color: 0xE8B894 });
  const vestMat   = new THREE.MeshLambertMaterial({ color: 0xFF6F00 });
  const pantMat   = new THREE.MeshLambertMaterial({ color: 0x2E3A4A });
  const bootMat   = new THREE.MeshLambertMaterial({ color: 0x1A1A1A });

  const g = new THREE.Group();

  // 머리 + 헬멧
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
  head.position.set(0, 1.62, 0);
  head.castShadow = true;
  g.add(head);
  AVATAR.head = head;

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
  helmet.position.set(0, 1.68, 0);
  helmet.castShadow = true;
  g.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.025, 18), helmetMat);
  brim.position.set(0, 1.62, 0);
  g.add(brim);

  // 몸통 (안전조끼)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.26), vestMat);
  torso.position.set(0, 1.18, 0);
  torso.castShadow = true;
  g.add(torso);
  AVATAR.body = torso;
  // 반사 테이프 (조끼 2줄)
  const tapeMat = new THREE.MeshLambertMaterial({ color: 0xDDDDDD });
  [1.05, 1.25].forEach(ty => {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.05, 0.27), tapeMat);
    tape.position.set(0, ty, 0);
    g.add(tape);
  });

  // 팔 (어깨에서 손까지)
  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.28, 1.18, 0);
  g.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.28, 1.18, 0);
  rightArm.castShadow = true;
  g.add(rightArm);

  // 오른손 슬롯 (도구 부착 위치)
  const rightHand = new THREE.Group();
  rightHand.position.set(0.32, 0.95, 0.05);
  g.add(rightHand);
  AVATAR.rightHand = rightHand;

  // 다리
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8);
  [-0.12, 0.12].forEach(dx => {
    const leg = new THREE.Mesh(legGeo, pantMat);
    leg.position.set(dx, 0.55, 0);
    leg.castShadow = true;
    g.add(leg);
  });
  // 부츠
  [-0.12, 0.12].forEach(dx => {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.22), bootMat);
    boot.position.set(dx, 0.16, 0.02);
    g.add(boot);
  });

  GAME.scene.add(g);
  AVATAR.group = g;
  g.visible = false;  // 게임 시작 후 첫 프레임에 mode 따라 결정

  // 매설물 탐지기 도구 (오른손에 부착)
  _buildDetectorTool();
  // FPS 뷰모델용 탐지기 (카메라에 부착)
  _buildDetectorViewmodel();
}

function _buildDetectorTool() {
  // 노란 손잡이 + 검은 본체 + 안테나
  const handleMat = new THREE.MeshLambertMaterial({ color: 0xE8C418 });
  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x2A2620 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00FFAA });
  const antMat    = new THREE.MeshLambertMaterial({ color: 0x6E6A60 });

  const tool = new THREE.Group();
  // 손잡이
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 10), handleMat);
  grip.position.set(0, -0.08, 0);
  tool.add(grip);
  // 본체
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), bodyMat);
  body.position.set(0, 0.05, 0);
  tool.add(body);
  // 화면 (녹색 픽셀)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), screenMat);
  screen.position.set(0, 0.06, 0.041);
  tool.add(screen);
  // 안테나 (긴 막대)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), antMat);
  antenna.position.set(0, 0.32, 0);
  tool.add(antenna);
  // 디스크 (바닥 — 탐지 감지부)
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16), bodyMat);
  disk.position.set(0, 0.58, 0);
  tool.add(disk);

  tool.rotation.z = -0.15;
  tool.visible = false;
  AVATAR.rightHand.add(tool);
  AVATAR.detector = tool;
}

function _buildDetectorViewmodel() {
  // FPS 카메라에 부착되는 동일 형태 (작게)
  const handleMat = new THREE.MeshLambertMaterial({ color: 0xE8C418 });
  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x2A2620 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00FFAA });
  const antMat    = new THREE.MeshLambertMaterial({ color: 0x6E6A60 });

  const tool = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), handleMat);
  grip.position.set(0, -0.07, 0);
  tool.add(grip);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.07), bodyMat);
  body.position.set(0, 0.05, 0);
  tool.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), screenMat);
  screen.position.set(0, 0.06, 0.036);
  tool.add(screen);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.50, 8), antMat);
  antenna.position.set(0, 0.30, 0);
  tool.add(antenna);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 16), bodyMat);
  disk.position.set(0, 0.54, 0);
  tool.add(disk);

  // 카메라 우측 하단에 고정 — frustum 안에 위치
  tool.position.set(0.34, -0.32, -0.78);
  tool.rotation.set(-0.15, 0.05, -0.10);
  tool.visible = false;

  GAME.camera.add(tool);
  GAME.scene.add(GAME.camera);  // 카메라 자체를 씬에 add 해야 attached child가 렌더됨
  AVATAR.vmDetector = tool;
}

function updateAvatar() {
  if (!AVATAR.group || !PLAYER || !PLAYER.worldPos) return;

  // 위치·회전 동기 (점프·낙하 시 Y 도 같이 움직임)
  AVATAR.group.position.set(PLAYER.worldPos.x, PLAYER.worldPos.y || 0, PLAYER.worldPos.z);
  AVATAR.group.rotation.y = PLAYER.euler.y + Math.PI;

  // 카메라 모드 분기
  if (PLAYER.camMode === 'tps') {
    AVATAR.group.visible = true;
    if (AVATAR.vmDetector) AVATAR.vmDetector.visible = false;
  } else if (PLAYER.camMode === 'fps') {
    AVATAR.group.visible = false;
    // FPS 에서는 들고 있는 도구만 카메라 앞에
    if (AVATAR.vmDetector) {
      AVATAR.vmDetector.visible = typeof SURVEY !== 'undefined' && SURVEY.active;
    }
  } else {
    // fixed
    AVATAR.group.visible = true;
    if (AVATAR.vmDetector) AVATAR.vmDetector.visible = false;
  }

  // 들고 있는 도구 가시화 (TPS 에서 오른손에 잡힘)
  if (AVATAR.detector) {
    AVATAR.detector.visible = typeof SURVEY !== 'undefined' && SURVEY.active && PLAYER.camMode === 'tps';
  }
}
