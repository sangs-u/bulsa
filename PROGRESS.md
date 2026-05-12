# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — 자율 마라톤 ~40 건 / 14 커밋
- GLB 파이프라인 (assets.js + 4 시나리오 attach) · 18시 타임아웃 패널 · rc_frame sub-step (formwork/pour) · rc_loop 5층 컨트롤러
- motion.js (Mixamo 클립 10 + 도구 5 + IK) · NPC 직종별 도구 자동
- 중복 함수 픽스 (bumpSkill 단일, _shakeCameraBuild/Accident 분리)
- plan 매개변수 양방향 검증 (excav/found/env/mep_finish)
- 4 시나리오 운전석/콘솔 거부권 일반화 (board*/open*Console)
- 22 사고 88 vi/ar 키 + accident.js langSuffix · 21 inspector 위반 라벨 vi/ar
- 11 achievement vi/ar · 13 INSTRUCTIONS labelVi/labelAr · 16 NPC role vi/ar + roleText()
- core 15 파일 + scenarios 16 파일 + game.html 4 plan-panel + index.html 시나리오 카드 + intro/loading 한국어 → 4언어
- `qa/syntax-check.js` + `npm run check` + GitHub Actions CI 자동 PASS 84/84
- `applyDataLangI18n()` data-lang-* primitive · `_speakRefusal()` Web Speech TTS
- lifting 작업계획서 SWL/각도/가닥수 사용자 입력 · LIFT_STATE_LABELS 4언어
- CLAUDE.md 모바일 원격작업 가이드 (WSL+tmux+Tailscale+claude --continue)

## 검증 상태
- `npm run check` PASS 84/84 · GitHub Actions 활성화 · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 클립 7~10개 → assets/glb/anim_*.glb
2. 무사이 작업계획서 UI 인게임 이식
3. v1.0 시각 플레이쓰루 — 실 브라우저 5공정 통과
4. 수료증 (certificate) 4언어 검증 (마지막 잔여 UI)
5. NPC AI 거부권 음성 사전녹음 (TTS 한계 보완)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
