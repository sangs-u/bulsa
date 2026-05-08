# BULSA 프로젝트 — 에이전트 운영 규칙

## 에이전트 구조

### 메인 에이전트 (Sonnet) — 항상 실행
- 파일 작성 및 수정
- git add / commit / push
- 반복 실행 작업
- 서브에이전트 결과 받아서 실행

### 분석 서브에이전트 (Opus) — 필요할 때만 호출
- 전체 코드 의존성 분석
- 오류 근본 원인 파악
- 아키텍처 결정
- 분석만 하고 파일 수정/push 절대 금지
- 결과 반환 후 즉시 종료

## 호출 규칙
복잡한 오류 또는 설계 결정 필요 시:
1. Task 도구로 Opus 서브에이전트 호출
2. 분석 결과만 받아옴
3. 메인 Sonnet이 결과 기반으로 실행

## 프로젝트 정보
- 로컬: C:\Users\User\Desktop\bulsa
- GitHub: https://github.com/sangs-u/bulsa
- 배포: https://sangs-u.github.io/bulsa
- 참조용: https://github.com/sangs-u/musaai (수정 금지)

## 현재 오류
브라우저 console: "GAME is not defined"
영향 파일: building.js, npc.js, tbm.js, signboard.js
증상: 3D 씬 렌더링 안됨, 게임 진행 불가
