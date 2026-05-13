# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트.
> **v4 설계 전환 — 반드시 DESIGN_V4.md 먼저 읽을 것**

## 최근 완료 (2026-05-13) — batch #52~54

- **#52** 페이즈 진척도 *_STATE 플래그 기반 수정 + GAME.state.phase 동기화
- **#53** STATE 리셋 + npcMoveTo Yuka 동기화 + RMB NPC 이동 + Y키 final 버그 + 페이즈 클리어 연출
- **#54** 튜토리얼 수료증 통합 모드 분기 (5페이즈 라벨·법조문·과태료·층수 4언어) · NPC soft push-back (반경 0.77m, ACCIDENT 통과) · 카메라 bob 진폭 2배+abs(sin)+roll · NPC 끄덕임/고개젓기(_startAck) · trade→motion 매핑 · E키 cameraShake 피드백

## 직전 완료 — v3 마라톤 batch #44~51
- #44 script load order / #45 마우스 LMB·RMB / #46 phase_controller 신규
- #47~48 scene 시각 전환 / #49 NPC 페이즈 게이팅 / #50 HUD 진행바 / #51 업적+헬퍼

## 검증 상태
- `npm run check` PASS 98/98 · **시각 플레이쓰루 미실시 (BLOCKING)**

## v4 전환 — 현재 상태
- 수직 회전 클램프 버그 수정 완료 (batch #56)
- **v4 설계 확정 (2026-05-13)**: DESIGN_V4.md 참조
- 기존 interaction.js flag 방식 → 행위 기반으로 전면 교체 결정

## v4 다음 작업 (배치 순서)
1. `core/material.js` — 자재 정의 + GAME.materials 레지스트리
2. `core/carry.js` — 플레이어 휴대 상태 (E픽업, G내려놓기, 중량→속도)
3. `core/hazard_zone.js` — 구역별 위험 누적·감소·사고 판정
4. `core/act.js` — 행위 정의 + hold_e 게이지 + 완료 콜백
5. `core/marker.js` — 3D 설치 마커
6. `core/phase_v4.js` — 페이즈 전환 + 씬 빌드
7. 페이즈 1 전체 구현

## 핵심 결정사항
- 행위 기반: 물류→운반→설치가 실제 게임플레이
- 위험 노출: 구역별 독립 수치, 임계점 초과 시 자연 사고
- 안전 행위: 위험 감소 트리거 (체크리스트 아님)
- 유지: engine.js, player.js, npc.js, accident.js, hud.js, i18n
- 교체: interaction.js, phase_controller.js, scenarios/*/actions.js
