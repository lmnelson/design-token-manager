'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExpandedGroups } from '@/contexts/ExpandedGroupsContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TokenGroupNode = memo(function TokenGroupNode(props: NodeProps<any>) {
  const { data, selected } = props;
  const { isExpanded: checkExpanded, toggleGroup } = useExpandedGroups();

  const pathString = data.path?.join('.') || '';
  const isExpanded = checkExpanded(pathString);
  const isSelected = selected;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleGroup(pathString);
    },
    [toggleGroup, pathString]
  );

  const handleClick = useCallback(() => {
    // Toggle expand/collapse on click
    toggleGroup(pathString);
  }, [toggleGroup, pathString]);

  // Get folder color based on inherited type
  const getFolderColor = () => {
    switch (data.inheritedType) {
      case 'color':
        return 'text-pink-500';
      case 'typography':
        return 'text-purple-500';
      case 'dimension':
        return 'text-blue-500';
      case 'shadow':
        return 'text-gray-500';
      default:
        return 'text-amber-500';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all duration-150',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-gray-400'
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

      {/* Expand/collapse toggle */}
      <button
        onClick={handleToggle}
        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Folder icon */}
      {isExpanded ? (
        <FolderOpen className={cn('w-4 h-4 flex-shrink-0', getFolderColor())} />
      ) : (
        <Folder className={cn('w-4 h-4 flex-shrink-0', getFolderColor())} />
      )}

      {/* Group name */}
      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
        {data.name}
      </span>

      {/* Child count badge */}
      <span className="ml-auto text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded flex-shrink-0">
        {data.childCount}
      </span>

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !-right-1.5 hover:!bg-indigo-500 hover:!scale-125 transition-transform"
      />

      {/* Bottom handle for tree hierarchy connections */}
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-1.5 !h-1.5 !bg-gray-300 !border-0 !-bottom-0.5"
      />
    </div>
  );
});

export default TokenGroupNode;
