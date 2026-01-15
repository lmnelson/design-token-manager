'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { usePipelineStore } from '@/stores/pipelineStore';
import { DEFAULT_BUILD_SETTINGS } from '@/types/build';
import {
  importStyleDictionaryConfig,
  exportStyleDictionaryConfig,
  parseStyleDictionaryJSON,
} from '@/lib/build/style-dictionary';

export function AdvancedTab() {
  const { pipeline, updateBuildSettings } = usePipelineStore();
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [configJson, setConfigJson] = useState('');

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;

  const handleImport = useCallback(() => {
    setImportError(null);
    setImportWarnings([]);
    setImportSuccess(false);

    if (!configJson.trim()) {
      setImportError('Please paste a Style Dictionary configuration');
      return;
    }

    const { config, validation } = parseStyleDictionaryJSON(configJson);

    if (!validation.valid && validation.errors.length > 0) {
      setImportError(validation.errors.join(', '));
      return;
    }

    if (validation.warnings.length > 0) {
      setImportWarnings(validation.warnings);
    }

    if (config) {
      try {
        const imported = importStyleDictionaryConfig(config);
        updateBuildSettings(imported);
        setImportSuccess(true);
        setConfigJson('');
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Import failed');
      }
    }
  }, [configJson, updateBuildSettings]);

  const handleExport = useCallback(() => {
    const sdConfig = exportStyleDictionaryConfig(settings);
    const json = JSON.stringify(sdConfig, null, 2);

    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'style-dictionary.config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setConfigJson(content);
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Style Dictionary Integration</h3>
        <p className="text-xs text-gray-500">
          Import or export Style Dictionary configuration files for compatibility with existing workflows
        </p>
      </div>

      {/* Import Section */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import Style Dictionary Config
        </h4>

        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block">Upload or paste configuration</Label>
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="sd-config-upload"
              />
              <label htmlFor="sd-config-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-3 h-3 mr-1" />
                    Upload File
                  </span>
                </Button>
              </label>
            </div>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder={`{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/css/",
      "files": [{
        "destination": "variables.css",
        "format": "css/variables"
      }]
    }
  }
}`}
              className="w-full h-48 p-2 text-xs font-mono border rounded bg-gray-50 dark:bg-gray-900 resize-none"
            />
          </div>

          {importError && (
            <div className="flex items-start gap-2 text-red-500 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {importWarnings.length > 0 && (
            <div className="text-amber-600 text-xs space-y-1">
              {importWarnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-2 text-green-500 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Configuration imported successfully!</span>
            </div>
          )}

          <Button onClick={handleImport} size="sm">
            Import Configuration
          </Button>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Style Dictionary Config
        </h4>

        <p className="text-xs text-gray-500 mb-3">
          Export your current build settings as a Style Dictionary configuration file.
          This can be used with the Style Dictionary CLI or integrated into your build pipeline.
        </p>

        <Button onClick={handleExport} size="sm">
          <Download className="w-4 h-4 mr-1" />
          Download Config
        </Button>
      </Card>

      {/* Current Raw Config (read-only) */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Current Configuration (JSON)</h4>
        <pre className="text-xs font-mono p-3 bg-gray-50 dark:bg-gray-900 rounded overflow-auto max-h-64">
          {JSON.stringify(exportStyleDictionaryConfig(settings), null, 2)}
        </pre>
      </Card>
    </div>
  );
}
