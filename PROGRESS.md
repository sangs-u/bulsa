# BULSA 개발 현황
> **아트 디렉션**: 구조체=사실적 PBR / 장비·NPC=chibi / 가구·차량=사실적

## 최근 완료 (2026-05-13) — 에셋 파이프라인 설계

### #64~67 Meshy.ai 에셋 파이프라인 확정
- `scripts/gen_assets.js`: preview→refine→download 자동화, preview_only 지원
- `assets/equipment_catalog.json`: **85종 확정**
  - Batch1(chibi 43종): 대형장비·도구·착용아이템12·NPC — Month1 생성중
  - Batch2(realistic 13종): 건축마감·철골 — Month1
  - Batch4(realistic 14종): 현장시설·자재 — Month2
  - Batch5(realistic 5종): 프리미엄 차량 — Month2
  - Batch6(realistic 10종): 실내 가구 — Month2
- 완료 GLB: excavator/dump_truck/tower_crane/worker/concrete_pump/mixer_truck/bulldozer/aerial_lift/forklift/scaffold_kit

### 확정된 게임 설계
- **캐릭터**: 맨몸 스폰 → 착용 슬롯 12종 직접 착용 (교육 핵심)
- **공사**: 절차적 구조체가 그대로 완성 건물 (모델 교체 없음)
- **인테리어**: 완성 건물에 가구 구매·드래그 배치
- **다양성**: 표준 베이스 GLB → Blender material swap (크레딧 절약)

## 검증 상태
- `npm run check` PASS 109/109
- GLB 생성 중 (PID 109510, 로그: /tmp/gen_assets_full.log)
- 시각 플레이쓰루 미실시 (BLOCKING) — ?s=excavation

## 다음 작업 (우선순위순)
1. **착용 시스템** (equipment_slot.js): 슬롯 관리·GLB attach·HUD 12슬롯·1인칭 body 가시성
2. **ASSETS.js GLTFLoader 래퍼**: 생성된 GLB → Three.js 로딩
3. ?s=excavation 플레이쓰루 검증
4. 인테리어 배치 시스템 (드래그 앤 드롭 가구)
5. Phase 2 기초공사: 철근 배근 + 거푸집
