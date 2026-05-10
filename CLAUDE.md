# BULSA — 안전 문명 시뮬레이터
> 설계서 v1.0 최종 · 최종수정 2026-05-09

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

```
v1.0 — 시나리오 모드 (현재)   줄걸이/인양 작업 1개 시나리오, 튜토리얼 성격
v2.0 — 건설현장 전체           복합 공정 관리
v3.0 — 자유 모드               설계도 기반 공정 자동 생성, 안전검토 통과 시 구조물 생성
v4.0 — 제조시설                공장 설치/가동/유지보수
v5.0 — 마을/도시               멀티플레이 협동 필수
```

---

## 기술 스택

```
렌더링:     Three.js r128 (CDN)
물리:       Rapier.js (v2.0 예정, 현재 Raycaster 기반 충돌)
AI 경로:    Yuka.js 0.7.8
빌드:       없음 (정적 HTML/JS/CSS)
배포:       GitHub Pages — https://sangs-u.github.io/bulsa
다국어:     i18n 자체 구현 (ko/en/ar/vi)
캐릭터:     Meshy AI 생성 GLB + Mixamo 애니메이션 (현재 Soldier.glb 테스트용)
사운드:     Web Audio API 절차적 생성
```

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
│   └── (예정) roles.js / process.js / safety-engine.js / violation.js / events.js
├── scenarios/lifting/
│   ├── scene.js                게임 씬 + GAME.colliders 구축
│   ├── hazards.js              위험 오브젝트 등록
│   └── data.js (또는 lifting-data.js)  사고 데이터 DB
└── i18n/strings.js             ko/en/ar/vi 전체 문자열
```

---

## 역할 시스템

```
FOREMAN (작업반장)    플레이어. 흰 헬멧+노란 조끼. 전체 지휘.
CRANE_OPERATOR        크레인 운전원 NPC (미구현). 파란 헬멧+파란 조끼. 거부권 있음.
RIGGER (박영수)       줄걸이 작업자. 노란 헬멧+파란 조끼.
SIGNALMAN (김철수)    신호수. 노란 헬멧+빨간 조끼. 고정 위치 유지.
SAFETY_OFFICER (이민호) 안전감시자. 고소작업자 겸임.
WORKER (아흐마드/응우옌) 보조작업자. 언어장벽 있음.
```

---

## 6개 Phase (줄걸이/인양 시나리오)

```
Phase 1: plan             현장 사무실에서 작업계획서 작성
Phase 2: safety_review    무사이 계산 엔진 연동 안전성 검토
Phase 3: equipment_setup  크레인 세팅 (아웃트리거, 수준기, 과부하장치)
Phase 4: rigging_setup    박영수에게 지시 — 슬링선택/달기기구/걸이방식/각도/점검/핀
Phase 5: site_setup       작업반경 설치/표지/NPC 대피/TBM
Phase 6: execution        크레인 운전석 탑승 or NPC 지시로 인양 실행
```

---

## 사고 트리거 매핑

```
sling_not_inspected     → sling_snap       슬링 파단, 확률 0.8
pin_not_secured         → shackle_release  샤클 이탈, 확률 0.9
outrigger_not_extended  → crane_overturn   크레인 전도, 확률 0.7
angle_exceeded          → overload         슬링 과부하, 확률 0.85
worker_in_zone          → falling_object   낙하물 인명피해, 확률 1.0
no_signalman            → collision        화물 충돌, 확률 0.6
overload (강행)         → crane_overturn   확률 0.95
no_outrigger_plate      → ground_collapse  지반 침하, 확률 0.5
crane_operator_refused  → crane_overturn   무리한 강행, 확률 1.0
```

---

## 불안전 행동 감지 시스템 (구현 예정)

```
helmet_off        안전모 미착용   RIGGER/WORKER   확률 0.10
zone_intrusion    작업반경 침범   WORKER          확률 0.15
smoking           위험구역 흡연   WORKER/RIGGER   확률 0.08
phone_use         신호수 폰 사용  SIGNALMAN       확률 0.12 → 충돌 사고
no_harness        안전대 미착용   SAFETY/RIGGER   확률 0.10
```

위반 누적:
1회 → 플레이어 경고 아이콘, 직접 가서 지시
2회 → 안전관리자 외부 등장, 작업 15분 중단
3회 → NPC 퇴출, 대체 인력(숙련도 60%, 외국인 가능)

---

## 돌발 이벤트 시스템 (구현 예정)

```
labor_inspector    고용노동부 감독관 방문  30분마다 10% 확률
strong_wind        강풍 발생              10분마다, 풍속 10m/s 초과
heat_wave          온열질환 위험          12:00~15:00
equipment_malfunction  장비 이상          인양 중 7% 확률
```

---

## 구조물 생성 시스템 (구현 예정)

```
공정 완료 → spawnStructure(mesh) + showCompletionCutscene()
단계: 터파기 → 기초 → 1층기둥 → 1층슬라브 → 2층기둥 → 2층슬라브 → 지붕
```

---

## 코딩 원칙

- Three.js + 바닐라 JS. 외부 의존성 최소화.
- 모든 텍스트 i18n (strings.js). 하드코딩 금지.
- musaai 저장소는 참조용. 절대 수정 금지.
- 파일 삭제 금지. 수정만 허용.
- 모든 수정 후 즉시 git push. push 없이 작업 종료 금지.
- 작업 완료 시 .claude/status.json 을 업데이트한 뒤 push. (timestamp, lastTask, agent, status 필드 포함)
- 질문 금지. 모호한 부분은 스스로 판단하고 즉시 실행.

---

## 에이전트 5개 운영 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  에이전트    모델              역할                  파일수정/push  │
├─────────────────────────────────────────────────────────────────┤
│  PM         Sonnet 4.6   개발 실행·조율·git push        ✅        │
│  QA         Opus 4       Playwright 자동화·완주 검증     ❌        │
│  품질       Opus 4       코드리뷰·i18n 완성도·키 누락    ❌        │
│  콘텐츠     Opus 4       시나리오 텍스트·번역·법령 검증  ❌        │
│  데이터     Haiku 4.5    report.json 파싱·로그 집계       ❌        │
└─────────────────────────────────────────────────────────────────┘
```

