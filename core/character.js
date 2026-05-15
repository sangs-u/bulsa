// character.js — GLB 캐릭터 플레이어 비주얼 + 애니메이션 상태머신
// 캡슐(GAME.player)은 이동 프록시(invisible), GLB가 실제 캐릭터

const CHARACTER = {
  root:      null,
  skeleton:  null,
  anims:     { idle: null, walk: null, carry: null },
  state:     'none',
  loaded:    false,
};

const _CHAR_BASE = 'assets/glb/character/';

window.addEventListener('game:ready', function() {
  _loadAllCharacter();
});

async function _loadAllCharacter() {
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', _CHAR_BASE, 'ldle.glb', GAME.scene
    );

    console.log('[CHARACTER] mesh names:', result.meshes.map(function(m) { return m.name; }));

    const root = result.meshes[0];
    CHARACTER.root     = root;
    CHARACTER.skeleton = result.skeletons[0] || null;

    result.meshes.forEach(function(m) { _applyColor(m); });

    if (result.animationGroups && result.animationGroups.length > 0) {
      const idleAg = result.animationGroups[0];
      idleAg.stop();
      CHARACTER.anims.idle = idleAg;
    }

    await _loadExtraAnim('walking.glb', 'walk');
    await _loadExtraAnim('pickup.glb',  'carry');

    CHARACTER.loaded = true;

    // 현재 플레이어에 부착
    if (GAME.player) _attachToPlayer(GAME.player);

    if (CHARACTER.anims.idle) CHARACTER.anims.idle.play(true);
    CHARACTER.state = 'idle';

    GAME.scene.onBeforeRenderObservable.add(_charTick);

  } catch (e) {
    console.warn('[CHARACTER] GLB 로드 실패 — 캡슐 유지:', e.message);
  }
}

/* ─── 플레이어 캡슐에 GLB 부착 ──────────────────────────── */
function _attachToPlayer(player) {
  CHARACTER.root.parent   = player;
  CHARACTER.root.position = new BABYLON.Vector3(0, -0.85, 0); // 발 위치 보정
  CHARACTER.root.rotation = new BABYLON.Vector3(0, Math.PI, 0); // 전면 보정
  CHARACTER.root.scaling  = new BABYLON.Vector3(1, 1, 1);
  player.isVisible = false;

  // 캡슐 dispose 시 GLB 분리 (scene 전환 대응)
  player.onDisposeObservable.addOnce(function() {
    if (CHARACTER.root) CHARACTER.root.parent = null;
  });
}

/* ─── 매 프레임 ──────────────────────────────────────────── */
function _charTick() {
  if (!CHARACTER.loaded || !CHARACTER.root) return;
  if (!GAME.player) return;

  // scene 전환 후 새 캡슐에 재부착
  if (CHARACTER.root.parent !== GAME.player) {
    _attachToPlayer(GAME.player);
  }

  // 애니메이션 상태 결정
  var next = 'idle';
  if (typeof CARRY !== 'undefined' && CARRY.held) {
    next = 'carry';
  } else if (typeof PLAYER !== 'undefined') {
    const k  = PLAYER.keys;
    const jx = PLAYER.joy ? PLAYER.joy.x : 0;
    const jy = PLAYER.joy ? PLAYER.joy.y : 0;
    if (k.w || k.a || k.s || k.d || Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1) {
      next = 'walk';
    }
  }

  if (next === CHARACTER.state) return;
  CHARACTER.state = next;

  Object.keys(CHARACTER.anims).forEach(function(k) {
    const ag = CHARACTER.anims[k];
    if (!ag) return;
    if (k === next) ag.play(true);
    else ag.stop();
  });
}

/* ─── 색상 적용 ──────────────────────────────────────────── */
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

/* ─── 추가 애니메이션 리타깃 로드 ───────────────────────── */
async function _loadExtraAnim(file, key) {
  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
      _CHAR_BASE, file, GAME.scene
    );
    const srcAg = container.animationGroups && container.animationGroups[0];
    if (!srcAg) { container.dispose(); return; }

    if (CHARACTER.skeleton) {
      const newAg = new BABYLON.AnimationGroup(key, GAME.scene);
      srcAg.targetedAnimations.forEach(function(ta) {
        const bone = CHARACTER.skeleton.bones.find(function(b) {
          return b.name === ta.target.name;
        });
        if (bone) newAg.addTargetedAnimation(ta.animation, bone);
      });
      newAg.normalize();
      newAg.stop();
      CHARACTER.anims[key] = newAg;
      container.meshes.forEach(function(m) {
        try { m.dispose(false, true); } catch (err) {}
      });
    } else {
      container.addAllToScene();
      srcAg.stop();
      CHARACTER.anims[key] = srcAg;
    }
  } catch (e) {
    console.warn('[CHARACTER] 애니메이션 로드 실패:', file, e.message);
  }
}
