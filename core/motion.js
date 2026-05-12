// 모션 시스템 — Mixamo 클립 + 스테이트머신 + IK 도구 어태치
// 사용 흐름:
//   1. Mixamo 에서 Soldier 본 구조에 맞춘 7~10개 클립을 다운로드 → assets/glb/anim_<clip>.glb
//   2. MOTION.preload() 가 모든 클립을 한 번에 로드해 캐시
//   3. NPC.setMotion('hammer') 호출 시 캐시된 AnimationClip 을 mixer 에 부착하여 재생
//   4. MOTION.attachTool(npc, 'hammer.glb') 로 손 본(Hand_R)에 도구 부착

const MOTION = {
  // Mixamo 다운로드 후 assets/glb/ 에 떨어뜨리면 자동 인식 (없으면 Idle/Walk/Run 폴백)
  CLIPS: {
    idle:    { url: 'assets/glb/anim_idle.glb',    fallback: 'Idle' },
    walk:    { url: 'assets/glb/anim_walk.glb',    fallback: 'Walk' },
    run:     { url: 'assets/glb/anim_run.glb',     fallback: 'Run'  },
    hammer:  { url: 'assets/glb/anim_hammer.glb',  fallback: 'Walk' },  // 망치질 — formwork
    weld:    { url: 'assets/glb/anim_weld.glb',    fallback: 'Walk' },  // 용접 — mep
    climb:   { url: 'assets/glb/anim_climb.glb',   fallback: 'Walk' },  // 사다리/비계
    lift:    { url: 'assets/glb/anim_lift.glb',    fallback: 'Walk' },  // 줄걸이 자세
    signal:  { url: 'assets/glb/anim_signal.glb',  fallback: 'Idle' },  // 신호수 손짓
    fall:    { url: 'assets/glb/anim_fall.glb',    fallback: 'Idle' },  // 추락
    inspect: { url: 'assets/glb/anim_inspect.glb', fallback: 'Idle' },  // 점검 (쪼그려 앉음)
  },

  // 도구 GLB — 손에 부착
  TOOLS: {
    hammer:   'assets/glb/tool_hammer.glb',
    welder:   'assets/glb/tool_welder.glb',
    wrench:   'assets/glb/tool_wrench.glb',
    detector: 'assets/glb/tool_detector.glb',
    flag:     'assets/glb/tool_flag.glb',     // 신호수 깃발
  },

  _clipCache: {},  // name → AnimationClip | null
  _toolCache: {},  // name → GLTF | null
  _preloaded: false,
};

// ── Preload (모든 클립 1회) ────────────────────────────────
function preloadMotionClips(onReady) {
  if (MOTION._preloaded) { onReady && onReady(); return; }

  const names = Object.keys(MOTION.CLIPS);
  let pending  = names.length;
  let any      = false;

  if (typeof THREE.GLTFLoader === 'undefined') {
    console.warn('[motion] GLTFLoader 없음 — 모션 시스템 비활성');
    MOTION._preloaded = true;
    onReady && onReady();
    return;
  }
  const loader = new THREE.GLTFLoader();

  // 각 클립 — fetch HEAD 로 사전점검 후 GLTFLoader
  names.forEach(name => {
    const spec = MOTION.CLIPS[name];
    const finish = (clip) => {
      MOTION._clipCache[name] = clip;
      if (clip) any = true;
      pending -= 1;
      if (pending <= 0) {
        MOTION._preloaded = true;
        if (any) console.log('[motion] 추가 클립 로드 완료');
        onReady && onReady();
      }
    };
    // HEAD 점검 — 404 면 즉시 폴백
    fetch(spec.url, { method: 'HEAD' })
      .then(r => {
        if (!r || !r.ok) { finish(null); return; }
        loader.load(
          spec.url,
          (gltf) => {
            const clip = gltf.animations && gltf.animations[0];
            if (clip) clip.name = name;
            finish(clip || null);
          },
          undefined,
          () => finish(null)
        );
      })
      .catch(() => finish(null));
  });
}

// ── 도구 미리 로드 ──────────────────────────────────────────
function preloadMotionTools(onReady) {
  const names = Object.keys(MOTION.TOOLS);
  let pending = names.length;
  if (!pending || typeof THREE.GLTFLoader === 'undefined') {
    onReady && onReady();
    return;
  }
  const loader = new THREE.GLTFLoader();
  names.forEach(name => {
    const url = MOTION.TOOLS[name];
    fetch(url, { method: 'HEAD' })
      .then(r => {
        if (!r || !r.ok) { MOTION._toolCache[name] = null; if (--pending <= 0) onReady && onReady(); return; }
        loader.load(
          url,
          (gltf) => { MOTION._toolCache[name] = gltf; if (--pending <= 0) onReady && onReady(); },
          undefined,
          () => { MOTION._toolCache[name] = null; if (--pending <= 0) onReady && onReady(); }
        );
      })
      .catch(() => { MOTION._toolCache[name] = null; if (--pending <= 0) onReady && onReady(); });
  });
}

