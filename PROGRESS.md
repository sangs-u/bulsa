# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — 자율 마라톤
- **v1.1 합계 ~30건** (8 커밋 푸시, 단일 세션)
  · GLB MANIFEST 로컬·HEAD 사전점검·4 시나리오 ASSETS.attach 후크
  · 18시 타임아웃 패널·시계 i18n·5공정 8초 자동진행 카운트다운
  · rc_frame sub-step 2종(formwork/pour) + rc_loop 5층 컨트롤러
  · motion.js (Mixamo 클립 10 + 도구 5 + IK 어태치) + NPC 직종별 도구 자동
  · 중복 함수 픽스 (bumpSkill 단일화 · _shakeCameraBuild/_shakeCameraAccident)
  · plan 매개변수 양방향 검증 (excavation/foundation/envelope/mep_finish)
  · 4 시나리오 운전석 거부권 일반화 (board* + open*Console)
  · 22 사고 vi/ar 88개 키 · accident.js langSuffix 자동 선택
  · core 5 파일 + scenarios 16 파일 한국어 하드코딩 i18n (백그라운드 에이전트 포함)
  · `_speakRefusal()` Web Speech API 4언어 TTS
  · lifting 작업계획서 SWL/각도/가닥수 사용자 입력 + 4언어 라벨
  · `qa/syntax-check.js` + `npm run check` + GitHub Actions CI
  · `applyDataLangI18n()` data-lang-* primitive + setLang 후크
  · index.html 시나리오 카드 SCENARIOS title/desc 4언어 + _l() 헬퍼
  · 4 plan-panel (excav/found/env/mep) 모든 입력 라벨 data-lang-*
  · NPC role 16개 4언어 객체 + roleText() 메소드 (npc/instruction/minigame 3 사용처)
  · CLAUDE.md 모바일 원격작업 가이드 (WSL+tmux+Tailscale+claude --continue)

## 검증 상태
- `npm run check` PASS 84/84 · GitHub Actions 활성화 · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 클립 7~10개 → assets/glb/anim_*.glb
2. 무사이 작업계획서 UI 인게임 이식
3. v1.0 시각 플레이쓰루 — 실 브라우저 5공정 통과
4. inspector 위반 21항목 4언어 완료 — 통계/수료증 4언어 잔여
5. NPC AI 거부권 음성 — 사전녹음 (TTS 한계 보완)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
