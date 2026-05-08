// NPC System — humanoid workers with state machine + Three.js mesh

const NPC_STATES = { IDLE: 'IDLE', WORKING: 'WORKING', UNSAFE: 'UNSAFE', DANGER: 'DANGER', ACCIDENT: 'ACCIDENT' };

const NPC_COLORS = {
  IDLE:     0x6688AA,
  WORKING:  0x2C6FAC,
  UNSAFE:   0xDC2626,
  DANGER:   0xFF6600,
  ACCIDENT: 0x222222,
};

// ── NPC Class ───────────────────────────────────────────────
class NPC {
  constructor({ id, name, role, language, skill, position, vestColor }) {
    this.id       = id;
    this.name     = name;
    this.role     = role;
    this.language = language;  // 'ko' | 'en' | 'ar' | 'vi'
    this.skill    = skill;
    this.fatigue  = 0;
    this.state    = NPC_STATES.IDLE;
    this.hasInstruction = false;
    this.instructionLangMismatch = false;
    this.position = position.slice();
    this._vestColor  = vestColor || 0xFF6600;
    this._animPhase  = Math.random() * Math.PI * 2;
    this._targetPos  = null;
    this._accidentTriggered = false;
    this._accidentTimer = 0;
    this._mistakeAccum  = 0;

    this.group = null;
    this._bodyParts = {};
    this.mesh = null;  // interaction trigger sphere
  }

  build() {
    this.group = new THREE.Group();
    this.group.position.set(...this.position);

    const mats = {
      vest:   new THREE.MeshLambertMaterial({ color: this._vestColor }),
      skin:   new THREE.MeshLambertMaterial({ color: 0xC8845A }),
      helmet: new THREE.MeshLambertMaterial({ color: 0xDEBB14 }),
      shirt:  new THREE.MeshLambertMaterial({ color: 0x3A5068 }),
      pant:   new THREE.MeshLambertMaterial({ color: 0x2C3A48 }),
      boot:   new THREE.MeshLambertMaterial({ color: 0x1C1814 }),
    };

    // Helper: add mesh to group; geometry can be pre-translated for pivot control
    const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // Boots
    add(new THREE.BoxGeometry(0.12, 0.09, 0.24), mats.boot, -0.09, 0.045, 0.04);
    add(new THREE.BoxGeometry(0.12, 0.09, 0.24), mats.boot,  0.09, 0.045, 0.04);

    // Legs — geometry translated so top = y 0, giving hip-pivot rotation
    const legGeoL = new THREE.CylinderGeometry(0.068, 0.054, 0.80, 16);
    legGeoL.translate(0, -0.40, 0);
    this._bodyParts.legL = add(legGeoL, mats.pant, -0.09, 0.88, 0);

    const legGeoR = new THREE.CylinderGeometry(0.068, 0.054, 0.80, 16);
    legGeoR.translate(0, -0.40, 0);
    this._bodyParts.legR = add(legGeoR, mats.pant,  0.09, 0.88, 0);

    // Torso — tapered (wider at shoulders)
    this._bodyParts.body = add(
      new THREE.CylinderGeometry(0.158, 0.132, 0.52, 20),
      mats.vest, 0, 1.08, 0
    );

    // Neck
    add(new THREE.CylinderGeometry(0.052, 0.048, 0.09, 14), mats.skin, 0, 1.39, 0);

    // Head
    this._bodyParts.head = add(new THREE.SphereGeometry(0.115, 28, 20), mats.skin, 0, 1.56, 0);

    // Helmet dome + brim
    this._bodyParts.helmet = add(
      new THREE.SphereGeometry(0.132, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mats.helmet, 0, 1.625, 0
    );
    add(new THREE.CylinderGeometry(0.165, 0.148, 0.024, 28), mats.helmet, 0, 1.568, 0);

    // Arms — geometry translated so top = y 0, giving shoulder-pivot rotation
    const armGeoL = new THREE.CylinderGeometry(0.048, 0.038, 0.64, 14);
    armGeoL.translate(0, -0.32, 0);
    this._bodyParts.armL = add(armGeoL, mats.vest, -0.215, 1.32, 0, 0,  0.12);

    const armGeoR = new THREE.CylinderGeometry(0.048, 0.038, 0.64, 14);
    armGeoR.translate(0, -0.32, 0);
    this._bodyParts.armR = add(armGeoR, mats.vest,  0.215, 1.32, 0, 0, -0.12);

    GAME.scene.add(this.group);

    // Invisible interaction trigger
    const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), triggerMat);
    this.mesh.position.set(this.position[0], this.position[1] + 1.0, this.position[2]);
    GAME.scene.add(this.mesh);

