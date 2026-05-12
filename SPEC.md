# BULSA — 안전 문명 시뮬레이터 설계서
> v2.0 · 최종수정 2026-05-12
> v1.x 의 "시나리오" 모델 폐기. **작업 큐 + 간섭 매트릭스** 모델로 재정의.

---

## 비전

5층 건물 1동을 안전기준 준수하며 자율 건설하는 작업반장 시뮬레이터.
플레이어는 한 부지에서 **동시에 활성화되는 여러 작업**을 NPC들에게 배치·조율하며 진행.
사고는 1) 단일 작업의 안전 위반 또는 2) 여러 작업이 공간·시간상 충돌하는 **간섭(interference)** 으로 발생.

**무사이와의 관계**
```
무사이 — 서류/계산 플랫폼 (작업계획서, 안전성 계산, 체크리스트)
불사   — 실행 시뮬레이터 (계획서대로 현장 수행 + 간섭 회피)
```

---

## 핵심 모델 (v2 변경점)

### 폐기된 개념 — "시나리오 (scenario)"
- 옛 v0.x ~ v1.x: `excavation`, `foundation`, `lifting`, `envelope`, `mep_finish` 5개 시나리오 URL 분리 진입
- 현재 코드의 `GAME.scenarioId` 변수는 **레거시**. 점진적으로 `currentSiteContext` 로 대체 예정
- 한 시나리오 끝나면 다음 시나리오로 점프하는 선형 흐름 → 폐기

### 새 개념 — "작업 (task)"
- 한 부지에 **여러 작업이 동시 활성** 가능
- 작업은 종류(type) · 층(floor) · 위치(loc) · 담당NPC · 진척도(progress) 보유

```
가설공사 (Temporary works) — 본공사 받쳐주며 처음~끝 유지
  shoring          흙막이 가시설 (H-pile/시트파일/어스앵커)
  scaffold         시스템 비계 (층마다 증축 / 외장 완료 후 해체)
  formwork_support 동바리·거푸집 지지 (층마다 설치/해체)
  guardrail        안전난간·낙하물방지망
  lifeline         안전대 부착설비

본공사 사이클 (Main cycle) — 5층 반복
  excavate    부지 굴착 (시작점, 1회)
  found_pour  매트 기초 타설 (1회)
  formwork    거푸집 조립 (층마다)
  rebar       철근 배근 (층마다)
  pour        콘크리트 타설 (층마다)
  cure        양생 (층마다 · 시간 점유 작업)

마감/설비 (Finish/MEP) — 골조 진행 중 병행 가능
  panel       외장 패널 (해당 층 골조 완료 후)
  glass       창호 설치
  electric    전기 배선 + LOTO
  plumb       배관
  vent        환기 설비
  paint       도장
  ext_install 소화기 배치

지속 작업 (Continuous) — 항상 진행
  lift        양중 (자재 인양 — 사이클별 발생)
  signal      신호수 통제
  survey      매설물·풍속 모니터링
  inspect     안전감시
```

### 간섭 매트릭스 (Interference Matrix)
두 작업이 같은 공간·시간에 진행되면 사고 확률 가산:

| 작업 A | 작업 B | 위치 조건 | 사고 | 기본 확률 |
|--------|--------|----------|------|----------|
| lift (양중) | 인양 반경 내 작업자 | 반경 6m | worker_crush | 0.85 |
| pour (위층) | 작업자 (아래층) | 수직 하방 | falling_debris | 0.75 |
| electric (활선) | plumb (배관) | 1m 내 | electric_shock | 0.70 |
| paint (유성·에폭시) | electric (용접/스파크) | 5m 내 | fire_explosion | 0.80 |
| scaffold (해체) | panel (설치 중) | 같은 층 | fall + panel_drop | 0.65 |
| pour | formwork_support (미점검) | 같은 층 | form_collapse | 0.85 |
| excavate (굴착기) | survey 없음 | 반경 5m | excavator_crush | 0.70 |
| lift (인양) | 풍속 > 10m/s | 전역 | swing_drop | 0.85 |
| formwork (해체) | rebar (다음 층 배근) | 수직 하방 | falling_debris | 0.55 |
| cure (양생 중) | next floor 타설 | 같은 슬래브 | premature_load | 0.60 |

확률은 **NPC 숙련도·안전조치 이행도** 에 따라 가감.

### 명령 풀 (Instruction Pool) 합성 규칙
플레이어가 NPC에게 명령할 때, 풀은 **현재 활성 작업 집합**으로 동적 합성:

```
pool = ∪ INSTRUCTION_POOLS_BY_TASK[t.type]  for t in GAME.activeTasks
      + TRAPS_GLOBAL     (위험변종·타직종 함정 — 항상 포함)
```

