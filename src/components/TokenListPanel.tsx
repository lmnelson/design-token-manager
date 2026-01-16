'use client';

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Palette,
  Type,
  Ruler,
  Box,
  Folder,
  FolderOpen,
  Copy,
  Pencil,
  Trash2,
  FolderPlus,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import { NewTokenMenu } from '@/components/flow/NewTokenMenu';
import type { DesignTokenFile, TokenType } from '@/types/tokens';
import { isDesignToken, isTokenGroup } from '@/types/tokens';

// Flattened token with source info for inheritance tracking
interface TokenWithSource {
  path: string[];
  value: unknown;
  type?: TokenType;
  sourceLayerId: string;
  sourceLayerName: string;
  isInherited: boolean;
  isToken: boolean; // true for tokens, false for groups
  isExtended?: boolean; // true if this token only exists in current page, not siblings
}

// Compute all effective tokens for the current page, including inherited ones
function computeEffectiveTokens(
  pipeline: { layers: Array<{ id: string; name: string; order: number; variables: string[] }> },
  pages: Array<{ id: string; layerId: string; variableValues: Record<string, string>; tokens: DesignTokenFile }>,
  activePageId: string | null,
  extendedKeys: Set<string> = new Set()
): TokenWithSource[] {
  if (!activePageId) return [];

  const activePage = pages.find(p => p.id === activePageId);
  if (!activePage) return [];

  const activeLayer = pipeline.layers.find(l => l.id === activePage.layerId);
  if (!activeLayer) return [];

  const result: TokenWithSource[] = [];
  const seenPaths = new Map<string, TokenWithSource>();

  // Get layers in order (lower order = base, processed first)
  const sortedLayers = [...pipeline.layers]
    .filter(l => l.order <= activeLayer.order)
    .sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    // Find the page for this layer that matches the active page's variable values
    // (or has no variables for static layers)
    const layerVars = layer.variables || [];
    const matchingPage = pages.find(p => {
      if (p.layerId !== layer.id) return false;

      // For static layers (no variables), any page for that layer works
      if (layerVars.length === 0) {
        return Object.keys(p.variableValues).length === 0;
      }

      // For variable layers, match the variable values from active page
      for (const varKey of layerVars) {
        if (p.variableValues[varKey] !== activePage.variableValues[varKey]) {
          return false;
        }
      }
      return true;
    });

    if (!matchingPage) continue;

    // Flatten tokens from this page
    const flattenTokens = (
      obj: Record<string, unknown>,
      currentPath: string[] = [],
      inheritedType?: TokenType
    ) => {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;

        const path = [...currentPath, key];
        const pathStr = path.join('.');

        if (isDesignToken(value)) {
          const token: TokenWithSource = {
            path,
            value: value.$value,
            type: value.$type || inheritedType,
            sourceLayerId: layer.id,
            sourceLayerName: layer.name,
            isInherited: layer.id !== activeLayer.id,
            isToken: true,
            isExtended: extendedKeys.has(pathStr),
          };
          seenPaths.set(pathStr, token);
        } else if (isTokenGroup(value)) {
          // Also track groups for tree rendering
          const group: TokenWithSource = {
            path,
            value,
            type: value.$type || inheritedType,
            sourceLayerId: layer.id,
            sourceLayerName: layer.name,
            isInherited: layer.id !== activeLayer.id,
            isToken: false,
            isExtended: extendedKeys.has(pathStr),
          };
          seenPaths.set(pathStr, group);
          flattenTokens(value as Record<string, unknown>, path, value.$type || inheritedType);
        }
      }
    };

    flattenTokens(matchingPage.tokens as Record<string, unknown>);
  }

  return Array.from(seenPaths.values());
}

interface TokenTreeItemProps {
  path: string[];
  tokens: TokenWithSource[];
  expandedGroups: Set<string>;
  onToggleGroup: (path: string) => void;
  onSelectToken: (path: string[]) => void;
  onGoToSource: (layerId: string) => void;
  selectedPath: string[] | null;
  level?: number;
  editingPath: string | null;
  onStartEdit: (path: string) => void;
  onRename: (oldPath: string[], newName: string) => void;
  onCancelEdit: () => void;
  onItemContextMenu: (e: React.MouseEvent, path: string[], isGroup: boolean, isInherited: boolean) => void;
}

