'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Figma, ExternalLink, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFigmaStore } from '@/stores/figmaStore';
import type { FigmaComponentNodeData } from '@/types/flow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FigmaComponentNode = memo(function FigmaComponentNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { selectComponent, selectedComponentId } = useFigmaStore();

  const isSelected = selected || selectedComponentId === data.componentId;

  const handleClick = useCallback(() => {
    selectComponent(data.componentId);
  }, [selectComponent, data.componentId]);

  // Count unique properties
  const propertyCount = data.properties?.length || 0;

  return (
    <div
      className={cn(
        'relative rounded-xl shadow-lg border-2 transition-all duration-200',
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200',
        'bg-white dark:bg-gray-800'
      )}
      onClick={handleClick}
      style={{ width: Math.max(200, Math.min(data.width / 2, 400)) }}
    >
      {/* Multiple handles around the component for token connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-white"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Figma className="w-4 h-4 text-purple-500" />
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
          {data.name}
        </span>
        <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
          {data.width} × {data.height}
        </span>
      </div>

      {/* Component preview */}
      <div className="p-4">
        {data.thumbnailUrl ? (
          <div className="relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
            <img
              src={data.thumbnailUrl}
              alt={data.name}
              className="w-full h-auto object-contain"
              style={{ maxHeight: 200 }}
            />
          </div>
        ) : (
          <div className="h-32 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Layers className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            {data.properties?.filter((p: { propertyType: string }) => p.propertyType === 'fill').length || 0} fills
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            {data.properties?.filter((p: { propertyType: string }) => p.propertyType === 'text').length || 0} text
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            {data.properties?.filter((p: { propertyType: string }) => p.propertyType === 'spacing').length || 0} spacing
          </span>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {data.description}
          </p>
        </div>
      )}
    </div>
  );
});

export default FigmaComponentNode;
