# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.1 3건 처리**
  · i18n/strings.js setLang → refreshClockI18n + RC_LOOP._renderRcHud + refreshRcLoopI18n 즉시 호출
  · rc_loop HUD title 툴팁 4언어 + 외부 노출 RC_LOOP._renderRcHud
  · lifting `_buildCrane` 정적 메시 → craneStaticGroup 으로 분리, GLB 로드 시 visible=false (훅·케이블·hook block 은 양중 애니용으로 유지)
  · envelope `_buildScaffolding` → scaffoldGroup 그룹화 + onAttached 자동 숨김
  · 사고 ↔ 계획서 양방향 검증 — lifting `_validateLiftPlan()` (SWL 사용률·각도·가닥수 분기) + foundation FOUND_CHECKS 에 planRebarSpacing/planConcStrength/planMatArea 추가 (excavation 은 이미 적용됨)
- **v1.0 잔여 9건 일괄 처리** (이전 커밋)

## 검증 상태
- node 구문 검사 6/6 OK · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 실제 클립 7~10개 다운로드 → assets/glb/anim_*.glb (현재는 폴백 동작)
2. 무사이 작업계획서 UI 인게임 이식 (현장사무소 PC/태블릿)
3. excavation/foundation 시나리오 모든 NPC 거부권 확장 (현재 lifting 만)
4. 모바일 SSH+tmux 원격 작업환경 가이드 PROGRESS.md 외부에 기록 (현재 채팅에만)
5. v1.0 시각 플레이쓰루 — 실 브라우저에서 5공정 통과 검증

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
