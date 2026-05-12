# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #40 · 통합 모드 hazard 안전 통합 (회귀 사전 차단)
- **5 시나리오 hazards.js** — `GAME.hazards = []` / `GAME.interactables = []` 강제 리셋 제거. 모두 `= [...] || []` 가드로 변경. **버그**: 통합 모드에서 4 register 가 순서대로 호출될 때마다 배열이 wipe 되어 마지막(mep_finish) 만 살아남던 회귀 제거.
- **core/interaction.js** — proximity fallback 의 `mesh.position` → `mesh.getWorldPosition()` 으로 변경. unified zone group offset 적용 mesh 도 정확한 거리 측정. CLAUDE.md 체크리스트 J 항목 사전 fix.

## 직전 완료 — v2.0 batch #36~39
- #36 NPC N 키 호출 / #37 저장 시스템 1단계 (localStorage) / #38 부지 통합 도면 (🗺 탭) / #39 허브 카드 강화 (등급 칩·환영바·s06 글로우)

## 검증 상태
- `npm run check` PASS 97/97 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 아래 우선순위로 확인**

## v2.0 다음 작업 (집 PC 도착 시 — 우선순위 순)
1. **회귀 검증 (BLOCKING)** — `?s=unified` 진입 → 5 영역 모두 NPC + 작업 + 인터랙터블 동작 확인. **batch #40 이전엔 lifting/excavation/foundation/envelope 4 영역의 E 키 인터랙션이 안 됐을 가능성 큼**. 모든 영역에서 E 키 popup 열리는지·작업 칩 클릭 텔레포트 후 NPC 호출 가능한지 확인.
2. **신규 기능 시각 확인** — N 키 가장 가까운 NPC 호출 + popup · P 키 `💾 저장` 탭 (export → import → reset) · B 키 `🗺 부지 통합` 탭 (5 영역 박스 + 실시간 NPC/작업/간섭 dot + 플레이어 시선) · 허브 환영 바 + s06 황금 글로우
3. **단일 시나리오 회귀** — `?s=lifting` 등 5 시나리오 정상 진입 + phase 진행 (batch #40 변경이 단일에선 무영향이어야 함)
4. **CLAUDE.md A~J 체크리스트** — 마라톤 34 batch 이후 미검증된 항목 전부

## v2.0 추가 작업 (검증 후)
- index 허브 카드: 시나리오별 진행 phase 표시 / 통합 모드 진입 카운트
- 통합 모드: 시나리오 그룹별 색상 영역 표시 (지면 텍스처 4분할)
- (배포 후) 저장 2단계 — Supabase OAuth + saveExportJSON 동기화 (리더보드·기기 이전)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
