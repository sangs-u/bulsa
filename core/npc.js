// NPC System — GLB characters (Soldier.glb) with geometry fallback

const NPC_STATES = { IDLE: 'IDLE', WORKING: 'WORKING', UNSAFE: 'UNSAFE', DANGER: 'DANGER', ACCIDENT: 'ACCIDENT' };

const NPC_COLORS = {
  IDLE:     0x6688AA,
  WORKING:  0x2C6FAC,
  UNSAFE:   0xDC2626,
  DANGER:   0xFF6600,
  ACCIDENT: 0x222222,
};

// Animation name per state (Soldier.glb clip names)
const STATE_ANIM = {
  [NPC_STATES.IDLE]:     'Idle',
  [NPC_STATES.WORKING]:  'Walk',
  [NPC_STATES.UNSAFE]:   'Walk',
  [NPC_STATES.DANGER]:   'Run',
  [NPC_STATES.ACCIDENT]: 'Idle',
};

const STATE_SPEED = {
  [NPC_STATES.UNSAFE]:  1.6,
  [NPC_STATES.DANGER]:  1.8,
  [NPC_STATES.WORKING]: 1.0,
  [NPC_STATES.IDLE]:    1.0,
};

// ── NPC Class ──────────────────────────────────────────────────
class NPC {
  constructor({ id, name, role, trade, language, skill, position, vestColor, experience }) {
    this.id         = id;
    this.name       = name;
    this.role       = role;        // string 또는 {ko,en,vi,ar} 객체
    this.trade      = trade || 'misc';   // 공종 (signal/lifting/...)
    this.language   = language;
    this.skill      = skill;
    this.experience = experience || 0;
    this.fatigue    = 0;
    this.state    = NPC_STATES.IDLE;
    this.hasInstruction = false;
    this.instructionLangMismatch = false;
    this.position = position.slice();
    this._vestColor = vestColor || 0xFF6600;
    this._animPhase = Math.random() * Math.PI * 2;
    this._targetPos = null;
    this._accidentTriggered = false;
    this._accidentTimer = 0;
    this._mistakeAccum  = 0;

    this.group = null;
    this._bodyParts = {};
    this.mesh  = null;  // interaction trigger sphere
    this._char = null;  // { group, mixer, actions, current } — set if GLB loaded
  }

  build() {
    preloadCharacter(() => {
      const char = spawnCharacter(this.position);
      if (char) {
        this._char = char;
        this.group = char.group;
        this._playAnim('Idle');
        // 직종별 도구 부착 (MOTION 사용 가능할 때)
        if (typeof attachTool === 'function') {
          const toolByTrade = {
            signal:    'flag',
            formwork:  'hammer',
            rebar:     'wrench',
            mep:       'welder',
            survey:    'detector',
            excavator: null,
            crane:     null,
          };
          const t = toolByTrade[this.trade];
          if (t) {
            try { this._tool = attachTool(char, t, { scale: 0.9 }); } catch(e) {}
          }
        }
      } else {
        this._buildGeometry();
      }
      this._addTrigger();
    });
  }

  // 외부에서 직접 모션 클립을 지정 (Mixamo 클립 사용 시)
  setMotionClip(name, fadeIn) {
    if (typeof setMotion === 'function' && this._char) {
      setMotion(this._char, name, fadeIn);
    } else if (this._char) {
      this._playAnim(name, fadeIn || 0.3);
    }
  }

  // 현재 언어 기준 역할 텍스트 (role 이 string/객체 양쪽 지원)
  roleText() {
    if (this.role == null) return '';
    if (typeof this.role === 'string') return this.role;
    return this.role[currentLang] || this.role.ko || this.role.en || '';
  }

  // _targetPos 지원: tick에서 목표 위치로 이동
  _moveToTarget(delta) {
    if (!this._targetPos || !this.group) return false;
    const dir = new THREE.Vector3().subVectors(this._targetPos, this.group.position);
    if (dir.length() > 0.25) {
      dir.normalize().multiplyScalar(delta * 1.2);
      this.group.position.add(dir);
      this.group.rotation.y = Math.atan2(dir.x, dir.z) + (this._char ? Math.PI : 0);
      return true;
    }
    this.group.position.copy(this._targetPos);
    this._targetPos = null;
    this.setState(NPC_STATES.IDLE);
    return false;
  }

