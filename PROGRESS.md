# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 간섭 런타임 결선
- **core/interference.js 신규** — 매 프레임 evaluateInterference() 호출
  · 충돌 등장 시 두 task.loc 사이 적색 THREE.Line 자동 표시
  · 누적 6초 지속 또는 prob × dt 확률 트리거 → triggerAccident()
  · 충돌 해소 시 라인 자동 dispose
- **engine.js _loop()** 에 updateInterference(delta) 후크
- **GLOBAL_ACCIDENTS 5종 추가** — falling_debris · fire_explosion · panel_drop · swing_drop · premature_load (4언어 desc/cause/law/procedure 골격)
- **이전 누적 (v2.0 골격)**: SPEC.md v2 · TASK_TYPES 23 · INTERFERENCE_MATRIX 10 · core/tasks.js · instruction.js 풀 합성

## 검증 상태
- `npm run check` PASS 86/86 · GitHub Actions 활성 · 시각 플레이쓰루 미실시
- **주의**: 간섭 런타임은 활성 task 가 enqueue 되어야 동작. 현재 큐 enqueue 자(rc_loop 등) 미통합 → 다음 단계 1번.

## v2.0 다음 작업 (순서)
1. **5층 사이클 컨트롤러(rc_loop.js) → addTask 호출 — 자동 enqueue (간섭 실동작 키)**
2. HUD 활성 작업 리스트 위젯 (phase 위젯 옆)
3. 추가 사고 ID vi/ar 번역 보강 + 시나리오 dataset 정합
4. 명령 히스토리 UI — 시도/거부/사고 기록 (학습 도구)
5. 5 시나리오 URL → 한 부지 통합으로 흡수 (큰 작업)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
