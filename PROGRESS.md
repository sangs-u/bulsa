# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #39 · index 허브 카드 강화
- **index.html** — 시나리오 카드에 `bulsa_stats` 읽어 **최고 등급/완주 횟수/사고 수** 칩 추가. `bulsa_profile` 있으면 부지 평면도 위 환영 바 (이름·총 플레이타임·전체 완주·전체 사고). 처음 플레이는 자동 숨김.
- **style.css** — `.fp-room.s06` 황금 글로우 + 4초 펄스 애니메이션 (자유 모드 부각). `.fp-room-stats` 칩 5등급 색상 (S 금색·A 초록·B 청·C 베이지·D 적). `.fp-welcome` 환영 바 청록 테마.

## 직전 완료 — v2.0 batch #36~38 · N 키 호출 + 저장 시스템 1단계 + 부지 통합 도면

## 검증 상태
- `npm run check` PASS 97/97 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 CLAUDE.md A~J + N 키 + 💾 저장 탭 + 🗺 부지 통합 + 허브 환영 바·s06 글로우·등급 칩 확인**

## v2.0 다음 작업
1. **집 PC 검증 체크리스트** + 신규 (N 호출 · 💾 저장 · 🗺 부지 통합 · 허브 환영바)
2. 통합 모드 hazard 안전 통합 (5 시나리오 hazard register 단일 cycle 안전화)
3. 시각 플레이쓰루 회귀 검사
4. (배포 후) 저장 2단계 — Supabase OAuth + saveExportJSON 동기화 (리더보드·기기 이전)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
