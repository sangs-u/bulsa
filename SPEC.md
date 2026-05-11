# BULSA — 안전 문명 시뮬레이터 설계서
> v1.0 · 최종수정 2026-05-11

---

## 비전

안전기준을 지키면서 건물→공장→마을→도시를 직접 건설하는 안전 문명 시뮬레이터.
플레이어는 작업반장. 동료 NPC에게 지시하며 KOSHA 기준 준수 시 구조물 완성.
안전 무시 시 사고 발생.

**무사이와의 관계**
```
무사이 — 서류/계산 플랫폼 (작업계획서, 안전성 계산, 체크리스트)
불사   — 실행 시뮬레이터 (무사이 계획서대로 현장 수행)
```
무사이 v2 업그레이드 후 BULSA 내부에 **작업계획서 작성 UI를 인게임 이식** (현장사무소 PC/태블릿) — v1.1.
무사이 저장소는 수정 금지.

---

## 게임 모드 로드맵

| 버전 | 모드 | 내용 |
|------|------|------|
| **v1.0** (현재 목표) | 5층 건물 1동 완공 | 5공정 통과 + KOSHA 안전 준수 시 건물 완성 |
| v1.1 | 인게임 학습 | 작업계획서 작성 UI · KOSHA 가이드 · 산안법 조항 열람 |
| v2.0 | 복합현장·다건물 | 복수 건물 동시 시공, 자원관리, 일정관리 |
| v3.0 | 자유 모드 | 설계도 입력 → 공정 자동 생성, 안전검토 통과 시 구조물 생성 |
| v4.0 | 제조시설 | 공장 설치/가동/유지보수 |
| v5.0 | 마을/도시 | 멀티플레이 협동 필수 |

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 렌더링 | Three.js r128 (CDN) |
| 물리 | Raycaster 기반 충돌 (Rapier.js는 v2.0+) |
| AI 경로 | Yuka.js 0.7.8 |
| 빌드 | 없음 (정적 HTML/JS/CSS) |
| 배포 | GitHub Pages — https://sangs-u.github.io/bulsa |
| 다국어 | i18n 자체 구현 (ko/en/ar/vi) |
| 캐릭터 | Meshy AI 생성 GLB + Mixamo 애니메이션 |
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

## v1.0 구조 — "5층 건물 1동"

### 5공정 (scenarios/manifest.js와 정합)

| 순서 | 공정 ID | 한국어 | 핵심 작업 | 상태 |
|------|---------|--------|-----------|------|
| 1 | excavation | 토공사 | 부지 굴착 + 흙막이 가시설 | ✅ 4개 미니게임 (survey/shoring/railing/signal) |
| 2 | foundation | 기초공사 | 매트기초 동바리·거푸집·철근·콘크리트 | ✅ rebar 미니게임 |
| 3 | rc_frame | RC 골조공사 | 1~5층 골조 sub-step 3회전 × 5층 | ⏳ lift만 구현. formwork_rebar · pour_cure 잔여 |
| 4 | envelope | 외장·창호공사 | 시스템 비계 + 외벽 패널 + 창호 | ✅ scaffold 미니게임 |
| 5 | mep_finish | 설비·마감·준공 | 전기·배관·LOTO·환기 → 준공검사 | ✅ mep 미니게임 |

> 이전 분리 시나리오(밀폐/전기/화재/비계/차량)는 모두 5공정에 통합 흡수됨.
> 비계→envelope, 차량→excavation/foundation, 전기·화재·밀폐→mep_finish.

### rc_frame 내부 (sub-step × 5층)

```
1층 → 2층 → 3층 → 4층 → 5층  (반복)
  ├ formwork_rebar  거푸집·철근  ⏳ 미구현
  ├ lift            양중         ✅ (현 줄걸이 시나리오 = 이 sub-step)
  └ pour_cure       타설·양생    ⏳ 미구현
```

### 점진 빌드 시각화 (core/building.js)

```
터파기 → 기초 → 1F골조 → 2F → 3F → 4F → 5F → 외벽 → 준공+현수막
```
공정 완료 시 advanceBuildingStage() 호출 → fadeIn + 카메라 줌아웃 연출.

---

## 파일 구조

