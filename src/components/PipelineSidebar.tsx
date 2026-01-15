'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Files,
  Database,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import { formatSlotName, PIPELINE_TEMPLATES } from '@/types/pipeline';
import type { PipelineLayer } from '@/types/pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { TokenListPanel } from './TokenListPanel';
import { PipelineEditor } from './PipelineEditor';

interface LayerItemProps {
  layer: PipelineLayer;
  isExpanded: boolean;
  onToggle: () => void;
}

function LayerItem({ layer, isExpanded, onToggle }: LayerItemProps) {
  const {
    pipeline,
    pages,
    activePageId,
    viewContext,
    getLayerSlots,
    getOrCreatePage,
    setActivePage,
    setViewContext,
    removeLayer,
  } = usePipelineStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const slots = getLayerSlots(layer);
  const hasSlots = slots.length > 1 || (slots.length === 1 && Object.keys(slots[0]).length > 0);

  // For static layers (no variables), get the single page directly
  const staticPage = !hasSlots
    ? pages.find(p => p.layerId === layer.id && Object.keys(p.variableValues).length === 0)
    : null;

  // Check if this layer's schema view is active
  const isSchemaViewActive = viewContext?.layerId === layer.id && viewContext?.isSchemaView;

  const handleLayerHeaderClick = useCallback(() => {
    if (!hasSlots) {
      // Static layer - go directly to its page
      const page = getOrCreatePage(layer.id, {});
      setActivePage(page.id);
      setViewContext({ layerId: layer.id, isSchemaView: false, variableValues: {} });
    } else {
      // Layer with variables - show schema view (keys only)
      // Set the first (default) slot as active for inheritance computation
      const defaultSlot = slots[0] || {};
      const defaultPage = getOrCreatePage(layer.id, defaultSlot);
      setActivePage(defaultPage.id);
      setViewContext({ layerId: layer.id, isSchemaView: true, variableValues: defaultSlot });
    }
  }, [hasSlots, layer.id, slots, getOrCreatePage, setActivePage, setViewContext]);

  const handleExpandToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  const handleSlotClick = useCallback((slot: Record<string, string>) => {
    const page = getOrCreatePage(layer.id, slot);
    setActivePage(page.id);
    setViewContext({ layerId: layer.id, isSchemaView: false, variableValues: slot });
  }, [layer.id, getOrCreatePage, setActivePage, setViewContext]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDeleteLayer = useCallback(() => {
    if (confirm(`Delete layer "${layer.name}"? This will remove all tokens in this layer.`)) {
      removeLayer(layer.id);
    }
    setContextMenu(null);
  }, [layer.id, layer.name, removeLayer]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const isStaticLayerActive = staticPage && staticPage.id === activePageId;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 relative">
      {/* Layer Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
          (isSchemaViewActive || (!hasSlots && isStaticLayerActive)) && 'bg-blue-50 dark:bg-blue-900/20'
        )}
        onClick={handleLayerHeaderClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/collapse chevron for layers with slots */}
        {hasSlots && (
          <span
            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            onClick={handleExpandToggle}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </span>
        )}

        {/* Layer type icon */}
        <span className="w-4 h-4 flex items-center justify-center">
          {hasSlots ? (
            <Files className="w-3 h-3 text-gray-400" />
          ) : (
            <FileText className="w-3 h-3 text-gray-400" />
          )}
        </span>

        {/* Layer name */}
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {layer.name}
        </span>

        {/* Schema indicator for layers with variables */}
        {hasSlots && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            {slots.length} variants
          </span>
        )}

        {/* Required indicator */}
        {!layer.required && (
          <span className="text-[9px] text-gray-400 italic">optional</span>
        )}
      </div>

      {/* Child slots (pages) for this layer */}
      {hasSlots && isExpanded && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30">
          {slots.map((slot, index) => {
            const slotName = formatSlotName(slot);
            const page = pages.find(p =>
              p.layerId === layer.id &&
              Object.keys(slot).every(k => p.variableValues[k] === slot[k]) &&
              Object.keys(p.variableValues).length === Object.keys(slot).length
            );
            const isActive = viewContext?.layerId === layer.id &&
              !viewContext?.isSchemaView &&
              viewContext?.variableValues &&
              Object.keys(slot).every(k => viewContext.variableValues?.[k] === slot[k]);
            const isDefault = index === 0;

            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 pl-7 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  isActive && 'bg-blue-100 dark:bg-blue-900/30'
                )}
                onClick={() => handleSlotClick(slot)}
              >
                {/* Key-value icon for child pages */}
                <Database className="w-3 h-3 text-gray-400" />

                {/* Slot name */}
                <span className={cn(
                  'flex-1 text-sm',
                  isActive
                    ? 'text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {slotName}
                </span>

                {/* DEFAULT badge for first child */}
                {isDefault && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                    DEFAULT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDeleteLayer}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            Delete Layer
          </button>
        </div>
      )}
    </div>
  );
}

export function PipelineSidebar() {
  const { pipeline, activePageId, pages, getActivePage, viewContext, addLayer, createFromTemplate } = usePipelineStore();
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [addLayerOpen, setAddLayerOpen] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const newLayerInputRef = useRef<HTMLInputElement>(null);

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when popover opens
  useEffect(() => {
    if (addLayerOpen && newLayerInputRef.current) {
      newLayerInputRef.current.focus();
    }
  }, [addLayerOpen]);

  const handleAddLayerSubmit = useCallback(() => {
    if (newLayerName.trim()) {
      addLayer({
        name: newLayerName.trim(),
        variables: [],
        required: true,
      });
      setNewLayerName('');
      setAddLayerOpen(false);
    }
  }, [addLayer, newLayerName]);

  const handleAddLayerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLayerSubmit();
    } else if (e.key === 'Escape') {
      setNewLayerName('');
      setAddLayerOpen(false);
    }
  }, [handleAddLayerSubmit]);

  const toggleLayer = useCallback((layerId: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  // Sort layers by order (bottom wins, so higher order = lower in list visually, but we show top-to-bottom)
  const sortedLayers = [...pipeline.layers].sort((a, b) => a.order - b.order);

  const activePage = getActivePage();

  // Show loading skeleton until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Layers header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Layers
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Add Layer button with popover */}
            <Popover open={addLayerOpen} onOpenChange={setAddLayerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Add layer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start" side="bottom">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Layer Name
                  </label>
                  <Input
                    ref={newLayerInputRef}
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    onKeyDown={handleAddLayerKeyDown}
                    placeholder="Enter layer name..."
                    className="h-8 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setNewLayerName('');
                        setAddLayerOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAddLayerSubmit}
                      disabled={!newLayerName.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Pipeline settings">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditorOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Pipeline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Layers className="w-4 h-4 mr-2" />
                    Load Template
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {PIPELINE_TEMPLATES.map((template, index) => (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => createFromTemplate(index)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-gray-500">{template.description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Layers */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {sortedLayers.map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isExpanded={expandedLayers.has(layer.id)}
            onToggle={() => toggleLayer(layer.id)}
          />
        ))}
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-auto">
        <TokenListPanel />
      </div>

      {/* Active view info */}
      {viewContext && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-[10px] text-gray-500 uppercase font-medium mb-1">
            {viewContext.isSchemaView ? 'Viewing Schema' : 'Editing'}
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            {viewContext.isSchemaView ? (
              <>
                <Files className="w-3 h-3 text-gray-400" />
                {pipeline.layers.find(l => l.id === viewContext.layerId)?.name || 'Layer'}
                <span className="text-xs text-gray-500">(keys only)</span>
              </>
            ) : (
              <>
                <Database className="w-3 h-3 text-gray-400" />
                {activePage?.tokens.$name || 'Untitled Page'}
              </>
            )}
          </div>
          {!viewContext.isSchemaView && viewContext.variableValues && Object.keys(viewContext.variableValues).length > 0 && (
            <div className="text-xs text-gray-500 mt-0.5">
              {Object.entries(viewContext.variableValues).map(([k, v]) => `${k}: ${v}`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Pipeline Editor Dialog */}
      <PipelineEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}
