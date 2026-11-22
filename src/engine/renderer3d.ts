/**
 * Three.js 3D Rendering and Resource Management Utilities.
 * Implements F7-02: Generates 3D meshes from project state (walls, doors, windows,
 * stairs, electrical devices, conduit tubes, and circuit cables).
 * Provides complete cleanup and disposal for geometries, materials, and textures (BUG-05).
 */

import * as THREE from 'three';
import { Wall, Box, Tube, Route, Cable, ProjectConfig, ProjectState } from './types';
import { CATALOG } from './catalog';
import { SCALE, DEFAULT_WALL_WIDTH, DEFAULT_WALL_HEIGHT } from './constants';

export interface LayerVisibility {
  civil: boolean;
  elec: boolean;
  tubes: boolean;
  cables: boolean;
}

export const DEFAULT_3D_LAYERS: LayerVisibility = {
  civil: true,
  elec: true,
  tubes: true,
  cables: true
};

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
    try {
      controls.dispose();
    } catch (_) {}
  }

  // Dispose WebGLRenderer and force context loss
  if (renderer && typeof renderer.dispose === 'function') {
    try {
      renderer.dispose();
      renderer.forceContextLoss?.();
    } catch (_) {}

    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
}

/**
 * Calculates vertical level offset in 3D world units.
 */
export function getOffsetY(
  level: number,
  wallHeight: number = DEFAULT_WALL_HEIGHT,
  scale: number = SCALE
): number {
  return (level - 1) * wallHeight * scale;
}

/**
 * Generates a 3D Mesh for a Wall element (F7-02).
 */
