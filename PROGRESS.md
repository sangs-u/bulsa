# BULSA 개발 현황
> **v4 설계 전환 — 반드시 DESIGN_V4.md 먼저 읽을 것**

## 최근 완료 (2026-05-13) — v4 batch

- **#56~58** v4 코어 시스템 (material/carry/hazard_zone/act/marker/anim_gen/phase_v4.js)
- **#59** 튜토리얼 가이드 (guidance.js): 3D 비콘 + 화살표 + 컨트롤 오버레이 + 다음할일카드
- **#60** 3D TBM (tbm.js): NPC 원형 집합 + 말풍선 + 배너
- **#61** PBR 텍스처 (tex_loader.js + assets/tex/ 9종): matConcrete/matWall/matDirt/matGravel/matMetal/matRust/matAsphalt
- **#62** 콘크리트 타설 (pour.js): 채움 메시 + 파티클 + 진동기 + 양생 + 탈형
- **#63** 굴착기 직접 조작 (excavator.js):
  - WASD 트랙 이동 · 마우스 상부선회 · Q/E 붐 · R/F 아암 · Space 굴착 · X 덤프 · T 덤프트럭 · V 하차
  - 관절 재구성 (root→upper→boomPvt→armPvt→bucketPvt 계층)
  - 토사 청크 스폰 (matDirt PBR)
  - 덤프트럭 AI (idle→coming→waiting→leaving)
  - 굴착 깊이 HUD (바 + 수치)
  - exitCraneCab 오버라이드 (크레인/굴착기 분기)
  - excavation/scene.js PBR 재질 적용

## 검증 상태
- `npm run check` PASS 109/109
- 시각 플레이쓰루 미실시 (BLOCKING) — ?s=excavation 굴착기 탑승 → 굴착 → 덤프트럭 흐름

## 다음 작업
1. ?s=excavation 플레이쓰루 — 굴착기 탑승 후 붐/아암/버킷 조작 동작 확인
2. Phase 2 기초공사 상세: 철근 배근 (직접 운반·배치) + 거푸집 패널-by-패널 설치
3. carry.js ↔ interaction.js E키 중복 방지 확인
4. NPC 직종별 모션 매핑 (trade→setMotion)
5. 페이즈 완료 → 오픈월드 전환
