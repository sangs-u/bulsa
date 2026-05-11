# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 마지막 완료 작업
- **5개 시나리오 자동 테스트 인프라**: qa/smoke-test.js, qa/full-test.js, qa/static-server.js
  · 5개 시나리오 모두 PASS — 에러 0, 404 0, 페이지에러 0
  · 강제 상태 주입 → evaluate → 완료/사고 패널 확인 전 단계 검증
  · CDN 일시 장애 대비 3회 재시도, lifting 컷씬 30초 대기
- **물리엔진 통합 (cannon.js 0.6.2 / vendor 로컬)**:
  · core/physics.js — initPhysics / updatePhysics / spawnFallHazard / spawnDemoHazards
  · 게임 루프에 fixed-dt 통합 (1/60 가속도)
  · 시나리오별 낙하물 데모: 흙더미 자갈, 거푸집 못, 비계 도구상자, 천장 렌치
  · BULSA 정체성 유지 — "낙하물 위험" 시각화로 안전 시뮬 연장
- **poll.js 제거** + npm scripts 정리

## 다음 작업 (우선순위 순)
1. **안전관리자 적발 이벤트** + **과태료 시스템**
2. **외부 GLB 에셋 통합** — Quaternius/Kenney 굴착기·펌프카·크레인
3. **물리 확장** — 빔 흔들림(양중), 작업자 추락 람돌체, NPC↔낙하물 충돌
4. **모션 시스템** — NPC 작업 애니메이션 + GLB 스테이트머신

## 디자인 원칙
- **행동 중심**: 도구 사용·측정·이동이 결과에 영향
- **숙련도**: 도구별 카운터 → Lv 진행

## 핵심 결정사항
- Phase 1·2는 무사이 담당. BULSA는 Phase 3부터
- 추가 시나리오(밀폐/전기/화재/비계/차량)는 v2.0 스텁
- 물리엔진: cannon.js 0.6.2 UMD 채택 (Rapier 대신, 호환성·번들사이즈 우선)
