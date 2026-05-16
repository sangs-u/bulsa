// character.js — 통합 GLB 캐릭터 + 20개 애니메이션
// assets/characters/player.glb — 클립 이름과 실제 모션이 다름 (Mixamo 원본명 유지)
// 게임 상태 이름 → 실제 GLB 클립명 매핑

const CHARACTER = {
  root:    null,
  wrapper: null,
  anims:   {},      // { [게임 상태명]: AnimationGroup }
  state:   'none',
  loaded:  false,
  _once:   false,
};

const _CHAR_PATH = 'assets/characters/';
const _CHAR_FILE = 'player.glb';

// 게임 상태 → 실제 GLB 클립 이름 매핑
// (사용자 매핑표 — 이름은 Mixamo 원본이지만 실제 모션은 아래 한국어 주석대로)
const _CLIP_MAP = {
  idle:           'Running',                          // 대기
  walk:           'Ladder_Mount_Start',               // 걷기
  run:            'Ladder_Climb_Loop',                // 뛰기
  sprint:         'Heavy_Hammer_Swing',               // 빠르게 뛰기
  carry:          'Carry_Heavy_Object_Walk',          // 물건 들고 이동
  push:           'Walking',                          // 밀기
  jump:           'falling_down',                     // 점프
  jump_obstacle:  'Collect_Object',                   // 장애물 뛰어넘기
  fall:           'Idle_02',                          // 추락
  trip:           'Limping_Walk',                     // 넘어지기
  hammer:         'Climb_Attempt_and_Fall_5',         // 망치질
  interact:       'Chair_Sit_Idle_M',                 // 상호작용 조작
  throw:          'Injured_Walk',                     // 던지기
  injured_light:  'Regular_Jump',                     // 경상
  injured_heavy:  'Jump_Over_Obstacle',               // 중상
  climb_start:    'Push_and_Walk_Forward',            // 사다리 오르기 처음 모습
  climb_full:     'Female_Crouch_Pick_Throw_Forward', // 사다리 타고 올라가기
  climb_finish:   'Ladder_Climb_Finish',              // 사다리 타고 올라가기 (완료)
  sit_idle:       'Run_02',                           // 앉아서 대기
  breakdance:     'Breakdance_1990',                  // 브레이크댄스
};

window.addEventListener('game:ready', function() { _loadCharacter(); });

async function _loadCharacter() {
  try {
    // GLB 로더가 자동 재생하지 않도록 설정
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

    // GLB 클립명 → AnimationGroup 임시 맵
    const byClip = {};
    result.animationGroups.forEach(function(ag) {
      try { ag.stop(); ag.reset(); } catch(e) {}
      byClip[ag.name] = ag;
    });

    // 게임 상태명으로 매핑 저장
    Object.keys(_CLIP_MAP).forEach(function(state) {
      const clipName = _CLIP_MAP[state];
      const ag = byClip[clipName];
      if (ag) CHARACTER.anims[state] = ag;
      else console.warn('[CHARACTER] 누락된 클립:', clipName, '(상태:', state + ')');
    });

    console.log('[CHARACTER] 로드 완료 —', Object.keys(CHARACTER.anims).length, '개 상태:',
      Object.keys(CHARACTER.anims).join(', '));

    CHARACTER.loaded = true;

    if (GAME.player) _attachToPlayer(GAME.player);
    setState('idle');

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

  let next = 'idle';
  if (typeof CARRY !== 'undefined' && CARRY.held) {
    next = 'carry';
  } else if (typeof PLAYER !== 'undefined') {
    const k  = PLAYER.keys || {};
    const jx = PLAYER.joy ? PLAYER.joy.x : 0;
    const jy = PLAYER.joy ? PLAYER.joy.y : 0;
    const moving = k.w || k.a || k.s || k.d || Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1;
    if (moving) next = (k.shift) ? 'run' : 'walk';
  }

  setState(next);
}

/* ─── 외부 API ─────────────────────────────────────────── */
function setState(name) {
  if (!CHARACTER.loaded) return;
  if (CHARACTER.state === name) return;

  const ag = CHARACTER.anims[name];
  if (!ag) {
    console.warn('[CHARACTER] 상태 없음:', name);
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
  if (!ag) { setState(afterState || 'idle'); return; }

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
    setState(afterState || 'idle');
  });
}

window.CHARACTER_API = { setState: setState, playOnce: playOnce };

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
