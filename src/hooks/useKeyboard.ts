import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { ToolType, Phase } from '@/engine/types';

export interface UseKeyboardOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onDeleteSelected?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onZoomToFit?: () => void;
  onOpenCommandPalette?: () => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const {
    tool,
    phase,
    setTool,
    setPhase,
    setZoom,
    clearSelection,
    setDrawTmp,
    setIsSpacePressed,
    setIsCommandPaletteOpen
  } = useEditorStore();

  const prevToolRef = useRef<ToolType>(tool);
  const isSpaceDownRef = useRef<boolean>(false);

  useEffect(() => {
    const isTextInput = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const inText = isTextInput(e.target);
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. Command Palette: Ctrl+K / Cmd+K
      if (isCtrlOrMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (options.onOpenCommandPalette) {
          options.onOpenCommandPalette();
        } else {
          setIsCommandPaletteOpen(true);
        }
        return;
      }

      // 2. Undo / Redo: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y
      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          options.onRedo?.();
        } else {
          options.onUndo?.();
        }
        return;
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        options.onRedo?.();
        return;
      }

      // 3. Save: Ctrl+S / Cmd+S
      if (isCtrlOrMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        options.onSave?.();
        return;
      }

      // 4. Zoom to fit: Ctrl+0 / Ctrl+F / Cmd+0 / Cmd+F
      if (isCtrlOrMeta && (e.key === '0' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        options.onZoomToFit?.();
        return;
      }

      // 5. Copy & Paste (internal CAD clipboard): Ctrl+C / Ctrl+V
      if (isCtrlOrMeta && !inText) {
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          options.onCopy?.();
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          options.onPaste?.();
          return;
        }
      }

      // If user is typing in a form field, do NOT trigger single-key hotkeys
      if (inText) return;

      // 6. Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        options.onDeleteSelected?.();
        return;
      }

      // 7. Escape: Cancel drawing / clear selection / back to select
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrawTmp(null);
        clearSelection();
        if (tool !== 'select') {
          setTool('select');
        }
        return;
      }

      // 8. Space: Temporary Pan
      if (e.code === 'Space' && !e.repeat && !isSpaceDownRef.current) {
        e.preventDefault();
        isSpaceDownRef.current = true;
        prevToolRef.current = tool;
        setIsSpacePressed(true);
        if (tool !== 'pan') {
          setTool('pan');
        }
        return;
      }

      // 9. Zoom In / Zoom Out: +/-
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(5, Number((z * 1.15).toFixed(2))));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => Math.max(0.1, Number((z / 1.15).toFixed(2))));
        return;
      }

      // 10. Phase switching: 1, 2, 3, 4
      if (e.key >= '1' && e.key <= '4' && !isCtrlOrMeta && !e.altKey) {
        const targetPhase = parseInt(e.key, 10) as Phase;
        setPhase(targetPhase);
        options.onToast?.(`Cambiado a Fase ${targetPhase}`, 'info');
        return;
      }

      // 11. Tool Hotkeys (V, H/P, W, D, N, O, R, Q, T, E)
      if (!isCtrlOrMeta && !e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'v':
            setTool('select');
            break;
          case 'h':
          case 'p':
            setTool('pan');
            break;
          case 'w':
            if (phase === 1) setTool('wall');
            break;
          case 'd':
            if (phase === 1) setTool('door');
            break;
          case 'n':
            if (phase === 1) setTool('window');
            break;
          case 'o':
            setTool('box_oct');
            break;
          case 'r':
            setTool('box_rect');
            break;
          case 'q':
            setTool('box_sq');
            break;
          case 't':
            setTool('tube');
            break;
          case 'e':
            if (phase === 2) setTool('wire');
            break;
          default:
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isSpaceDownRef.current) {
          isSpaceDownRef.current = false;
          setIsSpacePressed(false);
          setTool(prevToolRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    tool,
    phase,
    setTool,
    setPhase,
    setZoom,
    clearSelection,
    setDrawTmp,
    setIsSpacePressed,
    setIsCommandPaletteOpen,
    options
  ]);
}
