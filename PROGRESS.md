# BULSA 개발 현황
> 작업 완료 시 이 파일만 업데이트. 내용은 항상 30줄 이내로 유지.

## 마지막 완료 작업
- 기초공사 모듈 신규 + 공정 간 전환: scenarios/foundation/ {data,scene,hazards,actions}.js, 6단계 흐름(계획서·철근·거푸집·펌프카·타설순서·실행), 4개 사고 유형. SCENARIO_ORDER(excavation→foundation→lifting) + complete-panel "다음 공정" 버튼 (?s= 재로딩 방식)

## 다음 작업 (우선순위 순)
1. **공정 진행 흐름 검증 + 자잘한 i18n** — 토공→기초→양중 풀 플레이스루 직접 확인, 한글 위주 메시지 4국어로 마이그레이션
2. **과태료/감독관 이벤트 시스템** — applyPenalty + 감독관 NPC + 작업계획서 누락 검증
3. **외장공사 모듈 신규** (envelope) — 비계 + 외벽 + 창호
4. **설비·마감 모듈 신규** (mep_finish) — 전기·배관·LOTO·환기

## 핵심 결정사항
- Phase 1(작업계획서)·Phase 2(안전검토)는 무사이 담당. BULSA v1.0은 Phase 3부터 시작
- 추가 시나리오(밀폐/전기/화재/비계/차량)는 v2.0 스텁으로 유지, 현재 삭제 불가
- Rapier.js 물리엔진은 v2.0으로 미룸
