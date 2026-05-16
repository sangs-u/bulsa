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
- [x] index.html 작성 (로딩 → 언어 선택 → 캐릭터 생성 3단계 온보딩)
- [x] game.html 작성 (게임 메인 진입점)
- [x] style.css 작성 (전역 스타일, 게임 UI 느낌)
- [x] core/engine.js 재작성 (v0 기준 클린 버전)

### Batch 2 — 플레이어 & 입력 (Three.js → Babylon.js 전환 포함)
- [x] core/player.js 재작성 (Babylon.js 기반, WASD + 모바일 조이스틱)

### Batch 3 — 命 게이지 & HUD
- [x] core/life.js 신규 (命 게이지, safetyIndex 관리, Z/X 테스트키)
- [x] core/hud.js 재작성 (안전지수 수치 + 파티창 수위바)
- [x] engine.js 물 수위 메시 (플레이어 몸 안 clip plane 수위 시각화)
- [x] game.html danger-flash / safety-badge / party-panel 추가

### Batch 4 — NPC & 현장
- [x] core/npc.js 재작성 (등급, 피로도, 언어장벽, mistakeRate 공식)
- [x] core/hazard.js 신규 (위험 구역, 바닥 색상 오버레이, lifeDamage 연동)

### Batch 5 — 공정 시스템
- [ ] core/phase.js 신규 (공정 흐름, 체크리스트)
- [ ] core/guide.js 신규 (선배 NPC, 힌트 시스템)

### Batch 6 — 사고 & 경제
- [ ] core/accident.js 재작성 (하인리히 법칙, 연출)
- [ ] core/economy.js 신규 (수입/지출, 과태료)

### Batch 7 — 온보딩 & 마무리
- [x] 현장사무소 씬 (Batch 1&2에서 구현 완료)
- [x] 발주처 NPC 대화 시스템 (game.html 인라인, 4개국어)
- [ ] 온보딩 씬 전환 연출 (index → game 컷씬)

---

## 발견된 버그 & 이슈

### 모바일 버그 수정 현황 (2026-05-15) — ✅ 전체 실기기 확인 완료

- **3D 화면 안 나옴** ✅ — `window.load` 이후 Babylon.js 초기화, `game:ready` 이벤트 체계
- **SW 캐시 stale** ✅ — `.html`도 캐시 제외, SW v6
- **대화 버튼 클릭 불가** ✅ — 근본 원인: Babylon.js InputManager가 window 레벨에서 PointerEvent 캡처 → dialog 버튼의 click 합성 차단. 수정: `scene.detachControl()` (모바일) + dialog에 stopPropagation capture 리스너 + 버튼 touchstart 제거(click만 유지)
- **카메라 회전** ✅ — `inertialAlphaOffset` 방식, `cam.attachControl` 제거
- **조이스틱 이동** ✅ — 실기기 확인 완료

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
| 2026-05-14 | Batch 1 | index.html 전면 재작성 (딥 네이비×라임 색상, Nunito, 로딩→언어→캐릭터 3단계, localStorage 저장) | 대기 중 |
| 2026-05-14 | Batch 2 | Three.js → Babylon.js 전환: engine.js + player.js + game.html 전면 재작성, 현장사무소 씬, NPC 대화 4개국어 | ✅ |
| 2026-05-14 | Batch 3 | 命 게이지 시스템: life.js + hud.js + engine.js 물 수위 메시(clip plane) + game.html HUD 확장 | ✅ 데스크톱 확인 |
| 2026-05-14 | 모바일 버그픽스 1 | waterFill disableDepthWrite + attachControl(false) + SW 캐시 제외 | ⚠️ 미확인 |
| 2026-05-15 | 모바일 버그픽스 2 | window.load 지연 초기화 + game:ready 이벤트 체계 + sw.js v6 + 버튼 touchstart + 모바일 attachControl 제거 | ✅ |
| 2026-05-15 | 모바일 버그픽스 3 | scene.detachControl() + dialog stopPropagation + 버튼 click only — 대화버튼 터치 완전 해결 | ✅ 실기기 확인 |
| 2026-05-15 | 시각 일관성 | 하늘 그라디언트 돔, 지반 분할(흙+콘크리트), 사무소 블루그레이+간판, NPC 헬멧/조끼/그림자/이름표, 황금빛 아침 조명 | 대기 중 |
| 2026-05-15 | Batch 5 | 사전조사+작업계획서 11단계 다이얼로그 (토질조사·매설물 X-ray·공법선택·안전조치·서류 overlay) + phase.js + survey.js | 대기 중 |
| 2026-05-15 | Batch 6 | 자재 운반/설치 시스템: carry.js, TBM 3단계 연출, 굴착 구역·더미·스냅 존 mesh, NPC 위임 AI, 체크리스트 HUD | 대기 중 |
| 2026-05-15 | Batch 7 | 굴착 단계: 복셀 지형 terrain.js + excavator.js + dumptruck.js | ✅ |
| 2026-05-16 | 롤백 + 정리 | 5/16 오전 잘못된 머지 폐기, 어제 KST 마지막(417966e)로 reset 후 재시작 | ✅ |
| 2026-05-16 | 통합 GLB 캐릭터 | assets/characters/player.glb (8.8MB, 20 클립) 적용. 기존 11×22MB 개별 GLB 폐기 (≈242MB 감소). character.js 재작성: 로더 auto-play 차단, 클립명↔실제 모션 in-memory rename, setState/playOnce API | ✅ |
| 2026-05-16 | 난간 재설계 | railing.js 폐기, carry.js에 통합. 부재 단위(POST/RAIL/CONE) 분리, 다중 집기(5/2/1), 자유 위치 설치, 수평재 자동 정렬, 미리보기 ghost. CLAUDE.md §12 "부재 단위 배치" 원칙 추가 | ✅ |
| 2026-05-16 | 후속 보정 | 라바콘 자유 배치 통일, carry 모션 폐기(walk로 통일), Shift 달리기, 집기 우선순위 수정, NPC 위임(빈손+근처 NPC→자동 설치), 자재 더미 99/99/99 풍족화 | ⚠️ 다음 세션 검증 |
| 2026-05-16 | 정리/푸시 | .gitignore 보강(.claude/worktrees, *.zip), 미사용 파일 삭제, PROGRESS.md 업데이트 | - |
| 2026-05-16 | 후속 보정 2 | G키 내려놓기(더미 반환) + NPC 위임 수직재 금지(수평재/라바콘만) + NPC GLB 캐릭터화(LoadAssetContainerAsync+instantiate, 등급별 작업복·헬멧) + 맵 경계 타이트화(x±22, z 9.2~38) + 대화 Space/E 진행 | ⚠️ 브라우저 확인 필요 |
| 2026-05-17 | 버그픽스 묶음 | 대화 키보드(Space/E) 가드 추가 + 카메라 radius 드리프트(휠input 제거+in-place lerp) + NPC GLB 커밋 누락 수정 | ⚠️ 브라우저 확인 필요 |
| 2026-05-17 | 카메라/NPC 개선 | V키 1인칭↔3인칭 전환(모바일 버튼 포함) + NPC 위임 거리 4.5m + 라바콘 수직재 독립 위임 | ⚠️ 브라우저 확인 필요 |
