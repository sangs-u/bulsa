// npc.js — NPC 팀원 시스템 (GLB 캐릭터 + 등급·피로도·언어장벽·실수율)

/* ─── 팀원 정의 ──────────────────────────────────────────── */
const NPC_DEFS = [
  { id: 0, name: '김철수', grade: 'expert',  skill: 0.85, languageGap: 0.0, pos: [-4.5, 0.85,  0.5] },
  { id: 1, name: '이영수', grade: 'semi',    skill: 0.65, languageGap: 0.0, pos: [ 4.5, 0.85,  0.5] },
  { id: 2, name: '박신입', grade: 'newbie',  skill: 0.40, languageGap: 0.0, pos: [-1.5, 0.85,  3.5] },
  { id: 3, name: '응우옌', grade: 'foreign', skill: 0.55, languageGap: 0.4, pos: [ 1.5, 0.85,  3.5] },
];

const NPC_BODY_COLORS = [
  new BABYLON.Color3(0.85, 0.32, 0.05),
  new BABYLON.Color3(0.75, 0.62, 0.10),
  new BABYLON.Color3(0.30, 0.45, 0.60),
  new BABYLON.Color3(0.35, 0.60, 0.15),
];

const HELMET_COLOR_MAP = {
  expert:  new BABYLON.Color3(0.553, 0.776, 0.247),
  semi:    new BABYLON.Color3(0.988, 0.827, 0.302),
  newbie:  new BABYLON.Color3(0.910, 0.910, 0.910),
  foreign: new BABYLON.Color3(0.227, 0.608, 0.910),
};

// GLB 원본 클립명 → 게임 상태 이름 (character.js와 동일)
const _NPC_RENAME = {
  'Running':                          'idle',
  'Ladder_Mount_Start':               'walk',
  'Ladder_Climb_Loop':                'run',
  'Heavy_Hammer_Swing':               'sprint',
  'Carry_Heavy_Object_Walk':          'carry',
  'Walking':                          'push',
  'falling_down':                     'jump',
  'Collect_Object':                   'jump_obstacle',
  'Idle_02':                          'fall',
  'Limping_Walk':                     'trip',
  'Climb_Attempt_and_Fall_5':         'hammer',
  'Chair_Sit_Idle_M':                 'interact',
  'Injured_Walk':                     'throw',
  'Regular_Jump':                     'injured_light',
  'Jump_Over_Obstacle':               'injured_heavy',
  'Push_and_Walk_Forward':            'climb_start',
  'Female_Crouch_Pick_Throw_Forward': 'climb_full',
  'Ladder_Climb_Finish':              'climb_finish',
  'Run_02':                           'sit_idle',
  'Breakdance_1990':                  'breakdance',
};

/* ─── NPC 클래스 ─────────────────────────────────────────── */
class NPC {
  constructor(def, mesh) {
    this.id              = def.id;
    this.name            = def.name;
    this.grade           = def.grade;
    this.skill           = def.skill;
    this.languageGap     = def.languageGap;
    this.fatigue         = 0;
    this.safetyAwareness = 0.5;
    this.health          = 100;
    this.tbmDone         = false;
    this.mesh            = mesh;
    this.task            = null;
    this.moveSpeed       = 0.04;
    this.charAnims       = {};
    this.charState       = 'none';
    this.charRoot        = null;
  }

  get mistakeRate() {
    let r = (this.fatigue / 100 * 0.3)
          + ((1 - this.skill) * 0.2)
          + this.languageGap * 0.4;
    if (this.tbmDone) r *= 0.6;
    return Math.min(r, 1.0);
  }

  setCharState(name) {
    if (!this.charRoot || this.charState === name) return;
    const ag = this.charAnims[name];
    if (!ag) return;
    Object.values(this.charAnims).forEach(a => { try { a.stop(); } catch(e) {} });
    ag.start(true, 1.0, ag.from, ag.to, false);
    this.charState = name;
  }

