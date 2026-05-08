// GLB character system
// worker.glb: Idle / Walk / Run 클립 포함 단일 파일
// URL을 WORKER_GLB_URL 상수만 바꾸면 전체 NPC에 적용됨

const WORKER_GLB_URL = 'assets/worker.glb'; // ← GLB 준비되면 이 경로만 교체

let _workerGLB   = null;   // 로드된 GLTF 객체 (캐시)
let _loadPending = [];     // 로드 완료 전 대기 콜백

function preloadCharacter(onReady) {
  // 이미 로드됨
  if (_workerGLB) { onReady(_workerGLB); return; }

  // 이미 로딩 중 — 콜백 대기열에 추가
  if (_loadPending !== null) {
    _loadPending.push(onReady);
    if (_loadPending.length > 1) return; // 중복 로드 방지
  }

  if (typeof THREE.GLTFLoader === 'undefined') {
    console.warn('[character] GLTFLoader 미로드 — 기하학 폴백 사용');
    onReady(null); return;
  }

  const loader = new THREE.GLTFLoader();
  loader.load(
    WORKER_GLB_URL,
    (gltf) => {
      _workerGLB = gltf;
      const pending = _loadPending.slice();
      _loadPending  = [];
      pending.forEach(cb => cb(gltf));
    },
    undefined,
    (err) => {
      console.warn('[character] GLB 로드 실패 — 기하학 폴백 사용:', err.message || err);
      const pending = _loadPending.slice();
      _loadPending  = [];
      pending.forEach(cb => cb(null));
    }
  );
}

function spawnCharacter(position) {
  if (!_workerGLB) return null;

  // SkeletonUtils.clone으로 독립적인 인스턴스 생성
  const Clone = (typeof THREE.SkeletonUtils !== 'undefined')
    ? THREE.SkeletonUtils
    : null;

  const group = Clone
    ? Clone.clone(_workerGLB.scene)
    : _workerGLB.scene.clone(true);

  group.position.set(...position);
  group.scale.setScalar(1.0); // Meshy/Mixamo 결과물 스케일에 맞게 조정
  group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  GAME.scene.add(group);

  // AnimationMixer + 클립 이름 매핑
  const mixer   = new THREE.AnimationMixer(group);
  const actions = {};
  _workerGLB.animations.forEach(clip => {
    actions[clip.name] = mixer.clipAction(clip);
  });

  return { group, mixer, actions, current: null };
}
