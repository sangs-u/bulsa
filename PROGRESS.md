# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 청사진 재정의 + 골격 구축
- **SPEC.md v2 재작성** — "시나리오" 모델 폐기, **작업 큐 + 간섭 매트릭스** 모델 정립
  · TASK_TYPES 23종 (가설/본공사 1회/본공사 사이클/마감/지속)
  · INTERFERENCE_MATRIX 10건 (lift+작업자, pour+아래층, paint+electric 등)
  · 명령 풀 합성 = ∪ INSTRUCTION_POOLS_BY_TASK[active.type] + TRAPS_GLOBAL
- **CLAUDE.md 보강** — 다음 세션이 v2 모델·코드 잔재·마이그레이션 순서 즉시 파악
- **core/tasks.js 신규** — TASK_TYPES + INTERFERENCE_MATRIX + 작업 큐 API (addTask/getActiveTasks/evaluateInterference) + buildInstructionPoolFromActiveTasks() 합성 헬퍼
- **instruction.js 통합** — INSTRUCTION_POOLS_BY_TASK 14종 + TRAPS_GLOBAL 4종 + openInstructionPopup 가 활성 작업 우선, 비어있으면 phase 풀 폴백 (백워드 호환)
- **이전 누적**: v1.x 시나리오 분리 모드 + 4언어 i18n 광범위 + GitHub Actions CI 활성 + 작업 분기 시스템 (NPC 거부/숙련/위험변종)

## 검증 상태
- `npm run check` PASS 85/85 · GitHub Actions 활성 · 시각 플레이쓰루 미실시

## v2.0 다음 작업 (순서)
1. 간섭 평가 매 프레임 호출 → 충돌 시 시각 경고선 + 사고 trigger
2. 5층 사이클 컨트롤러 (rc_loop.js) 가 작업 큐에 addTask 호출 — 자동 enqueue
3. HUD 활성 작업 리스트 위젯 (phase 위젯 옆)
4. 명령 히스토리 UI — 시도/거부/사고 기록 (학습 도구)
5. 5 시나리오 URL → 한 부지 통합으로 흡수 (큰 작업)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
