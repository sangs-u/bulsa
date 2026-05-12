# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 마라톤 16 batch (한 세션 · 15 커밋)
- **v2.0 데이터 모델** — TASK_TYPES 23 · INTERFERENCE_MATRIX 10 · cond AND 평가 + flag 토큰 4종 · GLOBAL_ACCIDENTS 5 신규 + 20종 4언어 라벨
- **간섭 런타임** — interference.js 매 프레임 · 적색 THREE.Line + sustained 강도 (opacity/color/pulse) + NPC 위치 추적 끝점 · 6초 임계 + prob 확률 트리거 · trigger origin 패널 표시
- **작업 큐 결선** — rc_loop sub-step enqueue/dequeue · 4 시나리오 시드 (`enqueueScenarioTasks`) · NPC 1:N trade 라운드로빈 · `?s=unified` 통합 모드 진입점
- **명령 시스템** — INSTRUCTION_POOLS_BY_TASK 23종 · TRAPS_GLOBAL 8 (flag-trigger 4) · 풀 정렬 (safe-fit > 일반 > flag > danger) · type 그룹 헤더 (floor 태그) · 위험 명령 사고 라벨 노출 · trade fit 옅게 + ✗ 마크 · 거부 대사 4언어 풀 확장 (3→6)
- **학습 UI** — H 키 명령 히스토리 (localStorage 영속, accident/interference 이벤트, 사고 라이브러리 점프) · L 키 사고 라이브러리 (전체 사고 + 4언어 상세) · pause 통계 (시나리오별 ☠ · 사고 누적 TOP5 · 명령 7종 카운터) · HUD 작업 칩 풍부 tooltip
- **명(命) 게이미피케이션** — 안전지수 → 명/Lives/Mạng/أرواح 4언어 · 임계 비네팅 (≤30 active, ≤15 critical) · floating +/-N · pulse glow
- **개발 도구** — `__bulsa.{tasks,conflicts,addTask,windSet,simulateAccident,history,help}`

## 검증 상태
- `npm run check` PASS 91/91 · GitHub Actions 활성 · 시각 플레이쓰루 미실시
- 마라톤 누적 커밋: 4a40fc0 → 1146d84 (15 커밋, 한 세션)

## v2.0 다음 작업 (순서)
1. **시각 플레이쓰루** — 비네팅·작업 칩·간섭 라인·히스토리·라이브러리·통합 모드 실동작 검증
2. index.html 허브에 ?s=unified 진입 카드 노출
3. inspector 가 task.flags 적발 → 위반/과태료 (premature·unchecked·organic·dismantling)
4. 5 시나리오 hazard register 통합 모드에서 안전 호출 (mesh 충돌 회피)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
- **v2 핵심**: 시나리오 모델 폐기 · 작업 큐 + 간섭 매트릭스 (SPEC.md v2 참조)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
