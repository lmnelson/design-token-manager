'use client';

import React, { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Layers, ChevronDown, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayerContainerData {
  layerName: string;
  variableValues?: Record<string, string>;
  tokenCount: number;
  layerOrder: number;
  isActive?: boolean;
  width?: number;
  height?: number;
  // For variant dropdown
  availableSlots?: Record<string, string>[];
  onSlotChange?: (slot: Record<string, string>) => void;
}

// Color palette for layer backgrounds
const LAYER_COLORS = [
  { bg: 'bg-blue-50/50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', header: 'bg-blue-100/80 dark:bg-blue-900/50', accent: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-purple-50/50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', header: 'bg-purple-100/80 dark:bg-purple-900/50', accent: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-emerald-50/50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', header: 'bg-emerald-100/80 dark:bg-emerald-900/50', accent: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-50/50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', header: 'bg-amber-100/80 dark:bg-amber-900/50', accent: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-50/50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', header: 'bg-rose-100/80 dark:bg-rose-900/50', accent: 'text-rose-600 dark:text-rose-400' },
];

// Format variable values for display
function formatSlotName(values: Record<string, string>): string {
  const entries = Object.values(values);
  if (entries.length === 0) return '';
  return entries.join(' / ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LayerContainerNode = memo(function LayerContainerNode(props: NodeProps<any>) {
  const { selected } = props;
  const data = props.data as LayerContainerData;
  const colorIndex = (data.layerOrder || 0) % LAYER_COLORS.length;
  const colors = LAYER_COLORS[colorIndex];

  const hasVariants = data.availableSlots && data.availableSlots.length > 1;
  const variableDisplay = data.variableValues && Object.keys(data.variableValues).length > 0
    ? formatSlotName(data.variableValues)
    : null;

  const handleSlotChange = (slot: Record<string, string>) => {
    if (data.onSlotChange) {
      data.onSlotChange(slot);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all duration-150 min-w-[280px]',
        colors.bg,
        colors.border,
        selected && 'ring-2 ring-blue-500 ring-offset-2',
        data.isActive && 'ring-2 ring-amber-400'
      )}
      style={{
        width: data.width || 300,
        height: data.height || 400,
      }}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-md border-b',
          colors.header,
          colors.border
        )}
      >
        <Layers className={cn('w-4 h-4', colors.accent)} />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {data.layerName}
        </span>

        {/* Variant dropdown or static display */}
        {variableDisplay && (
          <>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            {hasVariants ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                    'bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40',
                    'transition-colors cursor-pointer',
                    colors.accent
                  )}>
                    <GitBranch className="w-3 h-3" />
                    {variableDisplay}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {data.availableSlots?.map((slot, index) => {
                    const isActive = data.variableValues && Object.keys(slot).every(
                      k => data.variableValues?.[k] === slot[k]
                    );
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleSlotChange(slot)}
                        className={cn(isActive && 'bg-blue-50 dark:bg-blue-900/20')}
                      >
                        {formatSlotName(slot)}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className={cn('flex items-center gap-1 text-xs font-medium', colors.accent)}>
                <GitBranch className="w-3 h-3" />
                {variableDisplay}
              </div>
            )}
          </>
        )}

        <span className="ml-auto text-[10px] text-gray-500 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
          {data.tokenCount} tokens
        </span>
      </div>

      {/* Content area - tokens will be positioned inside this via React Flow */}
      <div className="p-2 h-[calc(100%-40px)] overflow-hidden">
        {/* Child nodes are rendered by React Flow, not here */}
      </div>
    </div>
  );
});

export default LayerContainerNode;
