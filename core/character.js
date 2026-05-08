// GLB character system — geometry fallback only (GLB removed: all CDN URLs 404 as of 2026)
// NPC appearance is handled by _buildGeometry() in npc.js

function preloadCharacter(onReady) {
  // Skip GLB loading: always use geometry fallback
  onReady();
}

function spawnCharacter(_position) {
  // Geometry fallback is used; this path is never reached
  return null;
}