### 에이전트 호출 패턴

```
PM (Sonnet)이 기준 에이전트.
복잡한 버그/설계 → Opus (QA 또는 콘텐츠)로 분석 위임 → 결과 받아 PM이 실행
i18n 누락 검사  → 품질 에이전트 → PM이 strings.js 보완
QA 실패 리포트  → 데이터 에이전트 → PM이 수정
```

### 에이전트별 세부 역할

**PM (Sonnet 4.6)**
- 파일 수정, git add/commit/push 전담
- 서브에이전트 위임 및 결과 통합
- CLAUDE.md, MEMORY.md 갱신

**QA (Opus 4)**
- `node qa/visual-test.js` 실행 판단 지시
- 게임플레이 완주 경로 검증
- report.json 해석 후 실패 항목 PM에 전달

**품질 (Opus 4)**
- strings.js 4개국어 키 일치 검사
- 하드코딩 문자열 탐지 (grep으로 한글/아랍어 리터럴)
- 코드 중복·dead code 리포트

**콘텐츠 (Opus 4)**
- 사고 데이터 텍스트 (ko/en/vi/ar) 품질 검증
- KOSHA 법령 인용 정확도 확인
- 신규 시나리오 시나리오 텍스트 초안

**데이터 (Haiku 4.5)**
- `qa/report.json` 파싱 및 요약
- NPC 위치 이탈·QA Fails 집계
- 세션 간 에러 트렌드 비교

---

## v1.0 현재 구현 상태

```
✅ Three.js 씬 + 게임루프
✅ 1인칭 플레이어 이동 + Raycaster 충돌
✅ NPC 5명 (역할별 행동 + Yuka AI)
✅ GLB 캐릭터 시스템 (Soldier.glb 테스트, Meshy 교체 대기)
✅ Bloom+SSAO 포스트프로세싱
✅ NPC 래그돌 사고 연출
✅ 사고 패널 (미이행 항목 인과 표시)
✅ 수료증 (전항목 완료 시 자동 호출)
✅ 다국어 ko/en/ar/vi (NPC 언어 즉시반영)
✅ 허브 index.html
✅ 크레인 훅+슬링+빔 동기화 인양 애니메이션
✅ GLB 로딩 인디케이터

🔄 Meshy 커스텀 캐릭터 (작업 중)
⏳ Phase 1~3 (계획서/안전검토/장비세팅) 구현
⏳ 크레인 운전원 NPC
⏳ 불안전 행동 감지 시스템
⏳ 돌발 이벤트 시스템
⏳ 구조물 단계별 생성
⏳ 무사이 계산 엔진 연동
⏳ Rapier.js 물리엔진 (v2.0)
```
