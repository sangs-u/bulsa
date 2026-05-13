# BULSA 개발 현황
> **v4 설계 전환 — 반드시 DESIGN_V4.md 먼저 읽을 것**

## 최근 완료 (2026-05-13) — v4 batch

- **#56** 카메라 수직 360° 버그 수정 (YXZ Euler 쿼터니언 방식)
- **#57** v4 코어 시스템 신규: material.js · carry.js · hazard_zone.js · act.js · marker.js · anim_gen.js
- **#58** phase_v4.js (5페이즈 행위 기반 튜토리얼) + engine 루프 연결 (?mode=v4 진입점)
  - 17개 행위 정의 (survey→railing→rebar→sling→signal→loto 등)
  - 페이즈별 마커·위험구역·자재 자동 배치
  - hazard_zone/marker/material/carry.js window.* exports 추가
  - 구문검증 PASS 105/105

## 검증 상태
- `npm run check` PASS 105/105
- **시각 플레이쓰루 미실시 (BLOCKING)** — ?mode=v4 진입 후 전체 흐름 검증 필요

## 다음 작업
1. ?mode=v4 실제 플레이쓰루 검증 (마커 보이는지, E홀드 작동, 위험구역 색상)
2. carry.js ↔ interaction.js 연동 (E키 자재 픽업 중복 방지)
3. NPC 직종별 모션 연결 (trade→setMotion 매핑)
4. 페이즈 완료 후 오픈 월드 진입 구현
5. HUD에 carry 상태 + 마커 E키 힌트 표시

## 핵심 결정사항
- 행위 기반: 물류→운반→설치가 실제 게임플레이
- 위험 노출: 구역별 독립 수치, 임계점 초과 시 자연 사고
- 안전 행위: 위험 감소 트리거 (체크리스트 아님)
- Mixamo 애니메이션: 나중에 교체 가능 (현재 procedural + Idle/Walk/Run 폴백)
