'use client';

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import type { SpacingTokenNodeData } from '@/types/flow';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SpacingTokenNode = memo(function SpacingTokenNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { selectToken, updateToken, selectedTokenPath } = useTokenStore();

  // Extract numeric value - handle both direct number and {value, unit} object
  const rawValue = data.value;
  const numericValue = typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
    ? rawValue.value
    : (typeof rawValue === 'number' ? rawValue : 0);
  const unitValue = typeof rawValue === 'object' && rawValue !== null && 'unit' in rawValue
    ? rawValue.unit
    : (data.unit || 'px');

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(numericValue);
  const [editUnit, setEditUnit] = useState(unitValue);

  const isSelected = selected || (selectedTokenPath?.join('.') === data.path?.join('.'));

  const handleClick = useCallback(() => {
    selectToken(data.path);
  }, [selectToken, data.path]);

  const handleSave = useCallback(() => {
    updateToken(data.path, {
      $value: { value: editValue, unit: editUnit },
      $type: 'dimension',
      $description: data.description,
    });
    setIsEditing(false);
  }, [updateToken, data.path, editValue, editUnit, data.description]);

  // Visual bar width (max 24px for inline display)
  const barWidth = Math.min(Math.max(numericValue / 2, 4), 24);

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

      {/* Spacing indicator */}
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <button className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
            <div
              className="bg-blue-500 rounded-sm"
              style={{ width: barWidth, height: barWidth }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Value</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(Number(e.target.value))}
                className="font-mono text-xs h-8"
                min={0}
              />
              <select
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs h-8"
              >
                <option value="px">px</option>
                <option value="rem">rem</option>
                <option value="em">em</option>
                <option value="%">%</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              className="w-full px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </PopoverContent>
      </Popover>

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
            {numericValue}{unitValue}
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

export default SpacingTokenNode;