```
bulsa/
├── index.html                  허브 (5공정 진입)
├── game.html                   메인 게임
├── style.css / style_extensions.css
├── core/
│   ├── engine.js               씬·게임루프·시나리오 디스패치 (GAME 객체)
│   ├── player.js               1인칭 이동 + 다중 raycast + 점프/추락 데미지
│   ├── npc.js                  NPC 클래스 + Yuka AI + 동적 생성
│   ├── character.js            GLB 로더 (헬멧/조끼 색 변경)
│   ├── avatar.js               1인칭 viewmodel + vmDetector
│   ├── inventory.js            핫바 6슬롯 + 도구 카탈로그
│   ├── skill.js                숙련도 시스템 (공종별 카운터)
│   ├── interaction.js          E키 상호작용 + animateLift
│   ├── instruction.js          NPC 지시 팝업 (다국어 즉시반영)
│   ├── accident.js             사고 트리거/VFX/패널 + 미이행항목 인과
│   ├── building.js             5층 건물 9단계 점진 빌드 (advanceBuildingStage)
│   ├── structure.js            구조물 메시 헬퍼
│   ├── hud.js                  HUD/알림
│   ├── minimap.js              미니맵
│   ├── signboard.js            현장 간판/표지판
│   ├── sound.js                Web Audio 절차적 생성
│   ├── weather.js              날씨 시스템
│   ├── postfx.js               Bloom+SSAO
│   ├── unsafe.js               불안전 행동 감지 (골격)
│   ├── tbm.js                  TBM (작업 전 미팅)
│   └── ending.js               완료/수료증 패널
├── scenarios/
│   ├── manifest.js             5공정 정의 + 산안법 매핑 + 과태료 베이스
│   ├── excavation/             ✅ scene/data/hazards/actions + 4 미니게임
│   ├── foundation/             ✅ scene/data/hazards/actions + rebar 미니게임
│   ├── lifting/                ✅ rc_frame.lift sub-step (v1.0 핵심)
│   ├── envelope/               ✅ scene/data/hazards/actions + scaffold 미니게임
│   └── mep_finish/             ✅ scene/data/hazards/actions + mep 미니게임
├── blueprints/                 도면 시스템
└── i18n/strings.js             ko/en/ar/vi 전체 문자열
```

---

## 역할 시스템

| 역할 | 설명 | 헬멧 | 조끼 | 특이사항 |
|------|------|------|------|---------|
| FOREMAN (작업반장) | 플레이어. 전체 지휘 | 흰색 | 노란색 | — |
| CRANE_OPERATOR | 크레인 운전원 NPC | 파란색 | 파란색 | 거부권 미구현 (v1.0 잔여) |
| RIGGER | 줄걸이 작업자 | 노란색 | 파란색 | — |
| SIGNALMAN | 신호수 | 노란색 | 빨간색 | 고정 위치 유지 |
| SAFETY_OFFICER | 안전감시자 | — | — | 고소작업자 겸임 |
| WORKER | 보조작업자 | — | — | 언어장벽(외국인 NPC) 있음 |
| LABOR_INSPECTOR | 고용노동부 감독관 | — | — | 돌발 등장, 위반 적발 (v1.0 잔여) |

---

## 작업계획서 시스템 (Phase 1·2 인게임 통합)

```
GAME.state.workPlans[scenarioId] = { params, signedAt, signedBy }
```
각 공정 진입 시 작업반장이 매개변수 입력 → 서명 → 운전원/작업자가 그 계획서대로 수행.
미작성·위반 시 사고 확률 ↑↑ + 과태료 (산안법 §38).

KOSHA 가이드·산안법 조항 인게임 열람은 v1.1.

---

## 사고 트리거 매핑 (rc_frame.lift sub-step 기준)

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

글로벌: worker_fall (안전대 미착용·추락방지망 미설치 시 어디서나 발생).

---

## 불안전 행동 감지 시스템 (v1.0 잔여)

| 행동 | 대상 NPC | 확률 |
|------|----------|------|
| helmet_off (안전모 미착용) | RIGGER/WORKER | 0.10 |
| zone_intrusion (작업반경 침범) | WORKER | 0.15 |
| smoking (위험구역 흡연) | WORKER/RIGGER | 0.08 |
| phone_use (신호수 폰 사용) | SIGNALMAN | 0.12 → 충돌 사고 |
| no_harness (안전대 미착용) | SAFETY/RIGGER | 0.10 |

**위반 누적:** 1회 → 경고 / 2회 → 안전관리자 등장·15분 중단 / 3회 → NPC 퇴출·대체 인력.

---

## 돌발 이벤트 시스템 (v1.0 잔여)

| 이벤트 | 조건 |
|--------|------|
| labor_inspector (감독관 방문) | 30분마다 10% 확률 → 위반 적발 → 과태료 영수증 |
| strong_wind (강풍) | 10분마다, 풍속 10m/s 초과 |
| heat_wave (온열질환) | 12:00~15:00 |
| equipment_malfunction (장비 이상) | 인양 중 7% 확률 |

---

## 구현 진행 현황

### 핵심 엔진