  // ── Geometry fallback ────────────────────────────────────────
  _buildGeometry() {
    this.group = new THREE.Group();
    this.group.position.set(...this.position);

    // 외모 랜덤화 (매 NPC 인스턴스마다)
    const HELMETS = [0xDEBB14, 0xE8E8E8, 0xCC4010, 0x2B6CB0, 0xFFFFFF, 0x22A858, 0xFFAA00];
    const SKINS   = [0xE8B894, 0xD49A6A, 0xC8845A, 0xA66B44, 0x7C4D2A];
    const PANTS   = [0x2C3A48, 0x1A1F2A, 0x3B3528, 0x2A2620];
    const heightMul = 0.92 + Math.random() * 0.16;  // 0.92~1.08
    this._heightMul = heightMul;
    const helmetColor = HELMETS[Math.floor(Math.random() * HELMETS.length)];
    const skinColor   = SKINS[Math.floor(Math.random() * SKINS.length)];
    const pantColor   = PANTS[Math.floor(Math.random() * PANTS.length)];
    const hasGlasses  = Math.random() < 0.35;
    const hasBeard    = Math.random() < 0.25;
    this._helmetColor = helmetColor;

    const mats = {
      vest:   new THREE.MeshLambertMaterial({ color: this._vestColor }),
      skin:   new THREE.MeshLambertMaterial({ color: skinColor }),
      helmet: new THREE.MeshLambertMaterial({ color: helmetColor }),
      pant:   new THREE.MeshLambertMaterial({ color: pantColor }),
      boot:   new THREE.MeshLambertMaterial({ color: 0x1C1814 }),
      glass:  new THREE.MeshLambertMaterial({ color: 0x202020 }),
      beard:  new THREE.MeshLambertMaterial({ color: 0x2A2018 }),
    };
    // 키 변동을 group 전체에 적용
    this.group.scale.y = heightMul;

    const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    add(new THREE.BoxGeometry(0.12, 0.09, 0.24), mats.boot, -0.09, 0.045, 0.04);
    add(new THREE.BoxGeometry(0.12, 0.09, 0.24), mats.boot,  0.09, 0.045, 0.04);

    const legGeoL = new THREE.CylinderGeometry(0.068, 0.054, 0.80, 16);
    legGeoL.translate(0, -0.40, 0);
    this._bodyParts.legL = add(legGeoL, mats.pant, -0.09, 0.88, 0);

    const legGeoR = new THREE.CylinderGeometry(0.068, 0.054, 0.80, 16);
    legGeoR.translate(0, -0.40, 0);
    this._bodyParts.legR = add(legGeoR, mats.pant,  0.09, 0.88, 0);

    this._bodyParts.body = add(new THREE.CylinderGeometry(0.158, 0.132, 0.52, 20), mats.vest, 0, 1.08, 0);
    add(new THREE.CylinderGeometry(0.052, 0.048, 0.09, 14), mats.skin, 0, 1.39, 0);
    this._bodyParts.head   = add(new THREE.SphereGeometry(0.115, 28, 20), mats.skin, 0, 1.56, 0);
    this._bodyParts.helmet = add(new THREE.SphereGeometry(0.132, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), mats.helmet, 0, 1.625, 0);
    add(new THREE.CylinderGeometry(0.165, 0.148, 0.024, 28), mats.helmet, 0, 1.568, 0);

    // 안경 (35% 확률)
    if (hasGlasses) {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 8, 12), mats.glass);
      frame.position.set(-0.04, 1.555, 0.105); frame.rotation.x = Math.PI / 2;
      this.group.add(frame);
      const frame2 = frame.clone(); frame2.position.x = 0.04; this.group.add(frame2);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.005), mats.glass);
      bridge.position.set(0, 1.555, 0.105); this.group.add(bridge);
    }
    // 수염 (25% 확률)
    if (hasBeard) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.025), mats.beard);
      beard.position.set(0, 1.495, 0.105);
      this.group.add(beard);
    }

    const armGeoL = new THREE.CylinderGeometry(0.048, 0.038, 0.64, 14);
    armGeoL.translate(0, -0.32, 0);
    this._bodyParts.armL = add(armGeoL, mats.vest, -0.215, 1.32, 0, 0,  0.12);

    const armGeoR = new THREE.CylinderGeometry(0.048, 0.038, 0.64, 14);
    armGeoR.translate(0, -0.32, 0);
    this._bodyParts.armR = add(armGeoR, mats.vest,  0.215, 1.32, 0, 0, -0.12);

    GAME.scene.add(this.group);
  }

  _addTrigger() {
    const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), triggerMat);
    this.mesh.position.set(this.position[0], this.position[1] + 1.0, this.position[2]);
    GAME.scene.add(this.mesh);

    // 신호수(gimc): Phase 5 직접 행동 + Phase 6 대화 팝업
    if (this.id === 'gimc') {
      GAME.interactables.push({
        mesh: this.mesh, type: 'action', actionId: 'assign_signal', label: { ko:'신호수 위치 지정', en:'Assign signaller position', vi:'Chỉ định vị trí người ra hiệu', ar:'تحديد موقع الإشاري' },
        phase: 5,
      });
      GAME.interactables.push({
        mesh: this.mesh, type: 'npc', npcId: 'gimc', label: { ko:'신호수와 대화', en:'Talk to signaller', vi:'Trò chuyện với người ra hiệu', ar:'تحدث إلى الإشاري' },
        phase: 6,
      });
    } else {
      GAME.interactables.push({ mesh: this.mesh, type: 'npc', npcId: this.id, nameKey: null });
    }
  }

  // ── Animation (GLB) ──────────────────────────────────────────
  _playAnim(name, fadeIn = 0.3) {
    const c = this._char;
    if (!c || !c.actions[name]) return;
    if (c.current === name) return;

    const prev = c.current ? c.actions[c.current] : null;
    const next = c.actions[name];
    if (prev) prev.fadeOut(fadeIn);
    next.reset().fadeIn(fadeIn).play();
    c.current = name;
  }

  // ── State machine ────────────────────────────────────────────
  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this._updateColor();
    this._onStateAnim(newState);
  }

  _onStateAnim(state) {
    let animName = STATE_ANIM[state] || 'Idle';
    if (state === NPC_STATES.WORKING && this._char) {
      const tradeMotion = {
        signal: 'signal', formwork: 'hammer', rebar: 'hammer',
        lifting: 'lift', scaffold: 'climb', electric: 'weld',
        plumbing: 'weld', mep: 'weld', survey: 'inspect', excavator: 'inspect',
      };
      const mapped = tradeMotion[this.trade];
      if (mapped && typeof setMotion === 'function') {
        try { setMotion(this._char, mapped, 0.3); } catch (e) {}
      }
    }
    this._playAnim(animName);
    if (this._char) this._char.mixer.timeScale = STATE_SPEED[state] || 1.0;
  }

  _updateColor() {
    if (this._char) return; // GLB: skip geometry coloring
    const color = new THREE.Color(NPC_COLORS[this.state] || NPC_COLORS.IDLE);
    ['body', 'armL', 'armR'].forEach(k => {
      if (this._bodyParts[k]) this._bodyParts[k].material.color.set(color);
    });
  }

  // ── Tick ─────────────────────────────────────────────────────
  tick(delta, elapsed) {
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;
    if (!this.group) return; // not yet loaded

    if (this._char) this._char.mixer.update(delta);

    this.fatigue = Math.min(100, this.fatigue + delta * 0.8);

    // 플레이어 회피 — 사고 중이 아닐 때만, 1.4m 내 접근 시 옆으로 밀려남
    this._avoidPlayer(delta);

    // _targetPos 이동 처리
    const moving = this._moveToTarget(delta);

    if (!moving) {
      switch (this.state) {
        case NPC_STATES.WORKING:
          // 새 시스템: 실수 체크 비활성 (사고는 evaluateLift에서만 발생)
          break;
        case NPC_STATES.ACCIDENT:
          break;
      }
    }

    if (this._char) {
      this._animateGLB();
    } else {
      this._animateGeometry(elapsed);
    }
    this._updateAck(delta);
    this._syncTriggerMesh();
  }

  // ── Player avoidance ─────────────────────────────────────────
  _avoidPlayer(delta) {
    if (this.state === NPC_STATES.ACCIDENT) return;
    if (!window.PLAYER || !PLAYER.position) return;
    const px = PLAYER.position.x, pz = PLAYER.position.z;
    const dx = this.group.position.x - px;
    const dz = this.group.position.z - pz;
    const d2 = dx * dx + dz * dz;
    const R  = 1.4;
    if (d2 > R * R || d2 < 0.0001) {
      this._dodgeNudge = 0;
      return;
    }
    const d = Math.sqrt(d2);
    const k = (R - d) / R; // 0~1, 가까울수록 큼
    const nx = dx / d, nz = dz / d;
    // 살짝 옆으로 밀려나는 효과 (사이드스텝, 1.0 m/s × k)
    this.group.position.x += nx * delta * 1.0 * k;
    this.group.position.z += nz * delta * 1.0 * k;
    // 플레이어 쪽으로 머리 살짝 돌림 ("인식" 효과)
    const wantY = Math.atan2(-nx, -nz) + (this._char ? Math.PI : 0);
    const cur   = this.group.rotation.y;
    let diff = wantY - cur;
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, delta * 4) * 0.6;
    this._dodgeNudge = k;
  }

  // ── Ragdoll trigger (공개 API) ───────────────────────────────
  startRagdoll(dirY) {
    this.setState(NPC_STATES.ACCIDENT);
    this._ragdollT   = 0;
    this._ragdollDir = dirY ?? (Math.random() * Math.PI * 2);
  }

  // ── Accident fall (GLB) ──────────────────────────────────────
  _animateGLB() {
    if (this.state !== NPC_STATES.ACCIDENT) return;
    this._ragdollT = (this._ragdollT || 0) + 0.016;
    const t  = this._ragdollT;
    const rx = this.group.rotation.x;
    if (t < 0.25) {
      // 비틀거림
      this.group.rotation.z = Math.sin(t * 38) * 0.28 * (t / 0.25);
    } else if (rx < Math.PI / 2 - 0.04) {
      this.group.rotation.x += 0.045;
      this.group.position.y  = Math.max(0, 0.5 - this.group.rotation.x * 0.32);
    }
  }

  // ── Geometry animation fallback ──────────────────────────────
  _animateGeometry(elapsed) {
    const t = elapsed + this._animPhase;
    const parts = this._bodyParts;
    switch (this.state) {
      case NPC_STATES.IDLE:
        // Skip constant y-rotation when Yuka is providing movement direction
        if (parts.body && !this._yukaMoving) this.group.rotation.y += 0.0005;
        if (parts.body) parts.body.rotation.z = Math.sin(t * 0.8) * 0.02;
        break;
      case NPC_STATES.WORKING:
        // trade별 작업 모션
        if (this.trade === 'signal') {
          // 신호수 — 오른팔 위로 들고 좌우로 흔들기
          if (parts.armR) { parts.armR.rotation.x = -1.6 + Math.sin(t * 3.5) * 0.25; parts.armR.rotation.z = -0.4; }
          if (parts.armL) parts.armL.rotation.x = Math.sin(t * 1.2) * 0.15;
          if (parts.body) parts.body.rotation.z = Math.sin(t * 1.2) * 0.04;
        } else if (this.trade === 'rebar' || this.trade === 'formwork' || this.trade === 'lifting') {
          // 망치질 — 오른팔 큰 다운스윙
          const swing = Math.max(0, Math.sin(t * 3.2));
          if (parts.armR) { parts.armR.rotation.x = -1.3 + swing * 1.8; parts.armR.rotation.z = -0.2; }
          if (parts.armL) parts.armL.rotation.x = -0.4;
          if (parts.body) parts.body.rotation.x = swing * 0.12;
        } else if (this.trade === 'electric' || this.trade === 'plumbing' || this.trade === 'painting') {
          // 정밀 작업 — 양팔 앞으로 고정 + 미세 떨림
          if (parts.armR) { parts.armR.rotation.x = -1.0 + Math.sin(t * 12) * 0.06; parts.armR.rotation.z = -0.3; }
          if (parts.armL) { parts.armL.rotation.x = -1.0 + Math.cos(t * 12) * 0.06; parts.armL.rotation.z = 0.3; }
          if (parts.head) parts.head.rotation.x = -0.25;
        } else if (this.trade === 'excavator' || this.trade === 'earthwork' || this.trade === 'pour') {
          // 중량 작업 — 양팔 들어올리기 반복
          const lift = Math.sin(t * 1.6);
          if (parts.armR) parts.armR.rotation.x = -0.6 + lift * 0.5;
          if (parts.armL) parts.armL.rotation.x = -0.6 - lift * 0.5;
          if (parts.body) parts.body.rotation.x = lift * 0.08;
        } else {
          // 기본 — 걸음/팔 흔들기 (기존 동작)
          if (parts.armL) parts.armL.rotation.x =  Math.sin(t * 2) * 0.5;
          if (parts.armR) parts.armR.rotation.x = -Math.sin(t * 2) * 0.5;
          if (parts.legL) parts.legL.rotation.x = -Math.sin(t * 2) * 0.25;
          if (parts.legR) parts.legR.rotation.x =  Math.sin(t * 2) * 0.25;
        }
        break;
      case NPC_STATES.UNSAFE:
      case NPC_STATES.DANGER:
        if (parts.armL) parts.armL.rotation.x =  Math.sin(t * 3) * 0.7;
        if (parts.armR) parts.armR.rotation.x = -Math.sin(t * 3) * 0.7;
        if (parts.legL) parts.legL.rotation.x = -Math.sin(t * 3) * 0.4;
        if (parts.legR) parts.legR.rotation.x =  Math.sin(t * 3) * 0.4;
        break;
      case NPC_STATES.ACCIDENT: {
        this._ragdollT = (this._ragdollT || 0) + 0.016;
        const rt = this._ragdollT;
        const p  = this._bodyParts;
        if (rt < 0.22) {
          // 비틀거림 단계
          this.group.rotation.z = Math.sin(rt * 36) * 0.28 * (rt / 0.22);
        } else if (rt < 0.95) {
          // 낙하 단계
          const ft = (rt - 0.22) / 0.73;
          this.group.rotation.y  = this._ragdollDir || 0;
          this.group.rotation.x  = ft * (Math.PI * 0.47);
          this.group.position.y  = Math.max(0, 0.9 * (1 - ft * ft));
          if (p.armL) { p.armL.rotation.x = ft * 1.5;  p.armL.rotation.z = ft * 1.1; }
          if (p.armR) { p.armR.rotation.x = -ft * 1.0; p.armR.rotation.z = -ft * 0.9; }
          if (p.legL) { p.legL.rotation.x = -ft * 0.65; }
          if (p.legR) { p.legR.rotation.x =  ft * 0.45; }
          if (p.head) { p.head.rotation.x = -ft * 0.8; }
        } else {
          // 정착 단계 — 바닥에서 미세 반동
          this.group.rotation.x  = Math.PI * 0.47;
          this.group.rotation.z  = 0;
          this.group.position.y  = 0;
          const bt = rt - 0.95;
          if (bt < 1.2) {
            const bounce = Math.exp(-bt * 4.5) * Math.sin(bt * 14) * 0.028;
            this.group.position.y = Math.max(0, bounce);
          }
        }
        break;
      }
    }
  }

  // ── Movement helpers ─────────────────────────────────────────
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

  _checkSpontaneousAccident(_delta) {
    // Disabled: accidents only triggered via evaluateLift() in new 6-phase system
  }

  _moveTowardDanger(delta) {
    const target = new THREE.Vector3(-2, 0, -8);
    const pos    = this.group.position;
    const dir    = new THREE.Vector3().subVectors(target, pos);
    if (dir.length() > 0.3) {
      dir.normalize().multiplyScalar(delta * 0.4);
      pos.add(dir);
      this.group.rotation.y = Math.atan2(dir.x, dir.z) + (this._char ? Math.PI : 0);
    }
  }

  _syncTriggerMesh() {
    if (this.mesh) {
      this.mesh.position.x = this.group.position.x;
      this.mesh.position.z = this.group.position.z;
    }
  }

  // ── Interaction API ──────────────────────────────────────────
  receiveInstruction(lang) {
    this.hasInstruction = true;
    this.instructionLangMismatch = (lang !== this.language && lang !== 'en');
    if (this.instructionLangMismatch) {
      this._startAck('shake');
      return false;
    }
    this._startAck('nod');
    this.setState(NPC_STATES.WORKING);
    return true;
  }

  _startAck(kind) {
    this._ackT    = 0;
    this._ackDur  = 0.7;
    this._ackKind = kind;
    if (this.group && window.PLAYER && PLAYER.worldPos) {
      const dx = PLAYER.worldPos.x - this.group.position.x;
      const dz = PLAYER.worldPos.z - this.group.position.z;
      this._ackTargetYaw = Math.atan2(dx, dz) + (this._char ? Math.PI : 0);
    }
  }

  _updateAck(delta) {
    if (this._ackT == null || this._ackT >= this._ackDur) return;
    this._ackT += delta;
    const k = this._ackT / this._ackDur;
    const head = this._bodyParts && this._bodyParts.head;
    if (head) {
      head.rotation.x = this._ackKind === 'nod'
        ? Math.sin(k * Math.PI * 3) * 0.35
        : 0;
      head.rotation.y = this._ackKind === 'shake'
        ? Math.sin(k * Math.PI * 4) * 0.45
        : 0;
    }
    if (this._char && this.group) {
      const headBone = this.group.getObjectByName('mixamorigHead')
                    || this.group.getObjectByName('Head');
      if (headBone) {
        headBone.rotation.x = this._ackKind === 'nod'  ? Math.sin(k * Math.PI * 3) * 0.35 : 0;
        headBone.rotation.y = this._ackKind === 'shake' ? Math.sin(k * Math.PI * 4) * 0.45 : 0;
      }
    }
    if (this._ackTargetYaw != null && this.group) {
      let d = this._ackTargetYaw - this.group.rotation.y;
      while (d >  Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.group.rotation.y += d * Math.min(1, delta * 6);
    }
  }

  evacuate() {
    this._targetPos = new THREE.Vector3(12, 0, 5);
    this.setState(NPC_STATES.IDLE);
    this.hasInstruction = true;
  }

  triggerAccidentPose() {
    this.setState(NPC_STATES.ACCIDENT);
  }
}

