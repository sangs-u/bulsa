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

  function _toastConflict(rule, a, b) {
    const prefix = { ko: '⚠ 간섭', en: '⚠ Interference', vi: '⚠ Xung đột', ar: '⚠ تداخل' }[currentLang] || '⚠ 간섭';
    const msg    = prefix + ': ' + _label(a.type) + ' × ' + _label(b.type) + ' — ' + rule.cond;
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
      }
      track.sustainedS += delta;
      track.lastSeenT   = nowT;

      // 확률적 사고 — rule.prob 를 초당 위험률로 사용 (보수: 누적 6초 임계를 주 트리거로)
      const perFrameRisk = (c.rule.prob || 0) * delta * 0.04;
      if (Math.random() < perFrameRisk) {
        _fireAccident(c.rule);
        return;
      }

      // 임계 누적 사고 — 보수적 안전망
      if (track.sustainedS >= SUSTAIN_THRESHOLD_S) {
        _fireAccident(c.rule);
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

  function _fireAccident(rule) {
    if (typeof triggerAccident !== 'function') return;
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
