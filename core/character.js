// character.js — GLB 캐릭터 플레이어 비주얼 + 애니메이션

const CHARACTER = {
  root:     null,   // GLB __root__ mesh
  wrapper:  null,   // 위치 제어용 TransformNode (캡슐 자식)
  skeleton: null,
  anims:    { idle: null, walk: null, carry: null },
  state:    'none',
  loaded:   false,
};

const _CHAR_BASE = 'assets/glb/character/';

window.addEventListener('game:ready', function() {
  _loadAllCharacter();
});

async function _loadAllCharacter() {
  try {
    // ── 1. 베이스 GLB 로드 ────────────────────────────────
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', _CHAR_BASE, 'ldle.glb', GAME.scene
    );

    // 디버그 — 콘솔에서 mesh 이름 확인 가능
    console.log('[CHARACTER] meshes:', result.meshes.map(function(m) { return m.name; }));
    console.log('[CHARACTER] skeletons:', result.skeletons.length);
    console.log('[CHARACTER] animGroups:', result.animationGroups.map(function(ag) { return ag.name; }));

    CHARACTER.root     = result.meshes[0];
    CHARACTER.skeleton = result.skeletons[0] || null;

    // ── 2. 색상 적용 ──────────────────────────────────────
    result.meshes.forEach(function(m) { _applyColor(m); });

    // ── 3. idle 애니메이션 ────────────────────────────────
    if (result.animationGroups.length > 0) {
      CHARACTER.anims.idle = result.animationGroups[0];
      CHARACTER.anims.idle.stop();
    }

    // ── 4. 추가 애니메이션 로드 ───────────────────────────
    await _loadExtraAnim('walking.glb', 'walk');
    await _loadExtraAnim('pickup.glb',  'carry');

    CHARACTER.loaded = true;

    // ── 5. 플레이어에 부착 ────────────────────────────────
    if (GAME.player) _attachToPlayer(GAME.player);

    if (CHARACTER.anims.idle) CHARACTER.anims.idle.play(true);
    CHARACTER.state = 'idle';

    GAME.scene.onBeforeRenderObservable.add(_charTick);

    console.log('[CHARACTER] 로드 완료');

  } catch (e) {
    console.error('[CHARACTER] 로드 실패:', e.message || e);
  }
}

/* ─── 플레이어에 부착 ────────────────────────────────────── */
function _attachToPlayer(player) {
  // 기존 wrapper 정리
  if (CHARACTER.wrapper) {
    try { CHARACTER.wrapper.dispose(); } catch(e) {}
  }

  // wrapper TransformNode — GLB root의 internal transform을 건드리지 않음
  const wrapper = new BABYLON.TransformNode('charWrapper', GAME.scene);
  wrapper.parent   = player;
  wrapper.position = new BABYLON.Vector3(0, -0.85, 0); // 발 위치 = 캡슐 중심 아래
  CHARACTER.wrapper = wrapper;

  // GLB root를 wrapper에 부착 — position/rotation은 건드리지 않음
  CHARACTER.root.parent = wrapper;

  console.log('[CHARACTER] 부착됨 — player pos:', player.position);

  // 캡슐 + 자식(playerWater 등) 숨김
  player.isVisible = false;
  player.getChildMeshes(false).forEach(function(m) {
    if (_isCharMesh(m)) return; // GLB 메시는 건드리지 않음
    m.isVisible = false;
  });

  // 캡슐 dispose 시 GLB 분리 보존
  player.onDisposeObservable.addOnce(function() {
    if (CHARACTER.root)    CHARACTER.root.parent = null;
    if (CHARACTER.wrapper) { CHARACTER.wrapper.dispose(); CHARACTER.wrapper = null; }
  });
}

function _isCharMesh(m) {
  if (!CHARACTER.root) return false;
  if (m === CHARACTER.root) return true;
  var node = m.parent;
  while (node) {
    if (node === CHARACTER.root || node === CHARACTER.wrapper) return true;
    node = node.parent;
  }
  return false;
}

