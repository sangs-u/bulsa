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

## 현재 구현 상태
```
✅ Three.js 씬 + 게임루프 + 1인칭 이동
✅ NPC 5명 (역할별 + Yuka AI) + 다국어 ko/en/ar/vi
✅ Phase 4 rigging_setup (줄걸이 지시)
✅ Phase 5 site_setup (작업반경/TBM)
✅ Phase 6 execution (인양 실행)
✅ 사고 패널 + 수료증
🔗 Phase 1·2 — 무사이 담당 (BULSA 미구현, 기본값으로 통과)
⏳ Phase 3 equipment_setup — 다음 목표
⏳ 크레인 운전원 NPC 거부권, 불안전 행동 감지
```
