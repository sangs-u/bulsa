# BULSA — 에이전트 작업 지침
> 안전 문명 시뮬레이터 · https://sangs-u.github.io/bulsa

## 프로젝트 경로
- 게임: `C:\Users\sangs\OneDrive\Desktop\bulsa`
- 사이트: `C:\Users\sangs\OneDrive\Desktop\sangs-u.github.io`
- 서버: `C:\Users\sangs\OneDrive\Desktop\bulsa-server`
- 참조(수정금지): https://github.com/sangs-u/musaai

## 기술 스택
```
Three.js r128 (CDN) · Yuka.js 0.7.8 · 바닐라 JS · 정적 HTML
다국어: ko/en/ar/vi (i18n/strings.js)
배포: GitHub Pages
```

## 파일 구조 (핵심)
```
bulsa/
├── game.html           메인 게임
├── core/
│   ├── engine.js       씬·게임루프
│   ├── player.js       1인칭 이동
│   ├── npc.js          NPC + Yuka AI
│   ├── interaction.js  E키 상호작용
│   ├── accident.js     사고 트리거
│   └── hud.js          HUD·알림
├── scenarios/lifting/
│   └── scene.js        줄걸이 시나리오
└── i18n/strings.js     4개국어 문자열
```

## 코딩 원칙
- Three.js + 바닐라 JS. 외부 의존성 최소화
- 모든 텍스트 i18n (strings.js). 하드코딩 금지
- 파일 삭제 금지. 수정만
- musaai 저장소 절대 수정 금지

## 작업 완료 규칙 (필수)
1. 모든 수정 후 즉시 `git add . && git commit && git push` (bulsa 저장소)
2. sangs-u.github.io 수정 시 해당 저장소도 push
3. 작업 완료 시 `PROGRESS.md` 업데이트 (마지막 완료 작업 + 다음 작업 목록 갱신). 30줄 이내 유지.
4. 질문 금지. 모호한 부분은 스스로 판단하고 즉시 실행
5. **응답은 3줄 이내**: 완료된 파일명 + 핵심 변경사항만. 설명·요약·칭찬 금지
6. 커밋·푸시 전 `npm run check` 로 86 파일 구문 검증 (PASS 아니면 푸시 금지)

## 모바일 원격 작업 환경 (집 PC + 휴대폰)
어디서나 휴대폰으로 작업 지시·로그 확인하는 셋업. Railway 같은 별도 환경은 컨텍스트 재구성으로 토큰 폭발 — 집 PC 단일 세션 유지가 최적.

**집 PC (WSL2 Ubuntu, 1회 셋업):**
```bash
sudo apt install -y tmux openssh-server
sudo systemctl enable ssh && sudo systemctl start ssh
curl -fsSL https://claude.ai/install.sh | bash && claude login   # Max OAuth
# Tailscale (공인 IP 불필요, 무료)
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up
# 부팅 자동 시작 — Windows Task Scheduler 에서:
#   wsl.exe -d Ubuntu -e bash -c "~/start-bulsa.sh"
```

**`~/start-bulsa.sh`** (한 번 만들어 둠):
```bash
#!/bin/bash
tmux has-session -t bulsa 2>/dev/null || {
  tmux new-session -d -s bulsa -c ~/projects/bulsa
  tmux send-keys -t bulsa 'claude --continue' C-m
}
```

**휴대폰 (1회 셋업):**
- Tailscale 앱 로그인 → 집 PC IP(`100.x.x.x`) 자동 인식
- Termius/Blink SSH 앱에 호스트 저장
- 일상: SSH 접속 → `tmux attach -t bulsa` → 명령 입력. 끝나면 `Ctrl+B D` (exit 금지)

**영속성 핵심:** `claude --continue` 가 디스크 저장 대화를 자동 재개. tmux 죽어도, PC 재부팅돼도 이전 컨텍스트 복귀. 토큰 추가 소모 없음 (Max 정액 한도 동일).

## v2 설계 모델 — 다음 세션 필독

**v1.x 시나리오 모델 폐기됨. v2 = 작업 큐 + 간섭 매트릭스.**

### 핵심 변경 (SPEC.md v2 참조)
- ❌ 시나리오 (`excavation`/`foundation`/`lifting`/`envelope`/`mep_finish` URL 분리) → **레거시**
- ✅ **작업(task) 큐** — 한 부지에서 여러 작업 동시 활성 (가설+본공사+마감+지속)
- ✅ **간섭 매트릭스** — 두 작업 공간·시간 충돌 시 사고 (lift+작업자, pour+아래층, paint+electric 등)
- ✅ **명령 풀 동적 합성** — `pool = ∪ INSTRUCTION_POOLS_BY_TASK[t.type] + TRAPS_GLOBAL`

