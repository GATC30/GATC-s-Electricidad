'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Phase, ToolType } from '@/engine/types';

export interface Canvas2DProps {
  phase: Phase;
  tool: ToolType;
  zoom?: number;
  showDims?: boolean;
  showRulers?: boolean;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({
  phase,
  tool,
  zoom = 1,
  showDims = true,
  showRulers = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Handle cursor tracking in meters (40 px = 1 meter)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;
    setCoords({
      x: +(pxX / 40).toFixed(2),
      y: +(pxY / 40).toFixed(2)
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;

        // Draw initial subtle grid in canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex-1 h-full w-full bg-[#f8fafc] dark:bg-slate-950 overflow-hidden select-none outline-none cursor-crosshair"
    >
      {/* Blueprint Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Rulers (Top & Left) */}
      {showRulers && (
        <>
          <div className="absolute top-0 left-6 right-0 h-6 bg-slate-900/90 border-b border-slate-800 z-10 flex items-center px-2 text-[9px] text-slate-400 font-mono pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="inline-block w-20 text-left border-l border-slate-700 pl-1">
                {i * 2}m
              </span>
            ))}
          </div>
          <div className="absolute top-6 bottom-0 left-0 w-6 bg-slate-900/90 border-r border-slate-800 z-10 flex flex-col py-2 text-[9px] text-slate-400 font-mono pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="h-20 text-center border-t border-slate-700 pt-0.5">
                {i * 2}m
              </span>
            ))}
          </div>
        </>
      )}

      {/* Actual Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Canvas Status Hud (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-lg">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-500">X:</span>
          <span className="text-indigo-400 font-semibold">{coords.x}m</span>
          <span className="text-slate-500 ml-1">Y:</span>
          <span className="text-indigo-400 font-semibold">{coords.y}m</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Herramienta:</span>
          <span className="font-semibold text-slate-200 uppercase">{tool}</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <span className="text-slate-500">Zoom:</span>
          <span className="font-semibold text-slate-200">{(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
