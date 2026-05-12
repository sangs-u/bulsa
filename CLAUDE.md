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

### 즉시 적용 작업 (이 세션)
1. `core/tasks.js` 신규 — TASK_TYPES + INTERFERENCE_MATRIX + 평가 함수
2. `instruction.js` 활성작업 기반 풀 합성
3. PROGRESS.md 정리

### v2 마이그레이션 우선순위 (다음 세션)
1. 간섭 평가 + 시각화 (적색 경고선)
2. 5층 사이클 컨트롤러가 작업 큐 enqueue
3. HUD 활성 작업 리스트 위젯
4. 명령 히스토리 UI (학습 도구)
5. 5 시나리오 URL → 한 부지 통합으로 흡수

## 현재 구현 상태
```
✅ v1.x: Three.js 씬, 5 시나리오 분리 동작, NPC 5+ 명 4언어, 사고 패널, 수료증
✅ v1.2: NPC 명령 4분기 (거부/숙련/위험변종), 88개 사고 vi/ar, 21 inspector 위반 vi/ar
✅ v2.0 설계: SPEC v2 + CLAUDE.md 가이드 (시나리오→작업 큐 모델 전환)
⏳ v2.0 구현: core/tasks.js 작성 + 간섭 매트릭스 데이터 + 명령풀 합성 통합
```
