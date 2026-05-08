// Post-processing — Bloom + SSAO
// Three.js r128 EffectComposer pipeline
// 모바일: Bloom만 / 데스크톱: Bloom + SSAO

let COMPOSER = null;

function initPostFX() {
  if (typeof THREE.EffectComposer === 'undefined') {
    console.warn('[PostFX] EffectComposer 미로드 — 기본 렌더 사용');
    return;
  }

  const renderer = GAME.renderer;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // 톤 매핑 — ACESFilmic 적용으로 Bloom 계조 개선
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding      = THREE.sRGBEncoding;

  COMPOSER = new THREE.EffectComposer(renderer);

  // ① 기본 렌더 패스
  COMPOSER.addPass(new THREE.RenderPass(GAME.scene, GAME.camera));

  // ② SSAO — 데스크톱 전용 (코너·크레인 하부에 입체감)
  if (!isMobile && typeof THREE.SSAOPass !== 'undefined') {
    const ssao        = new THREE.SSAOPass(GAME.scene, GAME.camera, innerWidth, innerHeight);
    ssao.kernelRadius = 10;
    ssao.minDistance  = 0.002;
    ssao.maxDistance  = 0.06;
    ssao.output       = THREE.SSAOPass.OUTPUT.Default;
    COMPOSER.addPass(ssao);
  }

  // ③ Bloom — 태양·하늘 밝은 영역 글로우
  if (typeof THREE.UnrealBloomPass !== 'undefined') {
    const bloom = new THREE.UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      isMobile ? 0.18 : 0.38,  // strength
      0.55,                      // radius
      0.86                       // threshold — 밝은 픽셀만
    );
    COMPOSER.addPass(bloom);
  }

  window.addEventListener('resize', () => {
    if (COMPOSER) COMPOSER.setSize(innerWidth, innerHeight);
  });
}

function renderPostFX() {
  if (COMPOSER) {
    COMPOSER.render();
  } else {
    GAME.renderer.render(GAME.scene, GAME.camera);
  }
}
