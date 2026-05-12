// v2.0 간섭 평가 런타임 — 매 프레임 호출, 시각 경고선 + 사고 트리거
//
// tasks.js 의 데이터(TASK_TYPES + INTERFERENCE_MATRIX + evaluateInterference)
// 를 게임 루프와 씬·사고 시스템에 연결.
//
// 동작:
//   - 매 프레임 conflicts 평가
//   - 새 충돌 등장 시 두 task.loc 사이 적색 라인 표시
//   - 충돌 지속 시간(_sustainedS) > SUSTAIN_THRESHOLD 면 triggerAccident(rule.accident)
//   - rule.prob 는 누적 1초 위험률(=확률 × dt) 로 환산해 stochastic 사고 가능
//
// 의존:  THREE · GAME · evaluateInterference · TASK_TYPES · triggerAccident

(function () {
  const SUSTAIN_THRESHOLD_S = 6.0;  // 보수적: 6초 지속되면 강제 사고
  const LINE_Y              = 2.2;  // 라인 높이 (지표면 위)
  const LINE_COLOR          = 0xff3030;

  // 충돌별 누적 상태 — key = sorted task id pair
  // value = { sustainedS, line, lastSeenT, rule }
  const _conflictTracks = new Map();

  function _key(a, b) {
    return a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
  }

  function _midPoint(a, b) {
    const ax = (a.loc && a.loc.x) || 0, az = (a.loc && a.loc.z) || 0;
    const bx = (b.loc && b.loc.x) || 0, bz = (b.loc && b.loc.z) || 0;
    return { x: (ax + bx) / 2, z: (az + bz) / 2 };
  }

  function _createLine(a, b) {
    if (typeof THREE === 'undefined' || !GAME.scene) return null;
    const ax = (a.loc && a.loc.x) || 0, az = (a.loc && a.loc.z) || 0;
    const bx = (b.loc && b.loc.x) || 0, bz = (b.loc && b.loc.z) || 0;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ax, LINE_Y, az),
      new THREE.Vector3(bx, LINE_Y, bz),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color:       LINE_COLOR,
      transparent: true,
      opacity:     0.85,
      depthTest:   false,
    });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = 9999;
    GAME.scene.add(line);
    return line;
  }

  function _updateLineEndpoints(line, a, b) {
    if (!line || !line.geometry) return;
    const ax = (a.loc && a.loc.x) || 0, az = (a.loc && a.loc.z) || 0;
    const bx = (b.loc && b.loc.x) || 0, bz = (b.loc && b.loc.z) || 0;
    const arr = line.geometry.attributes.position.array;
    arr[0] = ax; arr[1] = LINE_Y; arr[2] = az;
    arr[3] = bx; arr[4] = LINE_Y; arr[5] = bz;
    line.geometry.attributes.position.needsUpdate = true;
  }

  function _updateLineIntensity(line, sustained) {
    if (!line || !line.material) return;
    // 0s → opacity 0.55 / 6s → 1.0 + pulse
    const ratio = Math.min(1, sustained / SUSTAIN_THRESHOLD_S);
    const baseOpacity = 0.55 + 0.40 * ratio;
    // critical 단계(≥80%) 에는 펄스
    if (ratio >= 0.8) {
      const phase = (performance.now() / 180) % (Math.PI * 2);
      line.material.opacity = baseOpacity * (0.7 + 0.3 * Math.sin(phase));
    } else {
      line.material.opacity = baseOpacity;
    }
    // 임계 가까울수록 더 강한 적색 (color shift)
    const r = 1, g = 0.19 - 0.15 * ratio, b = 0.19 - 0.15 * ratio;
    line.material.color.setRGB(r, Math.max(0, g), Math.max(0, b));
  }

  function _disposeLine(line) {
    if (!line) return;
    if (line.parent) line.parent.remove(line);
    if (line.geometry) line.geometry.dispose();
    if (line.material) line.material.dispose();
  }

  function _label(taskType) {
    const def = (typeof TASK_TYPES !== 'undefined') && TASK_TYPES[taskType];
    if (!def) return taskType;
    const l = def.label && (def.label[currentLang] || def.label.ko);
    return l || taskType;
  }

  const _COND_PHRASE = {
    within_radius_6m: { ko: '6m 반경 내', en: 'within 6m radius', vi: 'trong bán kính 6m', ar: 'ضمن نطاق 6م' },
    within_5m:        { ko: '5m 이내',    en: 'within 5m',        vi: 'trong 5m',          ar: 'ضمن 5م' },
    within_1m:        { ko: '1m 이내',    en: 'within 1m',        vi: 'trong 1m',          ar: 'ضمن 1م' },
    below_floor:      { ko: '아래층 수직',en: 'directly below',   vi: 'tầng dưới',         ar: 'الطابق السفلي' },
    same_floor:       { ko: '같은 층',    en: 'same floor',       vi: 'cùng tầng',         ar: 'الطابق نفسه' },
    same_slab:        { ko: '같은 슬래브',en: 'same slab',        vi: 'cùng sàn',          ar: 'البلاطة نفسها' },
    wind_gt_10mps:    { ko: '풍속 10m/s 초과', en: 'wind > 10m/s',vi: 'gió > 10m/s',       ar: 'الرياح > 10م/ث' },
    no_signal:        { ko: '신호수 없음',en: 'no signaler',      vi: 'không người ra hiệu', ar: 'بلا مُوجِّه' },
    dismantle:        { ko: '해체 중',    en: 'while dismantling',vi: 'đang tháo dỡ',      ar: 'أثناء التفكيك' },
    unchecked:        { ko: '점검 누락',  en: 'unchecked',        vi: 'chưa kiểm tra',     ar: 'بدون فحص' },
    organic:          { ko: '유기용제',   en: 'organic solvent',  vi: 'dung môi hữu cơ',   ar: 'مذيب عضوي' },
    premature:        { ko: '양생 미완',  en: 'premature',        vi: 'chưa đủ dưỡng hộ',  ar: 'معالجة غير مكتملة' },
  };

  function _humanCond(cond) {
    if (!cond) return '';
    return cond.split('+').map(s => s.trim()).filter(Boolean).map(tok => {
      const e = _COND_PHRASE[tok];
      return (e && (e[currentLang] || e.ko)) || tok;
    }).join(' + ');
  }

  function _toastConflict(rule, a, b) {
    const prefix = { ko: '⚠ 간섭', en: '⚠ Interference', vi: '⚠ Xung đột', ar: '⚠ تداخل' }[currentLang] || '⚠ 간섭';
    const accLbl = (typeof accidentLabel === 'function') ? ' → ' + accidentLabel(rule.accident) : '';
    const msg    = prefix + ': ' + _label(a.type) + ' × ' + _label(b.type) + ' — ' + _humanCond(rule.cond) + accLbl;
    if (typeof showActionNotif === 'function') { try { showActionNotif(msg, 3500); return; } catch (e) {} }
    if (typeof showHUDAlert    === 'function') { try { showHUDAlert(msg);          return; } catch (e) {} }
    if (typeof showAlert       === 'function') { try { showAlert(msg);             return; } catch (e) {} }
    console.warn('[interference]', msg);
  }

  function updateInterference(delta) {
    if (typeof evaluateInterference !== 'function') return;
    if (!GAME.state || GAME.state.gameOver || GAME.state.paused) return;

    const conflicts = evaluateInterference();
    const seenKeys  = new Set();
    const nowT      = performance.now();

    for (const c of conflicts) {
      const k = _key(c.a, c.b);
      seenKeys.add(k);

      let track = _conflictTracks.get(k);
      if (!track) {
        track = {
          sustainedS: 0,
          line:       _createLine(c.a, c.b),
          rule:       c.rule,
          lastSeenT:  nowT,
        };
        _conflictTracks.set(k, track);
        _toastConflict(c.rule, c.a, c.b);
        if (typeof recordInterferenceEvent === 'function') {
          try { recordInterferenceEvent(c.rule, _label(c.a.type), _label(c.b.type)); } catch (e) {}
        }
      }
      track.sustainedS += delta;
      track.lastSeenT   = nowT;

      // 라인 끝점은 NPC 가 움직이면 따라가야 함 + sustained 에 따라 강도 변화
      _updateLineEndpoints(track.line, c.a, c.b);
      _updateLineIntensity(track.line, track.sustainedS);

      // 확률적 사고 — rule.prob 를 초당 위험률로 사용 (보수: 누적 6초 임계를 주 트리거로)
      const perFrameRisk = (c.rule.prob || 0) * delta * 0.04;
      if (Math.random() < perFrameRisk) {
        _fireAccident(c.rule, c.a, c.b);
        return;
      }

      // 임계 누적 사고 — 보수적 안전망
      if (track.sustainedS >= SUSTAIN_THRESHOLD_S) {
        _fireAccident(c.rule, c.a, c.b);
        return;
      }
    }

    // 해소된 충돌 정리 — 시각 라인 제거
    for (const [k, track] of _conflictTracks) {
      if (!seenKeys.has(k)) {
        _disposeLine(track.line);
        _conflictTracks.delete(k);
      }
    }
  }

  function _fireAccident(rule, a, b) {
    if (typeof triggerAccident !== 'function') return;
    // 사고 원인 글로벌 노출 — 사고 패널이 읽음
    GAME._lastAccidentOrigin = {
      kind: 'interference',
      cond: rule.cond,
      a:    a && _label(a.type),
      b:    b && _label(b.type),
    };
    // 모든 라인 정리
    for (const [, track] of _conflictTracks) _disposeLine(track.line);
    _conflictTracks.clear();
    triggerAccident(rule.accident);
  }

  function clearInterferenceLines() {
    for (const [, track] of _conflictTracks) _disposeLine(track.line);
    _conflictTracks.clear();
  }

  window.updateInterference      = updateInterference;
  window.clearInterferenceLines  = clearInterferenceLines;
})();
