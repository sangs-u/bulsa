# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 진행 중 — v3 마라톤 (페이즈 통합 모드 재설계)
**비전 변경**: v2 unified mode (5 시나리오 공간 분할) 폐기 결정. 새 통합 모드 = 한 부지에서 **페이즈 1~5 순차 시공** (굴착 → 기초 → 골조 → 외장 → 마감), 플레이어 = 작업반장 1인. 향후 오픈월드 협동으로 확장. 전체 9 batch 마라톤 (#44~#51).

## 최근 완료 (2026-05-13) — Phase 0 batch #44 · BLOCKING fix
- **#44 script load order + E키 UX** — game.html 에서 `tasks.js`/`interference.js`/`task_chips.js` 를 `engine.js` 보다 앞으로 이동 (engine IIFE 가 즉시 사용 → 이전 버그: unified 모드 활성 작업 0개). interaction.js NPC 인터랙션 반경 2.8 → 3.5m 완화 + E 키 빈 입력에 "가까이 다가가세요" 토스트 (이전: 키 눌러도 무반응 인상).

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
