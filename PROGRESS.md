# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 마지막 완료 작업 (2026-05-12 — v1.x 4종)
- **core/assets.js** — 범용 GLB 로더 + 캐시 + 8초 타임아웃 폴백, MANIFEST URL 런타임 주입
- **building.js 진행 애니** — 솟아오르는 ease-out-back + 흙먼지 파티클 14개 + 카메라 임팩트 셰이크 + drop SFX
- **npc.js 작업 제스처** — trade별 분기 (신호수·망치질·정밀·중량) + 플레이어 1.4m 회피·머리 회전
- **timepressure.js (신규)** — 게임 시계 09:00→18:00 (5분 실시간), 17:30 적색 깜빡임·알림, 18:00 강제 종료

## 검증 상태
- node 구문 검사 5/5 OK · 정적 서버 200 OK (assets.js / timepressure.js / game.html)
- 시각 플레이쓰루 미실시 (다음 세션에서 chrome 자동화로 확인 권장)

## 다음 작업
1. GLB URL 채우기 (Kenney Vehicle Pack 굴착기/펌프카 검증된 CDN 확정 후 ASSETS.setUrl)
2. 시나리오 hazards.js의 박스 메시 → ASSETS.attach 호출 추가
3. 18:00 타임아웃 UX 다듬기 (전용 패널 + 다시하기 버튼)
4. 시계 위젯 i18n (현재 한국어 알림만)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 (외부 파일 의존 없음)
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- PWA: network-first (활성 개발 중 자동 업데이트)
- GLB: assets.js MANIFEST 빈 URL은 자동 폴백, 외부 호스팅 결정 후 setUrl로 주입

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 (외부 파일 의존 없음)
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- PWA: network-first (활성 개발 중 자동 업데이트)
