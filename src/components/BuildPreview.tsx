'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { cn } from '@/lib/utils';
import {
  Check,
  AlertCircle,
  Circle,
  Folder,
  FileText,
  ArrowDown,
  Package,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CodePreview } from '@/components/CodePreview';
import { PipelineSettingsModal } from '@/components/settings/PipelineSettingsModal';
import { OUTPUT_FORMATS, DEFAULT_BUILD_SETTINGS } from '@/types/build';
import type { OutputFormat } from '@/types/build';

interface BuildPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildPreview({ open, onOpenChange }: BuildPreviewProps) {
  const {
    pipeline,
    pages,
    selectedBuildConfig,
    setSelectedBuildConfig,
    getAllBuildConfigs,
    resolveBuildPath,
    buildTokens,
    getBuildPreview,
  } = usePipelineStore();

  const allConfigs = getAllBuildConfigs();
  const [previewFormat, setPreviewFormat] = useState<OutputFormat>('css');
  const [previewPlatform, setPreviewPlatform] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const platforms = settings.platforms;

  // Auto-select first config when dialog opens if none selected
  useEffect(() => {
    if (open && !selectedBuildConfig && allConfigs.length > 0) {
      setSelectedBuildConfig(allConfigs[0]);
    }
  }, [open, selectedBuildConfig, allConfigs, setSelectedBuildConfig]);

  const { resolvedPath, tokenCount } = useMemo(() => {
    if (!selectedBuildConfig) {
      return { resolvedPath: null, tokenCount: 0 };
    }

    const resolved = resolveBuildPath(selectedBuildConfig);
    const tokens = buildTokens(selectedBuildConfig);

    // Count tokens in merged result
    function countTokens(obj: Record<string, unknown>, count = 0): number {
      for (const key in obj) {
        if (key.startsWith('$')) continue;
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          if ('$value' in value) {
            count++;
          } else {
            count = countTokens(value as Record<string, unknown>, count);
          }
        }
      }
      return count;
    }

    return {
      resolvedPath: resolved,
      tokenCount: countTokens(tokens as Record<string, unknown>),
    };
  }, [selectedBuildConfig, resolveBuildPath, buildTokens]);

  // Get preview code
  const previewCode = useMemo(() => {
    if (!selectedBuildConfig) return '';
    return getBuildPreview(previewPlatform, previewFormat);
  }, [selectedBuildConfig, previewPlatform, previewFormat, getBuildPreview]);

  // Get language for syntax highlighting
  const getLanguage = (format: OutputFormat): string => {
    const formatInfo = OUTPUT_FORMATS.find(f => f.id === format);
    return formatInfo?.language || 'text';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Build Preview</DialogTitle>
                <DialogDescription>
                  Preview built tokens in different formats
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedBuildConfig?.id || ''}
                  onValueChange={(id) => {
                    const config = allConfigs.find(c => c.id === id);
                    if (config) setSelectedBuildConfig(config);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select build..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedBuildConfig && resolvedPath ? (
            <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList>
                <TabsTrigger value="preview">Format Preview</TabsTrigger>
                <TabsTrigger value="merge">Merge Path</TabsTrigger>
              </TabsList>

              {/* Format Preview Tab */}
              <TabsContent value="preview" className="flex-1 overflow-hidden m-0 mt-4">
                <div className="h-full flex flex-col">
                  {/* Platform and Format selectors */}
                  <div className="flex items-center gap-4 mb-3">
                    {platforms.length > 0 && (
                      <Select
                        value={previewPlatform || platforms[0]?.id || ''}
                        onValueChange={setPreviewPlatform}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex-1">
                      <Tabs
                        value={previewFormat}
                        onValueChange={(v) => setPreviewFormat(v as OutputFormat)}
                      >
                        <TabsList>
                          <TabsTrigger value="css">CSS</TabsTrigger>
                          <TabsTrigger value="scss">SCSS</TabsTrigger>
                          <TabsTrigger value="json">JSON</TabsTrigger>
                          <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                          <TabsTrigger value="ios-swift">Swift</TabsTrigger>
                          <TabsTrigger value="android-xml">Android</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  {/* Code preview */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    <CodePreview
                      code={previewCode}
                      language={getLanguage(previewFormat)}
                      maxHeight="100%"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Merge Path Tab */}
              <TabsContent value="merge" className="flex-1 overflow-auto m-0 mt-4">
                <div className="space-y-4">
                  {/* Build output folder */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span>builds/</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {selectedBuildConfig.name.toLowerCase().replace(/\s+\/\s+/g, '/')}
                      </span>
                    </div>

                    {/* Merge order visualization */}
                    <div className="ml-6 space-y-1">
                      {resolvedPath.pages.map((item, index) => {
                        const isLast = index === resolvedPath.pages.length - 1;
                        const prefix = isLast ? '└── ' : '├── ';

                        return (
                          <div key={item.layer.id} className="flex items-center gap-2">
                            <span className="text-gray-400 font-mono text-xs w-8">{prefix}</span>

                            {/* Status icon */}
                            {item.status === 'found' ? (
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : item.status === 'missing-required' ? (
                              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            )}

                            {/* Layer/Page info */}
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className={cn(
                              "text-sm",
                              item.status === 'found' && "text-gray-700 dark:text-gray-300",
                              item.status === 'missing-optional' && "text-gray-400 italic",
                              item.status === 'missing-required' && "text-red-600 dark:text-red-400"
                            )}>
                              {item.layer.name}
                            </span>

                            {/* Variable values */}
                            {(item.layer.variables || []).length > 0 && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                ({(item.layer.variables || []).map(v => selectedBuildConfig.selections[v]).join(', ')})
                              </span>
                            )}

                            {/* Page name if exists */}
                            {item.page && (
                              <span className="text-xs text-gray-500 ml-auto">
                                {item.page.tokens.$name}
                              </span>
                            )}

                            {/* Status badge */}
                            {item.status === 'missing-optional' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded ml-auto">
                                skipped
                              </span>
                            )}
                            {item.status === 'missing-required' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded ml-auto">
                                missing!
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Merge explanation */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ArrowDown className="w-3 h-3" />
                    <span>Pages merge top to bottom (bottom wins)</span>
                  </div>

                  {/* Output summary */}
                  <div className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        Output: {selectedBuildConfig.name}
                      </span>
                    </div>
                    <span className="text-sm text-purple-600 dark:text-purple-400">
                      {tokenCount} tokens
                    </span>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-6 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>Page found</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Circle className="w-3 h-3 text-gray-300" />
                      <span>Optional (skipped)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span>Required (missing)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Select a build configuration to preview
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <PipelineSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