export function createWallMesh(
  wall: Wall,
  config: ProjectConfig,
  scale: number = SCALE
): THREE.Mesh {
  const length = Math.hypot(wall.x1 - wall.x2, wall.y1 - wall.y2);
  const wallH = wall.heightM ?? config.wH ?? DEFAULT_WALL_HEIGHT;
  const height = wallH * scale;
  const thickness = (wall.wW ?? config.wW ?? DEFAULT_WALL_WIDTH) * scale;
  const oy = getOffsetY(wall.lvl, config.wH, scale);

  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const material = new THREE.MeshLambertMaterial({
    color: 0xe2e8f0, // slate-200
    transparent: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.set(
    (wall.x1 + wall.x2) / 2,
    height / 2 + oy,
    (wall.y1 + wall.y2) / 2
  );

  mesh.rotation.y = -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  mesh.userData = {
    id: wall.id,
    type: 'wall',
    lvl: wall.lvl,
    layer: 'civil'
  };

  return mesh;
}

/**
 * Generates a 3D Object3D (Mesh or Group) for an architectural opening or electrical device (F7-02).
 */
export function createBoxMesh(
  box: Box,
  config: ProjectConfig,
  scale: number = SCALE
): THREE.Object3D | null {
  const oy = getOffsetY(box.lvl, config.wH, scale);
  const hB = (box.z || 0) * scale;
  const isArch = ['door', 'window', 'stairs'].includes(box.type);
  const isElec = Boolean(box.device) || box.type.startsWith('box_');

  // Shared reusable materials
  const matDoor = new THREE.MeshLambertMaterial({ color: 0x8b5cf6 }); // purple-500
  const matWindow = new THREE.MeshLambertMaterial({
    color: 0x06b6d4, // cyan-500
    transparent: true,
    opacity: 0.65
  });
  const matStairs = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 }); // slate-300
  const matPlate = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matDetail = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // slate-800
  const matPanel = new THREE.MeshLambertMaterial({ color: 0x475569 }); // slate-600

  if (isArch) {
    let obj: THREE.Object3D | null = null;
    const wallThick = (config.wW ?? DEFAULT_WALL_WIDTH) * scale + 2;

    if (box.type === 'door') {
      const doorH = 2.1 * scale;
      const geo = new THREE.BoxGeometry(box.dim.w, doorH, wallThick);
      const m = new THREE.Mesh(geo, matDoor);
      m.position.y = doorH / 2 + oy;
      obj = m;
    } else if (box.type === 'window') {
      const winH = 1.2 * scale;
      const geo = new THREE.BoxGeometry(box.dim.w, winH, wallThick);
      const m = new THREE.Mesh(geo, matWindow);
      m.position.y = hB + winH / 2 + oy;
      obj = m;
    } else if (box.type === 'stairs') {
      const grp = new THREE.Group();
      const stepCount = 10;
      const totalH = (box.zH ? box.zH * scale : (config.wH ?? DEFAULT_WALL_HEIGHT) * scale);
      const stepH = totalH / stepCount;
      const stepD = box.dim.h / stepCount;

      for (let i = 0; i < stepCount; i++) {
        const sGeo = new THREE.BoxGeometry(box.dim.w, stepH, stepD);
        const sMesh = new THREE.Mesh(sGeo, matStairs);
        sMesh.position.set(0, i * stepH + stepH / 2, -box.dim.h / 2 + i * stepD + stepD / 2);
        grp.add(sMesh);
      }
      grp.position.y = hB + oy;
      obj = grp;
    }

    if (obj) {
      obj.position.x = box.x;
      obj.position.z = box.y;
      obj.rotation.y = (-box.rot * Math.PI) / 180;
      obj.userData = { id: box.id, type: box.type, lvl: box.lvl, layer: 'civil' };
      return obj;
    }
  }

  if (isElec) {
    const grp = new THREE.Group();
    const devSpec = box.device ? (CATALOG as Record<string, any>)[box.device] : null;
    const sym = devSpec?.sym || '';

    if (box.device === 'panel' || sym === 'TAB') {
      // Distribution Panel / Tablero eléctrico
      const panelBox = new THREE.Mesh(new THREE.BoxGeometry(20, 28, 8), matPanel);
      const panelDoor = new THREE.Mesh(new THREE.BoxGeometry(18, 26, 1), matPlate);
      panelDoor.position.z = 4.5;
      grp.add(panelBox);
      grp.add(panelDoor);
    } else if (sym.includes('S')) {
      // Switch / Interruptor
      const plate = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 2), matPlate);
      const btn = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 3), matDetail);
      btn.position.z = 1.2;
      grp.add(plate);
      grp.add(btn);
    } else if (sym.includes('T')) {
      // Tomacorriente / Outlet
      const plate = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 2), matPlate);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 2.5), matDetail);
      r1.position.set(-2, 0, 0.5);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 2.5), matDetail);
      r2.position.set(2, 0, 0.5);
      grp.add(plate);
      grp.add(r1);
      grp.add(r2);
    } else if (sym === 'L') {
      // Ceiling Lamp / Lámpara Plafón
      const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 3, 6, 16), matPlate);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfef08a }) // warm yellow
      );
      bulb.position.y = -3;
      grp.add(base);
      grp.add(bulb);
    } else if (sym === 'W') {
      // Wall Sconce / Aplique muro
      const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3, 16), matPlate);
      base.rotation.x = Math.PI / 2;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(6, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      bulb.position.z = 4;
      grp.add(base);
      grp.add(bulb);
    } else if (sym === 'TV' || sym === 'RJ') {
      // Media / Data Socket
      const plate = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 2), matPlate);
      const socket = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), matDetail);
      socket.position.z = 1;
      grp.add(plate);
      grp.add(socket);
    } else {
      // Standard junction box or generic accessory
      const plate = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 3), matPlate);
      grp.add(plate);
    }

    grp.position.set(box.x, hB + oy, box.y);
    grp.rotation.y = (-box.rot * Math.PI) / 180;
    grp.userData = {
      id: box.id,
      type: box.type,
      device: box.device,
      lvl: box.lvl,
      layer: 'elec'
    };
    return grp;
  }

  return null;
}

/**
 * Calculates 3D pathway curve points for a conduit tube.
 */
export function getTubeCurve(
  tube: Tube,
  boxes: Box[],
  config: ProjectConfig,
  scale: number = SCALE
): THREE.CatmullRomCurve3 | null {
  const startBox = boxes.find((b) => b.id === tube.startId);
  const endBox = boxes.find((b) => b.id === tube.endId);

  if (!startBox || !endBox) return null;

  const wallH = config.wH ?? DEFAULT_WALL_HEIGHT;
  const startOy = getOffsetY(startBox.lvl, wallH, scale);
  const endOy = getOffsetY(endBox.lvl, wallH, scale);

  const startY = (startBox.z || 0) * scale + startOy;
  const endY = (endBox.z || 0) * scale + endOy;

  const pts: THREE.Vector3[] = [];

  if (tube.place === 'pared') {
    pts.push(new THREE.Vector3(startBox.x, startY, startBox.y));
    if (tube.pts && tube.pts.length > 0) {
      const midY = startY + (endY - startY) / 2;
      tube.pts.forEach((p) => {
        pts.push(new THREE.Vector3(p.x, midY, p.y));
      });
    }
    pts.push(new THREE.Vector3(endBox.x, endY, endBox.y));
  } else {
    // Ceiling or Floor elevation
    const elev = tube.place === 'techo' ? wallH : -0.2;
    const planeY = elev * scale + startOy;

    pts.push(new THREE.Vector3(startBox.x, startY, startBox.y));
    pts.push(new THREE.Vector3(startBox.x, planeY, startBox.y));

    if (tube.pts && tube.pts.length > 0) {
      tube.pts.forEach((p) => {
        pts.push(new THREE.Vector3(p.x, planeY, p.y));
      });
    }

    pts.push(new THREE.Vector3(endBox.x, planeY, endBox.y));
    pts.push(new THREE.Vector3(endBox.x, endY, endBox.y));
  }

  if (pts.length < 2) return null;

  return new THREE.CatmullRomCurve3(pts, false, 'chordal', 0.5);
}