// ── NPC Definitions (ID·역할·스킬·위치만 고정, 이름·경력은 랜덤) ──
// 시나리오별 — lifting 은 기존 5명. 그 외 시나리오는 분위기용 작업자 2~3명.
const NPC_DEFS_BY_SCENARIO = {
  lifting: [
    { id: 'gimc',   role: { ko:'신호수',     en:'Signaller',     vi:'Người ra hiệu', ar:'الإشاري' },     trade: 'signal',   language: 'ko', skill: 0.90, vestColor: 0xCC5018, position: [ 7,  0,  -6] },
    { id: 'park',   role: { ko:'슬링작업자', en:'Rigger',        vi:'Thợ móc cẩu',    ar:'عامل التطويق' }, trade: 'lifting',  language: 'ko', skill: 0.75, vestColor: 0xD4A217, position: [-4,  0,  -8] },
    { id: 'lee',    role: { ko:'고소작업자', en:'High-rise Worker', vi:'Thợ cao tầng', ar:'عامل المرتفعات' }, trade: 'scaffold', language: 'ko', skill: 0.80, vestColor: 0xCC5018, position: [ 0,  0, -14] },
    { id: 'ahmad',  role: { ko:'보조작업자', en:'Helper',        vi:'Phụ',            ar:'مساعد' },        trade: 'rebar',    language: 'ar', skill: 0.70, vestColor: 0xD4A217, position: [ 5,  0, -12] },
    { id: 'nguyen', role: { ko:'보조작업자', en:'Helper',        vi:'Phụ',            ar:'مساعد' },        trade: 'formwork', language: 'vi', skill: 0.65, vestColor: 0xCC5018, position: [-3,  0,  -4] },
  ],
  excavation: [
    { id: 'kim_op',  role: { ko:'굴착기운전원', en:'Excavator Operator', vi:'Vận hành máy xúc', ar:'مشغل الحفّار' }, trade: 'excavator', language: 'ko', skill: 0.85, vestColor: 0xCC5018, position: [-14, 0, -8] },
    { id: 'lee_sg',  role: { ko:'신호수',       en:'Signaller',          vi:'Người ra hiệu',    ar:'الإشاري' },       trade: 'signal',    language: 'ko', skill: 0.78, vestColor: 0xD4A217, position: [  9, 0,  2] },
    { id: 'nguyen2', role: { ko:'굴착작업자',   en:'Earthworker',        vi:'Thợ đào',           ar:'عامل الحفر' },    trade: 'earthwork', language: 'vi', skill: 0.65, vestColor: 0xCC5018, position: [ -3, 0,-18] },
  ],
  foundation: [
    { id: 'park_fw', role: { ko:'형틀목공',    en:'Formwork Carpenter', vi:'Thợ ván khuôn',  ar:'نجار قوالب' }, trade: 'formwork',  language: 'ko', skill: 0.82, vestColor: 0xD4A217, position: [-12, 0, -6] },
    { id: 'cho_rb',  role: { ko:'철근공',      en:'Rebar Worker',       vi:'Thợ thép',        ar:'عامل الحديد' }, trade: 'rebar',     language: 'ko', skill: 0.78, vestColor: 0xCC5018, position: [  8, 0,  3] },
    { id: 'ahmad2',  role: { ko:'타설공',      en:'Concrete Pourer',    vi:'Thợ đổ bê tông',  ar:'عامل الصب' },   trade: 'pour',      language: 'ar', skill: 0.70, vestColor: 0xD4A217, position: [  2, 0,-16] },
  ],
  envelope: [
    { id: 'kim_sc',  role: { ko:'비계공',      en:'Scaffolder',         vi:'Thợ giàn giáo',    ar:'فنّي السقالات' }, trade: 'scaffold',  language: 'ko', skill: 0.85, vestColor: 0xCC5018, position: [-10, 0,-15] },
    { id: 'lee_en',  role: { ko:'외장공',      en:'Envelope Worker',    vi:'Thợ vỏ ngoài',      ar:'عامل الواجهة' },  trade: 'envelope',  language: 'ko', skill: 0.78, vestColor: 0xD4A217, position: [ 11, 0,-12] },
    { id: 'nguyen3', role: { ko:'보조작업자',  en:'Helper',             vi:'Phụ',                ar:'مساعد' },         trade: 'helper',    language: 'vi', skill: 0.65, vestColor: 0xCC5018, position: [ -2, 0,  3] },
  ],
  mep_finish: [
    { id: 'kim_el',  role: { ko:'전기공',      en:'Electrician',        vi:'Thợ điện',           ar:'كهربائي' },      trade: 'electric',  language: 'ko', skill: 0.82, vestColor: 0xD4A217, position: [-9, 0, -3] },
    { id: 'park_mp', role: { ko:'설비공',      en:'Plumber',            vi:'Thợ ống nước',       ar:'سبّاك' },        trade: 'plumbing',  language: 'ko', skill: 0.78, vestColor: 0xCC5018, position: [ 7, 0,-13] },
    { id: 'ahmad3',  role: { ko:'도장공',      en:'Painter',            vi:'Thợ sơn',            ar:'دهّان' },        trade: 'painting',  language: 'ar', skill: 0.70, vestColor: 0xD4A217, position: [-3, 0,  4] },
  ],
};
// v3 통합 모드 — 페이즈별로 PHASE_CONTROLLER 가 동적 spawn. 초기 NPC 풀 비움.
// initNPCs(unified) 시 NPC 0명, 그 후 PHASE_CONTROLLER.enable() 이 페이즈 1 NPC spawn.
NPC_DEFS_BY_SCENARIO.unified = [];

