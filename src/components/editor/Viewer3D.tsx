'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  build3DScene,
  disposeThreeScene,
  LayerVisibility,
  DEFAULT_3D_LAYERS
} from '@/engine/renderer3d';
import { Wall, Box, Tube, Route, ProjectConfig } from '@/engine/types';
import { Button } from '@/components/ui';

export interface Viewer3DProps {
  walls: Wall[];
  boxes: Box[];
  tubes: Tube[];
  routes: Route[];
  config: ProjectConfig;
  levels: number[];
  currentLevel: number;
  onClose: () => void;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  walls,
  boxes,
  tubes,
  routes,
  config,
  levels,
  currentLevel,
  onClose
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Layer visibility state
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_3D_LAYERS);
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');

  // Compute bounding center of the project
  const getProjectCenter = useCallback(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    walls.forEach((w) => {
      minX = Math.min(minX, w.x1, w.x2);
      maxX = Math.max(maxX, w.x1, w.x2);
      minZ = Math.min(minZ, w.y1, w.y2);
      maxZ = Math.max(maxZ, w.y1, w.y2);
    });

    boxes.forEach((b) => {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minZ = Math.min(minZ, b.y);
      maxZ = Math.max(maxZ, b.y);
    });

    if (minX === Infinity) {
      return { x: 400, z: 300, radius: 500 };
    }

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const radius = Math.max(maxX - minX, maxZ - minZ, 400);

    return { x: cx, z: cz, radius };
  }, [walls, boxes]);

  // Set Camera View Preset
  const setCameraPreset = useCallback(
    (preset: 'iso' | 'top' | 'front') => {
      if (!cameraRef.current || !controlsRef.current) return;
      const { x: cx, z: cz, radius } = getProjectCenter();

      if (preset === 'iso') {
        cameraRef.current.position.set(cx + radius * 0.9, radius * 1.1, cz + radius * 0.9);
        cameraRef.current.lookAt(cx, radius * 0.2, cz);
        controlsRef.current.target.set(cx, radius * 0.2, cz);
      } else if (preset === 'top') {
        cameraRef.current.position.set(cx, radius * 2.0, cz + 0.1);
        cameraRef.current.lookAt(cx, 0, cz);
        controlsRef.current.target.set(cx, 0, cz);
      } else if (preset === 'front') {
        cameraRef.current.position.set(cx, radius * 0.3, cz + radius * 1.6);
        cameraRef.current.lookAt(cx, radius * 0.2, cz);
        controlsRef.current.target.set(cx, radius * 0.2, cz);
      }
      controlsRef.current.update();
    },
    [getProjectCenter]
  );

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Dark CAD blueprint background
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 30000);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 15000;
    controls.minDistance = 20;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(800, 1500, 900);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.25);
    fillLight.position.set(-600, 400, -600);
    scene.add(fillLight);

    // 6. Ground Grid
    const grid = new THREE.GridHelper(8000, 80, 0x334155, 0x1e293b);
    grid.position.y = -0.5;
    scene.add(grid);

    // Initial camera position
    setCameraPreset('iso');

    // 7. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Cleanup on unmount (BUG-05 fix: proper WebGL disposal)
    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      disposeThreeScene(scene, renderer, controls);
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []); // Run once on mount

  // Re-build 3D Meshes whenever state, layers, or levelFilter changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing model group
    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      disposeThreeScene(modelGroupRef.current);
      modelGroupRef.current = null;
    }

    // Build fresh model group
    const newGroup = build3DScene(
      { walls, boxes, tubes, routes, config, levels },
      {
        layers,
        levelFilter
      }
    );

    modelGroupRef.current = newGroup;
    scene.add(newGroup);
  }, [walls, boxes, tubes, routes, config, levels, layers, levelFilter]);

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0a0f1d]">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Control Bar (Top Left) */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-2xl z-20">
        <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
            Capas:
          </span>

          {/* Obra Civil */}
          <button
            type="button"
            onClick={() => toggleLayer('civil')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              layers.civil
                ? 'bg-slate-700 text-white border border-slate-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Obra Civil (Paredes, Puertas, Ventanas)"
          >
            🏛️ Civil
          </button>

          {/* Eléctrico */}
          <button
            type="button"
            onClick={() => toggleLayer('elec')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              layers.elec
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Dispositivos Eléctricos"
          >
            ⚡ Eléctrico
          </button>

          {/* Tuberías */}
          <button
            type="button"
            onClick={() => toggleLayer('tubes')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              layers.tubes
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Tuberías PVC"
          >
            🔘 Tuberías
          </button>

          {/* Cables */}
          <button
            type="button"
            onClick={() => toggleLayer('cables')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              layers.cables
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Cableado de Circuitos"
          >
            🌈 Cables
          </button>
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
            Nivel:
          </span>
          <select
            value={levelFilter}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setLevelFilter(val);
            }}
            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
          >
            <option value="all">Todos los Niveles</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                Nivel {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Views */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 text-xs font-semibold"
            title="Vista Isométrica"
          >
            📐 Iso
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 text-xs font-semibold"
            title="Vista Superior (Planta)"
          >
            ⬆️ Planta
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 text-xs font-semibold"
            title="Vista Frontal"
          >
            🏢 Frente
          </button>
        </div>
      </div>

      {/* Close 3D / Return to 2D Button (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700 backdrop-blur-md shadow-xl text-xs font-bold py-1.5 px-3 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <span>Regresar a Plano 2D</span>
        </Button>
      </div>

      {/* Navigation Help overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 pointer-events-none flex items-center gap-3">
        <span>🖱️ Click Izq: Rotar</span>
        <span>🖱️ Click Der / Dos dedos: Desplazar</span>
        <span>🔍 Rueda: Zoom</span>
      </div>
    </div>
  );
};
