'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { TokenMappingEdgeData } from '@/types/flow';

// Using any to bypass strict type checking for custom edge data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TokenMappingEdge(props: EdgeProps<any>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props;

  const edgeData = data as TokenMappingEdgeData | undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine color based on confidence
  const getEdgeColor = () => {
    if (!edgeData) return '#9ca3af';
    if (edgeData.confidence === 1) return '#22c55e'; // Green for exact match
    if (edgeData.confidence >= 0.7) return '#eab308'; // Yellow for good match
    if (edgeData.confidence >= 0.4) return '#f97316'; // Orange for weak match
    return '#ef4444'; // Red for poor match
  };

  const edgeColor = getEdgeColor();

  // Format token path for display
  const tokenLabel = edgeData?.tokenPath.split('.').slice(-2).join('.') || '';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: edgeData?.matchType === 'approximate' ? '5,5' : undefined,
        }}
        markerEnd={`url(#arrow-${edgeData?.confidence === 1 ? 'green' : 'yellow'})`}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium shadow-sm border',
              'bg-white dark:bg-gray-800',
              selected
                ? 'border-blue-500 ring-1 ring-blue-200'
                : 'border-gray-200 dark:border-gray-600'
            )}
          >
            <div className="flex items-center gap-1.5">
              {/* Confidence indicator */}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: edgeColor }}
              />

              {/* Property type */}
              <span className="text-gray-500 dark:text-gray-400">
                {edgeData?.figmaProperty || 'property'}
              </span>

              <span className="text-gray-300 dark:text-gray-600">→</span>

              {/* Token path */}
              <span className="text-gray-900 dark:text-gray-100 font-mono">
                {tokenLabel}
              </span>

              {/* Confidence percentage */}
              {edgeData && edgeData.confidence < 1 && (
                <span className="text-gray-400 text-[10px]">
                  {Math.round(edgeData.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default TokenMappingEdge;