### 작업 종류 (TASK_TYPES)
- **가설**: shoring · scaffold · formwork_support · guardrail · lifeline
- **본공사 사이클** (5층 반복): formwork · rebar · pour · cure
- **본공사 1회**: excavate · found_pour
- **마감/설비** (병행 가능): panel · glass · electric · plumb · vent · paint · ext_install
- **지속**: lift · signal · survey · inspect

### 코드 잔재 처리
- `GAME.scenarioId` — 레거시 변수. 새 코드는 `GAME.activeTasks[]` 사용
- `scenarios/` 디렉토리 — 백워드 호환 유지, 신규 시나리오 분기 추가 금지
- `INSTRUCTIONS_BY_SCENARIO` / `INSTRUCTIONS_LIFTING` 등 시도 폐기. 풀은 **작업 종류 기준** (`INSTRUCTION_POOLS_BY_TASK[type]`)

### v2 마이그레이션 진행 (2026-05-12, 18 batch / 18 commits 마라톤 완료)
✅ 1. 간섭 평가 + 시각화 — interference.js 매 프레임 평가 · THREE.Line · sustained 강도 · NPC 추적
✅ 2. 5층 사이클 컨트롤러 작업 큐 enqueue — rc_loop sub-step 자동 enqueue/dequeue · 4 시나리오 시드
✅ 3. HUD 활성 작업 리스트 — task_chips.js · 그룹색 · 충돌 적색 · flag 주황 · 풍부 tooltip
✅ 4. 명령 히스토리 UI — H 키 패널 · localStorage 영속 · 사고/간섭 통합 · 라이브러리 점프
✅ 5. 사고 라이브러리 — L 키 · 전체 사고 + 4언어 상세
⏳ 6. 시각 플레이쓰루 검증 · ?s=unified 진입점 (현재 데이터 통합 골격)
⏳ 7. 5 시나리오 hazard register 통합 모드 안전 호출

### v2.0 새 단축키
- **H** — 명령 히스토리 패널 (✓성공/✗거부/☠사고/⚠간섭 카운트 + 30개 행)
- **L** — 사고 라이브러리 패널 (모든 사고 ID + 4언어 desc/cause/law/procedure)
- **P/Esc** — 일시정지 메뉴 → 통계 탭 (시나리오별 ☠ + 사고 누적 TOP5 + 명령 7종 카운터)

### 🏠 집 PC 검증 체크리스트 — v2.0 마라톤 30 batch 후 (BLOCKING)
> 이 마라톤은 시각 검증 없이 진행됨. 집 도착하면 아래 순서로 즉시 검증 → 회귀 발견 시 그 자리에서 수정.

**A. 통합 모드 진입** (game.html?s=unified)
- [ ] index.html "🆕 자유 모드" 카드 클릭 → game.html?s=unified 진입
- [ ] 인트로 "🏗 자유 모드 — 5 시나리오 통합 부지" 노출
- [ ] Blocker "🏗 자유 모드 — 통합 부지" 라벨
- [ ] 시작 3초 후 안내 토스트 8초 노출 ("H=히스토리 · L=사고도서관")
- [ ] HUD 상단 "🏗 오픈 부지 (자유 모드)" + 미션 안내

**B. 영역 분산 시각**
- [ ] 카메라 z=22 시작, 부지 전체 조망 가능
- [ ] 5 영역에 mesh 분포 — 중앙(lifting 크레인) / 좌상(excavation 구덩이) / 좌하(foundation 거푸집) / 우상(envelope 비계) / 우하(mep_finish 건물)
- [ ] mesh 겹침 발견 → 각 scene.js 의 _build* 함수가 GAME.scene.add 대신 child group 사용 시 offset 적용 안 됨. engine.js 의 newChildren 추출이 group 직접 자식만 잡으므로 깊은 hierarchy 는 누락 가능
- [ ] 자식 mesh 가 group 안에 있는데 collider 거리 검사가 부정확하면 → mesh.getWorldPosition() 으로 수정 필요 (interaction.js, hazard.js 등)
- [ ] 14 NPC 가 분산 영역에 spawn (중앙 5 + 좌상 3 + 좌하 3 + 우상 3 + 우하 3)

**C. 작업 큐 + 칩**
- [ ] HUD 작업 칩 18+개 (excavation 4 + foundation 4 + envelope 6 + mep_finish 5 + lifting 지속 3 = 22개)
- [ ] 그룹 색상 구분 (가설=하늘색, 본공사=주황, 마감=초록, 지속=보라)
- [ ] hover 시 다중행 tooltip (type/floor/loc/flags)
- [ ] 칩 영역 max-width:60vw / max-height:60px 초과 시 가려짐 정상

