'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Files,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import { formatSlotName } from '@/types/pipeline';
import type { PipelineLayer } from '@/types/pipeline';
import { TokenListPanel } from './TokenListPanel';

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
  } = usePipelineStore();

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

  const isStaticLayerActive = staticPage && staticPage.id === activePageId;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      {/* Layer Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
          (isSchemaViewActive || (!hasSlots && isStaticLayerActive)) && 'bg-blue-50 dark:bg-blue-900/20'
        )}
        onClick={handleLayerHeaderClick}
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
            <Files className="w-3 h-3 text-indigo-500" />
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
    </div>
  );
}

export function PipelineSidebar() {
  const { pipeline, activePageId, pages, getActivePage, viewContext } = usePipelineStore();
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            Layers
          </h2>
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
                <Files className="w-3 h-3 text-indigo-500" />
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
    </div>
  );
}
