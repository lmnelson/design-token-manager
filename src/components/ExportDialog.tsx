'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Download, FileArchive, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePipelineStore } from '@/stores/pipelineStore';
import { OUTPUT_FORMATS, DEFAULT_BUILD_SETTINGS } from '@/types/build';
import type { OutputFormat } from '@/types/build';
import { createBuildZip } from '@/lib/build/engine';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { pipeline, buildTokens, getAllBuildConfigs } = usePipelineStore();

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const platforms = settings.platforms;
  const allConfigs = getAllBuildConfigs();

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    platforms.map(p => p.id)
  );
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>(
    allConfigs.map(c => c.id)
  );
  const [isExporting, setIsExporting] = useState(false);

  // Toggle platform selection
  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  }, []);

  // Toggle config selection
  const toggleConfig = useCallback((configId: string) => {
    setSelectedConfigs(prev =>
      prev.includes(configId)
        ? prev.filter(id => id !== configId)
        : [...prev, configId]
    );
  }, []);

  // Compute files that will be exported
  const exportFiles = useMemo(() => {
    const files: Array<{ platform: string; config: string; fileName: string }> = [];

    for (const configId of selectedConfigs) {
      const config = allConfigs.find(c => c.id === configId);
      if (!config) continue;

      for (const platformId of selectedPlatforms) {
        const platform = platforms.find(p => p.id === platformId);
        if (!platform) continue;

        for (const output of platform.outputs) {
          if (output.enabled) {
            files.push({
              platform: platform.name,
              config: config.name,
              fileName: output.fileName,
            });
          }
        }
      }
    }

    return files;
  }, [selectedPlatforms, selectedConfigs, platforms, allConfigs]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (selectedPlatforms.length === 0 || selectedConfigs.length === 0) return;

    setIsExporting(true);

    try {
      // For each config, build tokens and create ZIP
      const selectedPlatformConfigs = platforms.filter(p =>
        selectedPlatforms.includes(p.id)
      );

      // Get first selected config's tokens (for now, export one at a time)
      const configId = selectedConfigs[0];
      const config = allConfigs.find(c => c.id === configId);
      if (!config) {
        setIsExporting(false);
        return;
      }

      const tokens = buildTokens(config);
      const blob = await createBuildZip(tokens, selectedPlatformConfigs);

      // Download the ZIP
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pipeline.name.toLowerCase().replace(/\s+/g, '-')}-tokens.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedPlatforms,
    selectedConfigs,
    platforms,
    allConfigs,
    buildTokens,
    pipeline.name,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            Export Tokens
          </DialogTitle>
          <DialogDescription>
            Select platforms and build configurations to export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform selection */}
          <div>
            <Label className="text-sm mb-2 block">Platforms</Label>
            {platforms.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No platforms configured. Add platforms in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`
                        px-3 py-1.5 rounded border text-sm transition-colors
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {platform.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Build configuration selection */}
          <div>
            <Label className="text-sm mb-2 block">Build Configurations</Label>
            <div className="flex flex-wrap gap-2">
              {allConfigs.map((config) => {
                const isSelected = selectedConfigs.includes(config.id);
                return (
                  <button
                    key={config.id}
                    onClick={() => toggleConfig(config.id)}
                    className={`
                      px-3 py-1.5 rounded border text-sm transition-colors
                      ${isSelected
                        ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File preview */}
          <div>
            <Label className="text-sm mb-2 block">Files to Export</Label>
            <div className="max-h-48 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
              {exportFiles.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  No files selected for export
                </p>
              ) : (
                <div className="space-y-1 text-xs font-mono">
                  {exportFiles.slice(0, 20).map((file, index) => (
                    <div key={index} className="text-gray-600 dark:text-gray-400">
                      {file.platform.toLowerCase()}/{file.fileName}
                    </div>
                  ))}
                  {exportFiles.length > 20 && (
                    <div className="text-gray-500 italic">
                      ...and {exportFiles.length - 20} more files
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {exportFiles.length} file(s) will be exported as a ZIP archive
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || exportFiles.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
