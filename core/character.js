// character.js — 통합 GLB 캐릭터 + 20개 애니메이션
// assets/characters/player.glb 단일 파일에 모든 상태 클립 포함 (스켈레톤 공유)

const CHARACTER = {
  root:    null,    // GLB root mesh
  wrapper: null,    // 위치 제어 TransformNode (캡슐 자식)
  anims:   {},      // { stateName: AnimationGroup }
  state:   'none',  // 현재 재생 중인 상태
  loaded:  false,
  _once:   false,   // playOnce 중 플래그
};

const _CHAR_PATH = 'assets/characters/';
const _CHAR_FILE = 'player.glb';

// GLB 클립 이름 → 게임 상태 매핑
const _ANIM_MAP = {
  'Idle_02':                          'idle',
  'Walking':                          'walk',
  'Running':                          'run',
  'Run_02':                           'run2',
  'Carry_Heavy_Object_Walk':          'carry',
  'Regular_Jump':                     'jump',
  'Jump_Over_Obstacle':               'jump_obstacle',
  'Heavy_Hammer_Swing':               'hammer',
  'Collect_Object':                   'pickup',
  'Female_Crouch_Pick_Throw_Forward': 'throw',
  'Push_and_Walk_Forward':            'push',
  'Ladder_Mount_Start':               'climb_start',
  'Ladder_Climb_Loop':                'climb_loop',
  'Ladder_Climb_Finish':              'climb_finish',
  'Climb_Attempt_and_Fall_5':         'climb_fail',
  'Injured_Walk':                     'injured',
  'Limping_Walk':                     'limp',
  'falling_down':                     'fall',
  'Chair_Sit_Idle_M':                 'sit',
  'Breakdance_1990':                  'celebrate',
};

window.addEventListener('game:ready', function() { _loadCharacter(); });

async function _loadCharacter() {
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', _CHAR_PATH, _CHAR_FILE, GAME.scene
    );

    CHARACTER.root = result.meshes[0];

    // 모든 자식 메시에 색상 적용
    result.meshes.forEach(_applyColor);

    // 20개 애니메이션 그룹을 상태 이름으로 매핑
    result.animationGroups.forEach(function(ag) {
      ag.stop();
      const key = _ANIM_MAP[ag.name];
      if (key) CHARACTER.anims[key] = ag;
      else console.log('[CHARACTER] unmapped clip:', ag.name);
    });

    console.log('[CHARACTER] 로드 완료 —', Object.keys(CHARACTER.anims).length, '상태:',
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
  wrapper.position = new BABYLON.Vector3(0, -0.85, 0);  // 발이 바닥에 닿도록
  CHARACTER.wrapper = wrapper;
  CHARACTER.root.parent = wrapper;

  // 캡슐 본체는 숨김, 자식 中 GLB 메시가 아닌 것만 숨김
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

/* ─── 매 프레임 ────────────────────────────────────────── */
function _charTick() {
  if (!CHARACTER.loaded || !CHARACTER.root || !GAME.player) return;
  if (CHARACTER._once) return;  // 단발 애니메이션 재생 중

  // 씬 전환 후 재부착
  if (!CHARACTER.wrapper || CHARACTER.wrapper.parent !== GAME.player) {
    _attachToPlayer(GAME.player);
  }

  // 상태 결정
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

  const ag = CHARACTER.anims[name] || CHARACTER.anims.idle;
  if (!ag) return;

  // 모든 애니메이션 정지 후 새 상태 재생
  Object.keys(CHARACTER.anims).forEach(function(k) {
    const a = CHARACTER.anims[k];
    if (a && a !== ag) a.stop();
  });
  ag.start(true, 1.0, ag.from, ag.to, false);
  CHARACTER.state = name;
}

// 한 번만 재생 후 다음 상태로 복귀
function playOnce(name, afterState) {
  if (!CHARACTER.loaded) return;
  const ag = CHARACTER.anims[name];
  if (!ag) {
    setState(afterState || 'idle');
    return;
  }
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

/* ─── 색상 적용 (PBR) ──────────────────────────────────── */
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