/* ─── 매 프레임 ──────────────────────────────────────────── */
function _charTick() {
  if (!CHARACTER.loaded || !CHARACTER.root) return;
  if (!GAME.player) return;

  // 씬 전환 후 새 플레이어에 재부착
  if (!CHARACTER.wrapper || CHARACTER.wrapper.parent !== GAME.player) {
    _attachToPlayer(GAME.player);
  }

  // 애니메이션 상태
  var next = 'idle';
  if (typeof CARRY !== 'undefined' && CARRY.held) {
    next = 'carry';
  } else if (typeof PLAYER !== 'undefined') {
    var k  = PLAYER.keys;
    var jx = PLAYER.joy ? PLAYER.joy.x : 0;
    var jy = PLAYER.joy ? PLAYER.joy.y : 0;
    if (k.w || k.a || k.s || k.d || Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1) {
      next = 'walk';
    }
  }

  if (next === CHARACTER.state) return;
  CHARACTER.state = next;

  Object.keys(CHARACTER.anims).forEach(function(k) {
    var ag = CHARACTER.anims[k];
    if (!ag) return;
    if (k === next) ag.play(true);
    else ag.stop();
  });
}

/* ─── 색상 적용 ──────────────────────────────────────────── */
function _applyColor(mesh) {
  if (!mesh) return;
  if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;

  var name = (mesh.name || '').toLowerCase();
  var mat  = new BABYLON.PBRMaterial('cMat_' + mesh.uniqueId, GAME.scene);
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

/* ─── 추가 애니메이션 리타깃 로드 ───────────────────────── */
async function _loadExtraAnim(file, key) {
  try {
    // ImportMeshAsync: 오브젝트가 씬에 실제로 추가되어야 retarget 가능
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', _CHAR_BASE, file, GAME.scene
    );
    const srcAg = result.animationGroups && result.animationGroups[0];
    if (!srcAg) {
      result.meshes.forEach(function(m) { try { m.dispose(); } catch(e) {} });
      return;
    }
    srcAg.stop();

    // Babylon.js GLB 스키닝은 Bone이 아니라 Bone에 연결된 TransformNode를 통해 mesh를 변형함.
    // linked TransformNode 우선 맵 구성
    var linkedTnMap = {};
    if (CHARACTER.skeleton) {
      CHARACTER.skeleton.bones.forEach(function(b) {
        var tn = b.getTransformNode ? b.getTransformNode() : null;
        if (tn) linkedTnMap[b.name] = tn;
      });
    }

    // fallback: CHARACTER.root 자식 TransformNode 맵
    var childTnMap = {};
    if (CHARACTER.root) {
      CHARACTER.root.getChildTransformNodes(false).forEach(function(n) {
        childTnMap[n.name] = n;
      });
    }

    var newAg = new BABYLON.AnimationGroup(key, GAME.scene);
    var matched = 0, unmatched = [];

    srcAg.targetedAnimations.forEach(function(ta) {
      var name = ta.target ? ta.target.name : '';
      // 우선순위: linked TN → root 자식 TN
      var target = linkedTnMap[name] || childTnMap[name] || null;
      if (target) {
        newAg.addTargetedAnimation(ta.animation, target);
        matched++;
      } else {
        unmatched.push(name);
      }
    });

    var sampleSrc = srcAg.targetedAnimations[0] ? srcAg.targetedAnimations[0].target.name : 'none';
    var linkedSample = Object.keys(linkedTnMap)[0] || 'no-linked-tn';
    console.log('[CHARACTER] retarget', key, ':', matched, '/', srcAg.targetedAnimations.length,
      '| srcSample:', sampleSrc, '| linkedTnSample:', linkedSample);
    if (unmatched.length > 0) console.log('[CHARACTER] unmatched (first 3):', unmatched.slice(0, 3));

    if (matched > 0) {
      newAg.normalize();
      newAg.stop();
      CHARACTER.anims[key] = newAg;
    }

    // 이 GLB의 여분 mesh·skeleton 정리
    result.meshes.forEach(function(m) { try { m.dispose(); } catch(e) {} });
    result.skeletons.forEach(function(s) { try { s.dispose(); } catch(e) {} });

  } catch (e) {
    console.warn('[CHARACTER] 애니메이션 로드 실패:', file, e.message);
  }
}
