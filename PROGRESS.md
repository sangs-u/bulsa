# BULSA 개발 현황
> **v4 설계 전환 — 반드시 DESIGN_V4.md 먼저 읽을 것**

## 최근 완료 (2026-05-13) — Asset 파이프라인

- **#64** Meshy.ai GLB 배치 생성 파이프라인 구축:
  - `scripts/gen_assets.js`: preview→refine→download 자동화, preview_only 캐릭터 지원
  - `assets/equipment_catalog.json`: 38종 (중장비13·소형공구6·안전용품8·자재6·현장소품3·NPC3)
  - 완료: excavator.glb · dump_truck.glb · tower_crane.glb · worker.glb (4종)
  - 생성 중: 35종 배경 실행 중 (PID 109510) · 예상 1,050 크레딧

- **#56~63** v4 코어: material/carry/hazard_zone/guidance/tbm/tex_loader/pour/excavator

## 검증 상태
- `npm run check` PASS 109/109
- 시각 플레이쓰루 미실시 (BLOCKING) — ?s=excavation

## 다음 작업
1. GLB 로딩 통합 — ASSETS.js에 생성 완료 모델 등록 + Three.js GLTFLoader 래퍼
2. ?s=excavation 플레이쓰루 — 굴착기 탑승 후 붐/아암/버킷 조작 확인
3. Phase 2 기초공사: 철근 배근 + 거푸집 패널-by-패널 설치
4. carry.js ↔ interaction.js E키 중복 방지
5. 페이즈 완료 → 오픈월드 전환
