# BULSA — 안전 문명 시뮬레이터 설계서
> v1.0 · 최종수정 2026-05-10

---

## 비전

안전기준을 지키면서 건물→공장→마을→도시를 직접 건설하는 안전 문명 시뮬레이터.
플레이어는 작업반장. 동료 NPC에게 지시하며 KOSHA 기준 준수 시 구조물 완성.
안전 무시 시 사고 발생.

**무사이와의 관계**
```
무사이 — 서류/계산 플랫폼 (작업계획서, 안전성 계산, 체크리스트)
불사   — 실행 시뮬레이터 (무사이 계획서대로 현장 수행, 연동 예정)
```

---

## 게임 모드 로드맵

| 버전 | 모드 | 내용 |
|------|------|------|
| v1.0 | 시나리오 모드 (현재) | 줄걸이/인양 작업 1개 시나리오, 튜토리얼 성격 |
| v2.0 | 건설현장 전체 | 복합 공정 관리 |
| v3.0 | 자유 모드 | 설계도 기반 공정 자동 생성, 안전검토 통과 시 구조물 생성 |
| v4.0 | 제조시설 | 공장 설치/가동/유지보수 |
| v5.0 | 마을/도시 | 멀티플레이 협동 필수 |

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 렌더링 | Three.js r128 (CDN) |
| 물리 | Rapier.js (v2.0 예정, 현재 Raycaster 기반 충돌) |
| AI 경로 | Yuka.js 0.7.8 |
| 빌드 | 없음 (정적 HTML/JS/CSS) |
| 배포 | GitHub Pages — https://sangs-u.github.io/bulsa |
| 다국어 | i18n 자체 구현 (ko/en/ar/vi) |
| 캐릭터 | Meshy AI 생성 GLB + Mixamo 애니메이션 (현재 Soldier.glb 테스트용) |
| 사운드 | Web Audio API 절차적 생성 |

---

## 프로젝트 경로

```
로컬:    C:\Users\sangs\OneDrive\Desktop\bulsa
GitHub:  https://github.com/sangs-u/bulsa
배포:    https://sangs-u.github.io/bulsa
참조용:  https://github.com/sangs-u/musaai (수정 금지)
```

---

## 파일 구조

```
bulsa/
├── index.html                  허브 (시나리오 선택)
├── game.html                   메인 게임
├── style.css / style_extensions.css
├── core/
│   ├── engine.js               씬·게임루프 (GAME 객체)
│   ├── player.js               1인칭 이동 + Raycaster 충돌
│   ├── npc.js                  NPC 클래스 + Yuka AI + 역할행동
│   ├── character.js            GLB 로더 (WORKER_GLB_URL 교체로 전체 적용)
│   ├── interaction.js          E키 상호작용 + animateLift
│   ├── instruction.js          NPC 지시 팝업 (언어 즉시반영)
│   ├── accident.js             사고 트리거/VFX/패널 + 미이행항목 인과
│   ├── hud.js                  HUD/미니맵/알림
│   ├── sound.js                Web Audio 절차적 생성
│   ├── weather.js              날씨 시스템
│   ├── postfx.js               Bloom+SSAO 포스트프로세싱
│   ├── building.js             구조물 메시 생성
│   ├── ending.js               완료/수료증 패널
│   ├── minimap.js              미니맵
│   ├── signboard.js            현장 간판/표지판
│   ├── structure.js            구조물 메시
│   └── (예정) roles.js / process.js / safety-engine.js / violation.js / events.js
├── scenarios/
│   ├── lifting/                ✅ v1.0 — 줄걸이/인양 (현재 유일한 플레이 가능 시나리오)
│   │   ├── scene.js
│   │   ├── hazards.js
│   │   ├── data.js
│   │   ├── actions.js
│   │   └── calc.js
│   ├── confined/               🔲 v2.0 stub — 밀폐공간
│   ├── electrical/             🔲 v2.0 stub — 전기작업
│   ├── fire/                   🔲 v2.0 stub — 화재
│   ├── scaffold/               🔲 v2.0 stub — 비계
│   └── vehicle/                🔲 v2.0 stub — 차량/장비
├── blueprints/                 도면 시스템
│   ├── lifting-plan.js
│   └── viewer.js
└── i18n/strings.js             ko/en/ar/vi 전체 문자열
```

---

## 역할 시스템

| 역할 | 설명 | 헬멧 | 조끼 | 특이사항 |
|------|------|------|------|---------|
| FOREMAN (작업반장) | 플레이어. 전체 지휘 | 흰색 | 노란색 | — |
| CRANE_OPERATOR | 크레인 운전원 NPC | 파란색 | 파란색 | 거부권 있음, 미구현 |
| RIGGER (박영수) | 줄걸이 작업자 | 노란색 | 파란색 | — |
| SIGNALMAN (김철수) | 신호수 | 노란색 | 빨간색 | 고정 위치 유지 |
| SAFETY_OFFICER (이민호) | 안전감시자 | — | — | 고소작업자 겸임 |
| WORKER (아흐마드/응우옌) | 보조작업자 | — | — | 언어장벽 있음 |

