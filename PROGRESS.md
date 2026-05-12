# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 진행 중 — v3 마라톤 (페이즈 통합 모드 재설계)
**비전 변경**: v2 unified mode (5 시나리오 공간 분할) 폐기 결정. 새 통합 모드 = 한 부지에서 **페이즈 1~5 순차 시공** (굴착 → 기초 → 골조 → 외장 → 마감), 플레이어 = 작업반장 1인. 향후 오픈월드 협동으로 확장. 전체 9 batch 마라톤 (#44~#51).

## 최근 완료 (2026-05-13) — Phase 0 batch #44~45 · 기본기 보강
- **#44 script load order + E키 UX** — game.html 에서 `tasks.js`/`interference.js`/`task_chips.js` 를 `engine.js` 보다 앞으로 이동 (engine IIFE 가 즉시 사용 → 이전 버그: unified 모드 활성 작업 0개). interaction.js NPC 인터랙션 반경 2.8 → 3.5m 완화 + E 키 빈 입력에 "가까이 다가가세요" 토스트.
- **#45 마우스 입력 표준화** — LMB=상호작용 (E와 동일, 미니게임 hold 포함), RMB=작업반장 위치 지시 (지면 raycast → 노랑 ring 마커 + 가장 가까운 NPC 4언어 토스트, 2.4초 페이드). crosshair `.targetable` 클래스 추가 (타겟 노출 시 노랑 글로우). 인터랙트 프롬프트 라벨 "[E / 좌클릭]" 으로 통일. 우클릭 contextmenu pointerlock 시 차단.
- **#46 phase_controller.js 신규** — 페이즈 1~5 (굴착·기초·골조·외장·마감) 상태머신. PHASES 메타데이터 + label 4언어 + npcTradePool + completion 조건 (RC_LOOP 또는 task progress 평균 80~85%). enable/advance/canAdvance/progress/onChange API. 인스펙터 flag 미해결 시 advance 차단. engine.js: unifiedMode 에서 v2 4시나리오 동시 시드 폐기, PHASE_CONTROLLER.enable() 만 호출 (페이즈 1=굴착 시드). _loop 에서 .tick() 호출. `__bulsa.phase(n)` 강제 이동 + `__bulsa.advance()` 디버그.
- **#47~48 페이즈 scene 시각 전환** — phase_controller.js 에 _buildCurrentPhaseScene + _teardownPhaseScene 추가. enable() 시 페이즈 1 build*Scene + register*Hazards 호출 후 새 mesh 들을 `phase_${id}_${key}` group 에 묶어 추적. advance() 시 이전 phase group 제거 + dispose (geometry/material/map) + interactables/hazards stale 항목 (mesh 가 scene tree 에 없는 것) 자동 정리 + 다음 페이즈 build. engine.js: unifiedMode 에서 baseline scene build 스킵 + v2 4-zone group offset 코드 폐기 (105 line 삭제).
- **#49 NPC 풀 페이즈 게이팅** — `NPC_DEFS_BY_SCENARIO.unified = []` (이전 14명 사전 합산 폐기). npc.js 에 `spawnNpcsForScenario(sid)` + `despawnNpcs(npcs)` 노출 + `_initYuka` 멱등성 (manager 재사용). phase_controller _buildCurrentPhaseScene 에서 페이즈 시드 시나리오 기반 NPC spawn + `_phaseId` 태깅. _teardownPhaseScene 에서 해당 phaseId NPC 만 제거 (group/mesh scene 분리 + YUKA vehicle 제거 + GAME.npcs/interactables 필터). 결과: 통합 모드 시작 시 NPC 14 → 페이즈 1 NPC 3명만 (굴착기운전원/신호수/굴착작업자).
- **#50 HUD 페이즈 진행바 + 전환 알림** — hud.js: 통합 모드 분기를 `_renderUnifiedPhaseHud` 로 교체. 라벨 "🏗 페이즈 N/5 — 굴착·흙막이" + 미션 영역 4언어 hint (incomplete/inspector_flag/ready/final 4 케이스). 화면 상단 `#hud-phase-progress` 진행바 동적 생성 (360px, 진행률 0~100% 그라디언트, 완료 시 황금색). interaction.js: Y 키 페이즈 전환 (advanceBlocker 시 4언어 토스트). PHASE_CONTROLLER.onChange 구독으로 전환 시 4.5초 토스트 + SFX.beep(880Hz).

## 직전 완료 — v2.0 batch #41~43
- #41 i18n pause 메뉴 4언어 / #42 디버그 콘솔 보강 / #43 인스펙터 다이얼로그 4언어

## 직전 완료 — v2.0 batch #36~40
- #36 N 키 NPC 호출 / #37 저장 시스템 1단계 / #38 부지 통합 도면 / #39 허브 강화 / #40 hazard 통합 회귀 fix

## 검증 상태
- `npm run check` PASS 97/97 · GitHub Actions 활성

## v3 마라톤 다음 작업 (#45~#51 진행 예정)
- **#45 (Phase 0)** — LMB=NPC/오브젝트 선택, RMB=위치 명령, 인터랙션 거리 글로우 강화 (RTS 식 작업반장 컨셉 토대)
- **#46 (Phase 1)** — `core/phase_controller.js` 신규: 페이즈 1~5 상태머신 + 전환 조건
- **#47~48** — 페이즈별 scene 시각 전환 (한 좌표에서 굴착 → 기초 → 골조 → 외장 → 마감 mesh swap)
- **#49** — task seed 페이즈 게이팅 + NPC 풀 페이즈별 교체 (굴착 페이즈에 마감공 spawn 안 됨)
- **#50** — HUD 페이즈 진행바 + 전환 알림 + 인스펙터 flag 미해결 시 진입 차단
- **#51** — v2 unifiedZones 코드 정리 + 업적/사고 페이즈 맥락화 + 검증 준비

## v3 이후 (튜토리얼 클리어 후)
- 오픈월드 + 부지 매물 + 협동 멀티 (Supabase 백엔드)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
