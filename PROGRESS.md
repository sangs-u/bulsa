# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-13) — batch #52~54

- **#52** 페이즈 진척도 *_STATE 플래그 기반 수정 + GAME.state.phase 동기화
- **#53** STATE 리셋 + npcMoveTo Yuka 동기화 + RMB NPC 이동 + Y키 final 버그 + 페이즈 클리어 연출
- **#54** 튜토리얼 수료증 통합 모드 분기 (5페이즈 라벨·법조문·과태료·층수 4언어) · NPC soft push-back (반경 0.77m, ACCIDENT 통과) · 카메라 bob 진폭 2배+abs(sin)+roll · NPC 끄덕임/고개젓기(_startAck) · trade→motion 매핑 · E키 cameraShake 피드백

## 직전 완료 — v3 마라톤 batch #44~51
- #44 script load order / #45 마우스 LMB·RMB / #46 phase_controller 신규
- #47~48 scene 시각 전환 / #49 NPC 페이즈 게이팅 / #50 HUD 진행바 / #51 업적+헬퍼

## 검증 상태
- `npm run check` PASS 98/98 · **시각 플레이쓰루 미실시 (BLOCKING)**

## 다음 작업
1. **플레이어 카메라 euler.z 충돌** — `camera.rotation.z = bobRoll` 이 포인터락 마우스 룩과 충돌 가능. quaternion 기반 카메라라면 `.rotation.z` 직접 할당이 무시될 수 있음 → 검증 필요
2. **NPC _avoidPlayer `PLAYER.position` 버그** — `player.js`는 `PLAYER.worldPos` 사용, `npc.js:297`은 `PLAYER.position` 참조 → 회피 무작동. `worldPos`로 수정 필요
3. **시각 플레이쓰루** — 집 PC에서 `?s=unified` 굴착→기초→골조→외장→마감 순차 + 수료증 확인
4. **단일 시나리오 5종 회귀** — lifting/excavation/foundation/envelope/mep_finish 진입 확인

## v3 이후
- 오픈월드 + 부지 매물 + 협동 멀티 (Supabase 백엔드)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지
- **명명**: 안전지수 → 명(命) · BULSA(不死) · 저장: localStorage → Supabase