/**
 * Generates a 3D Mesh for a conduit tube (F7-02).
 */
export function createTubeMesh(
  tube: Tube,
  boxes: Box[],
  config: ProjectConfig,
  scale: number = SCALE
): { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3 } | null {
  const curve = getTubeCurve(tube, boxes, config, scale);
  if (!curve) return null;

  const tubeGeo = new THREE.TubeGeometry(curve, 28, 2, 8, false);
  const tubeMat = new THREE.MeshLambertMaterial({
    color: 0x94a3b8, // slate-400 (PVC conduit)
    transparent: false
  });

  const mesh = new THREE.Mesh(tubeGeo, tubeMat);
  mesh.userData = {
    id: tube.id,
    type: 'tube',
    place: tube.place,
    layer: 'tubes'
  };

  return { mesh, curve };
}

/**
 * Generates a 3D Mesh for a conductor wire inside a conduit tube (F7-02).
 */
export function createCableMesh(
  curve: THREE.CatmullRomCurve3,
  cable: Cable,
  routeId: string,
  tubeId: string,
  cableIndex: number = 0
): THREE.Mesh {
  const cableGeo = new THREE.TubeGeometry(curve, 28, 0.9, 5, false);
  const cableMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cable.color || '#3b82f6')
  });

  const mesh = new THREE.Mesh(cableGeo, cableMat);
  mesh.userData = {
    id: `${routeId}-${tubeId}-${cableIndex}`,
    routeId,
    tubeId,
    cableIndex,
    layer: 'cables'
  };

  return mesh;
}

/**
 * Constructs the entire 3D project model into a Three.js Group (F7-02).
 */
export function build3DScene(
  state: {
    walls: Wall[];
    boxes: Box[];
    tubes: Tube[];
    routes: Route[];
    config: ProjectConfig;
    levels?: number[];
  },
  options: {
    layers?: Partial<LayerVisibility>;
    levelFilter?: number | 'all';
    scale?: number;
  } = {}
): THREE.Group {
  const root = new THREE.Group();
  const layers: LayerVisibility = { ...DEFAULT_3D_LAYERS, ...(options.layers || {}) };
  const scale = options.scale ?? SCALE;
  const levelFilter = options.levelFilter ?? 'all';

  const filterByLevel = (lvl: number) => {
    return levelFilter === 'all' || lvl === levelFilter;
  };

  // 1. Walls (Obra Civil)
  if (layers.civil) {
    state.walls.forEach((wall) => {
      if (filterByLevel(wall.lvl)) {
        const wallMesh = createWallMesh(wall, state.config, scale);
        root.add(wallMesh);
      }
    });
  }

  // 2. Boxes & Devices (Civil & Electrical)
  state.boxes.forEach((box) => {
    if (filterByLevel(box.lvl)) {
      const isArch = ['door', 'window', 'stairs'].includes(box.type);
      if (isArch && !layers.civil) return;
      if (!isArch && !layers.elec) return;

      const boxObj = createBoxMesh(box, state.config, scale);
      if (boxObj) {
        root.add(boxObj);
      }
    }
  });

  // 3. Tubes & Cables
  const tubeCurves = new Map<string, THREE.CatmullRomCurve3>();

  if (layers.tubes || layers.cables) {
    state.tubes.forEach((tube) => {
      const startBox = state.boxes.find((b) => b.id === tube.startId);
      if (!startBox || !filterByLevel(startBox.lvl)) return;

      const tubeResult = createTubeMesh(tube, state.boxes, state.config, scale);
      if (tubeResult) {
        tubeCurves.set(tube.id, tubeResult.curve);
        if (layers.tubes) {
          root.add(tubeResult.mesh);
        }
      }
    });
  }

  // 4. Circuit Cables
  if (layers.cables) {
    state.routes.forEach((route) => {
      if (!route.tubes || !route.cables) return;

      route.tubes.forEach((tubeId) => {
        const curve = tubeCurves.get(tubeId);
        if (curve) {
          route.cables.forEach((cable, cIdx) => {
            const cableMesh = createCableMesh(curve, cable, route.id, tubeId, cIdx);
            root.add(cableMesh);
          });
        }
      });
    });
  }

  return root;
}
