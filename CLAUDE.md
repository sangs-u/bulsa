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

## 현재 구현 상태
```
✅ Three.js 씬 + 게임루프
✅ 1인칭 플레이어 이동 + Raycaster 충돌
✅ NPC 5명 (역할별 + Yuka AI)
✅ 다국어 ko/en/ar/vi
✅ 사고 패널 + 수료증
✅ 크레인 인양 애니메이션
🔄 Phase 1~3 (계획서/안전검토/장비세팅) — 구현 중
⏳ 불안전 행동 감지, 돌발 이벤트, Rapier.js 물리엔진
```
