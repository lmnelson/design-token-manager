'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import type { TypographyTokenNodeData } from '@/types/flow';

// Helper to extract numeric value from dimension object or direct value
function extractValue(val: unknown, defaultVal: number = 0): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return (val as { value: number }).value;
  }
  return defaultVal;
}

function extractUnit(val: unknown, defaultUnit: string = 'px'): string {
  if (typeof val === 'object' && val !== null && 'unit' in val) {
    return (val as { unit: string }).unit;
  }
  return defaultUnit;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TypographyTokenNode = memo(function TypographyTokenNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { selectToken, selectedTokenPath } = useTokenStore();

  const isSelected = selected || (selectedTokenPath?.join('.') === data.path?.join('.'));

  const handleClick = useCallback(() => {
    selectToken(data.path);
  }, [selectToken, data.path]);

  // Extract values - handle both direct values and {value, unit} objects
  const rawValue = data.value;

  const fontFamily = rawValue?.fontFamily || data.fontFamily || 'sans-serif';
  const fontSize = extractValue(rawValue?.fontSize || data.fontSize, 16);
  const fontSizeUnit = extractUnit(rawValue?.fontSize || data.fontSize, data.fontSizeUnit || 'px');
  const fontWeight = extractValue(rawValue?.fontWeight || data.fontWeight, 400);

  // Format display
  const fontSizeDisplay = `${fontSize}${fontSizeUnit}`;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all duration-150',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
      )}
      onClick={handleClick}
    >
      {/* Left handle for hierarchy and alias connections */}
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-left-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
      />

      {/* Typography preview icon */}
      <div
        className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0 flex items-center justify-center bg-purple-50 dark:bg-purple-900/30"
      >
        <span
          className="text-purple-600 dark:text-purple-400 text-xs font-bold"
          style={{
            fontFamily: fontFamily,
            fontWeight: Math.min(fontWeight, 700),
          }}
        >
          Aa
        </span>
      </div>

      {/* Name and value */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Tier badge */}
        {data.tier && (
          <span className={cn(
            'text-[8px] px-1 py-0.5 rounded font-medium uppercase tracking-wide',
            data.tier === 'primitive' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            data.tier === 'semantic' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            data.tier === 'component' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          )}>
            {data.tier.slice(0, 3)}
          </span>
        )}
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
          {data.name}
        </span>
        {data.isAlias ? (
          <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-mono truncate">
            <Link2 className="w-2.5 h-2.5" />
            {data.aliasPath?.slice(-1)[0]}
          </span>
        ) : (
          <span className="text-[10px] text-gray-500 font-mono truncate">
            {fontSizeDisplay} / {fontWeight}
          </span>
        )}
      </div>

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-right-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

export default TypographyTokenNode;