// 후방호환: lifting 의 기존 NPC_DEFS 참조하는 코드를 위해 별칭 유지
const NPC_DEFS = NPC_DEFS_BY_SCENARIO.lifting;

// 언어별 이름 풀 — 매 세션 랜덤 선택
const NPC_NAMES = {
  ko: ['김민수','이지훈','박서준','최도윤','정시우','강하준','조이준','윤예준','장지호','임주원',
       '서건우','한현우','오정훈','신동현','권혁준','황준영','노재민','홍성민','문태영','양원석'],
  en: ['John Smith','David Brown','Michael Lee','Robert Kim','James Park','William Choi','Henry Cooper',
       'Daniel Wright','Thomas Hall','Charles Reed','Joseph Bell','Edward Murphy','Andrew Foster'],
  ar: ['أحمد المنصور','محمد الفهد','عمر السعيد','علي الناصر','يوسف الخالدي','حمزة العتيبي',
       'خالد القحطاني','عبدالله المطيري','سعد الحربي','فهد العنزي'],
  vi: ['Nguyễn Văn An','Trần Văn Bình','Lê Văn Chính','Phạm Văn Dũng','Hoàng Văn Em',
       'Vũ Quang Huy','Bùi Trọng Nghĩa','Đỗ Minh Khôi','Đặng Văn Phú','Lý Tuấn Khang'],
};

