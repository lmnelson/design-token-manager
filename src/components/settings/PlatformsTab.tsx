'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { usePipelineStore } from '@/stores/pipelineStore';
import { OUTPUT_FORMATS, DEFAULT_BUILD_SETTINGS } from '@/types/build';
import type { BuildPlatform, OutputFormat } from '@/types/build';

export function PlatformsTab() {
  const {
    pipeline,
    addBuildPlatform,
    updateBuildPlatform,
    removeBuildPlatform,
    addOutput,
    removeOutput,
    updateOutput,
  } = usePipelineStore();

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const platforms = settings.platforms;

  const handleAddPlatform = () => {
    addBuildPlatform({
      name: 'New Platform',
      prefix: '--',
      transforms: [],
      outputs: [
        { id: 'default', format: 'css', enabled: true, fileName: 'tokens.css', options: {} },
      ],
    });
  };

  const handleToggleFormat = (platform: BuildPlatform, format: OutputFormat) => {
    const existingOutput = platform.outputs.find(o => o.format === format);

    if (existingOutput) {
      removeOutput(platform.id, existingOutput.id);
    } else {
      const formatInfo = OUTPUT_FORMATS.find(f => f.id === format);
      addOutput(platform.id, {
        format,
        enabled: true,
        fileName: `tokens${formatInfo?.extension || `.${format}`}`,
        options: {},
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium">Build Platforms</h3>
          <p className="text-xs text-gray-500">
            Configure output formats and settings for each platform
          </p>
        </div>
        <Button size="sm" onClick={handleAddPlatform}>
          <Plus className="w-4 h-4 mr-1" />
          Add Platform
        </Button>
      </div>

      {platforms.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No platforms configured. Add a platform to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((platform) => (
            <Card key={platform.id} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="text-xs">Platform Name</Label>
                      <Input
                        value={platform.name}
                        onChange={(e) =>
                          updateBuildPlatform(platform.id, { name: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Prefix</Label>
                      <Input
                        value={platform.prefix || ''}
                        onChange={(e) =>
                          updateBuildPlatform(platform.id, { prefix: e.target.value })
                        }
                        placeholder="--"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBuildPlatform(platform.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Output Formats</Label>
                <div className="grid grid-cols-4 gap-2">
                  {OUTPUT_FORMATS.map((format) => {
                    const isEnabled = platform.outputs.some(o => o.format === format.id);
                    return (
                      <button
                        key={format.id}
                        onClick={() => handleToggleFormat(platform, format.id)}
                        className={`
                          flex flex-col items-center p-2 rounded border text-xs transition-colors
                          ${isEnabled
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <span className="font-medium">{format.label}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {format.extension}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File names for enabled outputs */}
              {platform.outputs.length > 0 && (
                <div className="mt-4">
                  <Label className="text-xs mb-2 block">Output Files</Label>
                  <div className="space-y-2">
                    {platform.outputs.map((output) => {
                      const formatInfo = OUTPUT_FORMATS.find(f => f.id === output.format);
                      return (
                        <div key={output.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-16">
                            {formatInfo?.label}:
                          </span>
                          <Input
                            value={output.fileName}
                            onChange={(e) =>
                              updateOutput(platform.id, output.id, { fileName: e.target.value })
                            }
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
