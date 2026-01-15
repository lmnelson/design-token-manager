'use client';

import React, { useCallback, useState } from 'react';
import {
  Copy,
  Trash2,
  Unlink,
  ArrowLeftRight,
  Pencil,
  Plus,
  Palette,
  Ruler,
  Type,
  Hash,
  Clock,
  Square,
  Sparkles,
  CircleDot,
  Layers,
  FolderPlus,
  ChevronRight,
} from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { isDesignToken } from '@/types/tokens';
import type { DesignTokenFile, DesignToken, TokenType } from '@/types/tokens';

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

interface NodeContextMenuProps {
  nodeId: string;
  nodePath: string[];
  nodeType: string;
  isAlias: boolean;
  aliasPath?: string[]; // The path this token aliases to
  position: { x: number; y: number };
  onClose: () => void;
}

export function NodeContextMenu({
  nodeId,
  nodePath,
  nodeType,
  isAlias,
  aliasPath,
  position,
  onClose,
}: NodeContextMenuProps) {
  const { getActivePage, updatePageTokens, setNewlyCreatedTokenPath } = usePipelineStore();

  // Helper to get a token at a path
  const getTokenAtPath = useCallback((tokens: DesignTokenFile, path: string[]): unknown => {
    let current: unknown = tokens;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  }, []);

  // Helper to set a value at a path (returns new tokens object)
  const setAtPath = useCallback((tokens: DesignTokenFile, path: string[], value: unknown): DesignTokenFile => {
    const newTokens = JSON.parse(JSON.stringify(tokens));
    let current = newTokens;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    return newTokens;
  }, []);

  // Helper to delete at a path (returns new tokens object)
  const deleteAtPath = useCallback((tokens: DesignTokenFile, path: string[]): DesignTokenFile => {
    const newTokens = JSON.parse(JSON.stringify(tokens));
    let current = newTokens;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return newTokens;
      current = current[path[i]];
    }
    delete current[path[path.length - 1]];
    return newTokens;
  }, []);

  const handleDuplicate = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    const token = getTokenAtPath(activePage.tokens, nodePath);
    if (!token) {
      onClose();
      return;
    }

    // Generate new name with -copy suffix
    const baseName = nodePath[nodePath.length - 1];
    const parentPath = nodePath.slice(0, -1);
    const newName = `${baseName}-copy`;
    const newPath = [...parentPath, newName];

    const newTokens = setAtPath(activePage.tokens, newPath, JSON.parse(JSON.stringify(token)));
    updatePageTokens(activePage.id, newTokens);
    onClose();
  }, [getActivePage, getTokenAtPath, setAtPath, updatePageTokens, nodePath, onClose]);

  const handleRename = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    const currentName = nodePath[nodePath.length - 1];
    const newName = prompt('Enter new name:', currentName);

    if (!newName || newName === currentName) {
      onClose();
      return;
    }

    // Validate name (no dots, no special chars that could break paths)
    if (newName.includes('.') || newName.includes('/') || newName.includes('\\')) {
      alert('Name cannot contain ".", "/", or "\\"');
      onClose();
      return;
    }

    const token = getTokenAtPath(activePage.tokens, nodePath);
    if (!token) {
      onClose();
      return;
    }

    // Create new path with new name
    const parentPath = nodePath.slice(0, -1);
    const newPath = [...parentPath, newName];

    // Check if new name already exists
    const existingToken = getTokenAtPath(activePage.tokens, newPath);
    if (existingToken) {
      alert(`A token named "${newName}" already exists at this level`);
      onClose();
      return;
    }

    // Delete old and create new
    let newTokens = deleteAtPath(activePage.tokens, nodePath);
    newTokens = setAtPath(newTokens, newPath, token);

    updatePageTokens(activePage.id, newTokens);
    onClose();
  }, [getActivePage, getTokenAtPath, setAtPath, deleteAtPath, updatePageTokens, nodePath, onClose]);

  const handleDelete = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    if (confirm(`Delete "${nodePath.join('.')}"?`)) {
      const newTokens = deleteAtPath(activePage.tokens, nodePath);
      updatePageTokens(activePage.id, newTokens);
    }
    onClose();
  }, [getActivePage, deleteAtPath, updatePageTokens, nodePath, onClose]);

  const handleUnlink = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage || !aliasPath) {
      onClose();
      return;
    }

    const token = getTokenAtPath(activePage.tokens, nodePath);
    if (!token || !isDesignToken(token)) {
      onClose();
      return;
    }

    // Get the target token to resolve its value
    const targetToken = getTokenAtPath(activePage.tokens, aliasPath);
    let resolvedValue: unknown = '#000000'; // Default fallback

    if (targetToken && isDesignToken(targetToken)) {
      // Use the target's value (could still be an alias, but at least one level resolved)
      resolvedValue = targetToken.$value;
    }

    const newToken = {
      ...token,
      $value: resolvedValue,
    };

    const newTokens = setAtPath(activePage.tokens, nodePath, newToken);
    updatePageTokens(activePage.id, newTokens);
    onClose();
  }, [getActivePage, getTokenAtPath, setAtPath, updatePageTokens, nodePath, aliasPath, onClose]);

  const handleReverseLink = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage || !aliasPath) {
      onClose();
      return;
    }

    const currentToken = getTokenAtPath(activePage.tokens, nodePath);
    const targetToken = getTokenAtPath(activePage.tokens, aliasPath);

    if (!currentToken || !isDesignToken(currentToken) || !targetToken || !isDesignToken(targetToken)) {
      onClose();
      return;
    }

    // Get the target's actual value (resolve if it's also an alias)
    const targetValue = targetToken.$value;

    // Create the alias reference for the target to point to current
    const aliasReference = `{${nodePath.join('.')}}`;

    // Update current token with target's value
    const updatedCurrentToken = {
      ...currentToken,
      $value: targetValue,
    };

    // Update target token to be an alias pointing to current
    const updatedTargetToken = {
      ...targetToken,
      $value: aliasReference,
    };

    // Apply both changes
    let newTokens = setAtPath(activePage.tokens, nodePath, updatedCurrentToken);
    newTokens = setAtPath(newTokens, aliasPath, updatedTargetToken);

    updatePageTokens(activePage.id, newTokens);
    onClose();
  }, [getActivePage, getTokenAtPath, setAtPath, updatePageTokens, nodePath, aliasPath, onClose]);

  // Handle group delete
  const handleDeleteGroup = useCallback(() => {
    const activePage = getActivePage();
    if (!activePage) {
      onClose();
      return;
    }

    if (confirm(`Delete group "${nodePath.join('.')}" and all its contents?`)) {
      const newTokens = deleteAtPath(activePage.tokens, nodePath);
      updatePageTokens(activePage.id, newTokens);
    }
    onClose();
  }, [getActivePage, deleteAtPath, updatePageTokens, nodePath, onClose]);

  // Handle adding a token to a group
  const handleAddToken = useCallback((tokenType: TokenTypeOption) => {
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

    // Find unique name within the group
    while (pathExists(activePage.tokens, [...nodePath, name])) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    // Create the token
    const newToken = {
      $value: tokenType.defaultValue,
      $type: tokenType.type,
    };

    // Add to the group
    const newPath = [...nodePath, name];
    const newTokens = setAtPath(activePage.tokens, newPath, newToken);
    updatePageTokens(activePage.id, newTokens);
    // Notify sidebar to highlight and edit the new token
    setNewlyCreatedTokenPath(newPath);
    onClose();
  }, [getActivePage, setAtPath, updatePageTokens, nodePath, onClose, setNewlyCreatedTokenPath]);

  // Handle adding a subgroup
  const handleAddGroup = useCallback(() => {
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

    while (pathExists(activePage.tokens, [...nodePath, name])) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    // Create empty group
    const newPath = [...nodePath, name];
    const newTokens = setAtPath(activePage.tokens, newPath, {});
    updatePageTokens(activePage.id, newTokens);
    // Notify sidebar to highlight and edit the new group
    setNewlyCreatedTokenPath(newPath);
    onClose();
  }, [getActivePage, setAtPath, updatePageTokens, nodePath, onClose, setNewlyCreatedTokenPath]);

  // Track submenu visibility for groups
  const [showTokenSubmenu, setShowTokenSubmenu] = useState(false);

  // Show menu for group nodes
  if (nodeType === 'tokenGroup') {
    return (
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
        style={{ left: position.x, top: position.y }}
      >
        {/* Add Token with submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowTokenSubmenu(true)}
          onMouseLeave={() => setShowTokenSubmenu(false)}
        >
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Token
            </span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </button>
          {showTokenSubmenu && (
            <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
              {TOKEN_TYPES.map((tokenType) => (
                <button
                  key={tokenType.type}
                  onClick={() => handleAddToken(tokenType)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {tokenType.icon}
                  {tokenType.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Group */}
        <button
          onClick={handleAddGroup}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FolderPlus className="w-4 h-4" />
          Add Group
        </button>

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        {/* Rename */}
        <button
          onClick={handleRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Pencil className="w-4 h-4" />
          Rename Group
        </button>

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        {/* Delete */}
        <button
          onClick={handleDeleteGroup}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
          Delete Group
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
      style={{ left: position.x, top: position.y }}
    >
      {/* Rename */}
      <button
        onClick={handleRename}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Pencil className="w-4 h-4" />
        Rename
      </button>

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Copy className="w-4 h-4" />
        Duplicate
      </button>

      {/* Alias options (only for aliases) */}
      {isAlias && aliasPath && (
        <>
          <button
            onClick={handleUnlink}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Unlink className="w-4 h-4" />
            Unlink Alias
          </button>
          <button
            onClick={handleReverseLink}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Reverse Link
          </button>
        </>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}