function _randomName(lang) {
  const pool = NPC_NAMES[lang] || NPC_NAMES.ko;
  return pool[Math.floor(Math.random() * pool.length)];
}

function _randomExperience() {
  return Math.floor(Math.random() * 25) + 3; // 3 ~ 27 년
}

GAME.npcs = [];

// ── Yuka entity manager (optional) ───────────────────────────
let _yukaManager = null;
const _yukaVehicles = new Map(); // npc.id → YUKA.Vehicle

function _initYuka() {
  if (typeof YUKA === 'undefined') return;
  // v3 — 멱등성: 이미 만들어진 manager 가 있으면 재사용 (phase_controller 사전 호출 케이스)
  if (_yukaManager) return;
  _yukaManager = new YUKA.EntityManager();
}

function initNPCs() {
  _initYuka();
  const defs = NPC_DEFS_BY_SCENARIO[GAME.scenarioId] || NPC_DEFS_BY_SCENARIO.lifting;
  _spawnNpcsFromDefs(defs);
}

// v3 — 페이즈 컨트롤러가 페이즈 전환 시 호출. _initYuka() 다시 안 함 (기존 NPC 보존).
// 반환: 새로 spawn 된 NPC 객체 배열 (호출 측에서 phase tagging 용도)
function spawnNpcsForScenario(scenarioId) {
  if (!_yukaManager) _initYuka();   // 안전망 (initNPCs 안 거치고 처음 호출 케이스)
  const defs = NPC_DEFS_BY_SCENARIO[scenarioId];
  if (!defs || !defs.length) return [];
  return _spawnNpcsFromDefs(defs);
}

