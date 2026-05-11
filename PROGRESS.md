# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.0 청사진 재정의** — "5층 건물 1동 완공" 5공정 구조로 SPEC.md 갈아엎음
  · 5개 stub 폴더 폐기 (confined/electrical/fire/scaffold/vehicle → 5공정 흡수)
  · 사무실 픽셀아트 제거 · 무사이 인게임화 v1.1로 이연
- **v1.x 4종** — core/assets.js (GLB 로더+캐시+8초 폴백) / building.js 솟아오르는 빌드 애니 + 흙먼지 + 카메라 셰이크 / npc.js 작업 제스처 + 1.4m 회피 · 머리 회전 / timepressure.js 09:00→18:00 시계
- 그 외 마라톤 18 모듈 (achievements/bgm/inspector/events/physics/pickup/intro/tutorial/pause_menu/objective_marker/scene_decor/juice 등)

## 검증 상태
- node 구문 검사 5/5 OK · 정적 서버 200 OK
- 시각 플레이쓰루 미실시 — chrome 자동화로 확인 권장

## v1.0 잔여 작업 (우선순위 순)
1. **GLB URL 채우기** — Kenney Vehicle Pack 굴착기/펌프카 CDN 확정 후 ASSETS.setUrl
2. **hazards.js 박스 메시 → ASSETS.attach** 호출 추가
3. **18:00 타임아웃 UX** — 전용 패널 + 다시하기 버튼
4. **시계 위젯 i18n** (현재 한국어 알림만 → 4개국어)
5. **5공정 연결 흐름** — 시나리오 완료 시 다음 공정 자동 트리거
6. **rc_frame.formwork_rebar / pour_cure** — 잔여 sub-step 미니게임
7. **rc_frame 5층 회전 루프** — sub-step × 5층 = 15 사이클
8. **모션 시스템** — Mixamo 클립 7~10 + 스테이트머신 + IK 도구 어태치
9. **크레인 운전원 NPC 거부권** — 계획서 위반 시 거부 분기

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- Phase 1·2 인게임 작업계획서 UI는 무사이 v2 후 v1.1
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지 · Rapier.js는 v3.0
