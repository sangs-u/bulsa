# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #41~43 · i18n + 디버그 보강
- **#41 i18n** — pause 메뉴 라벨 4언어 (타이틀·4탭·메뉴 4버튼·설정·난이도·튜토리얼·저장 탭·통계 5섹션 + 5 시나리오명 + 6 결과·retry/quit confirm). 언어 변경 시 패널 자동 재빌드. save.js 플레이타임 단위 4언어. index 환영 바·등급 칩 4언어. CLAUDE.md "모든 텍스트 i18n" 위반 정리.
- **#42 디버그** — `__bulsa = Object.assign(...)` 안전 머지 (save/callNpc 보호). 신규: `dumpStats()` · `seedStats({scenario,grade,runs,deaths})` · `seedProfile({name,hours})` · `clearAllSeed()` · `phase(n)` · `fines(krw)` · `npcs()` · `allConflicts()` · 카테고리 정렬된 `help()`.
- **#43 인스펙터 i18n + 검토** — 인스펙터 다이얼로그/도착 토스트 4언어 (이전: ko 또는 ko/en 분기). 코드 검토 결과 batch #40 fix 가 inspector flag path 에 회귀 없음 확인 (GAME.activeTasks 직접 읽음, zone offset 무관).

## 직전 완료 — v2.0 batch #36~40
- #36 N 키 NPC 호출 / #37 저장 시스템 1단계 / #38 부지 통합 도면 / #39 허브 강화 / #40 hazard 통합 회귀 fix

## 검증 상태
- `npm run check` PASS 97/97 · GitHub Actions 활성 · **시각 플레이쓰루 미실시**

## v2.0 다음 작업 (집 PC 도착 시 — 우선순위)
1. **회귀 검증 (BLOCKING)** — `?s=unified` 5 영역 E 키 인터랙션 (batch #40 fix 후 lifting/excavation/foundation/envelope 다 동작해야)
2. **UI 검증 (콘솔 헬퍼 사용)** — `__bulsa.seedStats({scenario:'lifting',grade:'A',runs:3,deaths:1})` + `__bulsa.seedProfile({name:'tester',hours:2.5})` → 허브 새로고침 → 환영 바·등급 칩 표시 확인. 언어 ko↔en↔vi↔ar 토글 시 pause 메뉴 즉시 갱신 확인
3. **신규 기능** — N 키 호출 / 💾 저장 탭 export-import-reset / 🗺 부지 통합 탭 / s06 황금 글로우
4. **단일 시나리오 5종 회귀** — phase 진행 정상
5. **CLAUDE.md A~J 체크리스트**

## v2.0 추후 작업 (검증 후)
- 통합 모드 지면 4분할 (시나리오 그룹 색)
- (배포 후) 저장 2단계 — Supabase OAuth + 동기화 (리더보드·기기 이전)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