---

## 6개 Phase (줄걸이/인양 시나리오)

| Phase | 이름 | 내용 | 담당 |
|-------|------|------|------|
| 1 | plan | 작업계획서 작성 | **무사이** (연동 — BULSA 진입 전 완료) |
| 2 | safety_review | 안전성 검토 + 하중계산 | **무사이** (연동 — 계산 결과 BULSA로 전달) |
| 3 | equipment_setup | 크레인 세팅 (아웃트리거/수준기/과부하장치) | **BULSA** ← v1.0 게임 시작점 |
| 4 | rigging_setup | 박영수에게 지시 — 슬링/달기기구/걸이방식/각도/점검/핀 | **BULSA** ✅ |
| 5 | site_setup | 작업반경 설치/표지/NPC 대피/TBM | **BULSA** ✅ |
| 6 | execution | 크레인 운전석 탑승 or NPC 지시로 인양 실행 | **BULSA** ✅ |

> Phase 1·2는 무사이가 담당. BULSA는 Phase 3부터 시작하며, 무사이에서 완료된 계획서·계산 결과를 파라미터로 전달받아 시작 조건으로 활용 (v2.0 연동 예정, v1.0은 기본값 사용).

---

## 사고 트리거 매핑

| 미이행 항목 | 사고 유형 | 확률 |
|------------|-----------|------|
| sling_not_inspected | sling_snap (슬링 파단) | 0.8 |
| pin_not_secured | shackle_release (샤클 이탈) | 0.9 |
| outrigger_not_extended | crane_overturn (크레인 전도) | 0.7 |
| angle_exceeded | overload (슬링 과부하) | 0.85 |
| worker_in_zone | falling_object (낙하물 인명피해) | 1.0 |
| no_signalman | collision (화물 충돌) | 0.6 |
| overload 강행 | crane_overturn | 0.95 |
| no_outrigger_plate | ground_collapse (지반 침하) | 0.5 |
| crane_operator_refused | crane_overturn (무리한 강행) | 1.0 |

---

## 불안전 행동 감지 시스템 (구현 예정)

| 행동 | 대상 NPC | 확률 |
|------|----------|------|
| helmet_off (안전모 미착용) | RIGGER/WORKER | 0.10 |
| zone_intrusion (작업반경 침범) | WORKER | 0.15 |
| smoking (위험구역 흡연) | WORKER/RIGGER | 0.08 |
| phone_use (신호수 폰 사용) | SIGNALMAN | 0.12 → 충돌 사고 |
| no_harness (안전대 미착용) | SAFETY/RIGGER | 0.10 |

**위반 누적 처리:**
- 1회 → 플레이어 경고 아이콘, 직접 가서 지시
- 2회 → 안전관리자 외부 등장, 작업 15분 중단
- 3회 → NPC 퇴출, 대체 인력(숙련도 60%, 외국인 가능)

---

## 돌발 이벤트 시스템 (구현 예정)

| 이벤트 | 조건 |
|--------|------|
| labor_inspector (고용노동부 감독관 방문) | 30분마다 10% 확률 |
| strong_wind (강풍 발생) | 10분마다, 풍속 10m/s 초과 |
| heat_wave (온열질환 위험) | 12:00~15:00 |
| equipment_malfunction (장비 이상) | 인양 중 7% 확률 |

---

## 구조물 생성 시스템 (구현 예정)

```
공정 완료 → spawnStructure(mesh) + showCompletionCutscene()
단계: 터파기 → 기초 → 1층기둥 → 1층슬라브 → 2층기둥 → 2층슬라브 → 지붕
```

---

## 에이전트 5개 운영 구조

| 에이전트 | 모델 | 역할 | 파일수정/push |
|---------|------|------|-------------|
| PM | Sonnet 4.6 | 개발 실행·조율·git push | ✅ |
| QA | Opus 4 | Playwright 자동화·완주 검증 | ❌ |
| 품질 | Opus 4 | 코드리뷰·i18n 완성도·키 누락 | ❌ |
| 콘텐츠 | Opus 4 | 시나리오 텍스트·번역·법령 검증 | ❌ |
| 데이터 | Haiku 4.5 | report.json 파싱·로그 집계 | ❌ |

---

## 구현 진행 현황

### 핵심 엔진