function _spawnNpcsFromDefs(defs) {
  const spawned = [];
  defs.forEach(def => {
    const runtimeDef = Object.assign({}, def);
    runtimeDef.name       = _randomName(def.language);
    runtimeDef.experience = _randomExperience();
    runtimeDef.trade      = def.trade;
    runtimeDef.position   = [
      def.position[0] + (Math.random() - 0.5) * 1.5,
      def.position[1],
      def.position[2] + (Math.random() - 0.5) * 1.5,
    ];
    runtimeDef.skill = Math.max(0.45, Math.min(0.98, def.skill + (Math.random() - 0.5) * 0.16));

    const npc = new NPC(runtimeDef);
    npc.build();
    GAME.npcs.push(npc);
    _addYukaVehicle(npc);
    spawned.push(npc);
  });
  return spawned;
}

// v3 — 페이즈 컨트롤러가 호출. 지정된 NPC 들을 scene/yuka/interactables 에서 정리.
function despawnNpcs(npcsToRemove) {
  if (!npcsToRemove || !npcsToRemove.length) return;
  const removeIds = new Set(npcsToRemove.map(n => n.id));

  npcsToRemove.forEach(npc => {
    // YUKA vehicle 제거
    const v = _yukaVehicles.get(npc.id);
    if (v && _yukaManager && !v.fixed) {
      try { _yukaManager.remove(v); } catch (e) {}
    }
    _yukaVehicles.delete(npc.id);

    // scene 에서 group + trigger mesh 제거 (dispose 는 GC 위임 — 짧은 라이프사이클이므로 안전)
    if (npc.group && npc.group.parent) npc.group.parent.remove(npc.group);
    if (npc.mesh  && npc.mesh.parent)  npc.mesh.parent.remove(npc.mesh);
  });

  // GAME.npcs 에서 제거
  if (GAME.npcs) {
    GAME.npcs = GAME.npcs.filter(n => !removeIds.has(n.id));
  }

  // GAME.interactables 에서 npc 타입 + 해당 id 제거
  if (GAME.interactables) {
    GAME.interactables = GAME.interactables.filter(item => {
      if (item.type !== 'npc' && item.type !== 'action') return true;
      if (!item.npcId) return true;
      return !removeIds.has(item.npcId);
    });
  }
}