  tick(dt) {
    this.fatigue = Math.min(100, this.fatigue + dt * 0.8 / 60);
    _updatePartyBar(this.id, this.health, this.fatigue);
    this._taskTick();
  }

  _taskTick() {
    if (!this.task) {
      this.setCharState('idle');
      return;
    }
    const t = this.task;

    if (t.phase === 'goBriefing') {
      this.setCharState('walk');
      const diff = t.target.subtract(this.mesh.position);
      diff.y = 0;
      const dist = diff.length();
      if (dist < 0.3) {
        const look = GAME.player.position.subtract(this.mesh.position);
        this.mesh.rotation.y = Math.atan2(look.x, look.z);
        this.task = null;
        return;
      }
      diff.scaleInPlace(this.moveSpeed / dist);
      this.mesh.position.addInPlace(diff);
      this.mesh.rotation.y = Math.atan2(diff.x, diff.z);
      return;
    }

    if (t.phase === 'goPile' || t.phase === 'goTarget') {
      this.setCharState('walk');
      const tx = (t.phase === 'goPile') ? t.pile.x : t.target.x;
      const tz = (t.phase === 'goPile') ? t.pile.z : t.target.z;
      const target = new BABYLON.Vector3(tx, this.mesh.position.y, tz);
      const diff = target.subtract(this.mesh.position);
      diff.y = 0;
      const dist = diff.length();

      if (dist < 0.4) {
        if (t.phase === 'goPile') {
          if (t.pile.count <= 0) { this.task = null; return; }
          t.pile.count -= 1;
          if (t.pile.count <= 0 && t.pile.mesh) t.pile.mesh.isVisible = false;
          let m;
          if (t.type === 'post') {
            m = BABYLON.MeshBuilder.CreateCylinder('npcHeld_'+this.id, {diameter:0.06, height:1.15, tessellation:8}, GAME.scene);
            m.rotation.z = Math.PI/2;
          } else if (t.type === 'rail') {
            m = BABYLON.MeshBuilder.CreateBox('npcHeld_'+this.id, {width:2.2, height:0.06, depth:0.06}, GAME.scene);
            m.rotation.z = Math.PI/2;
          } else {
            m = BABYLON.MeshBuilder.CreateCylinder('npcHeld_'+this.id,
              {diameterTop:0.05, diameterBottom:0.32, height:0.5, tessellation:12}, GAME.scene);
          }
          m.parent = this.mesh;
          m.position = new BABYLON.Vector3(0, 0.95, 0.35);
          const hm = new BABYLON.PBRMaterial('npcHM_'+this.id, GAME.scene);
          hm.albedoColor = (t.type === 'cone')
            ? new BABYLON.Color3(0.95,0.45,0.10)
            : new BABYLON.Color3(0.55,0.56,0.58);
          m.material = hm;
          t.heldMesh = m;
          t.phase = 'goTarget';
        } else {
          if (t.heldMesh) t.heldMesh.dispose();
          if (t.type === 'post' && window._carrySpawnPost) window._carrySpawnPost(t.target.x, t.target.z);
          else if (t.type === 'rail' && window._carrySpawnRail && t.target.pair) window._carrySpawnRail(t.target.pair[0], t.target.pair[1]);
          else if (t.type === 'cone' && window._carrySpawnCone) window._carrySpawnCone(t.target.x, t.target.z);
          this.task = null;
        }
        return;
      }
      diff.scaleInPlace(this.moveSpeed / dist);
      this.mesh.position.addInPlace(diff);
      this.mesh.rotation.y = Math.atan2(diff.x, diff.z);
    }
  }

  startInstallTask(type, pile, target) {
    if (this.task) return;
    this.task = { phase: 'goPile', type, pile, target, heldMesh: null };
  }

