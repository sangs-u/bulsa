# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 RC 루프 → 작업 큐 결선
- **rc_loop.js 가 작업 큐 enqueue/dequeue** — 사이클 진행에 따라 task 자동 등록/해제
  · initRcLoop: 지속 작업 lift{0,0} + signal{7,7} 1회 등록
  · _SUBSTEP_TASKS: formwork_rebar=[formwork(8,0)+rebar(-8,0)] / pour_cure=[pour(0,8)+cure(0,8)]
  · loc 분산 — 양중 반경(6m) 밖 배치로 정상 사이클은 충돌 없음
  · advanceRcStep 직전 sub-step dequeue + 다음 sub-step enqueue + 사이클 종료시 지속 작업 정리
  · 층 진행 시 지속 작업 floor 동기화 (_updateContinuousTaskFloor)
- **interference.js** perFrameRisk 0.15 → 0.04 (누적 6초 임계 위주, 확률 트리거 보조)
- **이전 누적**: SPEC.md v2 · TASK_TYPES 23 · INTERFERENCE_MATRIX 10 · core/tasks.js · interference.js · GLOBAL_ACCIDENTS 5종 신규

## 검증 상태
- `npm run check` PASS 86/86 · GitHub Actions 활성 · 시각 플레이쓰루 미실시
- 정상 사이클(=NPC 가 양중 반경 밖 유지) → 충돌 0 / NPC 가 반경 침범 → 6초 누적 사고

## v2.0 다음 작업 (순서)
1. HUD 활성 작업 리스트 위젯 (RC 진행 위젯 옆에 작업 칩 표시)
2. NPC 위치 → task.loc 동기화 (반경 침범 실제 평가)
3. 시나리오 dataset 5종 사고 vi/ar 번역 + 비-lifting 시나리오로 RC 사이클 적용 검토
4. 명령 히스토리 UI — 시도/거부/사고 기록 (학습 도구)
5. 5 시나리오 URL → 한 부지 통합으로 흡수 (큰 작업)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
