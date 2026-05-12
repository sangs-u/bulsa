# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 최근 완료 (2026-05-12)
- **v1.1 6건 일괄 처리**
  · 중복 함수 충돌 픽스 — `bumpSkill` (skill.js 단일화), `_shakeCamera` → `_shakeCameraBuild` / `_shakeCameraAccident` 분리 (사고 카메라 흔들림 버그 동시 해결)
  · plan 매개변수 검증 추가 — excavation planSlope, envelope planScaffoldHeight/Type, mep_finish planBreaker/PipeDiameter, foundation planRebarSpacing/ConcStrength/MatArea
  · 4개 시나리오 운전석 거부권 일반화 — `boardExcavator`, `openPumpConsole`, `openEnvelopeConsole`, `openFinalInspection` 모두 `_get<Scenario>Refusal()` + `showOperatorRefusal()` 패턴 (lifting boardCrane 과 동일)
  · 사고 데이터 i18n — 5 시나리오 22 사고 × descVi/causeVi/lawVi + descAr/causeAr/lawAr = 88개 키 추가 (베트남 OSH·KSA 산업안전 용어 기준)
  · accident.js — descKo/En → langSuffix 기반 4언어 자동 선택 (vi/ar 폴백: en → ko)
  · core/interaction.js + skill.js + minigame.js + pause_menu.js + pickup.js — 한국어 하드코딩 ~55개 줄 4언어 객체화 (_NOTIF 사전 + inline {ko,en,vi,ar} 패턴)
- **v1.1 3건** (이전 커밋) — setLang i18n 후크·procedural 그룹화·양방향 검증

## 검증 상태
- node 구문 검사 17/17 OK · 시각 플레이쓰루 미실시

## v1.1 다음 작업
1. Mixamo 실제 클립 7~10개 다운로드 → assets/glb/anim_*.glb
2. 무사이 작업계획서 UI 인게임 이식 (현장사무소 PC/태블릿)
3. v1.0 시각 플레이쓰루 — 실 브라우저에서 5공정 통과 검증
4. lifting 작업계획서 UI 추가 (현재 매개변수 하드코딩 — 다른 시나리오처럼 입력 패널 필요)
5. NPC 거부권 발화 음성 (Web Audio TTS 또는 사전녹음)

## 핵심 결정사항
- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소(github.com/sangs-u/musaai) 수정 절대 금지
