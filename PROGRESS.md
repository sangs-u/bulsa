# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.1 마라톤 추가 7건**
  · `qa/syntax-check.js` + `npm run check` — 84 .js 구문 검증 자동화
  · CLAUDE.md 모바일 작업환경 가이드 통합 (WSL2+tmux+Tailscale+claude --continue)
  · `_speakRefusal()` — 운전원 거부 시 Web Speech API TTS (ko/en/vi/ar lang 자동)
  · lifting 작업계획서 매개변수화 — SWL/각도/가닥수 사용자 직접 입력 (`plan-sling-*` 3개 input + 4언어 라벨)
  · LIFT_STATE_LABELS 4언어 객체화 + `_liftLabel()` 헬퍼
  · interaction.js+skill.js+minigame.js+pause_menu.js+pickup.js 한국어 하드코딩 i18n
  · scenarios actions/minigame 의 사용자 노출 한국어 하드코딩 i18n (백그라운드 에이전트)
- **v1.1 6건** (직전) — 중복 함수·plan 검증·4 시나리오 거부권 일반화·22 사고 vi/ar 88개·accident.js langSuffix
- **v1.1 3건** (직전) — setLang 후크·procedural 그룹화·양방향 검증

## 검증 상태
- `npm run check` PASS 84/84 · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. game.html 의 패널 한국어 텍스트 → setLang 후크 자동 갱신 검증 (특히 env/found/mep plan-panel)
2. Mixamo 실제 클립 7~10개 다운로드 → assets/glb/anim_*.glb
3. 무사이 작업계획서 UI 인게임 이식 (현장사무소 PC/태블릿)
4. v1.0 시각 플레이쓰루 — 실 브라우저에서 5공정 통과 검증
5. CI 통합 — push 시 `npm run check` GitHub Actions

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
