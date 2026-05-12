# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #38 · 블루프린트 통합 도면 (🗺 부지 통합 탭)
- **blueprints/unified-plan.js** — `BLUEPRINT_UNIFIED` (5 zone 좌표·라벨·icon·color · bounds ±45/32)
- **blueprints/viewer.js** — 4번째 탭 `🗺 부지 통합` (통합 모드에서만 노출, 첫 진입 시 자동 선택). 5 zone 박스 · 5m 격자 · 외곽 울타리. **실시간** 1초 주기 재렌더: NPC dot · 활성 작업 dot (그룹색·flag 주황) · `evaluateInterference()` 직접 호출한 적색 간섭 라인 · 플레이어 위치+시선. 우측 범례 (현황 수치 + 마커 의미 + 영역 색).
- **qa/syntax-check.js** — `blueprints/` ROOTS 추가 (97/97 PASS)

## 직전 완료 — v2.0 batch #36~37 · NPC N 키 호출 + localStorage 저장 시스템 1단계

## 검증 상태
- `npm run check` PASS 97/97 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 CLAUDE.md A~J + N 키 + 저장 탭 + B 키 부지 통합 탭 확인**

## v2.0 다음 작업
1. **집 PC 검증 체크리스트** + 신규 (N 키 호출 · 💾 저장 탭 · 🗺 부지 통합 탭)
2. index 허브 카드 강화 (자유 모드 부각·5 시나리오 카드 통일)
3. 통합 모드 hazard 안전 통합
4. (배포 후) 저장 2단계 — Supabase OAuth + saveExportJSON 동기화 (리더보드·기기 이전)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