**D. 명령 시스템**
- [ ] NPC 에 E 키 → instruction popup 열림
- [ ] 풀 ~80 항목 + type 그룹 헤더 ("— 형틀목공 · 0F —" 식)
- [ ] safe → flag → danger 정렬
- [ ] NPC 직종 불일치 명령은 옅게 + ✗ 마크
- [ ] 위험 명령에 ⚠ 사고라벨 sub
- [ ] hint footer 노출

**E. 간섭 라인 (debug 콘솔)**
- [ ] `__bulsa.tasks()` → 활성 task 목록
- [ ] `__bulsa.addTask('rebar', {x:0, z:0})` → lift 반경 6m 안에 rebar 추가
- [ ] 두 task 사이 적색 라인 등장 (sustained 강도 점점 증가)
- [ ] 6초 후 worker_crush 사고 발동 + 사고 패널 origin "양중 × 철근 — 6m 반경 내"
- [ ] H 히스토리에 ⚠ 간섭 + ☠ 사고 행 기록

**F. 학습 UI**
- [ ] H 키 → 우하단 명령 히스토리 패널 (사고 행 클릭 → 사고 라이브러리 자동 열림)
- [ ] L 키 → 사고 라이브러리 패널 (검색 input 작동 + 칩 클릭 → 상세)
- [ ] P 키 → 일시정지 통계 탭 (시나리오별 ☠ + 사고 TOP5 + 명령 7종 카운터)
- [ ] `__bulsa.simulateAccident('falling_debris')` → 사고 패널 한국어 라벨 "낙하물" + 4언어 desc/cause/law/proc

**G. 명(命) 게이미피케이션**
- [ ] HUD `명 100` 표시 (4언어 라벨)
- [ ] 위험 명령 발화 시 floating "-N" 적색 + bar pulse glow
- [ ] 명 ≤30 시 화면 가장자리 적색 비네팅 (활성)
- [ ] 명 ≤15 시 critical (애니메이션 빨라짐)

**H. 인스펙터 flag 적발**
- [ ] flag-trigger 명령 발화 (global_organic_solvent / global_start_dismantle 등) → 작업 칩에 🔶 주황 테두리
- [ ] 일정 시간 후 인스펙터 등장 → flag 적발 + 과태료 부과
- [ ] 안전 명령 (paint_vent / scaffold_anchor 등) 으로 flag 끄면 적발 안 됨

**I. 통합 모드 업적**
- [ ] 진입 즉시 `unified_enter` 🏗 unlock 알림
- [ ] 5분 무사고 → `unified_5min` ⏱
- [ ] 10분 간섭 0 → `unified_zero_int` 🛡

**J. 단일 시나리오 회귀 검사** (기존 5 시나리오 깨지지 않았는지)
- [ ] ?s=lifting / ?s=excavation / ?s=foundation / ?s=envelope / ?s=mep_finish 모두 정상 진입
- [ ] 단일 시나리오에서 작업 칩 4~6개만 보이는지 (unified 와 다른지)
- [ ] phase 진행 시스템 정상 작동
- [ ] 사고 패널 origin 섹션 hidden (단일 시나리오는 간섭 trigger 가 없으므로)

**회귀 발견 시**
- 우선순위: 단일 시나리오 회귀 > 통합 모드 핵심 > 통합 모드 시각 분산
- 핫픽스 1줄로 가능하면 즉시 commit, 큰 변경은 issue 메모 후 다음 세션

## 현재 구현 상태
```
✅ v1.x: Three.js 씬, 5 시나리오 분리 동작, NPC 5+ 명 4언어, 사고 패널, 수료증
✅ v1.2: NPC 명령 4분기 (거부/숙련/위험변종), 88개 사고 vi/ar, 21 inspector 위반 vi/ar
✅ v2.0 완성: TASK_TYPES 23 · INTERFERENCE_MATRIX 17 · cond AND + flag 토큰 4종 · INSTRUCTION_POOLS_BY_TASK 23 · TRAPS_GLOBAL 8 · GLOBAL_ACCIDENTS 5 신규 · accident_labels 20 · 작업 칩 · 사고 라이브러리 · 명(命) 비네팅 · 인스펙터 flag 적발 · 디버그 콘솔
⏳ v2.0 남은 작업: 시각 플레이쓰루 / 통합 모드 hazard 안전 통합 / index 허브 카드
```