  moveToBriefingSpot(idx) {
    if (!GAME.player) return;
    const center = GAME.player.position.clone();
    const angles = [-Math.PI*0.35, -Math.PI*0.12, Math.PI*0.12, Math.PI*0.35];
    const R = 2.2;
    const a = angles[idx] || 0;
    const tx = center.x + Math.sin(a) * R;
    const tz = center.z - Math.cos(a) * R;
    this.task = { phase:'goBriefing', target: new BABYLON.Vector3(tx, this.mesh.position.y, tz) };
  }
}

/* ─── 전역 NPC 배열 ──────────────────────────────────────── */
const NPCS = [];

/* ─── HUD 파티창 ─────────────────────────────────────────── */
function _updatePartyBar(id, health, fatigue) {
  const bar = document.getElementById('party-life-' + id);
  if (!bar) return;
  bar.style.height = health + '%';
  const tired = fatigue > 70;
  bar.style.background =
    tired       ? '#FCD34D' :
    health > 60 ? '#8DC63F' :
    health > 30 ? '#FCD34D' : '#E85A3A';
}

/* ─── GLB 색상 적용 ──────────────────────────────────────── */
function _applyNpcColor(mesh, colorIdx) {
  if (!mesh) return;
  if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;
  const name = (mesh.name || '').toLowerCase();
  const mat  = new BABYLON.PBRMaterial('npcCMat_' + mesh.uniqueId, GAME.scene);
  mat.roughness = 0.75;
  mat.metallic  = 0.05;
  if (name.includes('hair')) {
    mat.albedoColor = new BABYLON.Color3(0.10, 0.07, 0.05);
  } else if (name.includes('skin') || name.includes('face') || name.includes('head')) {
    mat.albedoColor = new BABYLON.Color3(0.85, 0.70, 0.56);
  } else {
    mat.albedoColor = NPC_BODY_COLORS[colorIdx] || new BABYLON.Color3(0.3, 0.4, 0.5);
  }
  mesh.material = mat;
}

/* ─── 헬멧 오버레이 ──────────────────────────────────────── */
function _addHelmetOverlay(npc, def) {
  const hColor = HELMET_COLOR_MAP[def.grade] || new BABYLON.Color3(0.9, 0.9, 0.9);
  const helmet = BABYLON.MeshBuilder.CreateSphere('npcHelmet_' + def.id,
    { diameter: 0.38, segments: 8 }, GAME.scene);
  helmet.parent     = npc.mesh;
  helmet.position   = new BABYLON.Vector3(0, 0.72, 0);
  helmet.scaling    = new BABYLON.Vector3(1.05, 0.52, 1.05);
  helmet.isPickable = false;
  const helMat = new BABYLON.PBRMaterial('npcHelMat_' + def.id, GAME.scene);
  helMat.albedoColor = hColor;
  helMat.roughness = 0.45;
  helMat.metallic  = 0.06;
  helmet.material  = helMat;
  if (GAME.shadowGen) GAME.shadowGen.addShadowCaster(helmet);
}

/* ─── 이름 라벨 ──────────────────────────────────────────── */
function _addNameLabel(npc, def) {
  const lPlane = BABYLON.MeshBuilder.CreatePlane('npcLabel_' + def.id,
    { width: 1.3, height: 0.42 }, GAME.scene);
  lPlane.parent = npc.mesh;
  lPlane.position = new BABYLON.Vector3(0, 1.28, 0);
  lPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  lPlane.isPickable = false;
  const lTex = new BABYLON.DynamicTexture('npcLT_' + def.id,
    { width: 256, height: 80 }, GAME.scene, true);
  const lCtx = lTex.getContext();
  lCtx.clearRect(0, 0, 256, 80);
  lCtx.fillStyle = 'rgba(13,27,42,0.85)';
  lCtx.fillRect(4, 4, 248, 72);
  lCtx.fillStyle = '#C8D8E8';
  lCtx.font = 'bold 30px Arial';
  lCtx.textAlign = 'center';
  lCtx.textBaseline = 'middle';
  lCtx.fillText(def.name, 128, 40);
  lTex.update();
  lTex.hasAlpha = true;
  const lMat = new BABYLON.StandardMaterial('npcLM_' + def.id, GAME.scene);
  lMat.diffuseTexture = lTex;
  lMat.emissiveTexture = lTex;
  lMat.disableLighting = true;
  lMat.useAlphaFromDiffuseTexture = true;
  lMat.backFaceCulling = false;
  lPlane.material = lMat;
}

