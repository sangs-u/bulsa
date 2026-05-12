# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 34 batch · 34 커밋 (단일 세션)
- **v2.0 데이터** — TASK_TYPES 23 · INTERFERENCE_MATRIX 17 · GLOBAL_ACCIDENTS 5 신규 · accident_labels 20 (4언어)
- **간섭 런타임** — 매 프레임 평가 · sustained 강도 라인 · NPC 추적 끝점 · origin 패널
- **작업 큐** — rc_loop sub-step enqueue · inspect 지속작업 · NPC 1:N trade 매핑
- **명령 시스템** — INSTRUCTION_POOLS_BY_TASK 23 · TRAPS_GLOBAL 8 · flag set/clear · 정렬·그룹 헤더·hint·검색 input · trade fit ✗ · 거부 6변종 · 통합 모드 30초 자동 reset
- **학습 UI** — H 히스토리(영속·라이브러리 점프) · L 라이브러리(검색+카테고리 5탭·매트릭스 룰 카드·발생 횟수) · pause 통계 · 작업 칩(텔레포트 클릭)
- **명(命) 게이미피케이션** — 4언어 · 임계 비네팅 · floating · pulse glow
- **인스펙터** — task.flags 4종 적발 + 과태료
- **🆕 통합 모드 (?s=unified)** — 오픈월드 자유 게임
  · 5 scene build + 5 hazard register + 14 NPC 영역 분산 (±22) + 18+ task seed
  · scene baseline 중복 회피 (lifting 만) · mesh THREE.Group offset
  · 카메라 z 22 · HUD "🏗 오픈 부지" · 시간압박 비활성 · RC 즉시 시작 · intro/blocker/허브 통합 라벨
  · 업적 3종 + HUD 미니 타이머 게이지 (▮/▯ 5분/10분 진행)
  · __bulsa.zone(name) 텔레포트 · 명령 30초 자동 reset

## 검증 상태
- `npm run check` PASS 92/92 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 CLAUDE.md 의 체크리스트 (A~J) 순서대로**

## v2.0 다음 작업
1. **집 PC 검증 체크리스트** (CLAUDE.md) — A 진입 / B 분산 / C 칩 / D 명령 / E 간섭 / F 학습 UI / G 명 / H 인스펙터 / I 업적 / J 회귀
2. 회귀 발견 시 즉시 수정 (mesh.getWorldPosition / 그룹 안 collider / 단일 시나리오 회귀)
3. 검증 후 — 블루프린트 통합 도면 / 저장 시스템 / NPC 빠른 호출 단축키

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