// ── NPC 캐릭터에 모션 적용 ──────────────────────────────────
// char: { group, mixer, actions, current } — character.js spawnCharacter 의 결과
function setMotion(char, motionName, fadeIn) {
  if (!char || !char.mixer) return;
  fadeIn = fadeIn != null ? fadeIn : 0.3;

  const spec = MOTION.CLIPS[motionName];
  let clipName = motionName;

  if (spec) {
    const cached = MOTION._clipCache[motionName];
    if (cached) {
      // 외부 클립 (Mixamo 다운로드 성공) — mixer 에 신규 동적 추가
      if (!char.actions[motionName]) {
        char.actions[motionName] = char.mixer.clipAction(cached);
      }
    } else {
      // 폴백 — 내장 Idle/Walk/Run 중 매핑된 것 사용
      clipName = spec.fallback;
    }
  }

  if (!char.actions[clipName]) return;
  if (char.current === clipName) return;

  const prev = char.current ? char.actions[char.current] : null;
  const next = char.actions[clipName];
  if (prev) prev.fadeOut(fadeIn);
  next.reset().fadeIn(fadeIn).play();
  char.current = clipName;
}

// ── 손에 도구 부착 (IK) ─────────────────────────────────────
// char.group 에서 손 본을 찾아 GLB 도구를 add(). Soldier.glb 의 손 본 이름은 'mixamorig8RightHand'
// 다른 GLB 의 경우 BONE_CANDIDATES 가 자동 탐색
const BONE_CANDIDATES = [
  'mixamorig8RightHand',
  'mixamorig7RightHand',
  'mixamorig6RightHand',
  'mixamorigRightHand',
  'RightHand',
  'Hand_R',
  'hand_R',
];

function attachTool(char, toolName, options) {
  if (!char || !char.group) return null;
  options = options || {};

  const gltf = MOTION._toolCache[toolName];
  if (!gltf) {
    // 폴백 — 작은 박스를 손에 부착
    return attachFallbackTool(char, toolName, options);
  }

  // 손 본 탐색
  let hand = null;
  for (const cand of BONE_CANDIDATES) {
    const b = char.group.getObjectByName(cand);
    if (b) { hand = b; break; }
  }
  if (!hand) {
    // 본 없음 → 폴백
    return attachFallbackTool(char, toolName, options);
  }

  const Clone = (typeof THREE.SkeletonUtils !== 'undefined') ? THREE.SkeletonUtils : null;
  const inst  = Clone ? Clone.clone(gltf.scene) : gltf.scene.clone(true);
  if (options.pos)   inst.position.set(options.pos[0], options.pos[1], options.pos[2]);
  if (typeof options.scale === 'number') inst.scale.setScalar(options.scale);
  hand.add(inst);
  return inst;
}

function attachFallbackTool(char, toolName, options) {
  if (!char || !char.group) return null;
  // 색상 — 도구별
  const colorMap = { hammer: 0x884030, welder: 0x2A4055, wrench: 0x6A6A70, detector: 0x40CC60, flag: 0xDC2626 };
  const color = colorMap[toolName] || 0x808080;
  const mat   = new THREE.MeshLambertMaterial({ color });
  const geom  = toolName === 'flag'
    ? new THREE.PlaneGeometry(0.28, 0.18)
    : new THREE.BoxGeometry(0.04, 0.22, 0.04);
  const tool = new THREE.Mesh(geom, mat);
  tool.castShadow = true;

  // 손 본 탐색
  let hand = null;
  for (const cand of BONE_CANDIDATES) {
    const b = char.group.getObjectByName(cand);
    if (b) { hand = b; break; }
  }
  if (hand) {
    tool.position.set(0, 0.04, 0.06);
    hand.add(tool);
  } else {
    // 본 못 찾음 — 그룹 전방에 임시 배치 (시각적으로만)
    tool.position.set(0.25, 1.0, 0.2);
    char.group.add(tool);
  }
  return tool;
}

// ── 도구 제거 ────────────────────────────────────────────────
function detachTool(toolMesh) {
  if (!toolMesh) return;
  if (toolMesh.parent) toolMesh.parent.remove(toolMesh);
  if (toolMesh.geometry) toolMesh.geometry.dispose();
  if (toolMesh.material) {
    if (Array.isArray(toolMesh.material)) toolMesh.material.forEach(m => m.dispose());
    else toolMesh.material.dispose();
  }
}

window.MOTION              = MOTION;
window.preloadMotionClips  = preloadMotionClips;
window.preloadMotionTools  = preloadMotionTools;
window.setMotion           = setMotion;
window.attachTool          = attachTool;
window.attachFallbackTool  = attachFallbackTool;
window.detachTool          = detachTool;
