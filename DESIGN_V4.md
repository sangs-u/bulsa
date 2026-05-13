# BULSA v4 설계 문서
> 작성: 2026-05-13 | 다음 세션도 이 문서부터 읽을 것

---

## 핵심 철학

**건설 행위 시뮬레이터 + 자연 발생 사고**

- 플레이어는 건설 행위 자체를 수행한다 (운반, 설치, 조작)
- 행위를 진행할수록 해당 작업 구역의 위험 노출이 누적된다
- 안전 행위(망 깔기, 난간 설치 등)는 위험 노출을 낮춘다
- 위험 노출이 임계치를 초과한 상태에서 작업 계속 → 사고 발생

**핵심 구분:**
- ❌ 기존: "안전 체크리스트 → flag 세팅" (안전을 확인하는 게임)
- ✅ v4: "건설 행위 → 위험 누적 → 안전 행위 → 위험 감소" (건설을 하는 게임)

---

## 전체 게임 흐름

```
게임 시작
  → 작업계획서 작성 (모달 — 공법/깊이/공정 선택)
  → 페이즈 1: 굴착
  → 페이즈 2: 기초 (철근배근 + 거푸집 + 타설)
  → 페이즈 3: 골조 양중 (RC 5층)
  → 페이즈 4: 외장공사 (비계 + 외장재)
  → 페이즈 5: 설비·마감 (MEP)
  → 수료증
```

각 페이즈는 **자재 반입 → 준비 행위 → 주요 행위 → 다음 페이즈 조건 충족** 구조.

---

## 3대 핵심 시스템

### 1. 자재 시스템 (material.js)

모든 자재는 물리적 실체를 가진다.

```js
// 자재 정의 예시
{
  id: 'railing_post',
  label: { ko: '난간 포스트', en: 'Railing post' },
  weight: 8,          // kg — 개당
  soloCarryMax: 25,   // kg — 1인 운반 한계
  twoPersonMax: 50,   // kg — 2인 운반 한계 (초과 시 장비 필요)
  stackable: true,    // 복수 운반 가능 여부
  geometry: { type: 'cylinder', r: 0.03, h: 1.2 },
  color: 0xFFCC00,
}
```

**자재 흐름:**
```
트럭 도착 (씬 외곽에 스폰)
  → E키: 하역 (중량 확인 → 초과 시 장비 요구)
  → 플레이어 휴대 상태 진입 (이동 속도 감소, 카메라 bob 변화)
  → 작업 포인트 근처에 내려놓기 (G키 또는 E키)
  → 설치 행위 가능 상태
```

**중량 규칙:**
- ≤ soloCarryMax: 혼자 운반 가능
- soloCarryMax ~ twoPersonMax: "2인 필요" 알림 (현재는 NPC 동반 명령 후 가능)
- > twoPersonMax: 크레인/지게차 필요

---

### 2. 위험 노출 시스템 (hazard_zone.js)

전역 safetyIndex 대신 **구역별·위험종류별** 독립 수치.

```js
// 위험 구역 예시
{
  id: 'excavation_edge',
  center: { x: 0, z: 0 },
  radius: 8,
  hazards: {
    edge_fall:      0.0,   // 0~1
    soil_collapse:  0.0,
    equip_crush:    0.0,
  },
  checkInterval: 6.0,   // 초마다 사고 판정
  accidentMap: {
    edge_fall:     'edge_fall',
    soil_collapse: 'soil_collapse',
    equip_crush:   'excavator_crush',
  }
}
```

**위험 누적 규칙:**
- 굴착 1m 진행 → edge_fall +0.15, soil_collapse +0.20
- 흙막이 H파일 설치 완료 → soil_collapse -0.40
- 난간 포스트 1개 설치 → edge_fall -0.10
- 난간 4개 완료 → edge_fall -0.50

**사고 판정 (매 checkInterval):**
```
hazard > 0.7 → Math.random() < hazard → triggerAccident(accidentMap[hazard])
```

**명(命) safetyIndex 역할 변경:**
- 전역 안전지수는 유지하되, 사고 발생 시 차감 (기존과 동일)
- 위험 노출은 별도 수치 (safetyIndex와 독립)

---

### 3. 행위 시스템 (act.js)

모든 행위는 정의된 구조를 가진다.

```js
{
  id: 'install_railing_post',
  label: { ko: '난간 포스트 설치', en: 'Install railing post' },
  // 행위 조건
  requires: {
    materialHeld: 'railing_post',   // 플레이어가 이 자재를 들고 있어야
    nearMarker: true,               // 설치 마커 반경 내
  },
  // 행위 수행
  inputMode: 'hold_e',             // E키 홀드 (게이지 채우기)
  duration: 2.5,                   // 초
  tool: 'drill',                   // 없으면 기본 손
  // 행위 결과
  onComplete: {
    spawnMesh: 'railing_post',      // 설치 위치에 mesh 생성
    consumeMaterial: true,
    hazardEffect: { edge_fall: -0.10 },
    advanceProgress: 'railing',
  }
}
```

