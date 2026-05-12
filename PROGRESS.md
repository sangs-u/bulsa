# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #36 · NPC 빠른 호출 (N 키)
- **npc_quickcall.js** — N 키 = 카메라 기준 최단거리 NPC 의 instruction popup 즉시 호출 (걸어갈 필요 없음). 두 번 누르면 다음 NPC 로 사이클. mesh.getWorldPosition · TRADES 표시 · 4언어 토스트. `__bulsa.callNpc()` 디버그 헬퍼
- **engine.js** — 자유 모드 진입 안내 토스트에 `N=가까운 NPC 호출` 추가 (4언어)

## 직전 완료 (2026-05-12) — v2.0 마라톤 34 batch · 34 커밋 (단일 세션)
- v2.0 데이터 · 간섭 런타임 · 작업 큐 · 명령 시스템 · 학습 UI · 명(命) · 인스펙터 · 통합 모드
- 상세: 이전 PROGRESS 히스토리 (git log batch #1 ~ #35)

## 검증 상태
- `npm run check` PASS 93/93 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 CLAUDE.md 의 체크리스트 (A~J) 순서대로**

## v2.0 다음 작업
1. **집 PC 검증 체크리스트** (CLAUDE.md) — A 진입 / B 분산 / C 칩 / D 명령 / E 간섭 / F 학습 UI / G 명 / H 인스펙터 / I 업적 / J 회귀 · 신규 N 키 호출 동작 확인
2. 회귀 발견 시 즉시 수정 (mesh.getWorldPosition / 그룹 안 collider / 단일 시나리오 회귀)
3. 검증 후 — 블루프린트 통합 도면 / 저장 시스템 / N 키 사이클 UX 튜닝 (현재 1↔2 이상 NPC 사이클)
4. (선택) index 허브 카드 통합 모드 부각 / 통합 모드 hazard 안전 통합

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
