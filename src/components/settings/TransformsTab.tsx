'use client';

import React from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelineStore } from '@/stores/pipelineStore';
import { TRANSFORM_PRESETS, DEFAULT_BUILD_SETTINGS } from '@/types/build';
import type { TransformType } from '@/types/build';

const AVAILABLE_TRANSFORMS: Array<{ type: TransformType; label: string; category: string }> = [
  // Name transforms
  { type: 'name/camel', label: 'camelCase', category: 'Name' },
  { type: 'name/kebab', label: 'kebab-case', category: 'Name' },
  { type: 'name/snake', label: 'snake_case', category: 'Name' },
  { type: 'name/constant', label: 'CONSTANT_CASE', category: 'Name' },
  { type: 'name/pascal', label: 'PascalCase', category: 'Name' },
  // Color transforms
  { type: 'color/hex', label: 'Hex (#RRGGBB)', category: 'Color' },
  { type: 'color/rgb', label: 'RGB (rgb())', category: 'Color' },
  { type: 'color/rgba', label: 'RGBA (rgba())', category: 'Color' },
  { type: 'color/hsl', label: 'HSL (hsl())', category: 'Color' },
  // Size transforms
  { type: 'size/px', label: 'Pixels (px)', category: 'Size' },
  { type: 'size/rem', label: 'REM (rem)', category: 'Size' },
  { type: 'size/em', label: 'EM (em)', category: 'Size' },
  // Time transforms
  { type: 'time/ms', label: 'Milliseconds (ms)', category: 'Time' },
  { type: 'time/s', label: 'Seconds (s)', category: 'Time' },
];

export function TransformsTab() {
  const {
    pipeline,
    updateBuildPlatform,
    addTransform,
    removeTransform,
  } = usePipelineStore();

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const platforms = settings.platforms;

  const handleApplyPreset = (platformId: string, presetId: string) => {
    const preset = TRANSFORM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const transforms = preset.transforms.map((t, index) => ({
      id: `t${Date.now()}-${index}`,
      name: t.name,
      type: t.type,
    }));

    updateBuildPlatform(platformId, { transforms });
  };

  const handleAddTransform = (platformId: string, type: TransformType) => {
    const transformInfo = AVAILABLE_TRANSFORMS.find(t => t.type === type);
    if (!transformInfo) return;

    addTransform(platformId, {
      name: transformInfo.label,
      type,
    });
  };

  // Group transforms by category
  const groupedTransforms = AVAILABLE_TRANSFORMS.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_TRANSFORMS>);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Transform Configuration</h3>
        <p className="text-xs text-gray-500">
          Configure how token names and values are transformed for each platform
        </p>
      </div>

      {platforms.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No platforms configured. Add a platform in the Platforms tab first.
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((platform) => (
            <Card key={platform.id} className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">{platform.name}</h4>
                <Select onValueChange={(value) => handleApplyPreset(platform.id, value)}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <Wand2 className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Apply Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFORM_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex flex-col">
                          <span>{preset.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {preset.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current transforms */}
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Active Transforms</Label>
                {platform.transforms.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No transforms configured. Apply a preset or add transforms manually.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {platform.transforms.map((transform) => (
                      <div
                        key={transform.id}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
                      >
                        <span>{transform.name}</span>
                        <button
                          onClick={() => removeTransform(platform.id, transform.id)}
                          className="text-gray-400 hover:text-red-500 ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add transform */}
              <div>
                <Label className="text-xs mb-2 block">Add Transform</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(groupedTransforms).map(([category, transforms]) => (
                    <div key={category}>
                      <p className="text-[10px] text-gray-500 mb-1">{category}</p>
                      <div className="flex flex-wrap gap-1">
                        {transforms.map((t) => {
                          const isActive = platform.transforms.some(pt => pt.type === t.type);
                          return (
                            <button
                              key={t.type}
                              onClick={() => !isActive && handleAddTransform(platform.id, t.type)}
                              disabled={isActive}
                              className={`
                                text-[10px] px-2 py-0.5 rounded border transition-colors
                                ${isActive
                                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }
                              `}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
