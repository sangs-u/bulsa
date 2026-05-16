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

// GLB 원본 클립명 → 실제 모션 기준 새 이름 (로드 직후 in-memory rename)
// GLB 파일은 그대로, AnimationGroup.name만 바꿔서 코드는 새 이름으로 호출
const _RENAME = {
  'Running':                          'idle',           // 대기
  'Ladder_Mount_Start':               'walk',           // 걷기
  'Ladder_Climb_Loop':                'run',            // 뛰기
  'Heavy_Hammer_Swing':               'sprint',         // 빠르게 뛰기
  'Carry_Heavy_Object_Walk':          'carry',          // 물건 들고 이동
  'Walking':                          'push',           // 밀기
  'falling_down':                     'jump',           // 점프
  'Collect_Object':                   'jump_obstacle',  // 장애물 뛰어넘기
  'Idle_02':                          'fall',           // 추락
  'Limping_Walk':                     'trip',           // 넘어지기
  'Climb_Attempt_and_Fall_5':         'hammer',         // 망치질
  'Chair_Sit_Idle_M':                 'interact',       // 상호작용 조작
  'Injured_Walk':                     'throw',          // 던지기
  'Regular_Jump':                     'injured_light',  // 경상
  'Jump_Over_Obstacle':               'injured_heavy',  // 중상
  'Push_and_Walk_Forward':            'climb_start',    // 사다리 오르기 처음
  'Female_Crouch_Pick_Throw_Forward': 'climb_full',     // 사다리 타고 올라가기
  'Ladder_Climb_Finish':              'climb_finish',   // 사다리 완료
  'Run_02':                           'sit_idle',       // 앉아서 대기
  'Breakdance_1990':                  'breakdance',     // 브레이크댄스
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

    // AnimationGroup.name을 원본 GLB명 → 실제 모션 기준 새 이름으로 갈아치움
    result.animationGroups.forEach(function(ag) {
      try { ag.stop(); ag.reset(); } catch(e) {}
      const newName = _RENAME[ag.name];
      if (newName) ag.name = newName;
      else console.warn('[CHARACTER] 매핑 없는 원본 클립:', ag.name);
      CHARACTER.anims[ag.name] = ag;
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

  // 단순화: 들고 있어도 그냥 걷기/뛰기 모션 사용
  let next = 'idle';
  if (typeof PLAYER !== 'undefined') {
    const k  = PLAYER.keys || {};
    const jx = PLAYER.joy ? PLAYER.joy.x : 0;
    const jy = PLAYER.joy ? PLAYER.joy.y : 0;
    const moving = k.w || k.a || k.s || k.d || Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1;
    if (moving) {
      // 들고 있을 땐 뛸 수 없음 (walk만)
      const holding = typeof CARRY !== 'undefined' && CARRY.held;
      next = (k.shift && !holding) ? 'run' : 'walk';
    }
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
