// character.js — 통합 GLB 캐릭터 + 20개 애니메이션
// assets/characters/player.glb 단일 파일에 모든 상태 클립 포함 (스켈레톤 공유)
// 클립 이름을 그대로 상태 키로 사용 (예: 'Walking', 'Running', 'Carry_Heavy_Object_Walk')

const CHARACTER = {
  root:    null,
  wrapper: null,
  anims:   {},      // { [GLB 클립명]: AnimationGroup }
  state:   'none',
  loaded:  false,
  _once:   false,
};

const _CHAR_PATH = 'assets/characters/';
const _CHAR_FILE = 'player.glb';

// 자동 상태 결정용 클립 이름 (GLB 원본 그대로)
const CLIP = {
  IDLE:   'Idle_02',
  WALK:   'Walking',
  RUN:    'Running',
  CARRY:  'Carry_Heavy_Object_Walk',
  JUMP:   'Regular_Jump',
  PICKUP: 'Collect_Object',
};

window.addEventListener('game:ready', function() { _loadCharacter(); });

async function _loadCharacter() {
  try {
    // GLB 로더가 자동 재생하지 않도록 설정 (auto-play 방지)
    BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce(function(plugin) {
      if (plugin.name === 'gltf' && plugin.animationStartMode !== undefined) {
        plugin.animationStartMode = 0; // GLTFLoaderAnimationStartMode.NONE
      }
    });

    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', _CHAR_PATH, _CHAR_FILE, GAME.scene
    );

    CHARACTER.root = result.meshes[0];
    result.meshes.forEach(_applyColor);

    // 모든 클립을 즉시 정지 + reset (안전망)
    result.animationGroups.forEach(function(ag) {
      try { ag.stop(); ag.reset(); } catch(e) {}
      CHARACTER.anims[ag.name] = ag;
    });

    console.log('[CHARACTER] 로드 완료 —', Object.keys(CHARACTER.anims).length, '개 클립:');
    Object.keys(CHARACTER.anims).forEach(function(n) { console.log('  •', n); });

    CHARACTER.loaded = true;

    if (GAME.player) _attachToPlayer(GAME.player);
    setState(CLIP.IDLE);

    GAME.scene.onBeforeRenderObservable.add(_charTick);

  } catch (e) {
    console.error('[CHARACTER] 로드 실패:', e.message || e);
  }
}

/* ─── 플레이어 캡슐에 부착 ─────────────────────────────── */
function _attachToPlayer(player) {
  if (CHARACTER.wrapper) {
    try { CHARACTER.wrapper.dispose(); } catch(e) {}
  }
  const wrapper = new BABYLON.TransformNode('charWrapper', GAME.scene);
  wrapper.parent   = player;
  wrapper.position = new BABYLON.Vector3(0, -0.85, 0);
  CHARACTER.wrapper = wrapper;
  CHARACTER.root.parent = wrapper;

  player.isVisible = false;
  player.getChildMeshes(false).forEach(function(m) {
    if (_isCharMesh(m)) return;
    m.isVisible = false;
  });

  player.onDisposeObservable.addOnce(function() {
    if (CHARACTER.root)    CHARACTER.root.parent = null;
    if (CHARACTER.wrapper) { CHARACTER.wrapper.dispose(); CHARACTER.wrapper = null; }
  });
}

function _isCharMesh(m) {
  if (!CHARACTER.root) return false;
  let node = m;
  while (node) {
    if (node === CHARACTER.root || node === CHARACTER.wrapper) return true;
    node = node.parent;
  }
  return false;
}

/* ─── 매 프레임 자동 상태 결정 ──────────────────────────── */
function _charTick() {
  if (!CHARACTER.loaded || !CHARACTER.root || !GAME.player) return;
  if (CHARACTER._once) return;

  if (!CHARACTER.wrapper || CHARACTER.wrapper.parent !== GAME.player) {
    _attachToPlayer(GAME.player);
  }

  let next = CLIP.IDLE;
  if (typeof CARRY !== 'undefined' && CARRY.held) {
    next = CLIP.CARRY;
  } else if (typeof PLAYER !== 'undefined') {
    const k  = PLAYER.keys || {};
    const jx = PLAYER.joy ? PLAYER.joy.x : 0;
    const jy = PLAYER.joy ? PLAYER.joy.y : 0;
    const moving = k.w || k.a || k.s || k.d || Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1;
    if (moving) next = (k.shift) ? CLIP.RUN : CLIP.WALK;
  }

  setState(next);
}

/* ─── 외부 API ─────────────────────────────────────────── */
function setState(name) {
  if (!CHARACTER.loaded) return;
  if (CHARACTER.state === name) return;

  const ag = CHARACTER.anims[name];
  if (!ag) {
    console.warn('[CHARACTER] 클립 없음:', name);
    return;
  }

  Object.keys(CHARACTER.anims).forEach(function(k) {
    const a = CHARACTER.anims[k];
    if (a && a !== ag) a.stop();
  });
  ag.start(true, 1.0, ag.from, ag.to, false);
  CHARACTER.state = name;
}

function playOnce(name, afterState) {
  if (!CHARACTER.loaded) return;
  const ag = CHARACTER.anims[name];
  if (!ag) { setState(afterState || CLIP.IDLE); return; }

  CHARACTER._once = true;
  Object.keys(CHARACTER.anims).forEach(function(k) {
    const a = CHARACTER.anims[k];
    if (a && a !== ag) a.stop();
  });
  CHARACTER.state = name;
  ag.start(false, 1.0, ag.from, ag.to, false);
  ag.onAnimationEndObservable.addOnce(function() {
    CHARACTER._once = false;
    CHARACTER.state = 'none';
    setState(afterState || CLIP.IDLE);
  });
}

window.CHARACTER_API = { setState: setState, playOnce: playOnce, CLIP: CLIP };

/* ─── 색상 적용 ────────────────────────────────────────── */
function _applyColor(mesh) {
  if (!mesh) return;
  if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;

  const name = (mesh.name || '').toLowerCase();
  const mat  = new BABYLON.PBRMaterial('cMat_' + mesh.uniqueId, GAME.scene);
  mat.roughness = 0.75;
  mat.metallic  = 0.05;

  if (name.includes('hair')) {
    mat.albedoColor = new BABYLON.Color3(0.15, 0.10, 0.08);
  } else if (name.includes('skin') || name.includes('face') || name.includes('head')) {
    mat.albedoColor = new BABYLON.Color3(0.88, 0.72, 0.58);
  } else {
    mat.albedoColor = new BABYLON.Color3(0.12, 0.20, 0.38);
  }
  mesh.material = mat;
}
