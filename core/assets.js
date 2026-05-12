// 범용 GLB 로더 + 캐시 + 폴백
// 사용:
//   ASSETS.load('excavator', (gltf) => { ... })  → 캐시된 GLTF 비동기 콜백
//   ASSETS.attach(parent, 'excavator', { pos, rot, scale, fallback })
//     → 로드 성공 시 GLB 클론을 parent에 추가, 실패/타임아웃 시 fallback() 호출

(function () {
  'use strict';

  // 매니페스트 — 로컬 우선 (assets/glb/*.glb), 파일 없으면 8초 타임아웃 후 폴백
  // 사용자가 Kenney Vehicle Pack 등 CC0 GLB를 다운로드해 assets/glb/ 에 떨어뜨리면 자동 적용
  // 런타임 오버라이드: ASSETS.setUrl('excavator', 'https://cdn.example.com/excavator.glb')
  const MANIFEST = {
    excavator:    'assets/glb/excavator.glb',
    pump_truck:   'assets/glb/pump_truck.glb',
    tower_crane:  'assets/glb/tower_crane.glb',
    scaffold_kit: 'assets/glb/scaffold_kit.glb',
    hardhat:      'assets/glb/hardhat.glb',
  };

  // 로컬 GLB가 없을 때 빠르게 폴백 (404 즉시 감지 → 8초 대기 불필요)
  // fetch HEAD 로 사전 점검: 200 응답일 때만 GLTFLoader 로드 시도
  const _quickCheck = (url) => {
    return new Promise((resolve) => {
      try {
        fetch(url, { method: 'HEAD' })
          .then(r => resolve(r && r.ok))
          .catch(() => resolve(false));
      } catch (e) { resolve(false); }
    });
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

    // 로컬 경로(assets/) 는 HEAD 사전점검으로 즉시 폴백 결정 (404 시 GLTFLoader 호출 자체 생략)
    const isLocal = url.indexOf('assets/') === 0 || url.indexOf('./assets/') === 0;
    const proceed = () => {
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
    };

    if (isLocal) {
      _quickCheck(url).then(ok => {
        if (!ok) {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutId);
          _failed.add(name);
          _resolve(name, null);
          return;
        }
        proceed();
      });
    } else {
      proceed();
    }
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
