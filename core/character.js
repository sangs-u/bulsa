// GLB character system — load once, clone per NPC via SkeletonUtils
// Model: Three.js Soldier (MIT, https://threejs.org/examples/models/gltf/Soldier/Soldier.glb)
// Animations: Idle · Walk · Run · TPose

const _CHAR_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier/Soldier.glb';

let _template = null;
let _clips    = [];
let _loading  = false;
let _cbs      = [];

function preloadCharacter(onReady) {
  if (_template !== null) { onReady(); return; }
  _cbs.push(onReady);
  if (_loading) return;
  _loading = true;

  const loader = new THREE.GLTFLoader();
  loader.load(
    _CHAR_URL,
    gltf => {
      _template = gltf.scene;
      _clips    = gltf.animations;
      _template.traverse(m => {
        if (m.isMesh) {
          m.castShadow    = true;
          m.receiveShadow = false;
        }
      });
      _flush();
    },
    undefined,
    err => {
      console.warn('[character.js] GLB load failed — geometry fallback active', err);
      _template = 'failed';
      _flush();
    }
  );
}

function _flush() {
  const q = _cbs.splice(0);
  q.forEach(cb => cb());
}

// Returns { group, mixer, actions, current } or null on failure
function spawnCharacter(position) {
  if (!_template || _template === 'failed') return null;

  const group = THREE.SkeletonUtils.clone(_template);
  group.position.set(position[0], position[1], position[2]);
  group.scale.setScalar(1.0);
  group.rotation.y = Math.PI;

  const mixer  = new THREE.AnimationMixer(group);
  const actions = {};
  _clips.forEach(clip => {
    const a = mixer.clipAction(clip);
    a.loop = THREE.LoopRepeat;
    actions[clip.name] = a;
  });

  GAME.scene.add(group);
  return { group, mixer, actions, current: null, timeScale: 1.0 };
}
