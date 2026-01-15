'use client';

import React, { useCallback, useState, DragEvent } from 'react';
import {
  FileStack,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import { DEFAULT_PAGE_TEMPLATES } from '@/types/tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface PageItemProps {
  page: { id: string; name: string; description?: string };
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (index: number) => void;
  draggedIndex: number | null;
}

function PageItem({
  page,
  index,
  isActive,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  draggedIndex,
}: PageItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(index);
    },
    [index, onDragStart]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (draggedIndex !== null && draggedIndex !== index) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
        onDragOver(e, index);
      }
    },
    [draggedIndex, index, onDragOver]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      onDrop(index);
    },
    [index, onDrop]
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onSelect}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors group',
            isActive
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700',
            isDragOver && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset'
          )}
        >
          <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="flex-1 text-sm truncate">{page.name}</span>
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={onDelete}
          className="text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Page
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function PageList() {
  const {
    pages,
    activePageId,
    addPage,
    addPageFromTemplate,
    removePage,
    setActivePage,
    reorderPages,
  } = useTokenStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddPage = useCallback(() => {
    const name = prompt('Enter page name:');
    if (name) {
      addPage(name);
    }
  }, [addPage]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) {
        alert('Cannot delete the last page');
        return;
      }
      if (confirm('Are you sure you want to delete this page?')) {
        removePage(pageId);
      }
    },
    [pages.length, removePage]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    // Just for visual feedback
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        reorderPages(draggedIndex, toIndex);
      }
      setDraggedIndex(null);
    },
    [draggedIndex, reorderPages]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Layers className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            Pages
          </h2>
          <span className="text-xs text-gray-400">({pages.length})</span>
        </div>

        {/* Add Page Button */}
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleAddPage}>
              <FileText className="w-4 h-4 mr-2" />
              New Empty Page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-gray-500 font-medium">
              From Template
            </div>
            {DEFAULT_PAGE_TEMPLATES.map((template, index) => (
              <DropdownMenuItem
                key={template.name}
                onClick={() => addPageFromTemplate(index)}
              >
                <FileStack className="w-4 h-4 mr-2" />
                {template.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Page List */}
      {isExpanded && (
        <div
          className="px-2 pb-2 space-y-0.5"
          onDragEnd={handleDragEnd}
        >
          {/* Stack visualization - pages ordered from bottom to top */}
          <div className="text-[10px] text-gray-400 px-2 mb-1 flex items-center justify-between">
            <span>↑ Higher = Overrides lower</span>
          </div>
          {/* Render pages in reverse order (top of stack at top) */}
          {[...pages].reverse().map((page, reversedIndex) => {
            const actualIndex = pages.length - 1 - reversedIndex;
            return (
              <PageItem
                key={page.id}
                page={page}
                index={actualIndex}
                isActive={page.id === activePageId}
                onSelect={() => setActivePage(page.id)}
                onDelete={() => handleDeletePage(page.id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggedIndex={draggedIndex}
              />
            );
          })}
          <div className="text-[10px] text-gray-400 px-2 mt-1">
            ↓ Base layer
          </div>
        </div>
      )}
    </div>
  );
}
