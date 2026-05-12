# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12) — v2.0 batch #37 · 저장 시스템 1단계 (localStorage)
- **save.js** — `SAVE.KEYS` 15개 (진행+설정+프로필) 통합 export/import JSON · `bulsa_profile` (이름/첫 플레이/총 플레이타임/마지막) · 자동 누적 (30초+visibility+unload flush) · 버전 마이그레이션 훅 · 손상 시 자동 재초기화 · 4언어 토스트 · `__bulsa.save.{export,download,import,reset,stats,profile}` 디버그 헬퍼
- **pause_menu.js** — 4번째 탭 `💾 저장` 추가. 프로필 이름 입력 · 첫 플레이/총 플레이타임/저장 키 수+KB · 내보내기(.json 다운로드) · 불러오기(file picker) · 모두 삭제(확인 후 새로고침). 불러오기 성공 시 새로고침.
- **2단계 (Supabase 동기화) 호환** — `saveExportJSON()` 블롭이 곧 REST POST body. 추후 동기화 추가 시 동일 형식 재사용.

## 직전 완료 — v2.0 batch #36 · NPC 빠른 호출 (N 키)
- npc_quickcall.js · engine 자유 모드 안내 토스트 (N 키 추가)

## 검증 상태
- `npm run check` PASS 94/94 · GitHub Actions 활성 · **시각 플레이쓰루 미실시 — 집 PC 도착 시 CLAUDE.md 의 체크리스트 (A~J) + N 키 호출 + 저장 탭 export/import/reset 동작 확인**

## v2.0 다음 작업
1. **집 PC 검증 체크리스트** + N 키 호출 + 💾 저장 탭 (export → import → reset 순서)
2. 블루프린트 통합 도면 / index 허브 카드 강화 / 통합 모드 hazard 안전 통합
3. (배포 후) 저장 2단계 — Supabase OAuth + saveExportJSON 동기화 (리더보드·기기 이전)

## 핵심 결정사항
- 물리: cannon.js · BGM: Web Audio · 과태료 KRW · 등급 S/A/B/C/D
- 무사이 저장소 수정 금지 · 시나리오 분기 신규 추가 금지 (v2 활성 작업 큐 사용)
- **명명**: 안전지수 → 명(命) · BULSA(不死) 정체성 · 0 되면 종료
- **저장 전략**: 1단계 localStorage (비용 0 · 즉시) → 2단계 Supabase (MAU 늘 때)
