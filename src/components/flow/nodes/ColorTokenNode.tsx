'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Link2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ColorTokenNode = memo(function ColorTokenNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { getActivePage, updatePageTokens } = usePipelineStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.value);

  const isSelected = selected;

  const handleColorChange = useCallback(
    (newValue: string) => {
      const activePage = getActivePage();
      if (!activePage) return;

      setEditValue(newValue);

      // Deep clone and update the tokens
      const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
      let current = newTokens;
      for (let i = 0; i < data.path.length - 1; i++) {
        if (!current[data.path[i]]) current[data.path[i]] = {};
        current = current[data.path[i]];
      }
      current[data.path[data.path.length - 1]] = {
        $value: newValue,
        $type: 'color',
        $description: data.description,
      };
      updatePageTokens(activePage.id, newTokens);
    },
    [getActivePage, updatePageTokens, data.path, data.description]
  );

  // Schema-only mode: show multi-value indicator instead of editable color
  if (data.isSchemaOnly) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md border-2 border-dashed transition-all duration-150',
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        {/* Left handle */}
        <Handle
          type="target"
          id="left"
          position={Position.Left}
          className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-left-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
        />

        {/* Multi-value indicator instead of color swatch */}
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
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
    >
      {/* Left handle for receiving alias connections */}
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-left-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
      />

      {/* Color swatch - use resolvedValue for visual display (handles aliases) */}
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <button
            className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 flex-shrink-0 shadow-sm"
            style={{ backgroundColor: typeof data.resolvedValue === 'string' ? data.resolvedValue : (typeof data.value === 'string' ? data.value : '#808080') }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={typeof editValue === 'string' && editValue.startsWith('#') ? editValue : '#000000'}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
              <Input
                value={typeof editValue === 'string' ? editValue : ''}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs h-8"
              />
            </div>
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
          <span className="text-[10px] text-gray-500 font-mono truncate">
            {typeof data.value === 'string' ? data.value : JSON.stringify(data.value)}
          </span>
        )}
        {/* Extension badge */}
        {data.isExtended && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">
            +
          </span>
        )}
      </div>

      {/* Right handle for creating alias connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-right-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

export default ColorTokenNode;
