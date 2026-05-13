# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-13) — batch #52~53 · 페이즈 시스템 완성

- **#52 페이즈 진척도 수정** — `_evaluateProgress`: task.progress(항상 0) 폐기 → 각 시나리오 *_STATE 불리언 플래그로 계산 (excavation/foundation/envelope/mep_finish 각 5개). `_notifyChange`: 페이즈 전환 시 `GAME.state.phase = 1` 리셋.
- **#53 페이즈 완성 4종** — ① STATE 리셋(`_resetPhaseStates`): 페이즈 전환 시 *_STATE 플래그 초기화 (이전 게임 잔재 제거). ② `window.npcMoveTo`: _targetPos + Yuka vehicle home 동기화 (도달 후 워프 방지). ③ RMB 실제 NPC 이동(npcMoveTo 호출) + Y키 final 버그 수정(advance(true) 발화). ④ `_playPhaseClearFx`: 흰색/황금 플래시 + cutscene 캡션 + cameraShake + 튜토리얼 완주 엔딩 연결.

## 직전 완료 — v3 마라톤 batch #44~51
- #44 script load order fix / #45 마우스 LMB·RMB / #46 phase_controller.js 신규
- #47~48 scene 시각 전환 / #49 NPC 풀 페이즈 게이팅 / #50 HUD 진행바 / #51 업적+검증헬퍼

## 검증 상태
- `npm run check` PASS 98/98 · GitHub Actions 활성 · **시각 플레이쓰루 미실시**

## 다음 작업 (우선순위)
1. **수료증 통합 모드 분기** — `ending.js` 시나리오 라벨 `'5페이즈 종합 튜토리얼'` (4언어) + 과태료·층수 데이터 반영
2. **HUD 진행바 실시간 갱신** — `updateHUD()` 에서 `PHASE_CONTROLLER.progress()` 를 매 프레임 진행바에 반영 (현재 정적)
3. **단일 시나리오 회귀 검증** — `?s=lifting` 등 5종 정상 진입 확인 (phase_controller 는 unifiedMode 에서만 활성이나 교차 영향 확인 필요)
4. **시각 플레이쓰루** — 집 PC 에서 `?s=unified` 굴착→기초→골조→외장→마감 전 페이즈 순차 진행 + 엔딩 확인

## v3 이후
- 오픈월드 + 부지 매물 + 협동 멀티 (Supabase 백엔드)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성
- **저장 전략**: 1단계 localStorage → 2단계 Supabase
