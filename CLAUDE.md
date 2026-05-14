# CLAUDE.md — 불사(BULSA) 개발 지침

> ⚠️ 이 파일은 직접 수정 금지. 변경 필요 시 개발자에게 제안만 할 것.
> ⚠️ DESIGN.md도 동일하게 직접 수정 금지.
> ✅ PROGRESS.md는 배치 완료 시 자동 업데이트 가능.

---

## 프로젝트 정체성

**불사(不死)** — 건설 안전 시뮬레이터 게임.
죽지 않고 끝까지 살아남아 건물을 완성하는 것이 목표.
건설 절차가 곧 게임이고, 안전은 선택이 아니라 게임 규칙이다.

- 장르: 3인칭 건설 시뮬레이터 (GTA 스타일 조작)
- 플랫폼: 브라우저 (PC + 모바일 동일 지원)
- 배포: GitHub Pages (정적, 서버 없음)
- 스택: Three.js + Cannon.js + Yuka AI + 바닐라 JS
- 다국어: ko / en / vi / ar

---

## 현재 상태

PROGRESS.md 읽어라. 거기서 최신 상태 확인.

---

## 파일 구조

```
bulsa/
├── CLAUDE.md          ← 지금 이 파일 (수정 금지)
├── DESIGN.md          ← 전체 설계 (수정 금지)
├── PROGRESS.md        ← 진행 상태 (업데이트 가능)
├── index.html         ← 메인 진입점
├── game.html          ← 게임 화면
├── style.css          ← 전역 스타일
├── sw.js              ← 서비스워커
├── manifest.webmanifest
├── core/
│   ├── engine.js      ← GAME 객체, 렌더러, 게임루프
│   ├── player.js      ← 플레이어 이동, 카메라, 입력
│   ├── npc.js         ← NPC 클래스, Yuka AI
│   ├── accident.js    ← 사고 트리거, 연출
│   ├── hud.js         ← HUD (미니맵, 命게이지, 파티창)
│   ├── sound.js       ← 효과음
│   ├── bgm.js         ← 배경음악
│   └── ending.js      ← 수료증
├── i18n/
│   └── strings.js     ← 4개국어 문자열
├── assets/
│   ├── equipment_catalog.json
│   └── manifest.md
├── vendor/
│   └── cannon.min.js
└── qa/
    ├── syntax-check.js
    └── static-server.js
```

---

## 절대 규칙

### 개발 방식
1. **배치 단위 개발** — 한 배치 = 하나의 기능 완성. 미완성 상태로 다음 배치 금지.
2. **시각 검증 필수** — 배치 완료 후 반드시 브라우저 확인 요청. 확인 없이 다음 배치 금지.
3. **설계 문서 선행** — DESIGN.md에 없는 기능은 구현 금지. 먼저 제안하고 승인 후 구현.
4. **보고 후 대기** — 배치 완료 시 "✅ 완료 — 브라우저에서 확인해주세요" 보고 후 대기.

### 코드 규칙
5. **SVG 텍스트 기반 UI 금지** — 문서처럼 보이는 UI 금지. 게임 UI 느낌으로.
6. **바닐라 JS 유지** — 프레임워크 추가 금지. Three.js + Cannon.js + Yuka만 사용.
7. **정적 파일만** — 서버 필요한 코드 금지. GitHub Pages 배포 기준.
8. **모바일 동시 지원** — PC/모바일 하나의 코드베이스. 입력 자동 감지.

### 문서 규칙
9. **CLAUDE.md 수정 금지** — 읽기만. 변경 필요 시 개발자에게 제안.
10. **DESIGN.md 수정 금지** — 읽기만. 설계 변경 필요 시 제안하고 승인 후 개발자가 수정.
11. **PROGRESS.md 업데이트** — 배치 완료마다 진행 상태 기록.

---

## 참조 문서

| 상황 | 읽을 문서 |
|------|-----------|
| 게임 시스템 구현 전 | DESIGN.md 전체 |
| 命게이지 구현 | DESIGN.md § 사고 & 命게이지 |
| NPC 구현 | DESIGN.md § NPC 시스템 |
| UI 구현 | DESIGN.md § UI/HUD |
| 캐릭터/에셋 | DESIGN.md § 아트 디렉션 |
| 공정 시스템 | DESIGN.md § 튜토리얼 공정 흐름 |
| 현재 진행 상태 | PROGRESS.md |

---

## 매 세션 시작 루틴

```
1. CLAUDE.md 읽기 (지금 이 파일)
2. PROGRESS.md 읽기 (현재 상태 파악)
3. 현재 상태 요약 보고
4. 개발자 승인 후 작업 시작
```
