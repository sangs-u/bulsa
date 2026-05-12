# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 7 batch (commit dc2005a → 8 커밋)
- **명(命) 게이미피케이션** — 안전지수 → 4언어 명/Lives/Mạng/أرواح. 변수명 `safetyIndex` 유지. 임계 비네팅(≤30 active, ≤15 critical) + 명 floating +/-N · pulse glow
- **간섭 런타임 결선** — interference.js 매 프레임 평가 · 적색 THREE.Line · 6초 누적/prob×dt 트리거 · _humanCond (12 토큰 4언어 자연어) · accidentLabel 통합 노출
- **작업 큐** — 23 TASK_TYPES + 10 INTERFERENCE_MATRIX + cond AND 평가(+dismantle/unchecked/organic/premature flag) · 4 시나리오 시드 + lifting RC 동적 enqueue · NPC 1:N trade 매핑(라운드로빈)
- **명령 풀** — INSTRUCTION_POOLS_BY_TASK 23종 완성 · TRAPS_GLOBAL 8 (flag-trigger 4 + safe/danger 4) · giveInstruction _applyInstructionFlag · 풀 정렬 (safe-fit > 일반 > flag > danger)
- **학습 도구** — H 키 명령 히스토리 (localStorage 영속, 30개, 10가지 result 색상 + accident/interference 이벤트) · 우하단 미니 버튼 ✓/✗/☠ 카운트 · pause 통계 사고 누적 TOP 5 (accidentLabel)
- **개발 도구** — __bulsa.{tasks,conflicts,addTask,windSet,simulateAccident,history,help}
- **사고 데이터** — GLOBAL_ACCIDENTS 5종 신규 (falling_debris·fire_explosion·panel_drop·swing_drop·premature_load 4언어) + accident_labels.js 20종 매핑

## 검증 상태
- `npm run check` PASS 90/90 · GitHub Actions 활성 · 시각 플레이쓰루 미실시

## v2.0 다음 작업 (순서)
1. 시각 플레이쓰루 — 비네팅·작업 칩·간섭 라인·히스토리 패널 실동작 검증
2. 명령 풀 그룹화 — 활성 작업 type 별로 시각 구분 (학습 UX)
3. 사고 라이브러리 패널 — 미발생 사고도 학습 가능 (A 키)
4. 5 시나리오 URL → 한 부지 통합으로 흡수 (큰 작업)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
- **명명**: 안전지수 → 명(命) — BULSA(不死) 정체성, 0 되면 종료
