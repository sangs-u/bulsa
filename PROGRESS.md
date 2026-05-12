# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.1 마라톤 막판 5건**
  · `applyDataLangI18n()` — HTML `data-lang-{ko,en,vi,ar}` 속성 자동 갱신 (setLang 후크)
  · 4 시나리오 plan-panel 타이틀 data-lang-* 적용
  · GitHub Actions CI — `.github/workflows/check.yml` (push 시 syntax-check)
  · `_instLangSwitchLabel()` — 지시 언어 토글 4언어
  · core/tutorial.js TUT 사전 4언어, core/npc.js 신호수 interactable 4언어, 16개 scenarios 파일 한국어 하드코딩 → 4언어 inline 객체
- **v1.1 마라톤 7건** (직전) — qa/syntax-check 자동화, CLAUDE.md 모바일 가이드, TTS, lifting 매개변수 UI, LIFT_STATE_LABELS 4언어, 5 core 파일 i18n
- **v1.1 6건** (직전) — 중복 함수, plan 검증, 4 시나리오 거부권, 22 사고 vi/ar 88개, accident.js langSuffix
- **v1.1 3건** (직전) — setLang 후크, procedural 그룹화, 양방향 검증

## 검증 상태
- `npm run check` PASS 84/84 · GitHub Actions 활성화 · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 클립 7~10개 → assets/glb/anim_*.glb
2. 무사이 작업계획서 UI 인게임 이식
3. v1.0 시각 플레이쓰루 — 실 브라우저에서 5공정 통과 검증
4. index.html 허브 페이지 시나리오 카드 데이터 i18n (현재 ko 하드코딩)
5. excav-plan-panel + found/env/mep plan-panel 입력 라벨 data-lang-* 적용

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