**inputMode 종류:**
- `hold_e`: E키 홀드 (게이지) — 설치, 점검
- `tap_e`: E키 단타 — 하역, 픽업
- `operate`: WASD 조작 — 굴착기, 크레인
- `walk_area`: 구역 내 이동 — 매설물 조사 (걸으면 자동 마킹)

---

## 페이즈별 설계

### 페이즈 1 — 굴착

**모달 (게임 시작 시 1회):**
- 굴착 깊이 선택 (0.5m ~ 10m)
- 공법 선택:
  - 사면개착: 깊이 ≤ 1.5m (흙막이 불필요, 구배 자동)
  - H파일+흙막이: 깊이 > 1.5m
  - 시트파일: 깊이 > 3m 또는 인접 구조물 있을 때
- 선택에 따라 자재 목록과 행위 순서가 달라짐

**행위 순서 (H파일 선택 시):**
```
[A] 자재 반입 (자동 — 트럭 스폰)
[B] 매설물 조사 (walk_area — 부지 걷기, 탐지기 들고)
      → 미조사 구역에서 굴착 시 지하매설물 파손 사고
[C] 트럭에서 H파일 하역 (tap_e × N개)
      → 중량 초과면 크레인 필요 알림
[D] H파일 운반 → 항타 지점에 내려두기
[E] 항타기 조작 (operate — 각 지점 H파일 타격)
      → 항타 미완료 상태에서 굴착 시 soil_collapse 위험 급등
[F] 강재 흙막이판 설치 (hold_e × M개)
[G] 난간 포스트 자재 하역 → 운반 → 설치 (hold_e × 4개)
      → 미설치 상태에서 굴착 진행 시 edge_fall 위험 급등
[H] 굴착기 탑승 → 굴착 조작 (operate)
      → 위험 노출 실시간 상승 → 안전 조치에 따라 상쇄
[I] 토사반출 (덤프트럭 루트 지정 또는 자동)
[J] 지반 정리 → 페이즈 2 진입 가능
```

**행위 순서 (사면개착 선택 시):**
```
[A] 매설물 조사
[B] 난간 설치 (굴착 단부 예정선 기준)
[C] 굴착기 조작 (경사각 유지 중요 — 어기면 사면 붕괴)
[D] 토사반출 → 지반 정리
```

**위험 구역 (페이즈 1):**
| 위험종 | 누적 트리거 | 감소 트리거 |
|--------|------------|------------|
| edge_fall | 굴착 깊이 증가 | 난간 설치 |
| soil_collapse | 굴착 진행 (흙막이 없음) | 흙막이판 설치 |
| equip_crush | 굴착기 작업반경 내 NPC | 신호수 배치 |
| underground_strike | 미조사 구역 굴착 | 매설물 조사 완료 |

---

### 페이즈 2 — 기초 (철근배근 + 거푸집 + 타설)

**행위 순서:**
```
[A] 철근 자재 반입 → 하역 (크레인 필요 — 중량 초과)
[B] 철근 운반 → 배근 위치 지정
      → 철근 간격 넓으면 실족 위험 발생
[C] 철근 배근 (hold_e — 각 격자 위치)
[D] 실족방지망 반입 → 운반 → 깔기 (walk + hold_e)
      → 깔면 실족 위험 대폭 감소
[E] 거푸집 패널 반입 → 운반 → 설치 (hold_e)
[F] 동바리 반입 → 설치 (hold_e)
[G] 펌프카 진입 → 타설 (operate — 노즐 방향 조작)
      → 타설 중 동바리 빠지면 거푸집 붕괴
[H] 양생 대기 (시간 경과 — skip 가능하나 위험)
      → 양생 전 탈형 시 붕괴 위험
```

**위험 구역 (페이즈 2):**
| 위험종 | 누적 트리거 | 감소 트리거 |
|--------|------------|------------|
| rebar_stab | 철근 배근 수량 증가 | 보호캡 설치 |
| floor_fall | 배근 간격 넓은 구역 | 실족방지망 설치 |
| form_collapse | 타설량 증가 | 동바리 밀도 확인 |

---

### 페이즈 3 — 골조 양중 (RC 5층)

기존 lifting 시나리오 미니게임 구조 유지 + 위험 누적 시스템 통합.

**행위:**
- 크레인 슬링 체크 (hold_e — 각 체결점)
- 신호수 배치 (NPC 명령)
- 크레인 조작 (operate — 기존 cab 시스템)
- 층별 철근/거푸집/타설 반복 (페이즈 2 축약형)

---

### 페이즈 4 — 외장공사

**행위:**
```
[A] 비계 강관 반입 → 조립 (hold_e × 구간별)
[B] 안전발판 설치 (hold_e)
[C] 안전대 부착설비 설치 (hold_e — 수직망 설치)
[D] 외장 패널 반입 → 크레인 양중 → 결속 (hold_e)
[E] 신호수 배치 (NPC 명령)
```

---

### 페이즈 5 — 설비·마감 (MEP)

