# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — 자율 마라톤 ~41 건 / 17 커밋
- **v1.2 핵심: NPC 명령 혼합풀 + 4분기 반응 시스템** — 정답지 메뉴 → 판단 훈련 시뮬레이터로 전환
  · INSTRUCTIONS 풀에 위험변종·타직종·타phase 함정 9개 추가
  · giveInstruction 분기: 언어/직종/phase/위험/숙련 5단계
  · 직종 미스매치 → NPC 거부 + 안전지수 -5 + 4언어 멘트
  · phase 미스매치 → -3 멘트
  · 위험변종 → 50% NPC 양심 거부 / 50% 마지못해 수행 (70% 사고)
  · 숙련도 미달 → 시도 실패 + 페널티 (사고 아님)
  · UI: 위험변종 적색 .inst-danger CSS · 직종 필터 제거 (전체 노출)
- v1.1: GLB 파이프라인·rc_frame sub-step·motion.js·plan 매개변수 양방향
- v1.1: 4 시나리오 운전석 거부권·22 사고 88 vi/ar·21 inspector·11 achievement vi/ar·13 INSTRUCTIONS vi/ar·16 NPC role
- v1.1: core 15 + scenarios 16 + plan-panel 4 + index.html + intro/loading 4언어
- v1.1: qa/syntax-check.js·npm run check·GitHub Actions CI 84/84 PASS
- v1.1: data-lang-* primitive·_speakRefusal TTS·lifting 매개변수 UI
- CLAUDE.md 모바일 원격작업 가이드 (WSL+tmux+Tailscale)

## 검증 상태
- `npm run check` PASS 84/84 · GitHub Actions 활성 · 시각 플레이쓰루 미실시

## v1.2 다음 작업
1. 다른 시나리오 (excavation/foundation/envelope/mep_finish) 에도 명령 혼합풀 확장
2. NPC 거부/실패 멘트 음성 (Web Speech TTS 활용)
3. 명령 히스토리 UI — 플레이어가 시도한 명령·반응 기록 (학습용)
4. Mixamo 클립 다운로드·무사이 인게임 이식
5. v1.0 시각 플레이쓰루

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
