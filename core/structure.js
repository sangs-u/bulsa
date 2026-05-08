// Structure generation system
// 공정 완료 시 구조물 단계별 생성

const STRUCTURE_STAGES = [
  { id: 'column_1f', y: 3.5, desc: '1층 기둥 거치 완료', descEn: '1F Column Placed' },
  { id: 'slab_1f',   y: 4.0, desc: '1층 슬라브 거치 완료', descEn: '1F Slab Placed' },
];

function initStructure() {
  // 현재는 씬 내 기존 구조물 참조
  GAME._structureStage = 0;
}

// Phase 6 완료 시 호출
function spawnStructure() {
  const stage = STRUCTURE_STAGES[GAME._structureStage];
  if (!stage) return;

  // RC보가 목표 위치에 거치되는 파티클 + 효과
  _flashSuccess();
  _spawnBeamParticles();

  // 목표 마커 제거
  if (GAME._liftTarget) {
    GAME.scene.remove(GAME._liftTarget);
    GAME._liftTarget = null;
  }

  // 완료된 구조 단계 메시 생성
  _buildStage(stage);

  GAME._structureStage++;

  // 컷씬 메시지
  showStructureComplete(stage.desc);
}

function _buildStage(stage) {
  // RC보를 목표 위치에 고정 (liftBeam을 그 자리에 고정)
  if (GAME.liftBeam) {
    GAME.liftBeam.position.y = 5.5;
    GAME.liftBeam.position.z = -8;
    GAME.liftBeam.rotation.z = 0;
    // 빔을 씬에 고정 (더 이상 낙하 안함)
    GAME._placedBeams = GAME._placedBeams || [];
    GAME._placedBeams.push(GAME.liftBeam);
    GAME.liftBeam = null; // 원래 참조 해제
  }
}

function _flashSuccess() {
  const overlay = document.getElementById('flash-overlay');
  if (!overlay) return;
  overlay.style.background = 'rgba(0,255,136,0.3)';
  overlay.style.opacity = '0.5';
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.background = ''; }, 500);
  }, 400);
}

function _spawnBeamParticles() {
  const count = 40;
  const geo  = new THREE.SphereGeometry(0.06, 4, 4);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
  const origin = new THREE.Vector3(0, 5.5, -8);

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(origin);
    GAME.scene.add(p);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 6
    );
    let t = 0;
    (function animP() {
      t += 0.016;
      vel.y -= 9.8 * 0.016;
      p.position.addScaledVector(vel, 0.016);
      p.material.opacity = Math.max(0, 1 - t / 1.5);
      p.material.transparent = true;
      if (t < 1.5) requestAnimationFrame(animP);
      else GAME.scene.remove(p);
    })();
  }
}

function showStructureComplete(msg) {
  const el = document.getElementById('structure-complete-msg');
  if (!el) return;
  el.textContent = '🏗 ' + msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
}