/* ─── NPC별 GLB 로드 (ImportMeshAsync — 플레이어와 동일 방식) ── */
async function _initNpcChar(npc, def, colorIdx) {
  try {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '', 'assets/characters/', 'player.glb', GAME.scene
    );

    // 자동 재생 정지
    result.animationGroups.forEach(ag => { try { ag.stop(); ag.reset(); } catch(e) {} });

    // 클립명 rename + charAnims 등록
    result.animationGroups.forEach(ag => {
      const gameName = _NPC_RENAME[ag.name];
      if (gameName) {
        npc.charAnims[gameName] = ag;
        ag.name = 'npc' + def.id + '_' + gameName;
      }
    });

    // 색상 적용
    result.meshes.forEach(m => _applyNpcColor(m, colorIdx));

    // 캡슐(npc.mesh)에 부착
    const charRoot = result.meshes[0];
    const wrapper  = new BABYLON.TransformNode('npcWrapper_' + def.id, GAME.scene);
    wrapper.parent   = npc.mesh;
    wrapper.position = new BABYLON.Vector3(0, -0.85, 0);
    charRoot.parent  = wrapper;
    npc.charRoot = wrapper;

    // 그림자 캐스터
    if (GAME.shadowGen) {
      result.meshes.forEach(m => {
        if (m.getTotalVertices && m.getTotalVertices() > 0) {
          GAME.shadowGen.addShadowCaster(m);
        }
      });
    }

    npc.setCharState('idle');
    console.log('[NPC]', def.name, 'GLB 로드 완료');
  } catch(e) {
    console.error('[NPC]', def.name, 'GLB 실패:', e.message || e);
    // 폴백: 캡슐 표시
    npc.mesh.isVisible = true;
    const mat = new BABYLON.PBRMaterial('npcFB_' + def.id, GAME.scene);
    mat.albedoColor = NPC_BODY_COLORS[colorIdx] || new BABYLON.Color3(0.4, 0.5, 0.6);
    mat.roughness = 0.65; mat.metallic = 0.05;
    npc.mesh.material = mat;
    if (GAME.shadowGen) GAME.shadowGen.addShadowCaster(npc.mesh);
  }
}

/* ─── 초기화 ─────────────────────────────────────────────── */
window.addEventListener('game:ready', function() {
  NPC_DEFS.forEach((def, i) => {
    // 위치 추적용 투명 캡슐 (GLB 로드 전까지 숨김)
    const mesh = BABYLON.MeshBuilder.CreateCapsule('npc_' + def.id,
      { radius: 0.30, height: 1.65, tessellation: 12 }, GAME.scene);
    mesh.position   = new BABYLON.Vector3(def.pos[0], def.pos[1], def.pos[2]);
    mesh.isVisible  = false;
    mesh.isPickable = false;
    mesh.receiveShadows = true;

    const npc = new NPC(def, mesh);

    // 헬멧 오버레이 + 이름 라벨 (GLB 로드 전에도 표시)
    _addHelmetOverlay(npc, def);
    _addNameLabel(npc, def);

    NPCS.push(npc);
    _updatePartyBar(def.id, npc.health, npc.fatigue);

    // GLB 비동기 로드 (fire & forget)
    _initNpcChar(npc, def, i);
  });

  // 매 프레임 tick
  let last = performance.now();
  GAME.scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const dt  = (now - last) / 1000;
    last = now;
    NPCS.forEach(n => n.tick(dt));
  });
});
