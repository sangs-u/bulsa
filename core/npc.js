// npc.js — NPC 팀원 시스템 (등급·피로도·언어장벽·실수율)

/* ─── 팀원 정의 ──────────────────────────────────────────── */
const NPC_DEFS = [
  { id: 0, name: '김철수', grade: 'expert',  skill: 0.85, languageGap: 0.0, pos: [-6,  0.85, -2] },
  { id: 1, name: '이영수', grade: 'semi',    skill: 0.65, languageGap: 0.0, pos: [ 5,  0.85, -2] },
  { id: 2, name: '박신입', grade: 'newbie',  skill: 0.40, languageGap: 0.0, pos: [ 1,  0.85,  3] },
  { id: 3, name: '응우옌', grade: 'foreign', skill: 0.55, languageGap: 0.4, pos: [-5,  0.85,  3] },
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