`giveInstruction` 분기 로직 (시나리오 무관, 공통):
1. 언어 미스매치 → 무작위 행동
2. 직종 미적합 → NPC 거부 + -5
3. 활성 작업과 무관 (해당 작업이 큐에 없는 명령) → NPC 거부 + -3
4. 위험변종 → 50% 양심 거부 / 50% 시도 → 70% 사고
5. 숙련도 미달 → 시도 실패 + -4
6. 정상 수행

---

## 파일 구조 (v2 목표)

```
bulsa/
├── core/
│   ├── tasks.js          v2 신규 — 작업 큐 + 간섭 매트릭스 + 합성 헬퍼
│   ├── instruction.js    분기 로직 (v1.2 완성) + tasks 통합
│   ├── npc.js            NPC + 작업 할당 (task.npcId)
│   ├── interaction.js    플레이어 행동
│   └── engine.js         scenarioId 점진 폐기 → currentSiteContext
├── scenarios/            레거시 — 점진 폐기 예정 (한 부지 통합으로 마이그레이션)
└── i18n/strings.js
```

---

## v2 마이그레이션 진행 상태 (2026-05-12)

1. ✅ **SPEC v2 + CLAUDE.md 명문화** (이 문서)
2. ✅ **core/tasks.js 신규** — TASK_TYPES 23 · GAME.activeTasks · INTERFERENCE_MATRIX 10
3. ✅ **간섭 평가 함수** — evaluateInterference + cond AND 평가 (+flag 토큰: dismantle/unchecked/organic/premature)
4. ✅ **명령 풀 합성 헬퍼** — buildInstructionPoolFromActiveTasks + INSTRUCTION_POOLS_BY_TASK 23종 + TRAPS_GLOBAL 8 (flag-trigger 포함)
5. ✅ **레거시 scenarioId 보존** — engine.js scenarioId 유지, activeTasks 와 병행
6. ✅ **5층 사이클 컨트롤러** — rc_loop.js 가 sub-step 진행에 따라 enqueue/dequeue + 4 시나리오 시드
7. ✅ **HUD 활성 작업 칩** — core/task_chips.js, hud-tl 영역 (그룹색·충돌 적색 glow)
8. ✅ **간섭 시각화** — core/interference.js, THREE.Line + sustained 강도 (opacity/color/pulse) + 끝점 NPC 추적
9. ✅ **명령 히스토리 UI** — core/instruction_history.js, H 키, localStorage 영속, accident/interference 이벤트 통합
10. ⏳ **5 시나리오 URL 진입을 한 부지 통합으로 흡수** — 마지막 큰 작업
11. ✅ **추가**: 사고 라이브러리 (L 키) · 명(命) 게이미피케이션 · 디버그 콘솔 (`__bulsa`) · 사고 ID 4언어 라벨 매핑 · NPC 1:N trade 매핑

---

## 코딩 원칙 (v2)

- Three.js + 바닐라 JS · 외부 의존성 최소화
- 모든 텍스트 i18n (ko/en/vi/ar) · 하드코딩 금지
- 파일 삭제 금지 · musaai 수정 금지
- **시나리오 분기 신규 추가 금지** (기존 코드는 백워드 호환 유지, 새 기능은 activeTasks 사용)
- 사고 = 단일 위반 + 간섭 양쪽 모두 모델링
- 작업은 시공간 좌표 + 위험도 + 의존성 보유

---

## 기술 스택 (변경 없음)

| 항목 | 내용 |
|------|------|
| 렌더링 | Three.js r128 (CDN) |
| AI 경로 | Yuka.js 0.7.8 |
| 다국어 | ko/en/vi/ar |
| 배포 | GitHub Pages |
| CI | GitHub Actions — `npm run check` (84 .js 구문) |

---

## 게임 모드 로드맵

| 버전 | 모드 | 내용 |
|------|------|------|
| **v1.x** (완료) | 시나리오 분리 모드 | 5공정 각각 시나리오로 학습 (레거시 — 점진 폐기) |
| **v2.0** (현재 목표) | 작업 큐 + 간섭 | 한 부지 5층 자율 건설 + 작업 간섭 사고 |
| v2.1 | 인게임 학습 | 무사이 작업계획서 UI 인게임 이식 + KOSHA 가이드 |
| v3.0 | 복합현장·다건물 | 복수 건물 동시 시공, 자원관리, 일정관리 |
| v4.0 | 자유 모드 | 설계도 입력 → 작업 큐 자동 생성, 안전검토 통과 시 구조물 생성 |
| v5.0 | 제조시설 | 공장 설치/가동/유지보수 |
| v6.0 | 마을/도시 | 멀티플레이 협동 필수 |

---

## 핵심 결정사항 (Lock-in)

- 물리: cannon.js 0.6.2 UMD · BGM: Web Audio 합성 · PWA: network-first
- 과태료: KRW (산안법 시행령 별표 35) · 등급: S/A/B/C/D
- 무사이 저장소 수정 절대 금지 · Rapier.js는 v3.0+
- **v2 핵심**: 시나리오 모델 폐기, 작업 큐 + 간섭 매트릭스로 v1.0 청사진 재정의