function TokenTreeItem({
  path,
  tokens,
  expandedGroups,
  onToggleGroup,
  onSelectToken,
  onGoToSource,
  selectedPath,
  level = 0,
  editingPath,
  onStartEdit,
  onRename,
  onCancelEdit,
  onItemContextMenu,
}: TokenTreeItemProps) {
  const pathStr = path.join('.');
  const tokenInfo = tokens.find(t => t.path.join('.') === pathStr);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState('');

  const isEditing = editingPath === pathStr;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!tokenInfo) return null;

  const isGroup = !tokenInfo.isToken;
  const isToken = tokenInfo.isToken;
  const isExpanded = expandedGroups.has(pathStr);
  const isSelected = selectedPath?.join('.') === pathStr;
  const isInherited = tokenInfo.isInherited;
  const isExtended = tokenInfo.isExtended;

  // Get children for groups
  const children = isGroup
    ? tokens.filter(t => {
        const tPath = t.path.join('.');
        return tPath.startsWith(pathStr + '.') && t.path.length === path.length + 1;
      })
    : [];

  const getTypeIcon = () => {
    switch (tokenInfo.type) {
      case 'color':
        return <Palette className="w-3 h-3 text-pink-500" />;
      case 'typography':
      case 'fontFamily':
        return <Type className="w-3 h-3 text-purple-500" />;
      case 'dimension':
        return <Ruler className="w-3 h-3 text-blue-500" />;
      default:
        return <Box className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleClick = () => {
    if (isGroup) {
      onToggleGroup(pathStr);
    }
    onSelectToken(path);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow editing inherited tokens
    if (isInherited) return;
    setEditValue(path[path.length - 1]);
    onStartEdit(pathStr);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editValue.trim() && editValue.trim() !== path[path.length - 1]) {
        onRename(path, editValue.trim());
      } else {
        onCancelEdit();
      }
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleEditBlur = () => {
    if (editValue.trim() && editValue.trim() !== path[path.length - 1]) {
      onRename(path, editValue.trim());
    } else {
      onCancelEdit();
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onItemContextMenu(e, path, isGroup, isInherited);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors',
          isSelected && 'bg-blue-100 dark:bg-blue-900/30',
          isExtended && 'border-l-2 border-teal-400 dark:border-teal-500'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        title={isExtended ? 'Extended (only in this variant)' : isInherited ? `Inherited from ${tokenInfo.sourceLayerName}` : undefined}
      >
        {/* Expand/collapse for groups */}
        {isGroup ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isGroup ? (
          isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-500" />
          )
        ) : (
          getTypeIcon()
        )}

        {/* Name - editable or static */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs bg-white dark:bg-gray-900 border border-blue-500 rounded px-1 py-0.5 outline-none min-w-0"
          />
        ) : (
          <span
            className={cn(
              'flex-1 text-xs truncate',
              isInherited && 'italic',
              isExtended && 'text-teal-700 dark:text-teal-400',
              !isExtended && (isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300')
            )}
          >
            {path[path.length - 1]}
          </span>
        )}

        {/* Extension badge */}
        {isExtended && !isEditing && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium flex-shrink-0">
            +
          </span>
        )}

        {/* Color preview for color tokens */}
        {tokenInfo.type === 'color' && typeof tokenInfo.value === 'string' && !tokenInfo.value.startsWith('{') && !isEditing && (
          <div
            className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
            style={{ backgroundColor: tokenInfo.value }}
          />
        )}
      </div>

      {/* Children */}
      {isGroup && isExpanded && (
        <div>
          {children.map((child) => (
            <TokenTreeItem
              key={child.path.join('.')}
              path={child.path}
              tokens={tokens}
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
              onSelectToken={onSelectToken}
              onGoToSource={onGoToSource}
              selectedPath={selectedPath}
              level={level + 1}
              editingPath={editingPath}
              onStartEdit={onStartEdit}
              onRename={onRename}
              onCancelEdit={onCancelEdit}
              onItemContextMenu={onItemContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TokenListPanel() {
  const { pipeline, pages, activePageId, setActivePage, getActivePage, getPageExtendedKeys, viewContext, updatePageTokens, newlyCreatedTokenPath, clearNewlyCreatedTokenPath, setSidebarSelectedTokenPath } = usePipelineStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['colors', 'spacing', 'typography'])
  );
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    parentPath: string[];
  } | null>(null);
  const [itemContextMenu, setItemContextMenu] = useState<{
    position: { x: number; y: number };
    path: string[];
    isGroup: boolean;
    isInherited: boolean;
  } | null>(null);

  const activePage = getActivePage();
  const isSchemaView = viewContext?.isSchemaView ?? false;

  // Watch for newly created tokens and auto-focus them
  useEffect(() => {
    if (newlyCreatedTokenPath && newlyCreatedTokenPath.length > 0) {
      // Expand all parent groups so the new token is visible
      const parentPaths: string[] = [];
      for (let i = 1; i < newlyCreatedTokenPath.length; i++) {
        parentPaths.push(newlyCreatedTokenPath.slice(0, i).join('.'));
      }
      setExpandedGroups(prev => {
        const next = new Set(prev);
        for (const p of parentPaths) {
          next.add(p);
        }
        return next;
      });

      // Select and start editing the new token
      setSelectedPath(newlyCreatedTokenPath);
      // Small delay to allow the tree to expand and render
      setTimeout(() => {
        setEditingPath(newlyCreatedTokenPath.join('.'));
      }, 50);

      // Clear the flag so we don't re-trigger
      clearNewlyCreatedTokenPath();
    }
  }, [newlyCreatedTokenPath, clearNewlyCreatedTokenPath]);

  // Handle right-click on token list area
  const handleContextMenu = useCallback((e: React.MouseEvent, parentPath: string[] = []) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      parentPath,
    });
  }, []);

  // Get extended keys for the current page (empty in schema view)
  const extendedKeys = useMemo(() => {
    if (isSchemaView || !activePageId) return new Set<string>();
    const keys = getPageExtendedKeys(activePageId);
    return new Set(keys);
  }, [isSchemaView, activePageId, getPageExtendedKeys]);

  // Compute effective tokens including inherited ones
  const effectiveTokens = useMemo(
    () => computeEffectiveTokens(pipeline, pages, activePageId, extendedKeys),
    [pipeline, pages, activePageId, extendedKeys]
  );

  // Get root-level items
  const rootItems = useMemo(
    () => effectiveTokens.filter(t => t.path.length === 1),
    [effectiveTokens]
  );

  const handleToggleGroup = useCallback((path: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelectToken = useCallback((path: string[]) => {
    setSelectedPath(path);
    // Notify canvas to highlight corresponding node
    setSidebarSelectedTokenPath(path);
  }, [setSidebarSelectedTokenPath]);

  const handleGoToSource = useCallback(
    (layerId: string) => {
      // Find a page for this layer that matches current variable values
      if (!activePage) return;

      const layer = pipeline.layers.find(l => l.id === layerId);
      if (!layer) return;

      const layerVars = layer.variables || [];
      const matchingPage = pages.find(p => {
        if (p.layerId !== layerId) return false;
        if (layerVars.length === 0) {
          return Object.keys(p.variableValues).length === 0;
        }
        for (const varKey of layerVars) {
          if (p.variableValues[varKey] !== activePage.variableValues[varKey]) {
            return false;
          }
        }
        return true;
      });

      if (matchingPage) {
        setActivePage(matchingPage.id);
      }
    },
    [activePage, pipeline.layers, pages, setActivePage]
  );

  // Handle starting edit mode
  const handleStartEdit = useCallback((path: string) => {
    setEditingPath(path);
  }, []);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingPath(null);
  }, []);

  // Handle token created - expand parent groups and start editing
  const handleTokenCreated = useCallback((path: string[]) => {
    // Expand all parent groups so the new token is visible
    const parentPaths: string[] = [];
    for (let i = 1; i < path.length; i++) {
      parentPaths.push(path.slice(0, i).join('.'));
    }
    setExpandedGroups(prev => {
      const next = new Set(prev);
      for (const p of parentPaths) {
        next.add(p);
      }
      return next;
    });

    // Select and start editing the new token
    setSelectedPath(path);
    // Small delay to allow the tree to expand and render
    setTimeout(() => {
      setEditingPath(path.join('.'));
    }, 50);
  }, []);

  // Handle renaming a token
  const handleRename = useCallback((oldPath: string[], newName: string) => {
    if (!activePage) return;

    // Validate name
    if (newName.includes('.') || newName.includes('/') || newName.includes('\\')) {
      setEditingPath(null);
      return;
    }

    // Get the token value
    const getAtPath = (obj: Record<string, unknown>, path: string[]): unknown => {
      let current: unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const tokenValue = getAtPath(activePage.tokens as Record<string, unknown>, oldPath);
    if (tokenValue === undefined) {
      setEditingPath(null);
      return;
    }

    // Check if new name already exists
    const parentPath = oldPath.slice(0, -1);
    const newPath = [...parentPath, newName];
    const existing = getAtPath(activePage.tokens as Record<string, unknown>, newPath);
    if (existing !== undefined) {
      setEditingPath(null);
      return;
    }

    // Deep clone tokens
    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));

    // Navigate to parent and rename
    let parent: Record<string, unknown> = newTokens;
    for (const key of parentPath) {
      parent = parent[key] as Record<string, unknown>;
    }

    const oldName = oldPath[oldPath.length - 1];
    parent[newName] = parent[oldName];
    delete parent[oldName];

    updatePageTokens(activePage.id, newTokens);
    setEditingPath(null);
    setSelectedPath(newPath);
  }, [activePage, updatePageTokens]);

  // Handle item context menu
  const handleItemContextMenu = useCallback((e: React.MouseEvent, path: string[], isGroup: boolean, isInherited: boolean) => {
    setItemContextMenu({
      position: { x: e.clientX, y: e.clientY },
      path,
      isGroup,
      isInherited,
    });
    // Also select this item
    setSelectedPath(path);
  }, []);

  // Handle duplicate token/group
  const handleDuplicate = useCallback(() => {
    if (!activePage || !itemContextMenu) return;

    const { path } = itemContextMenu;

    // Get the token value
    const getAtPath = (obj: Record<string, unknown>, p: string[]): unknown => {
      let current: unknown = obj;
      for (const key of p) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const tokenValue = getAtPath(activePage.tokens as Record<string, unknown>, path);
    if (tokenValue === undefined) {
      setItemContextMenu(null);
      return;
    }

    // Generate a unique name
    const baseName = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    let newName = `${baseName}-copy`;
    let counter = 1;

    while (getAtPath(activePage.tokens as Record<string, unknown>, [...parentPath, newName]) !== undefined) {
      newName = `${baseName}-copy-${counter}`;
      counter++;
    }

    // Clone and insert
    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
    let parent: Record<string, unknown> = newTokens;
    for (const key of parentPath) {
      parent = parent[key] as Record<string, unknown>;
    }
    parent[newName] = JSON.parse(JSON.stringify(tokenValue));

    updatePageTokens(activePage.id, newTokens);
    setItemContextMenu(null);
    setSelectedPath([...parentPath, newName]);
  }, [activePage, itemContextMenu, updatePageTokens]);

  // Handle delete token/group
  const handleDelete = useCallback(() => {
    if (!activePage || !itemContextMenu) return;

    const { path, isGroup } = itemContextMenu;
    const name = path.join('.');

    if (!confirm(`Delete ${isGroup ? 'group' : 'token'} "${name}"${isGroup ? ' and all its contents' : ''}?`)) {
      setItemContextMenu(null);
      return;
    }

    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
    const parentPath = path.slice(0, -1);

    let parent: Record<string, unknown> = newTokens;
    for (const key of parentPath) {
      parent = parent[key] as Record<string, unknown>;
    }
    delete parent[path[path.length - 1]];

    updatePageTokens(activePage.id, newTokens);
    setItemContextMenu(null);
    setSelectedPath(null);
  }, [activePage, itemContextMenu, updatePageTokens]);

  // Handle start rename from context menu
  const handleStartRenameFromMenu = useCallback(() => {
    if (!itemContextMenu) return;
    setEditingPath(itemContextMenu.path.join('.'));
    setItemContextMenu(null);
  }, [itemContextMenu]);

  // Count inherited vs own tokens
  const ownCount = effectiveTokens.filter(t => !t.isInherited && isDesignToken(t.value)).length;
  const inheritedCount = effectiveTokens.filter(t => t.isInherited && isDesignToken(t.value)).length;

  if (!activePage) {
    return (
      <div className="p-3 text-sm text-gray-500">
        Select a page to view tokens
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-[10px] text-gray-500 uppercase font-medium mb-1">Tokens</div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>{ownCount} defined</span>
          {inheritedCount > 0 && (
            <>
              <span>·</span>
              <span>{inheritedCount} inherited</span>
            </>
          )}
        </div>
      </div>

      {/* Token tree */}
      <div
        className="flex-1 overflow-auto py-1"
        onContextMenu={(e) => handleContextMenu(e, [])}
        onClick={() => {
          setContextMenu(null);
          setItemContextMenu(null);
        }}
      >
        {rootItems.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">
            No tokens defined yet
            <div className="mt-2 text-[10px] text-gray-400">
              Right-click to create a token
            </div>
          </div>
        ) : (
          rootItems.map((item) => (
            <TokenTreeItem
              key={item.path.join('.')}
              path={item.path}
              tokens={effectiveTokens}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
              onSelectToken={handleSelectToken}
              onGoToSource={handleGoToSource}
              selectedPath={selectedPath}
              editingPath={editingPath}
              onStartEdit={handleStartEdit}
              onRename={handleRename}
              onCancelEdit={handleCancelEdit}
              onItemContextMenu={handleItemContextMenu}
            />
          ))
        )}
      </div>

      {/* Context Menu for empty area */}
      {contextMenu && (
        <NewTokenMenu
          position={contextMenu.position}
          parentPath={contextMenu.parentPath}
          onClose={() => setContextMenu(null)}
          onTokenCreated={handleTokenCreated}
        />
      )}

      {/* Context Menu for tokens/groups */}
      {itemContextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
          style={{ left: itemContextMenu.position.x, top: itemContextMenu.position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename - only for non-inherited */}
          {!itemContextMenu.isInherited && (
            <button
              onClick={handleStartRenameFromMenu}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
          )}

          {/* Duplicate - only for non-inherited */}
          {!itemContextMenu.isInherited && (
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
          )}

          {/* Add Token (for groups) */}
          {itemContextMenu.isGroup && !itemContextMenu.isInherited && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() => {
                  setContextMenu({
                    position: itemContextMenu.position,
                    parentPath: itemContextMenu.path,
                  });
                  setItemContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" />
                Add Token
              </button>
              <button
                onClick={() => {
                  // Create a new group inside this group
                  if (!activePage) return;
                  const baseName = 'new-group';
                  let name = baseName;
                  let counter = 1;

                  const getAtPath = (obj: Record<string, unknown>, p: string[]): unknown => {
                    let current: unknown = obj;
                    for (const key of p) {
                      if (current && typeof current === 'object' && key in current) {
                        current = (current as Record<string, unknown>)[key];
                      } else {
                        return undefined;
                      }
                    }
                    return current;
                  };

                  while (getAtPath(activePage.tokens as Record<string, unknown>, [...itemContextMenu.path, name]) !== undefined) {
                    name = `${baseName}-${counter}`;
                    counter++;
                  }

                  const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
                  let parent: Record<string, unknown> = newTokens;
                  for (const key of itemContextMenu.path) {
                    parent = parent[key] as Record<string, unknown>;
                  }
                  parent[name] = {};

                  updatePageTokens(activePage.id, newTokens);
                  setItemContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderPlus className="w-4 h-4" />
                Add Group
              </button>
            </>
          )}

          {/* Delete - only for non-inherited */}
          {!itemContextMenu.isInherited && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}

          {/* Info for inherited items */}
          {itemContextMenu.isInherited && (
            <div className="px-3 py-2 text-xs text-gray-500 italic">
              Inherited token - edit in source layer
            </div>
          )}
        </div>
      )}
    </div>
  );
}
