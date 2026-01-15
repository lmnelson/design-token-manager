'use client';

import React from 'react';
import { Package, Apple, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { usePipelineStore } from '@/stores/pipelineStore';
import { DEFAULT_BUILD_SETTINGS } from '@/types/build';

export function PackageTab() {
  const { pipeline, updateBuildSettings } = usePipelineStore();

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const packageConfig = settings.package;

  const updatePackage = (updates: Partial<typeof packageConfig>) => {
    updateBuildSettings({
      package: {
        ...packageConfig,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Package Configuration</h3>
        <p className="text-xs text-gray-500">
          Configure package metadata for distribution
        </p>
      </div>

      {/* Basic Info */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Basic Information
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Package Name</Label>
            <Input
              value={packageConfig.name}
              onChange={(e) => updatePackage({ name: e.target.value })}
              placeholder="design-tokens"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Version</Label>
            <Input
              value={packageConfig.version}
              onChange={(e) => updatePackage({ version: e.target.value })}
              placeholder="1.0.0"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={packageConfig.description || ''}
              onChange={(e) => updatePackage({ description: e.target.value })}
              placeholder="Design tokens for my project"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* NPM Settings */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-red-500" />
          NPM Settings
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">NPM Scope</Label>
            <Input
              value={packageConfig.npmScope || ''}
              onChange={(e) => updatePackage({ npmScope: e.target.value })}
              placeholder="@myorg"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Optional organization scope (e.g., @company)
            </p>
          </div>
          <div>
            <Label className="text-xs">NPM Registry</Label>
            <Input
              value={packageConfig.npmRegistry || ''}
              onChange={(e) => updatePackage({ npmRegistry: e.target.value })}
              placeholder="https://registry.npmjs.org"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Custom registry URL (leave empty for default)
            </p>
          </div>
        </div>
      </Card>

      {/* iOS Settings */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Apple className="w-4 h-4" />
          iOS / CocoaPods Settings
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Pod Name</Label>
            <Input
              value={packageConfig.podName || ''}
              onChange={(e) => updatePackage({ podName: e.target.value })}
              placeholder="DesignTokens"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Name for the CocoaPods package
            </p>
          </div>
        </div>
      </Card>

      {/* Android Settings */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-green-500" />
          Android Settings
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Android Package</Label>
            <Input
              value={packageConfig.androidPackage || ''}
              onChange={(e) => updatePackage({ androidPackage: e.target.value })}
              placeholder="com.mycompany.tokens"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Package name for Android resources
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
