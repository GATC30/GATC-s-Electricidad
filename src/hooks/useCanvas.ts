import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { render2D, RenderOptions } from '@/engine/renderer2d';
import { InputHandler, InputCallbacks } from '@/engine/input-handler';

export interface UseCanvasOptions {
  theme?: 'dark' | 'light';
  onSaveState?: () => void;
  onToast?: (message: string) => void;
  onOpenWireModal?: (routeId: string | null) => void;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputHandlerRef = useRef<InputHandler>(new InputHandler());
  const animationFrameIdRef = useRef<number | null>(null);

  // Editor Store
  const editorStore = useEditorStore();
  const {
    camera,
    zoom,
    currentLevel,
    phase,
    tool,
    selectedId,
    selectedType,
    drawTmp,
    wireRoute,
    wireStartId,
    showDims,
    showRulers,
    setCamera,
    setZoom,
    setSelected,
    setCursorCoords,
    setDrawTmp,
    setWireRoute,
    addWireRouteTube,
    setWireStartId
  } = editorStore;

  // Project Store
  const projectStore = useProjectStore();
  const {
    walls,
    boxes,
    tubes,
    routes,
    config,
    levels,
    addWall,
    updateWall,
    addBox,
    updateBox,
    addTube
  } = projectStore;

  // Render trigger via requestAnimationFrame
  const requestRender = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    animationFrameIdRef.current = requestAnimationFrame(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const projectState = {
        walls,
        boxes,
        tubes,
        routes,
        config,
        levels
      };

      const editorState = {
        camera,
        zoom,
        currentLevel,
        phase,
        tool,
        selectedId,
        selectedType,
        drawTmp,
        wireRoute,
        wireStartId,
        showDims,
        showRulers
      };

      const renderOpts: RenderOptions = {
        width: cv.width,
        height: cv.height,
        isExport: false,
        theme: options.theme || 'dark'
      };

      render2D(ctx, projectState, editorState, renderOpts);
    });
  }, [
    walls,
    boxes,
    tubes,
    routes,
    config,
    levels,
    camera,
    zoom,
    currentLevel,
    phase,
    tool,
    selectedId,
    selectedType,
    drawTmp,
    wireRoute,
    wireStartId,
    showDims,
    showRulers,
    options.theme
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        requestRender();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [requestRender]);

  // Re-render when any CAD or Editor state changes
  useEffect(() => {
    requestRender();
  }, [requestRender]);

  // Input callbacks for input handler
  const inputCallbacks: InputCallbacks = {
    setCamera,
    setZoom,
    setSelected,
    setCursorCoords,
    setDrawTmp,
    setWireRoute,
    addWireRouteTube,
    setWireStartId,
    onAddWall: addWall,
    onUpdateWall: updateWall,
    onAddBox: addBox,
    onUpdateBox: updateBox,
    onAddTube: addTube,
    onOpenWireModal: options.onOpenWireModal,
    onSaveState: options.onSaveState,
    onToast: options.onToast
  };

  const getCanvasRect = () => {
    if (!canvasRef.current) return { left: 0, top: 0 };
    return canvasRef.current.getBoundingClientRect();
  };

  const getInputContextState = () => ({
    walls,
    boxes,
    tubes,
    currentLevel,
    phase,
    tool,
    camera,
    zoom,
    selectedId,
    selectedType,
    drawTmp,
    wireRoute,
    wireStartId
  });

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isSecondary = e.button === 1 || e.button === 2;
    inputHandlerRef.current.handlePointerDown(
      e.clientX,
      e.clientY,
      getCanvasRect(),
      getInputContextState(),
      inputCallbacks,
      isSecondary
    );
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current.handlePointerMove(
      e.clientX,
      e.clientY,
      getCanvasRect(),
      getInputContextState(),
      inputCallbacks
    );
  };

  const onMouseUp = () => {
    inputHandlerRef.current.handlePointerUp(
      getInputContextState(),
      inputCallbacks,
      config?.wH || 2.8,
      config?.wW || 0.2
    );
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current.handleWheel(
      e,
      getCanvasRect(),
      getInputContextState(),
      inputCallbacks
    );
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current.handleTouchStart(
      e,
      getCanvasRect(),
      getInputContextState(),
      inputCallbacks
    );
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    inputHandlerRef.current.handleTouchMove(
      e,
      getCanvasRect(),
      getInputContextState(),
      inputCallbacks
    );
  };

  const onTouchEnd = () => {
    inputHandlerRef.current.handleTouchEnd(
      getInputContextState(),
      inputCallbacks,
      getCanvasRect()
    );
  };

  const onTouchCancel = () => {
    inputHandlerRef.current.handlePointerUp(
      getInputContextState(),
      inputCallbacks,
      config?.wH || 2.8,
      config?.wW || 0.2
    );
  };

  return {
    canvasRef,
    containerRef,
    requestRender,
    events: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault()
    }
  };
}
