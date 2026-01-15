'use client';

import React, { useCallback, useState, DragEvent } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Palette,
  Type,
  Ruler,
  Layers,
  Box,
  Folder,
  FolderOpen,
  Trash2,
  Copy,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore, FlattenedTokenWithSource } from '@/stores/tokenStore';
import type { DesignTokenFile, TokenGroup, TokenType } from '@/types/tokens';
import { isDesignToken, isTokenGroup } from '@/types/tokens';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { PageList } from './PageList';

interface TokenTreeItemProps {
  name: string;
  path: string[];
  value: unknown;
  inheritedType?: TokenType;
  level: number;
  onDragStart?: (path: string[]) => void;
  onDrop?: (targetPath: string[]) => void;
  draggedPath: string[] | null;
  isInherited?: boolean; // Token is from a parent page
}

function TokenTreeItem({ name, path, value, inheritedType, level, onDragStart, onDrop, draggedPath, isInherited = false }: TokenTreeItemProps) {
  const {
    selectToken,
    selectedTokenPath,
    toggleGroup,
    expandedGroups,
    deleteToken,
    deleteGroup,
    pages,
    activePageId,
    setActivePage,
    flattenedTokens,
  } = useTokenStore();

  const [isDragOver, setIsDragOver] = useState(false);

  const pathString = path.join('.');
  const isSelected = selectedTokenPath?.join('.') === pathString;
  const isExpanded = expandedGroups.has(pathString);
  const isToken = isDesignToken(value);
  const isGroup = isTokenGroup(value);

  // Check if this specific path is inherited
  const tokenInfo = flattenedTokens.find(t => t.path.join('.') === pathString);
  const tokenIsInherited = tokenInfo ? tokenInfo.isInherited : isInherited;
  const sourcePageId = tokenInfo?.sourcePageId;
  const sourcePage = sourcePageId ? pages.find(p => p.id === sourcePageId) : null;

  const tokenType = isToken ? (value.$type || inheritedType) : undefined;
  const groupType = isGroup ? (value.$type || inheritedType) : undefined;

  const handleClick = useCallback(() => {
    if (isGroup) {
      toggleGroup(pathString);
    }
    selectToken(path);
  }, [isGroup, toggleGroup, pathString, selectToken, path]);

  const handleDelete = useCallback(() => {
    if (tokenIsInherited) {
      alert(`This token is defined in "${sourcePage?.name || 'another page'}". Switch to that page to edit it.`);
      return;
    }
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      if (isToken) {
        deleteToken(path);
      } else if (isGroup) {
        deleteGroup(path);
      }
    }
  }, [isToken, isGroup, deleteToken, deleteGroup, path, name, tokenIsInherited, sourcePage]);

  const handleGoToSource = useCallback(() => {
    if (sourcePageId) {
      setActivePage(sourcePageId);
    }
  }, [sourcePageId, setActivePage]);

  const getIcon = () => {
    if (isGroup) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-amber-500" />
      ) : (
        <Folder className="w-4 h-4 text-amber-500" />
      );
    }

    switch (tokenType) {
      case 'color':
        return <Palette className="w-4 h-4 text-pink-500" />;
      case 'typography':
        return <Type className="w-4 h-4 text-purple-500" />;
      case 'dimension':
        return <Ruler className="w-4 h-4 text-blue-500" />;
      case 'shadow':
        return <Layers className="w-4 h-4 text-gray-500" />;
      default:
        return <Box className="w-4 h-4 text-gray-400" />;
    }
  };

  const getValuePreview = () => {
    if (!isToken) return null;

    const tokenValue = value.$value;

    if (tokenType === 'color' && typeof tokenValue === 'string') {
      return (
        <div
          className="w-4 h-4 rounded border border-gray-200"
          style={{ backgroundColor: tokenValue }}
        />
      );
    }

    if (typeof tokenValue === 'object' && tokenValue !== null) {
      if ('value' in tokenValue && 'unit' in tokenValue) {
        return (
          <span className="text-xs text-gray-500 font-mono">
            {(tokenValue as { value: number; unit: string }).value}
            {(tokenValue as { value: number; unit: string }).unit}
          </span>
        );
      }
    }

    if (typeof tokenValue === 'string' && tokenValue.startsWith('{')) {
      return (
        <span className="text-xs text-indigo-500 font-mono truncate max-w-[100px]">
          {tokenValue}
        </span>
      );
    }

    return null;
  };

  // Get children if it's a group
  const children = isGroup
    ? Object.entries(value).filter(([key]) => !key.startsWith('$'))
    : [];

  // Drag handlers for tokens
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (isToken && onDragStart) {
      e.dataTransfer.setData('text/plain', path.join('.'));
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(path);
    }
  }, [isToken, path, onDragStart]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (isGroup && draggedPath && draggedPath.join('.') !== path.join('.')) {
      // Don't allow dropping into own children
      const draggedPathStr = draggedPath.join('.');
      const targetPathStr = path.join('.');
      if (!targetPathStr.startsWith(draggedPathStr)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }
    }
  }, [isGroup, draggedPath, path]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isGroup && onDrop) {
      onDrop(path);
    }
  }, [isGroup, onDrop, path]);

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-colors group',
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700',
              isDragOver && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={handleClick}
            draggable={isToken}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            title={tokenIsInherited ? `Inherited from "${sourcePage?.name}"` : undefined}
          >
            {/* Drag handle for tokens */}
            {isToken && (
              <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
            )}

            {isGroup && (
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </span>
            )}
            {!isGroup && !isToken && <span className="w-4 flex-shrink-0" />}

            {getIcon()}

            <span className={cn(
              "flex-1 text-sm truncate",
              tokenIsInherited && "italic"
            )}>{name}</span>

            {getValuePreview()}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {tokenIsInherited ? (
            <>
              <ContextMenuItem onClick={handleGoToSource}>
                <Layers className="w-4 h-4 mr-2" />
                Go to Source ({sourcePage?.name})
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(pathString);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Path
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(pathString);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Path
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {isGroup && isExpanded && (
        <div>
          {children.map(([childName, childValue]) => (
            <TokenTreeItem
              key={childName}
              name={childName}
              path={[...path, childName]}
              value={childValue}
              inheritedType={groupType}
              level={level + 1}
              onDragStart={onDragStart}
              onDrop={onDrop}
              draggedPath={draggedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TokenSidebar() {
  const { tokenFile, expandAll, collapseAll, moveToken, pages, activePageId } = useTokenStore();
  const [draggedPath, setDraggedPath] = useState<string[] | null>(null);

  // Find active page info
  const activePage = pages.find(p => p.id === activePageId);

  // Handle drag start
  const handleDragStart = useCallback((path: string[]) => {
    setDraggedPath(path);
  }, []);

  // Handle drop on a group
  const handleDrop = useCallback((targetGroupPath: string[]) => {
    if (draggedPath) {
      moveToken(draggedPath, targetGroupPath);
      setDraggedPath(null);
    }
  }, [draggedPath, moveToken]);

  // Get top-level items (excluding $ properties)
  const topLevelItems = Object.entries(tokenFile).filter(
    ([key]) => !key.startsWith('$')
  );

  return (
    <div className="h-full flex flex-col">
      {/* Page List */}
      <PageList />

      {/* Token Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Tokens
            </h2>
            {activePage && (
              <p className="text-xs text-gray-500">
                Editing: {activePage.name}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-auto py-2"
        onDragEnd={() => setDraggedPath(null)}
      >
        {topLevelItems.map(([name, value]) => (
          <TokenTreeItem
            key={name}
            name={name}
            path={[name]}
            value={value}
            level={0}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            draggedPath={draggedPath}
          />
        ))}

        {topLevelItems.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No tokens yet. Click "Add Token" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