window.spawnNpcsForScenario = spawnNpcsForScenario;
window.despawnNpcs           = despawnNpcs;

// RMB 위치 지시용 — NPC 를 목적지로 이동 + Yuka home 갱신 (도달 후 워프 방지)
window.npcMoveTo = function (npc, x, z) {
  if (!npc || !npc.group) return;
  npc._targetPos = new THREE.Vector3(x, 0, z);
  npc.setState(NPC_STATES.WORKING);
  // Yuka vehicle home 도 갱신 — 도달 후 IDLE 복귀 시 새 위치 기준으로 wander
  const entry = _yukaVehicles.get(npc.id);
  if (entry) {
    entry.home.set(x, 0, z);
    if (entry.vehicle) entry.vehicle.position.set(x, 0, z);
  }
};

function _addYukaVehicle(npc) {
  if (!_yukaManager) return;

  // gimc (신호수): fixed position, no wander — handled separately in tickAllNPCs
  if (npc.id === 'gimc') {
    // Store as fixed entry (no YUKA.Vehicle needed)
    _yukaVehicles.set(npc.id, { fixed: true, home: new YUKA.Vector3(npc.position[0], 0, npc.position[2]) });
    return;
  }

  const v = new YUKA.Vehicle();
  v.position.set(npc.position[0], 0, npc.position[2]);
  v.maxForce = 2.5;
  v.mass     = 1;

  const wander = new YUKA.WanderBehavior();

  switch (npc.id) {
    case 'park':   // 슬링작업자: 인양 빔 근처 소반경, 보통 속도
      v.maxSpeed       = 0.6;
      wander.jitter    = 0.8;
      wander.radius    = 1.0;
      wander.distance  = 1.5;
      break;
    case 'lee':    // 고소작업자: 거의 고정, 최소 이동
      v.maxSpeed       = 0.3;
      wander.jitter    = 0.3;
      wander.radius    = 0.4;
      wander.distance  = 0.5;
      break;
    case 'ahmad':  // 보조작업자: 느린 속도, 소반경
    case 'nguyen':
      v.maxSpeed       = 0.4;
      wander.jitter    = 0.6;
      wander.radius    = 1.2;
      wander.distance  = 2.0;
      break;
    default:
      v.maxSpeed       = 1.0;
      wander.jitter    = 0.8;
      wander.radius    = 1.2;
      wander.distance  = 2.5;
  }

  v.steering.add(wander);
  _yukaManager.add(v);
  _yukaVehicles.set(npc.id, { vehicle: v, home: new YUKA.Vector3(npc.position[0], 0, npc.position[2]) });
}

