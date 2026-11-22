'use client';

import React, { useRef, useState } from 'react';
import { ProjectState } from '@/engine/types';
import { validateGatcFile } from '@/lib/validators';
import { Button, ButtonProps } from '@/components/ui/Button';

export interface ImportResult {
  projectId: string;
  projectName: string;
  state: ProjectState;
}

export interface ImportButtonProps {
  onImport: (result: ImportResult) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  label?: string;
  children?: React.ReactNode;
}

/**
 * Reusable React component for importing .gatc project files (F7-05).
 * Validates schema and sanitizes input data using validators.ts (BUG-10 & BUG-01).
 */
export const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  onError,
  className = '',
  variant = 'secondary',
  size = 'md',
  label = 'Importar .gatc',
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        const msg = 'El archivo seleccionado no es un JSON válido.';
        onError?.(msg);
        return;
      }

      // Validate schema and sanitize state using validators.ts (F3-06, BUG-10)
      const validation = validateGatcFile(parsed);
      if (!validation.isValid && validation.errors.length > 0) {
        const errorMsg = `Archivo no válido: ${validation.errors.slice(0, 2).join('; ')}`;
        onError?.(errorMsg);
        return;
      }

      const rawProjectName =
        validation.projectName || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      const projectId = validation.projectId || `proj-${Date.now()}`;

      if (validation.sanitizedState) {
        onImport({
          projectId,
          projectName: rawProjectName,
          state: validation.sanitizedState
        });
      } else {
        onError?.('No se pudieron extraer datos válidos del proyecto.');
      }
    } catch (err: any) {
      console.error('Error importing .gatc file:', err);
      onError?.(err.message || 'Error inesperado al importar el archivo.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gatc,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        isLoading={isLoading}
        onClick={handleClick}
        className={className}
        leftIcon={
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        }
      >
        {children || label}
      </Button>
    </>
  );
};
