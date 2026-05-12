# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 26 batch · 26 커밋 (단일 세션)
- **v2.0 데이터 모델** — TASK_TYPES 23 · INTERFERENCE_MATRIX 17 · GLOBAL_ACCIDENTS 5 신규 · accident_labels 20 (4언어)
- **간섭 런타임** — interference.js 매 프레임 · 적색 라인 sustained 강도 · NPC 추적 끝점 · 6초 임계+prob 트리거 · origin 패널
- **작업 큐** — rc_loop sub-step 자동 enqueue · 4 시나리오 시드 · NPC 1:N trade 라운드로빈 매핑
- **명령 시스템** — INSTRUCTION_POOLS_BY_TASK 23 · TRAPS_GLOBAL 8 (flag set/clear) · 정렬·type 그룹 헤더+floor · 사고 라벨 노출 · trade fit ✗ · 거부 대사 4언어 6변종
- **학습 UI** — H 히스토리(영속+사고/간섭 이벤트+라이브러리 점프) · L 라이브러리(검색+상세) · pause 통계(시나리오/사고/명령 카운터) · HUD 작업 칩(그룹색·충돌·flag·풍부 tooltip)
- **명(命) 게이미피케이션** — 안전지수 → 명/Lives/Mạng/أرواح · 비네팅(≤30/≤15) · floating +/-N · pulse glow
- **인스펙터** — task.flags 4종(dismantling/unchecked/organic/premature) 적발 + 과태료 자동 부과
- **🆕 통합 모드 (?s=unified)** — 5 scene build + 5 hazard register + 14 NPC 영역 분산 + 18+ task 시드
  · 좌상=excavation / 좌하=foundation / 중앙=lifting / 우상=envelope / 우하=mep_finish (±22 분산)
  · scene baseline (sky/ground/lighting) 중복 회피 (lifting 만) · mesh THREE.Group 영역 offset · 카메라 시작 z 22
  · HUD "🏗 오픈 부지" 라벨 · index 허브 BETA 카드 · 진입 안내 토스트 8s · phase 무시 자유 진행
- **개발 도구** — `__bulsa.{tasks,conflicts,addTask,windSet,simulateAccident,history,help}`

## 검증 상태
- `npm run check` PASS 91/91 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 다음 단계**

## v2.0 다음 작업
1. **시각 플레이쓰루** — 통합 모드 ?s=unified 진입 → mesh 겹침/NPC wander/카메라 시야 검증
2. 회귀 수정 (시각 검증 후)
3. 통합 모드 카메라 자유 회전 — TPS 모드 추천 시야

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio · PWA: network-first · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 · 통합 모드 (오픈월드 자유게임)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
