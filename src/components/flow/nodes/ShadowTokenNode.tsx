'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import type { ShadowTokenNodeData } from '@/types/flow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ShadowTokenNode = memo(function ShadowTokenNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { selectToken, selectedTokenPath } = useTokenStore();

  const isSelected = selected || (selectedTokenPath?.join('.') === data.path?.join('.'));

  const handleClick = useCallback(() => {
    selectToken(data.path);
  }, [selectToken, data.path]);

  // Generate CSS box-shadow string for preview
  const shadows = data.shadows || [];
  const shadowCss = shadows
    .map((s: { inset?: boolean; offsetX: number; offsetY: number; blur: number; spread: number; color: string }) => {
      const inset = s.inset ? 'inset ' : '';
      return `${inset}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`;
    })
    .join(', ') || '0 1px 3px rgba(0,0,0,0.12)';

  const layerCount = shadows.length;

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

      {/* Shadow preview */}
      <div className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
        <div
          className="w-4 h-4 bg-white dark:bg-gray-600 rounded-sm"
          style={{ boxShadow: shadowCss }}
        />
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
          <span className="text-[10px] text-gray-500 font-mono">
            {layerCount} layer{layerCount !== 1 ? 's' : ''}
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

export default ShadowTokenNode;