// ── Exported tick (called from engine._loop) ─────────────────
function tickAllNPCs(delta, elapsed) {
  if (!GAME.state.gameStarted) return;

  // 1. Update Yuka manager first
  if (_yukaManager) {
    _yukaManager.update(delta);
  }

  // 2. Sync every Yuka vehicle → Three.js group (unconditionally each frame)
  _yukaVehicles.forEach((entry, npcId) => {
    const npc = GAME.npcs.find(n => n.id === npcId);
    if (!npc || !npc.group) return;

    // ── gimc (신호수): 고정 위치, 크레인 방향 고정 ──────────────
    if (entry.fixed) {
      // Only enforce position/rotation when not being moved via _targetPos
      if (!npc._targetPos) {
        npc.group.position.set(entry.home.x, 0, entry.home.z);
        // 크레인 방향(-Z): atan2(7 - 0, -6 - (-14)) = atan2(7, 8) ≈ Math.PI (뒤를 바라봄)
        // 크레인은 씬 -Z 방향에 있으므로 rotation.y = Math.PI
        npc.group.rotation.y = npc._char ? 0 : Math.PI;
        npc._yukaMoving = false;
        if (npc._char) npc._playAnim('Idle');
      }
      return;
    }

    // Only wander when IDLE and not moving to a target
    if (npc.state !== NPC_STATES.IDLE || npc._targetPos) return;

    const v    = entry.vehicle;
    const home = entry.home;

    // Home radius constraint (per-role max wander distance)
    const _homeRadius = { park: 2, lee: 1, ahmad: 3, nguyen: 3 };
    const maxR = _homeRadius[npcId] || 5;
    const dx   = v.position.x - home.x;
    const dz   = v.position.z - home.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > maxR) {
      v.position.x = home.x + (dx / dist) * (maxR * 0.96);
      v.position.z = home.z + (dz / dist) * (maxR * 0.96);
      v.velocity.x *= -0.5;
      v.velocity.z *= -0.5;
    }

    // World boundary clamp
    v.position.x = Math.max(-32, Math.min(32, v.position.x));
    v.position.z = Math.max(-28, Math.min(12, v.position.z));

    // ── Three.js sync ────────────────────────────────────────
    npc.group.position.x = v.position.x;
    npc.group.position.z = v.position.z;
    npc.group.position.y = 0;

    const spd = Math.sqrt(v.velocity.x * v.velocity.x + v.velocity.z * v.velocity.z);
    if (spd > 0.08) {
      npc.group.rotation.y = Math.atan2(v.velocity.x, v.velocity.z) + (npc._char ? Math.PI : 0);
      // Switch to Walk anim when moving
      if (npc._char) npc._playAnim('Walk');
    } else {
      // Switch to Idle anim when stopped
      if (npc._char) npc._playAnim('Idle');
    }
    // Flag so geometry animation skips constant y-rotation
    npc._yukaMoving = spd > 0.08;
  });

  // 3. Tick each NPC (mixer update, geometry anim, trigger sync)
  GAME.npcs.forEach(npc => npc.tick(delta, elapsed));
}

// ── Label update (called from engine._loop) ──────────────────
function updateNPCLabels() {
  if (!GAME.state.gameStarted || GAME.state.gameOver) return;
  GAME.npcs.forEach(npc => {
    if (!npc.group) return;
    let el = document.getElementById(`npc-label-${npc.id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `npc-label-${npc.id}`;
      el.className = 'npc-label';
      document.body.appendChild(el);
    }
    const sp = npcScreenPos(npc);
    if (!sp) { el.style.opacity = '0'; return; }
    const d = GAME.camera.position.distanceTo(npc.group.position);
    if (d > 12) { el.style.opacity = '0'; return; }
    const danger = npc.state === NPC_STATES.UNSAFE || npc.state === NPC_STATES.DANGER;
    el.className   = danger ? 'npc-danger-badge' : 'npc-label';
    el.textContent = danger ? `⚠ ${npc.name}` : `${npc.name} · ${npc.roleText()}`;
    el.style.left  = sp.x + 'px';
    el.style.top   = sp.y + 'px';
    el.style.opacity = Math.min(1, (12-d)/4).toString();
  });
}

// ── Screen-space labels ──────────────────────────────────────
function npcScreenPos(npc) {
  if (!GAME.camera || !GAME.renderer) return null;
  const pos = npc.group.position.clone().setY(npc.group.position.y + 2.3);
  pos.project(GAME.camera);
  if (pos.z > 1) return null;
  return {
    x: (pos.x + 1) / 2 * window.innerWidth,
    y: (-pos.y + 1) / 2 * window.innerHeight,
  };
}

