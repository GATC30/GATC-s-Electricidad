/**
 * Three.js 3D Rendering and Resource Management Utilities.
 * Provides complete cleanup and disposal for geometries, materials, and textures
 * to prevent WebGL memory leaks during 2D/3D toggling (BUG-05).
 */

import * as THREE from 'three';

/**
 * Disposes a material or array of materials and its associated textures.
 */
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const mats = Array.isArray(material) ? material : [material];

  for (const mat of mats) {
    if (!mat) continue;

    // Dispose all texture maps
    const matRecord = mat as unknown as Record<string, unknown>;
    for (const key of Object.keys(matRecord)) {
      const prop = matRecord[key];
      if (prop && typeof prop === 'object' && 'isTexture' in prop) {
        const tex = prop as THREE.Texture;
        tex.dispose();
      }
    }

    mat.dispose();
  }
}

/**
 * Traverses a Three.js scene/group and properly disposes all meshes,
 * geometries, materials, and controls, releasing WebGL GPU memory (BUG-05).
 */
export function disposeThreeScene(
  scene: THREE.Scene | THREE.Object3D | null | undefined,
  renderer?: THREE.WebGLRenderer | null,
  controls?: { dispose: () => void } | null
): void {
  if (!scene) return;

  scene.traverse((obj: THREE.Object3D) => {
    // If object is a Mesh or Line
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });

  // Remove all children from scene
  while (scene.children && scene.children.length > 0) {
    const child = scene.children[0];
    scene.remove(child);
  }

  // Dispose controls if provided
  if (controls && typeof controls.dispose === 'function') {
    controls.dispose();
  }

  // Dispose WebGLRenderer and force context loss
  if (renderer && typeof renderer.dispose === 'function') {
    renderer.dispose();
    try {
      renderer.forceContextLoss?.();
    } catch (_) {
      // Ignore if browser doesn't support forceContextLoss
    }
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
}
