# BULSA 에셋 매니페스트 (placeholder + 블렌더 교체 계획)

현재 모든 메시는 기하학(BoxGeometry/CylinderGeometry/SphereGeometry) 으로 구성.
배포 단계에서 CC0 GLB로 단계 교체 → 최종 블렌더 커스텀.

## 무료 에셋 출처 (모두 CC0 / 상업이용 가능)

| 카테고리 | 소스 | URL/노트 |
|----------|------|---------|
| 캐릭터 | Three.js 예제 Soldier.glb | `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb` (현재 사용 중) |
| 캐릭터 추가 | Quaternius Ultimate Animated Characters | https://quaternius.com — CC0 |
| 건설 키트 | Kenney "Construction Kit" | https://kenney.nl/assets/construction-kit — CC0 |
| 도구 | Quaternius "Ultimate Modular Pack" | https://quaternius.com — CC0 |
| 차량/장비 | Kenney "Vehicle Pack 2" | https://kenney.nl/assets — CC0 (굴착기·펌프카 포함) |
| 환경 | Polyhaven HDRIs · Textures | https://polyhaven.com — CC0 |

## 우선 교체 대상 (현재 → 교체 시 효과)

### 1순위 (게임 인상 결정)
- [ ] **굴착기 (excavator)** — 현재: 박스 조합 / 교체: Kenney Vehicle Pack
- [ ] **펌프카 (concrete pump)** — Kenney Vehicle Pack
- [ ] **타워크레인 (tower crane)** — 검색 필요 (Sketchfab CC0)
- [ ] **작업자 (NPC)** — 현재: Soldier.glb 1종 / 교체: Quaternius Modular Characters
- [ ] **안전모/조끼/안전대** — Quaternius

### 2순위 (디테일)
- [ ] **시스템 비계 (system scaffold)** — Kenney Construction Kit
- [ ] **흙막이 H-pile + 토류판** — 사용자 직접 모델링 (간단)
- [ ] **거푸집·동바리** — 박스 조합으로 충분 (낮은 우선순위)
- [ ] **분전반·환기 덕트** — Kenney Industrial Kit (검색 필요)
- [ ] **도구 (탐지기·검전기·각도계·LOTO 잠금)** — Quaternius Modular Pack

### 3순위 (환경)
- [ ] **HDRI 환경맵** — Polyhaven (현재: 단색 sky)
- [ ] **콘크리트/금속 텍스쳐** — Polyhaven Textures
- [ ] **나무·식물 (배경)** — Quaternius Nature Pack

## 블렌더 작업 항목 (최종)
- 한국 KOSHA 표지·안전 마크 텍스쳐
- 한국 건설 현장 특유의 가설울타리 디자인
- 시방서 도면 텍스쳐 (작업계획서 종이)
- 자체 마스코트 (사용자 IP)

## 통합 절차
1. `assets/glb/` 폴더에 다운로드
2. `core/assets.js` 에서 GLTFLoader 로 로드 + 캐싱
3. 각 scene/hazards.js 에서 기하학 메시 자리에 `addGLBInstance(name, pos, rot, scale)`
4. 로드 실패 시 자동 폴백 = 현재 기하학 메시 유지