    GAME.interactables.push({ mesh: this.mesh, type: 'npc', npcId: this.id, nameKey: null });
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this._updateColor();
  }

  _updateColor() {
    const color = new THREE.Color(NPC_COLORS[this.state] || NPC_COLORS.IDLE);
    ['body', 'armL', 'armR'].forEach(k => {
      if (this._bodyParts[k]) this._bodyParts[k].material.color.set(color);
    });
  }

  tick(delta, elapsed) {
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;

    // Slowly accumulate fatigue
    this.fatigue = Math.min(100, this.fatigue + delta * 0.8);

    // State machine
    switch (this.state) {
      case NPC_STATES.IDLE:
        if (!this.hasInstruction && GAME.state.phase >= 2) this.setState(NPC_STATES.UNSAFE);
        break;

      case NPC_STATES.UNSAFE:
        this._moveTowardDanger(delta);
        this._checkSpontaneousAccident(delta);
        break;

      case NPC_STATES.WORKING:
        this._checkMistake(delta);
        break;

      case NPC_STATES.DANGER:
        this._accidentTimer += delta;
        if (this._accidentTimer > 1.5 && !this._accidentTriggered) {
          this._accidentTriggered = true;
          triggerAccident('worker_crush');
        }
        break;

      case NPC_STATES.ACCIDENT:
        break;
    }

    this._animate(elapsed);
    this._syncTriggerMesh();
  }

  _checkMistake(delta) {
    const p = (this.fatigue / 100 * 0.3) + ((1 - this.skill) * 0.2)
            + (this.instructionLangMismatch ? 0.4 : 0);
    this._mistakeAccum += p * delta * 0.015;
    if (this._mistakeAccum >= 1) {
      this._mistakeAccum = 0;
      this.setState(NPC_STATES.DANGER);
      this._accidentTimer = 0;
    }
  }

  _checkSpontaneousAccident(delta) {
    // Unsafe workers in lift zone during Phase 2 cause accident
    if (GAME.state.phase === 2) {
      const cam = GAME.camera.position;
      if (!this._accidentTriggered) {
        this._accidentTimer += delta;
        if (this._accidentTimer > 4) {
          this._accidentTriggered = true;
          triggerAccident('worker_crush');
        }
      }
    }
  }

  _moveTowardDanger(delta) {
    // Drift toward beam area (danger zone center)
    const target = new THREE.Vector3(-2, 0, -8);
    const pos = this.group.position;
    const dir = new THREE.Vector3().subVectors(target, pos);
    if (dir.length() > 0.3) {
      dir.normalize().multiplyScalar(delta * 0.4);
      pos.add(dir);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
      if (this.mesh) {
        this.mesh.position.x = pos.x;
        this.mesh.position.z = pos.z;
      }
    }
  }

  _animate(elapsed) {
    const t = elapsed + this._animPhase;
    const parts = this._bodyParts;

    switch (this.state) {
      case NPC_STATES.IDLE:
        if (parts.body) this.group.rotation.y += 0.0005;
        if (parts.body) parts.body.rotation.z = Math.sin(t * 0.8) * 0.02;
        break;

      case NPC_STATES.WORKING:
        if (parts.armL) parts.armL.rotation.x = Math.sin(t * 2) * 0.5;
        if (parts.armR) parts.armR.rotation.x = -Math.sin(t * 2) * 0.5;
        if (parts.legL) parts.legL.rotation.x = -Math.sin(t * 2) * 0.25;
        if (parts.legR) parts.legR.rotation.x = Math.sin(t * 2) * 0.25;
        break;

      case NPC_STATES.UNSAFE:
      case NPC_STATES.DANGER:
        if (parts.armL) parts.armL.rotation.x = Math.sin(t * 3) * 0.7;
        if (parts.armR) parts.armR.rotation.x = -Math.sin(t * 3) * 0.7;
        if (parts.legL) parts.legL.rotation.x = -Math.sin(t * 3) * 0.4;
        if (parts.legR) parts.legR.rotation.x = Math.sin(t * 3) * 0.4;
        break;

      case NPC_STATES.ACCIDENT:
        // Fall over (rotate around x axis)
        if (this.group.rotation.x < Math.PI / 2 - 0.05) {
          this.group.rotation.x += 0.04;
          this.group.position.y = Math.max(0, 0.5 - this.group.rotation.x * 0.3);
        }
        break;
    }
  }

  _syncTriggerMesh() {
    if (this.mesh) {
      this.mesh.position.x = this.group.position.x;
      this.mesh.position.z = this.group.position.z;
    }
  }

  receiveInstruction(lang) {
    this.hasInstruction = true;
    this.instructionLangMismatch = (lang !== this.language && lang !== 'en');
    if (this.instructionLangMismatch) return false;
    this.setState(NPC_STATES.WORKING);
    return true;
  }

  evacuate() {
    this._targetPos = new THREE.Vector3(12, 0, 5); // Safe zone
    this.setState(NPC_STATES.IDLE);
    this.hasInstruction = true;
  }

  triggerAccidentPose() {
    this.setState(NPC_STATES.ACCIDENT);
  }
}