**행위:**
```
[A] LOTO 잠금장치 설치 (hold_e — 전기반 앞)
[B] 가스배관 연결 (hold_e)
[C] 국소배기 장치 작동 (tap_e)
[D] 소화기 배치 (tap_e — 각 위치)
[E] 전선 포설 (walk + hold_e)
```

---

## 물리 엔진 연동 (페이즈별)

cannon.js (현재 계획) 또는 Three.js raycaster 기반 근사.

| 페이즈 | 물리 요구사항 |
|--------|--------------|
| 1 (굴착) | 지면 변형 (굴착 진행 시 지면 mesh 함몰), 자재 낙하 |
| 2 (기초) | 자재 스태킹, 콘크리트 타설 범위 시각화 |
| 3 (골조) | 크레인 슬링 장력 근사, 양중 하중 진동 |
| 4 (외장) | 고소 작업 — 낙하 판정, 비계 하중 |
| 5 (MEP) | 가스 누출 확산 범위 (파티클) |

**공통 물리:**
- 플레이어 자재 휴대 시 이동속도 감소 (중량 비례)
- 자재 낙하 (들고 있다 놓으면 중력 적용)
- 작업 구역 충돌 판정 (raycaster로 설치 위치 snap)

---

## 아키텍처

### 유지하는 파일
```
core/engine.js        씬·렌더러·게임루프
core/player.js        이동·카메라 (휴대 상태 추가)
core/npc.js           NPC 시스템
core/accident.js      사고 패널 (트리거 인터페이스만 유지)
core/hud.js           HUD (위험 노출 게이지 추가)
core/ending.js        수료증
i18n/strings.js       4개국어
core/sound.js         사운드
```

### 교체하는 파일
```
core/interaction.js   → core/act.js (행위 시스템)
core/phase_controller.js → core/phase_v4.js
scenarios/*/actions.js → 각 페이즈 행위 정의로 통합
scenarios/*/scene.js  → 페이즈별 씬은 phase_v4가 관리
```

### 신규 파일
```
core/material.js      자재 정의 + 휴대 상태 관리
core/hazard_zone.js   구역별 위험 노출 수치 관리
core/act.js           행위 정의 + 트리거 + 결과
core/carry.js         플레이어 휴대 시스템 (중량·속도·UI)
core/phase_v4.js      페이즈 전환 + 씬 빌드 + 행위 시퀀스 관리
core/marker.js        설치 마커 (3D 위치 기반 E키 포인트)
```

---

## 구현 순서 (배치 계획)

**Batch 1 — 기반 시스템 3개:**
1. `material.js` — 자재 정의 + GAME.materials 레지스트리
2. `carry.js` — 플레이어 휴대 상태 (E키 픽업, G키 내려놓기, 중량→속도)
3. `hazard_zone.js` — 구역 등록, 수치 누적/감소, 주기 판정

**Batch 2 — 행위 시스템:**
4. `act.js` — 행위 정의, hold_e 게이지, 완료 콜백
5. `marker.js` — 3D 설치 마커 (링 mesh + 접근 감지)

**Batch 3 — 페이즈 컨트롤러:**
6. `phase_v4.js` — 씬 빌드, 행위 시퀀스, 페이즈 완료 조건

**Batch 4 — 페이즈 1 구현:**
7. 굴착 계획서 모달 (공법 선택)
8. 매설물 조사 행위 (walk_area)
9. H파일/사면 분기 + 항타 또는 경사 굴착
10. 난간 설치 행위
11. 굴착기 연동 + 위험 누적
12. 토사반출 + 지반정리

**Batch 5~ — 페이즈 2~5 순차 구현**

---

## 페이즈 전환 조건 (v4)

flag 기반 아님. **행위 완료 수 기반.**

```js
// 페이즈 1 완료 조건
{
  acts_completed: ['survey_done', 'shoring_done', 'railing_done', 'excavation_done', 'soil_removed'],
  hazard_max: 0.3,   // 모든 위험 노출이 0.3 이하여야 페이즈 전환 가능
}
```

Y키 → 조건 체크 → 통과하면 페이즈 전환, 아니면 미완 항목 알림.

---

## 네이밍 규칙

- 자재: `MAT_*` (MAT_RAILING_POST, MAT_H_PILE 등)
- 행위: `ACT_*` (ACT_INSTALL_RAILING, ACT_DRIVE_PILE 등)
- 위험: `HAZ_*` (HAZ_EDGE_FALL, HAZ_SOIL_COLLAPSE 등)
- 구역: `ZONE_*` (ZONE_EXCAVATION, ZONE_FOUNDATION 등)

---

## 참고: 기존 코드와의 경계

- `triggerAccident(id)` — 인터페이스 유지 (accident.js 수정 없음)
- `applySafetyPenalty(pt)` — 사고 시 명(命) 차감 유지
- `updateHUD()` — HUD 갱신 유지 (위험 게이지 추가)
- `GAME.npcs` — NPC 시스템 그대로 사용
- `GAME.activeTasks` — v2 작업 큐는 v4에서 폐기, phase_v4가 관리
