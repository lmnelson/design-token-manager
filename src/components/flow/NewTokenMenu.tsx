'use client';

import React, { useCallback } from 'react';
import {
  Plus,
  Palette,
  Ruler,
  Type,
  Hash,
  Clock,
  Square,
  Layers,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { TokenType, DesignTokenFile } from '@/types/tokens';

interface NewTokenMenuProps {
  position: { x: number; y: number };
  parentPath?: string[]; // If provided, creates token inside this group
  onClose: () => void;
  onTokenCreated?: (path: string[]) => void;
}

interface TokenTypeOption {
  type: TokenType;
  label: string;
  icon: React.ReactNode;
  defaultValue: unknown;
}

const TOKEN_TYPES: TokenTypeOption[] = [
  { type: 'color', label: 'Color', icon: <Palette className="w-4 h-4" />, defaultValue: '#000000' },
  { type: 'dimension', label: 'Dimension', icon: <Ruler className="w-4 h-4" />, defaultValue: '16px' },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, defaultValue: 0 },
  { type: 'fontFamily', label: 'Font Family', icon: <Type className="w-4 h-4" />, defaultValue: 'Inter' },
  { type: 'fontWeight', label: 'Font Weight', icon: <Type className="w-4 h-4" />, defaultValue: 400 },
  { type: 'duration', label: 'Duration', icon: <Clock className="w-4 h-4" />, defaultValue: '200ms' },
  { type: 'shadow', label: 'Shadow', icon: <Layers className="w-4 h-4" />, defaultValue: '0 2px 4px rgba(0,0,0,0.1)' },
  { type: 'border', label: 'Border', icon: <Square className="w-4 h-4" />, defaultValue: '1px solid #000000' },
  { type: 'gradient', label: 'Gradient', icon: <Sparkles className="w-4 h-4" />, defaultValue: 'linear-gradient(90deg, #000 0%, #fff 100%)' },
  { type: 'cubicBezier', label: 'Easing', icon: <CircleDot className="w-4 h-4" />, defaultValue: [0.4, 0, 0.2, 1] },
];

export function NewTokenMenu({
  position,
  parentPath = [],
  onClose,
  onTokenCreated,
}: NewTokenMenuProps) {
  const { getActivePage, updatePageTokens } = usePipelineStore();

  const handleCreateToken = useCallback((tokenType: TokenTypeOption) => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    // Generate a unique name
    const baseName = `new-${tokenType.type}`;
    let name = baseName;
    let counter = 1;

    // Helper to check if path exists
    const pathExists = (tokens: DesignTokenFile, path: string[]): boolean => {
      let current: unknown = tokens;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return false;
        }
      }
      return true;
    };

    // Find unique name
    while (pathExists(activePage.tokens, [...parentPath, name])) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    // Create the token
    const newToken = {
      $value: tokenType.defaultValue,
      $type: tokenType.type,
    };

    // Deep clone and update tokens
    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
    let current = newTokens;
    for (const key of parentPath) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    current[name] = newToken;

    updatePageTokens(activePage.id, newTokens);
    onTokenCreated?.([...parentPath, name]);
    onClose();
  }, [getActivePage, updatePageTokens, parentPath, onClose, onTokenCreated]);

  const handleCreateGroup = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    // Generate a unique name
    const baseName = 'new-group';
    let name = baseName;
    let counter = 1;

    const pathExists = (tokens: DesignTokenFile, path: string[]): boolean => {
      let current: unknown = tokens;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return false;
        }
      }
      return true;
    };

    while (pathExists(activePage.tokens, [...parentPath, name])) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    // Create empty group
    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
    let current = newTokens;
    for (const key of parentPath) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    current[name] = {};

    updatePageTokens(activePage.id, newTokens);
    onTokenCreated?.([...parentPath, name]);
    onClose();
  }, [getActivePage, updatePageTokens, parentPath, onClose, onTokenCreated]);

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
      style={{ left: position.x, top: position.y }}
    >
      {/* New Token with submenu */}
      <div className="relative group">
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Token
          </span>
          <span className="text-gray-400 text-xs">▶</span>
        </button>
        <div className="absolute left-full top-0 ml-1 hidden group-hover:block bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
          {TOKEN_TYPES.map((tokenType) => (
            <button
              key={tokenType.type}
              onClick={() => handleCreateToken(tokenType)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {tokenType.icon}
              {tokenType.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Group */}
      <button
        onClick={handleCreateGroup}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Layers className="w-4 h-4" />
        New Group
      </button>
    </div>
  );
}
