/**
 * 3D disposal utility for Three.js (BUG-05)
 */

export function disposeThreeScene(scene, renderer, controls) {
  if (!scene) return;

  scene.traverse((obj) => {
    if (obj.geometry) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat) return;
        for (const key of Object.keys(mat)) {
          const val = mat[key];
          if (val && typeof val === 'object' && val.isTexture) {
            val.dispose();
          }
        }
        mat.dispose();
      });
    }
  });

  while (scene.children && scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  if (controls && typeof controls.dispose === 'function') {
    controls.dispose();
  }

  if (renderer && typeof renderer.dispose === 'function') {
    renderer.dispose();
    try {
      renderer.forceContextLoss?.();
    } catch (_) {}
  }
}
