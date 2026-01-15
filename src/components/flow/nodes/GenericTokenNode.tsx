'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Link2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import type { GenericTokenNodeData } from '@/types/flow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GenericTokenNode = memo(function GenericTokenNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { selectToken, selectedTokenPath } = useTokenStore();

  const isSelected = selected || (selectedTokenPath?.join('.') === data.path?.join('.'));

  const handleClick = useCallback(() => {
    selectToken(data.path);
  }, [selectToken, data.path]);

  // Format value for display (compact)
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.length}]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  };

  const displayValue = formatValue(data.value);

  // Get background color based on type
  const getTypeBg = () => {
    switch (data.type) {
      case 'number':
        return 'bg-emerald-50 dark:bg-emerald-900/30';
      case 'fontFamily':
      case 'fontWeight':
        return 'bg-purple-50 dark:bg-purple-900/30';
      case 'duration':
        return 'bg-amber-50 dark:bg-amber-900/30';
      case 'cubicBezier':
        return 'bg-cyan-50 dark:bg-cyan-900/30';
      case 'border':
        return 'bg-orange-50 dark:bg-orange-900/30';
      case 'transition':
        return 'bg-teal-50 dark:bg-teal-900/30';
      case 'gradient':
        return 'bg-rose-50 dark:bg-rose-900/30';
      default:
        return 'bg-gray-50 dark:bg-gray-700';
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'number':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'fontFamily':
      case 'fontWeight':
        return 'text-purple-600 dark:text-purple-400';
      case 'duration':
        return 'text-amber-600 dark:text-amber-400';
      case 'cubicBezier':
        return 'text-cyan-600 dark:text-cyan-400';
      case 'border':
        return 'text-orange-600 dark:text-orange-400';
      case 'transition':
        return 'text-teal-600 dark:text-teal-400';
      case 'gradient':
        return 'text-rose-600 dark:text-rose-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Schema-only mode: show multi-value indicator instead of editable value
  if (data.isSchemaOnly) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md border-2 border-dashed transition-all duration-150',
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        )}
        onClick={handleClick}
      >
        {/* Left handle */}
        <Handle
          type="target"
          id="left"
          position={Position.Left}
          className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-left-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
        />

        {/* Multi-value indicator */}
        <div className="w-6 h-6 rounded border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
          <GitBranch className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </div>

        {/* Name and value count */}
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
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {data.name}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {data.childValueCount || 0} values
          </span>
        </div>

        {/* Right handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-right-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all duration-150',
        data.isExtended
          ? isSelected
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
            : 'border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-900/10 hover:border-teal-500'
          : isSelected
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

      {/* Type icon */}
      <div className={cn('w-6 h-6 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0 flex items-center justify-center', getTypeBg())}>
        <Box className={cn('w-3 h-3', getTypeColor())} />
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
            {displayValue}
          </span>
        )}
        {/* Extension badge */}
        {data.isExtended && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">
            +
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

export default GenericTokenNode;
