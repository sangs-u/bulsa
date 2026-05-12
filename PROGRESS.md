# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 3 batch (7→2→1→5→3→4→6 + 디버그)
- **batch #1**: 토스트 폴백(showActionNotif>HUDAlert>Alert>console) · NPC 위치→task.loc 매 프레임 동기화(trade 매핑) · 활성 작업 칩 위젯(hud-tl, 그룹색·충돌 적색 glow) · cond AND 평가 리팩토링 + dismantle/unchecked/organic/premature flag 토큰 · GLOBAL_ACCIDENTS 5종 vi/ar 번역
- **batch #2**: INSTRUCTION_POOLS_BY_TASK 14→23 (formwork_support·guardrail·found_pour·panel·glass·ext_install·survey·inspect) · 명령 히스토리 UI(H키 토글, 30개 + 8가지 결과 색상 · ✓/✗/☠ 카운트 미니 버튼) · giveInstruction 8 분기에 recordInstructionEvent 결선
- **batch #3**: TRAPS_GLOBAL 4→8 (flag-trigger 명령: start_dismantle·premature_load·organic_solvent·skip_shoring_check) · giveInstruction 에 _applyInstructionFlag (성공/위험강행 시 task.flags 활성) · debug_console.js __bulsa.tasks/conflicts/addTask/windSet/simulateAccident 등

## 검증 상태
- `npm run check` PASS 89/89 · GitHub Actions 활성 · 시각 플레이쓰루 미실시
- 정상 사이클(NPC 양중 반경 밖 유지) → 충돌 0 / NPC 반경 침범 → 6초 누적 사고
- 매트릭스의 +flag 조건은 사용자가 flag-trigger 명령을 수행해야 활성 (안전 default)

## v2.0 다음 작업 (순서)
1. 시각 플레이쓰루 — 적색 라인 표시·작업 칩·히스토리 패널 실동작 검증
2. 다른 4 시나리오에도 RC 식 작업 큐 결선 (foundation→pour, envelope→panel, mep_finish→electric/paint)
3. 사고 누적 통계 패널 (학습 도구)
4. 5 시나리오 URL → 한 부지 통합으로 흡수 (큰 작업)
5. NPC 다중 인스턴스 → task 다중 인스턴스 (지금은 trade 첫 NPC 한 명만 동기화)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
