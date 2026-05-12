# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 30 batch · 30 커밋 (단일 세션)
- **v2.0 데이터** — TASK_TYPES 23 · INTERFERENCE_MATRIX 17 · GLOBAL_ACCIDENTS 5 신규 · accident_labels 20 (4언어)
- **간섭 런타임** — 매 프레임 평가 · 적색 라인 sustained 강도 + NPC 추적 + origin 패널
- **작업 큐** — rc_loop sub-step 자동 enqueue · NPC 1:N trade 매핑 · inspect 지속작업 추가
- **명령 시스템** — INSTRUCTION_POOLS_BY_TASK 23 · TRAPS_GLOBAL 8 · flag set/clear · 정렬·type 그룹 헤더 · trade fit ✗ · 거부 4언어 6변종 · hint footer
- **학습 UI** — H 히스토리(영속+라이브러리 점프) · L 라이브러리(검색+상세) · pause 통계(시나리오/사고/명령 7종 카운터) · 작업 칩(그룹색·충돌·flag·풍부 tooltip·max-width)
- **명(命) 게이미피케이션** — 4언어 · 임계 비네팅(≤30/≤15) · floating +/-N · pulse glow
- **인스펙터** — task.flags 4종 적발 + 과태료 자동
- **🆕 통합 모드 (?s=unified)** — 오픈월드 자유 게임 토대
  · 5 scene build + 5 hazard register + 14 NPC 영역 분산 (±22) + 18+ task seed
  · scene baseline 중복 회피 (lifting 만 sky/ground) · mesh THREE.Group 영역 offset
  · 카메라 z 22 시야 · HUD "🏗 오픈 부지" 라벨 · 시간압박 비활성 · RC 즉시 시작
  · 진입 안내 토스트 8s · index BETA 카드 · intro 통합 타이틀 · blocker 라벨
  · 업적 3종 (unified_enter / unified_5min / unified_zero_int — 타이머 평가)
  · __bulsa.zone(name) 텔레포트 헬퍼 (excavation/foundation/envelope/mep_finish)

## 검증 상태
- `npm run check` PASS 92/92 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 다음 단계**

## v2.0 다음 작업
1. **시각 플레이쓰루** — ?s=unified 진입해 mesh 겹침/NPC wander/카메라/명령풀 검증
2. 회귀 발견 시 즉시 수정 (예: scene group 안 mesh 의 collide 검사 부정확 가능)
3. 통합 모드 카메라 자유 TPS / 미니맵 통합 부지 표시

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