| 항목 | 상태 | 파일 | 메모 |
|------|------|------|------|
| Three.js 씬 + 게임루프 | ✅ | core/engine.js | |
| 1인칭 이동 + Raycaster 충돌 | ✅ | core/player.js | |
| NPC 5명 (역할별 행동 + Yuka AI) | ✅ | core/npc.js | |
| GLB 캐릭터 시스템 | ✅ | core/character.js | Soldier.glb 테스트, Meshy 교체 대기 |
| Bloom+SSAO 포스트프로세싱 | ✅ | core/postfx.js | |
| NPC 래그돌 사고 연출 | ✅ | core/accident.js | |
| 사고 패널 (미이행 항목 인과 표시) | ✅ | core/accident.js | |
| 수료증 (전항목 완료 시 자동 호출) | ✅ | core/ending.js | |
| 다국어 ko/en/ar/vi | ✅ | i18n/strings.js | NPC 언어 즉시반영 |
| 허브 index.html | ✅ | index.html | |
| 크레인 훅+슬링+빔 동기화 인양 애니메이션 | ✅ | core/interaction.js | |
| GLB 로딩 인디케이터 | ✅ | — | |
| 줄걸이 시나리오 씬 | ✅ | scenarios/lifting/scene.js | |
| 위험 오브젝트 등록 | ✅ | scenarios/lifting/hazards.js | |
| 사고 데이터 DB | ✅ | scenarios/lifting/data.js | |
| 날씨 시스템 | ✅ | core/weather.js | |
| HUD/미니맵/알림 | ✅ | core/hud.js | |
| Web Audio 절차적 생성 | ✅ | core/sound.js | |
| NPC 지시 팝업 | ✅ | core/instruction.js | |
| 도면(blueprints) 시스템 | ✅ | blueprints/ | 에이전트 5개 구조 추가 |

### Phase 구현

| Phase | 상태 | 메모 |
|-------|------|------|
| Phase 1: plan | 🔗 | 무사이 담당. BULSA는 기본값으로 시작, v2.0 연동 |
| Phase 2: safety_review | 🔗 | 무사이 담당. 계산 결과 파라미터 수신, v2.0 연동 |
| Phase 3: equipment_setup | ⏳ | **다음 목표** — 크레인 아웃트리거/수준기/과부하장치 |
| Phase 4: rigging_setup | ✅ | 슬링/달기기구/걸이방식/각도/점검/핀 |
| Phase 5: site_setup | ✅ | 작업반경/표지/NPC 대피/TBM |
| Phase 6: execution | ✅ | 인양 실행 |

### 고급 시스템

| 항목 | 상태 | 목표 버전 |
|------|------|---------|
| Meshy 커스텀 캐릭터 | 🔄 진행 중 | v1.0 |
| 크레인 운전원 NPC | ⏳ | v1.0 |
| 불안전 행동 감지 시스템 | ⏳ | v1.1 |
| 돌발 이벤트 시스템 | ⏳ | v1.1 |
| 구조물 단계별 생성 | ⏳ | v2.0 |
| 무사이 계산 엔진 연동 | ⏳ | v2.0 |
| Rapier.js 물리엔진 | ⏳ | v2.0 |
| 건설현장 전체 공정 | ⏳ | v2.0 |
| 자유 모드 | ⏳ | v3.0 |
| 제조시설 | ⏳ | v4.0 |
| 마을/도시 + 멀티플레이 | ⏳ | v5.0 |

### 운영 인프라 (sangs-u.github.io)

| 항목 | 상태 | 메모 |
|------|------|------|
| poll.js 타임아웃+재시도+핑 | ✅ | ETIMEDOUT/ECONNABORTED 해결 |
| poll.js cwd 설정 | ✅ | CLAUDE.md 인식 |
| Railway 서버 (bulsa-server) | ✅ | history.json 복원, /status, /command |
| CLAUDE.md 슬림화 | ✅ | ~2000 → ~400 tokens/call |
| PM2 자동재시작 | ⏳ | 사용자가 직접 설정 필요 |
| 사무실 픽셀아트 UI (index.html) | 🔄 진행 중 | 캔버스 기반, Press Start 2P |

---

## i18n 문자열 키 현황

strings.js에 ko/en/ar/vi 4개국어 완성된 섹션:
- plan 패널 ✅
- safety 패널 ✅
- equipment 패널 ✅
- NPC 지시 알림 전체 ✅
- 건설 진행 HUD 레이블 ✅
- instruction popup 닫기 버튼 ✅

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-05-09 | blueprints/ 도면 시스템 + 에이전트 5개 구조 |
| 2026-05-09 | plan·safety·equipment 패널 4개국어 완성 |
| 2026-05-09 | interaction.js 게임 안내 알림 4개국어 |
| 2026-05-09 | building progress HUD 4개국어 레이블 |
| 2026-05-09 | instruction popup 닫기 버튼 4개국어 |
| 2026-05-10 | poll.js ETIMEDOUT/ECONNABORTED 수정, CLAUDE.md 슬림화 |
| 2026-05-10 | SPEC.md 분리 생성 (전체 설계서 + 진행현황) |
