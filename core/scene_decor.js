// Scene decor — 안전 콘·표지판·드럼통·자재 무더기 자동 산포.
// 모든 시나리오 공통 — 빈 부지 채움 + 안전 시뮬 분위기.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function spawnDecor(scene, scenarioId) {
    if (!scene || !THREE) return;

    // 안전 콘 — 8~12개 무작위 산포
    const coneCount = 10 + Math.floor(Math.random() * 4);
    const coneGeo = new THREE.ConeGeometry(0.18, 0.42, 6);
    const coneMatOrange = new THREE.MeshStandardMaterial({ color: 0xE85820, roughness: 0.7 });
    const coneMatWhite  = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.85 });
    for (let i = 0; i < coneCount; i++) {
      const cone = new THREE.Mesh(coneGeo, i % 2 === 0 ? coneMatOrange : coneMatWhite);
      cone.castShadow = true;
      // 작업장 외곽 우선 배치 (반경 12~28m)
      const r = 12 + Math.random() * 16;
      const a = Math.random() * Math.PI * 2;
      cone.position.set(Math.cos(a) * r, 0.21, Math.sin(a) * r);
      scene.add(cone);
    }

    // 드럼통 (200L) — 3~5개
    const drumCount = 3 + Math.floor(Math.random() * 3);
    const drumGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.85, 12);
    const drumMats = [
      new THREE.MeshStandardMaterial({ color: 0x2C5F7B, roughness: 0.5, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0xC04020, roughness: 0.5, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x4A6E3B, roughness: 0.5, metalness: 0.4 }),
    ];
    for (let i = 0; i < drumCount; i++) {
      const drum = new THREE.Mesh(drumGeo, drumMats[Math.floor(Math.random() * drumMats.length)]);
      drum.castShadow = true;
      drum.receiveShadow = true;
      const r = 16 + Math.random() * 10;
      const a = Math.random() * Math.PI * 2;
      drum.position.set(Math.cos(a) * r, 0.43, Math.sin(a) * r);
      scene.add(drum);
    }

    // 자재 더미 — 시멘트 포대/벽돌
    const pileCount = 2 + Math.floor(Math.random() * 2);
    const pileGeo = new THREE.BoxGeometry(1.2, 0.5, 0.85);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0xA89878, roughness: 0.95 });
    for (let i = 0; i < pileCount; i++) {
      const pile = new THREE.Mesh(pileGeo, pileMat);
      pile.castShadow = true;
      pile.receiveShadow = true;
      const r = 14 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      pile.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
      pile.rotation.y = Math.random() * Math.PI;
      scene.add(pile);
    }

    // 안전 표지판 — "위험!" 노란 삼각판 (KOSHA 표지 스타일)
    const signCount = 3;
    const signGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xFFE066, roughness: 0.6, side: THREE.DoubleSide });
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.7, metalness: 0.3 });
    for (let i = 0; i < signCount; i++) {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.8; pole.castShadow = true;
      grp.add(pole);
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.y = 1.5;
      sign.castShadow = true;
      grp.add(sign);
      const r = 13 + Math.random() * 10;
      const a = Math.random() * Math.PI * 2;
      grp.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      grp.rotation.y = Math.random() * Math.PI * 2;
      scene.add(grp);
    }

    // 도시 배경 — Kenney CC0 GLB (반경 38m 외곽, 가설울타리 바깥쪽)
    if (window.ASSETS) {
      const cityRadius = 44;
      const buildingKeys = ['city_building_a', 'city_building_b', 'city_building_c', 'city_building_d', 'city_garage'];
      const grassKeys    = ['city_grass_trees', 'city_grass'];
      // 빌딩 12채 — 8방향 + 보강
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
        const r = cityRadius + (Math.random() - 0.5) * 6;
        const key = buildingKeys[Math.floor(Math.random() * buildingKeys.length)];
        ASSETS.attach(scene, key, {
          pos:   [Math.cos(a) * r, 0, Math.sin(a) * r],
          rot:   [0, Math.atan2(-Math.cos(a), -Math.sin(a)) + (Math.random() - 0.5) * 0.6, 0],
          scale: 2.2 + Math.random() * 0.8,
        });
      }
      // 풀밭/나무 18 — 더 멀리 산포
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 38 + Math.random() * 18;
        const key = grassKeys[Math.floor(Math.random() * grassKeys.length)];
        ASSETS.attach(scene, key, {
          pos:   [Math.cos(a) * r, 0, Math.sin(a) * r],
          rot:   [0, Math.random() * Math.PI * 2, 0],
          scale: 1.5 + Math.random() * 0.8,
        });
      }
    }

    // 가설울타리 — 컬러 줄무늬 (현장 외곽)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xD4A217, roughness: 0.7 });
    const fenceWhiteMat = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.85 });
    const FENCE_SIDE = 36;
    const fenceCount = 16;
    for (let i = 0; i < fenceCount; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.05), i % 2 === 0 ? fenceMat : fenceWhiteMat);
      seg.castShadow = true;
      const sideIdx = i % 4;
      const t = (Math.floor(i / 4) + 0.5) / 4;
      const off = (t - 0.5) * FENCE_SIDE * 2;
      if (sideIdx === 0) seg.position.set(off, 0.7, -FENCE_SIDE);
      else if (sideIdx === 1) { seg.position.set(FENCE_SIDE, 0.7, off); seg.rotation.y = Math.PI / 2; }
      else if (sideIdx === 2) seg.position.set(off, 0.7,  FENCE_SIDE);
      else { seg.position.set(-FENCE_SIDE, 0.7, off); seg.rotation.y = Math.PI / 2; }
      scene.add(seg);
    }
  }

  window.spawnSceneDecor = spawnDecor;
})();
