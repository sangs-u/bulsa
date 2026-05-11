# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 마지막 완료 작업 (2026-05-12 — 마라톤 세션)
**18개 신규 모듈 + 8건 핵심 버그 픽스 + 5/5 자동 테스트 PASS**

### Phase 1 — 게임감
- pause_menu (P/ESC, 메뉴/설정/통계 3탭, 나가기/난이도/볼륨/감도) · achievements (12개 + 토스트) · bgm (시나리오별 Web Audio 합성) · sfx_ext (11개 효과음) · loading · intro (3초 컷씬) · stats · perf (F3) · crash · seo (OpenGraph)

### Phase 3 — 배포 폴리시
- manifest.webmanifest + sw.js (PWA, network-first) · 404.html · 모바일 메타

### Phase 4 — 확장
- pickup (Q/F, 물리 던지기) · weather_fx (비/먼지/안개, B키) · events (랜덤 알림) · interact_glow · objective_marker (3D 화살표) · scene_decor (안전콘·드럼·자재·표지판·울타리)

### Phase 5 — 유튜버 플레이쓰루 버그 픽스
- 블로커 시나리오별 텍스트 · "캐릭터 로딩 중..." 12초 타임아웃 · 컴퍼스 9자 윈도우 · 튜토리얼 타이밍 · 시나리오별 브리핑 5종 · Hub 5시나리오 모두 활성 · NPC 위치 분산 · 플레이어 가속/카메라보브/스프린트FOV/크라우치/감도

## 검증 상태
- 자동 테스트 5/5 PASS, 콘솔 에러 0, 404 0
- claude-in-chrome 플레이쓰루: 5시나리오 모두 시각 검증 완료
- 다국어 (ko/en/ar/vi) NPC 잡담 동작 확인

## 다음 작업 (v1.x)
1. GLB 에셋 통합 (Quaternius/Kenney)
2. 건설 진행 3D 애니메이션 (작업 완료 시 비계/철근 출현)
3. NPC 작업 애니메이션 + 플레이어 회피
4. 18:00 시간 압박 (작업 미완료 시 강제 종료)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 (외부 파일 의존 없음)
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- PWA: network-first (활성 개발 중 자동 업데이트)
