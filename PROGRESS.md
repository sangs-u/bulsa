# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.0 잔여 9건 일괄 처리**
  · GLB MANIFEST 로컬 우선 (`assets/glb/<name>.glb` · HEAD 사전점검 → 폴백)
  · 4종 시나리오 scene.js 에 `ASSETS.attach` 후크업 (excavator/pump_truck/tower_crane/scaffold_kit)
  · 18시 타임아웃 — 전용 패널 + 다시하기/홈 버튼 + 4개국어
  · 시계 위젯 툴팁 4개국어 + refreshClockI18n
  · 5공정 완료 시 8초 자동 진행 카운트다운 (allDone 한정 · 클릭 시 취소 · 4언어)
  · rc_frame sub-step 2종: formwork_minigame.js · pour_minigame.js (createInspectionMinigame 재사용, 층별 4지점)
  · rc_loop.js — 5층 × 3 sub-step 컨트롤러 + HUD 위젯
  · interaction.js _onBeamPlaced 에 RC sub-step 흐름 후크업 (양중→타설→다음 층 형틀→양중)
  · core/motion.js — Mixamo 클립 10종 + 도구 5종 캐시, attachTool IK 본 탐색, setMotion 폴백
  · NPC.build 에 직종별 도구 자동 부착 (signal=flag, formwork=hammer, rebar=wrench, mep=welder, survey=detector)
  · 크레인 운전원 거부권 확장 — 계획서 매개변수(SWL/각도/서명여부) 위반 시 거부 + 4개국어

## 검증 상태
- node 구문 검사 14/14 OK · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 실제 클립 7~10개 다운로드 → assets/glb/anim_*.glb (현재는 폴백 동작)
2. 무사이 작업계획서 UI 인게임 이식 (현장사무소 PC/태블릿)
3. rc_loop HUD 위젯 i18n applyLang 트리거 연결
4. ASSETS.attach 로 GLB 교체 시 procedural 자동 그룹화 + 숨김 (lifting/envelope crane/scaffold)
5. 사고 ↔ 계획서 매개변수 양방향 검증 (현재는 단방향)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
