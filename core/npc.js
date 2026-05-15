// npc.js — NPC 팀원 시스템 (등급·피로도·언어장벽·실수율)

/* ─── 팀원 정의 ──────────────────────────────────────────── */
const NPC_DEFS = [
  { id: 0, name: '김철수', grade: 'expert',  skill: 0.85, languageGap: 0.0, pos: [-4.5, 0.85,  0.5] },
  { id: 1, name: '이영수', grade: 'semi',    skill: 0.65, languageGap: 0.0, pos: [ 4.5, 0.85,  0.5] },
  { id: 2, name: '박신입', grade: 'newbie',  skill: 0.40, languageGap: 0.0, pos: [-1.5, 0.85,  3.5] },
  { id: 3, name: '응우옌', grade: 'foreign', skill: 0.55, languageGap: 0.4, pos: [ 1.5, 0.85,  3.5] },
];

// HUD 파티바 색상과 일치
const NPC_COLORS = [
  [0.976, 0.451, 0.086],  // 김: 주황
  [0.988, 0.827, 0.302],  // 이: 노랑
  [0.784, 0.847, 0.910],  // 박: 회청
  [0.553, 0.776, 0.247],  // 응: 라임
];

/* ─── NPC 클래스 ─────────────────────────────────────────── */
class NPC {
  constructor(def, mesh) {
    this.id              = def.id;
    this.name            = def.name;
    this.grade           = def.grade;
    this.skill           = def.skill;       // 0~1 (작업 정확도)
    this.languageGap     = def.languageGap; // 0~1 (언어 장벽)
    this.fatigue         = 0;               // 0~100 (시간 누적)
    this.safetyAwareness = 0.5;             // TBM 실시 시 상승
    this.health          = 100;             // 0~100
    this.tbmDone         = false;
    this.mesh            = mesh;
  }

  // DESIGN.md: mistakeRate = (fatigue/100×0.3) + ((1-skill)×0.2) + languageGap×0.4
  get mistakeRate() {
    let r = (this.fatigue / 100 * 0.3)
          + ((1 - this.skill) * 0.2)
          + this.languageGap * 0.4;
    if (this.tbmDone) r *= 0.6;
    return Math.min(r, 1.0);
  }

  tick(dt) {
    // 피로 누적: 1분당 0.8 포인트
    this.fatigue = Math.min(100, this.fatigue + dt * 0.8 / 60);
    _updatePartyBar(this.id, this.health, this.fatigue);
  }

  setMeshVariant(role) { /* reserved for GLB swap when final chibi model arrives */ }
}

/* ─── 전역 NPC 배열 (다른 시스템에서 참조 가능) ─────────── */
const NPCS = [];

/* ─── HUD 파티창 업데이트 ────────────────────────────────── */
function _updatePartyBar(id, health, fatigue) {
  const bar = document.getElementById('party-life-' + id);
  if (!bar) return;
  bar.style.height = health + '%';
  // 피로 70% 이상이면 노랑, 체력 기준 색상
  const tired = fatigue > 70;
  bar.style.background =
    tired       ? '#FCD34D' :
    health > 60 ? '#8DC63F' :
    health > 30 ? '#FCD34D' : '#E85A3A';
}

const HELMET_COLOR_MAP = {
  expert:  [0.553, 0.776, 0.247],  // lime
  semi:    [0.988, 0.827, 0.302],  // yellow
  newbie:  [0.910, 0.910, 0.910],  // white
  foreign: [0.227, 0.608, 0.910],  // blue
};

/* ─── 초기화 (game:ready 이후) ───────────────────────────── */
window.addEventListener('game:ready', function() {
  NPC_DEFS.forEach((def, i) => {
    const mesh = BABYLON.MeshBuilder.CreateCapsule('npc_' + def.id,
      { radius: 0.30, height: 1.65, tessellation: 12 }, GAME.scene);
    mesh.position = new BABYLON.Vector3(def.pos[0], def.pos[1], def.pos[2]);
    mesh.receiveShadows = true;
    GAME.shadowGen.addShadowCaster(mesh);

    const [r, g, b] = NPC_COLORS[i];
    const mat = new BABYLON.PBRMaterial('npcMat_' + def.id, GAME.scene);
    mat.albedoColor = new BABYLON.Color3(r, g, b);
    mat.roughness   = 0.65;
    mat.metallic    = 0.05;
    mesh.material   = mat;

    // 헬멧 (반구 하드햇)
    const [hr, hg, hb] = HELMET_COLOR_MAP[def.grade] || [0.9, 0.9, 0.9];
    const helmet = BABYLON.MeshBuilder.CreateSphere('npcHelmet_' + def.id,
      { diameter: 0.66, segments: 8 }, GAME.scene);
    helmet.parent   = mesh;
    helmet.position = new BABYLON.Vector3(0, 0.78, 0);
    helmet.scaling  = new BABYLON.Vector3(1.05, 0.52, 1.05);
    helmet.isPickable = false;
    const helMat = new BABYLON.PBRMaterial('npcHelMat_' + def.id, GAME.scene);
    helMat.albedoColor = new BABYLON.Color3(hr, hg, hb);
    helMat.roughness = 0.45; helMat.metallic = 0.06;
    helmet.material = helMat;
    GAME.shadowGen.addShadowCaster(helmet);

    // 조끼 띠 (캡슐 허리)
    const vest = BABYLON.MeshBuilder.CreateCylinder('npcVest_' + def.id,
      { diameter: 0.64, height: 0.30, tessellation: 12 }, GAME.scene);
    vest.parent   = mesh;
    vest.position = new BABYLON.Vector3(0, 0.10, 0);
    vest.isPickable = false;
    const vMat = new BABYLON.PBRMaterial('npcVestMat_' + def.id, GAME.scene);
    vMat.albedoColor = new BABYLON.Color3(r * 0.8, g * 0.8, b * 0.8);
    vMat.roughness = 0.80; vMat.metallic = 0;
    vest.material = vMat;

    // 블롭 그림자
    const blob = BABYLON.MeshBuilder.CreateCylinder('npcBlob_' + def.id,
      { diameter: 0.84, height: 0.015, tessellation: 16 }, GAME.scene);
    blob.parent   = mesh;
    blob.position = new BABYLON.Vector3(0, -0.84, 0);
    blob.isPickable = false;
    const blobMat = new BABYLON.StandardMaterial('npcBlobMat_' + def.id, GAME.scene);
    blobMat.diffuseColor = BABYLON.Color3.Black();
    blobMat.alpha = 0.35;
    blob.material = blobMat;

    // 이름 빌보드 라벨
    const lPlane = BABYLON.MeshBuilder.CreatePlane('npcLabel_' + def.id,
      { width: 1.3, height: 0.42 }, GAME.scene);
    lPlane.parent = mesh;
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

    const npc = new NPC(def, mesh);
    NPCS.push(npc);
    _updatePartyBar(def.id, npc.health, npc.fatigue);
  });

  // 매 프레임 상태 tick
  let last = performance.now();
  GAME.scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const dt  = (now - last) / 1000;
    last = now;
    NPCS.forEach(n => n.tick(dt));
  });
});
