# PROGRESS.md — 불사(BULSA) 진행 상태

> ✅ 이 파일은 Claude Code가 배치 완료마다 업데이트 가능.
> 매 세션 시작 시 반드시 읽을 것.

---

## 현재 버전: v0 (시작점)

---

## 완료된 것

### 설계 단계
- [x] 전체 브레인스토밍 완료
- [x] 게임 정체성 확정 (불사, 건설 절차 = 게임)
- [x] 플레이어 역할 구조 확정
- [x] 命 게이지 시스템 설계
- [x] 사고 시스템 설계 (하인리히 법칙)
- [x] 경제 시스템 설계
- [x] NPC 시스템 설계
- [x] 성장 시스템 설계
- [x] 오픈월드 구조 설계
- [x] 아트 디렉션 확정 (SD 2~2.5등신 캐릭터)
- [x] 에셋 파이프라인 확정
- [x] UI/HUD 설계
- [x] 온보딩 흐름 설계
- [x] 모바일+PC 동일 지원 방식 확정
- [x] 문서 구조 확정 (CLAUDE.md / DESIGN.md / PROGRESS.md)

### 파일 정리
- [x] 기존 코드 전수 분류 (살릴 것 / 버릴 것)
- [x] bulsa_v0 뼈대 파일 추출 완료

---

## 현재 파일 상태

### 있는 파일 (bulsa_v0 기준)
```
core/
├── engine.js      ← 참고용 (재작성 필요)
├── player.js      ← 참고용 (TPS 전환 로직 활용 가능)
├── npc.js         ← 참고용 (NPC 클래스 구조)
├── accident.js    ← 참고용 (triggerAccident 인터페이스)
├── hud.js         ← 참고용 (구조만)
├── sound.js       ← 재사용 가능
├── bgm.js         ← 재사용 가능
└── ending.js      ← 재사용 가능

i18n/strings.js    ← 재사용 가능 (4개국어 문자열 자산)
assets/
├── equipment_catalog.json  ← 재사용 가능
└── manifest.md             ← 참고용
vendor/cannon.min.js        ← 재사용
qa/syntax-check.js          ← 재사용
qa/static-server.js         ← 재사용
```

### 없는 파일 (새로 만들어야 함)
```
index.html         ← 온보딩 (언어선택, 캐릭터생성)
game.html          ← 게임 메인
style.css          ← 전역 스타일
core/life.js       ← 命 게이지 시스템 (신규)
core/phase.js      ← 공정 흐름 시스템 (신규)
core/hazard.js     ← 위험 구역 시스템 (신규)
core/economy.js    ← 경제 시스템 (신규)
core/sign.js       ← 안전보건표지 캔버스 (신규)
core/input.js      ← PC/모바일 입력 통합 (신규)
core/guide.js      ← 힌트 & 가이드 시스템 (신규)
core/weather.js    ← 날씨 & 시간 시스템 (신규)
```

---

## 다음 할 것 (우선순위 순)

### Batch 1 — 기본 씬 구축
- [ ] index.html 작성 (언어 선택 + 캐릭터 생성 화면)
- [ ] game.html 작성 (게임 메인 진입점)
- [ ] style.css 작성 (전역 스타일, 게임 UI 느낌)
- [ ] core/engine.js 재작성 (v0 기준 클린 버전)

### Batch 2 — 플레이어 & 입력
- [ ] core/input.js 신규 (PC/모바일 통합 입력)
- [ ] core/player.js 재작성 (3인칭 기본, 장비 탑승 시 1인칭)

### Batch 3 — 命 게이지 & HUD
- [ ] core/life.js 신규 (命 게이지, 수위 시각화)
- [ ] core/hud.js 재작성 (미니맵 + 命게이지 + 파티창)

### Batch 4 — NPC & 현장
- [ ] core/npc.js 재작성 (등급, 피로도, 언어장벽)
- [ ] core/hazard.js 신규 (위험 구역, 색상 오버레이)

### Batch 5 — 공정 시스템
- [ ] core/phase.js 신규 (공정 흐름, 체크리스트)
- [ ] core/guide.js 신규 (선배 NPC, 힌트 시스템)

### Batch 6 — 사고 & 경제
- [ ] core/accident.js 재작성 (하인리히 법칙, 연출)
- [ ] core/economy.js 신규 (수입/지출, 과태료)

### Batch 7 — 온보딩 & 마무리
- [ ] 온보딩 흐름 구현
- [ ] 현장사무소 씬
- [ ] 발주처 NPC 대화 시스템

---

## 발견된 버그 & 이슈

없음 (v0 시작 전)

---

## 결정 보류 중인 것

- 사운드 파일 선택 (들어보고 결정)
- 자격증 시스템 세부 (최후순위, v1.0 배포 후)
- 멀티플레이 계정 시스템 (v3.0 때 결정)

---

## 배치 완료 기록

| 날짜 | 배치 | 내용 | 시각 확인 |
|------|------|------|-----------|
| 2025-05 | 설계 | 전체 설계 확정 + 문서 작성 | - |