// ── NPC Definitions ─────────────────────────────────────────
const NPC_DEFS = [
  { id: 'gimc',   name: '김철수', role: '신호수',     language: 'ko', skill: 0.90, vestColor: 0xCC5018, position: [7,   0, -6]  },
  { id: 'park',   name: '박영수', role: '슬링작업자', language: 'ko', skill: 0.75, vestColor: 0xD4A217, position: [-4,  0, -8]  },
  { id: 'lee',    name: '이민호', role: '고소작업자', language: 'ko', skill: 0.80, vestColor: 0xCC5018, position: [0,   0, -14] },
  { id: 'ahmad',  name: '아흐마드', role: '보조작업자', language: 'ar', skill: 0.70, vestColor: 0xD4A217, position: [5,   0, -12] },
  { id: 'nguyen', name: '응우옌',   role: '보조작업자', language: 'vi', skill: 0.65, vestColor: 0xCC5018, position: [-3,  0, -4]  },
];

GAME.npcs = [];

function initNPCs() {
  NPC_DEFS.forEach(def => {
    const npc = new NPC(def);
    npc.build();
    GAME.npcs.push(npc);
  });
}

// ── Animation loop (independent) ────────────────────────────
let _npcLastTime = 0;
(function npcLoop(now) {
  requestAnimationFrame(npcLoop);
  const delta = Math.min((now - _npcLastTime) / 1000, 0.05);
  _npcLastTime = now;
  if (!GAME.state || !GAME.state.gameStarted) return;
  GAME.npcs.forEach(npc => npc.tick(delta, now / 1000));
})(0);

// ── World-space → screen-space for HUD labels ───────────────
function npcScreenPos(npc) {
  if (!GAME.camera || !GAME.renderer) return null;
  const pos = npc.group.position.clone().setY(npc.group.position.y + 2.3);
  pos.project(GAME.camera);
  if (pos.z > 1) return null;  // behind camera
  return {
    x: (pos.x + 1) / 2 * window.innerWidth,
    y: (-pos.y + 1) / 2 * window.innerHeight,
  };
}

// Render NPC name labels on screen (called from instruction.js)
function updateNPCLabels() {
  GAME.npcs.forEach(npc => {
    let labelEl = document.getElementById(`npc-label-${npc.id}`);
    if (!labelEl) {
      labelEl = document.createElement('div');
      labelEl.id = `npc-label-${npc.id}`;
      labelEl.className = 'npc-label';
      document.body.appendChild(labelEl);
    }

    const sp = npcScreenPos(npc);
    if (!sp || GAME.state.gameOver || !GAME.state.gameStarted) {
      labelEl.style.opacity = '0';
      return;
    }

    // Only show within 12m
    const d = GAME.camera.position.distanceTo(npc.group.position);
    if (d > 12) { labelEl.style.opacity = '0'; return; }

    const isDanger = npc.state === NPC_STATES.UNSAFE || npc.state === NPC_STATES.DANGER;
    labelEl.className = isDanger ? 'npc-danger-badge' : 'npc-label';
    labelEl.textContent = isDanger ? `⚠ ${npc.name}` : `${npc.name} · ${npc.role}`;
    labelEl.style.left   = sp.x + 'px';
    labelEl.style.top    = sp.y + 'px';
    labelEl.style.opacity = Math.min(1, (12 - d) / 4).toString();
  });
}

// ── NPC label update loop ────────────────────────────────────
(function labelLoop() {
  requestAnimationFrame(labelLoop);
  if (GAME.state && GAME.state.gameStarted && !GAME.state.gameOver) updateNPCLabels();
})();
