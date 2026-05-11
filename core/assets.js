// 범용 GLB 로더 + 캐시 + 폴백
// 사용:
//   ASSETS.load('excavator', (gltf) => { ... })  → 캐시된 GLTF 비동기 콜백
//   ASSETS.attach(parent, 'excavator', { pos, rot, scale, fallback })
//     → 로드 성공 시 GLB 클론을 parent에 추가, 실패/타임아웃 시 fallback() 호출

(function () {
  'use strict';

  // 매니페스트 — manifest.md 의 1순위 항목을 URL이 확정되는 대로 채움
  // 빈 문자열인 항목은 자동으로 폴백(기존 박스 메시) 사용
  const MANIFEST = {
    excavator:    '',  // Kenney Vehicle Pack — 검증 후 채울 것
    pump_truck:   '',
    tower_crane:  '',
    scaffold_kit: '',
    hardhat:      '',
  };

  const _cache    = {};   // name → gltf (null=폴백 확정)
  const _pending  = {};   // name → [callbacks]
  const _failed   = new Set();

  function _resolve(name, gltf) {
    _cache[name] = gltf;
    const cbs = _pending[name] || [];
    delete _pending[name];
    cbs.forEach(cb => { try { cb(gltf); } catch (e) {} });
  }

  function load(name, onReady) {
    const url = MANIFEST[name];

    // URL 미정 → 즉시 폴백
    if (!url) { onReady && onReady(null); return; }

    // 이미 캐시됨
    if (name in _cache) { onReady && onReady(_cache[name]); return; }

    // 로딩 중
    if (_pending[name]) { _pending[name].push(onReady); return; }
    _pending[name] = [onReady];

    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
      console.warn('[assets] GLTFLoader 미로드 — ' + name + ' 폴백');
      _resolve(name, null);
      return;
    }

    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.warn('[assets] ' + name + ' 8초 타임아웃 — 폴백');
      _failed.add(name);
      _resolve(name, null);
    }, 8000);

    new THREE.GLTFLoader().load(
      url,
      (gltf) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        gltf.scene.traverse(m => {
          if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
        });
        _resolve(name, gltf);
      },
      undefined,
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        console.warn('[assets] ' + name + ' 로드 실패 — 폴백:', (err && err.message) || err);
        _failed.add(name);
        _resolve(name, null);
      }
    );
  }

  function attach(parent, name, opts) {
    opts = opts || {};
    load(name, (gltf) => {
      if (!gltf) {
        if (opts.fallback) opts.fallback();
        return;
      }
      const Clone = (typeof THREE.SkeletonUtils !== 'undefined') ? THREE.SkeletonUtils : null;
      const inst  = Clone ? Clone.clone(gltf.scene) : gltf.scene.clone(true);
      if (opts.pos)   inst.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
      if (opts.rot)   inst.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
      if (typeof opts.scale === 'number') inst.scale.setScalar(opts.scale);
      else if (Array.isArray(opts.scale))  inst.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
      parent.add(inst);
      if (opts.onAttached) opts.onAttached(inst);
    });
  }

  // URL을 런타임에 주입할 수 있도록 노출 (CDN 변경/사용자 자산 추가용)
  function setUrl(name, url) {
    if (name in MANIFEST) {
      MANIFEST[name] = url || '';
      delete _cache[name];
      _failed.delete(name);
    }
  }

  function status() {
    return Object.keys(MANIFEST).map(n => ({
      name: n,
      url: MANIFEST[n] || '(empty)',
      cached: (n in _cache),
      failed: _failed.has(n),
    }));
  }

  window.ASSETS = { load, attach, setUrl, status, _manifest: MANIFEST };
})();
