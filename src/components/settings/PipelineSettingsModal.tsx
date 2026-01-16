'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePipelineStore } from '@/stores/pipelineStore';
import { LayersVariablesTab } from './LayersVariablesTab';
import { PlatformsTab } from './PlatformsTab';
import { TransformsTab } from './TransformsTab';
import { PackageTab } from './PackageTab';
import { AdvancedTab } from './AdvancedTab';

interface PipelineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function PipelineSettingsModal({ open, onClose }: PipelineSettingsModalProps) {
  const { pipeline, setPipeline, getLayerVariants } = usePipelineStore();

  const updatePipelineField = (field: 'name' | 'description', value: string) => {
    setPipeline({
      ...pipeline,
      [field]: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pipeline Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="layers">Layers & Variables</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="transforms">Transforms</TabsTrigger>
            <TabsTrigger value="package">Package</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="general" className="m-0">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Pipeline Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Pipeline Name</Label>
                      <Input
                        value={pipeline.name}
                        onChange={(e) => updatePipelineField('name', e.target.value)}
                        placeholder="My Design System"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={pipeline.description || ''}
                        onChange={(e) => updatePipelineField('description', e.target.value)}
                        placeholder="Design tokens for my project"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Pipeline Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-2xl font-bold text-green-500">
                        {pipeline.layers.length}
                      </div>
                      <div className="text-xs text-gray-500">Layers</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-2xl font-bold text-purple-500">
                        {pipeline.buildSettings?.platforms.length || 0}
                      </div>
                      <div className="text-xs text-gray-500">Build Platforms</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Layers</h3>
                  <div className="space-y-2">
                    {[...pipeline.layers]
                      .sort((a, b) => a.order - b.order)
                      .map((layer) => {
                        const variants = getLayerVariants(layer.id);
                        return (
                          <div
                            key={layer.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                          >
                            <div>
                              <span className="font-medium">{layer.name}</span>
                              {layer.description && (
                                <span className="text-gray-500 ml-2">- {layer.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {variants.length > 0 ? (
                                <div className="flex gap-1">
                                  {variants.map((variant) => (
                                    <span
                                      key={variant}
                                      className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded text-[10px]"
                                    >
                                      {variant}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">Static</span>
                              )}
                              {layer.required && (
                                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px]">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layers" className="m-0">
              <LayersVariablesTab />
            </TabsContent>

            <TabsContent value="platforms" className="m-0">
              <PlatformsTab />
            </TabsContent>

            <TabsContent value="transforms" className="m-0">
              <TransformsTab />
            </TabsContent>

            <TabsContent value="package" className="m-0">
              <PackageTab />
            </TabsContent>

            <TabsContent value="advanced" className="m-0">
              <AdvancedTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