| 항목 | 상태 | 파일 |
|------|------|------|
| Three.js 씬 + 게임루프 | ✅ | core/engine.js |
| 1인칭 이동 + 점프 + 추락 데미지 | ✅ | core/player.js |
| NPC 동적 생성 + Yuka AI + 외모 변동 | ✅ | core/npc.js |
| GLB 캐릭터 시스템 (헬멧/조끼 변경) | ✅ | core/character.js |
| 1인칭 viewmodel | ✅ | core/avatar.js |
| 인벤토리 핫바 + 도구 카탈로그 | ✅ | core/inventory.js |
| 숙련도 시스템 (공종별 카운터) | ✅ | core/skill.js |
| 5층 건물 9단계 점진 빌드 | ✅ | core/building.js |
| Bloom+SSAO 포스트프로세싱 | ✅ | core/postfx.js |
| NPC 래그돌 사고 연출 + 인과 패널 | ✅ | core/accident.js |
| 수료증 (전항목 완료) | ✅ | core/ending.js |
| 다국어 ko/en/ar/vi | ✅ | i18n/strings.js |
| 허브 index.html | ✅ | index.html |
| 크레인 훅+슬링+빔 동기화 인양 | ✅ | core/interaction.js |
| 날씨 / HUD / 미니맵 / 알림 | ✅ | core/* |
| Web Audio 절차적 생성 | ✅ | core/sound.js |
| NPC 지시 팝업 (다국어) | ✅ | core/instruction.js |
| 도면(blueprints) 시스템 | ✅ | blueprints/ |
| 작업계획서 서명 시스템 | ✅ | core/instruction.js + GAME.state.workPlans |

### 공정 구현

| 공정 | 상태 | 메모 |
|------|------|------|
| excavation | ✅ | scene + 4 미니게임 + 행동 기반 흐름 |
| foundation | ✅ | scene + rebar 미니게임 |
| rc_frame.formwork_rebar | ⏳ | **v1.0 잔여** |
| rc_frame.lift | ✅ | 9개 안전점검 항목 모두 구현 |
| rc_frame.pour_cure | ⏳ | **v1.0 잔여** |
| rc_frame 층 회전 (×5층) | ⏳ | **v1.0 잔여** — 현재 1회만 |
| envelope | ✅ | scene + scaffold 미니게임 |
| mep_finish | ✅ | scene + mep 미니게임 (LOTO·환기·소화기 포함) |

### v1.0 잔여 작업

| 항목 | 우선순위 | 메모 |
|------|---------|------|
| 5공정 연결 흐름 (자동 진행) | 1 | 시나리오 완료 → 다음 공정 자동 트리거 |
| rc_frame formwork_rebar · pour_cure | 1 | 사고: 거푸집 측압 붕괴, 타설 압사 |
| rc_frame 5층 회전 루프 | 1 | sub-step × 5층 = 15 사이클 |
| 감독관 등장 + 과태료 영수증 UI | 2 | OSH_PENALTY_BASE 참조 |
| 불안전 행동 감지 (helmet/harness/phone/zone) | 2 | 누적 처리 포함 |
| GLB 에셋 통합 (장비 4~5, 캐릭터 2~3) | 3 | Quaternius/Kenney |
| 모션 시스템 (Mixamo 7~10 클립) | 3 | idle/walk/dig/lift/pour/install/inspect/refuse/fall |
| 크레인 운전원 NPC 거부권 | 4 | 계획서 위반 시 작업 거부 분기 |

### 미래 버전

| 항목 | 목표 버전 |
|------|---------|
| 작업계획서 작성 UI 인게임 이식 + KOSHA 가이드 열람 | v1.1 |
| 복합현장·다건물·자원·일정 관리 | v2.0 |
| 자유 모드 (설계도 → 공정 자동) | v3.0 |
| Rapier.js 물리엔진 | v3.0 |
| 제조시설 | v4.0 |
| 마을/도시 + 멀티플레이 | v5.0 |

---

## i18n 문자열 키 현황

strings.js에 ko/en/ar/vi 4개국어 완성된 섹션:
- plan / safety / equipment 패널 ✅
- NPC 지시 알림 전체 ✅
- 건설 진행 HUD 레이블 ✅
- instruction popup 닫기 버튼 ✅
- 5공정 명칭 ✅ (manifest.js name 필드)

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-05-09 | blueprints/ 도면 시스템 + 에이전트 5개 구조 |
| 2026-05-09 | plan·safety·equipment 패널 4개국어 완성 |
| 2026-05-10 | SPEC.md 분리 생성 |
| 2026-05-10 | NPC 동적 생성 + 공종 숙련도 시스템 |
| 2026-05-11 | 인벤토리·핫바 + 토공 위임 + 장비 NPC 지시 |
| 2026-05-11 | 작업계획서 vs 작업 지시 구분 명확화 |
| 2026-05-11 | **v1.0 재정의** — "5층 건물 1동 완공" 5공정 통합, 5개 stub 시나리오 폐기, 사무실 픽셀아트 제거, 무사이 인게임화 v1.1로 이연 |
