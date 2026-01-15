'use client';

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { AlertCircle, Check, Copy, FileText } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function JsonEditor() {
  const { pipeline, getActivePage, updatePageTokens } = usePipelineStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const activePage = getActivePage();
  const tokenFile = activePage?.tokens || { $name: 'Empty' };

  // Generate filename from page info
  const filename = useMemo(() => {
    if (!activePage) return 'tokens.json';

    const layer = pipeline.layers.find(l => l.id === activePage.layerId);
    const layerName = layer?.name.toLowerCase().replace(/\s+/g, '-') || 'tokens';

    if (Object.keys(activePage.variableValues).length > 0) {
      const varPart = Object.values(activePage.variableValues).join('-');
      return `${layerName}-${varPart}.json`;
    }

    return `${layerName}.json`;
  }, [activePage, pipeline.layers]);

  const [localValue, setLocalValue] = useState(() => JSON.stringify(tokenFile, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(true);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdate = useRef(false);

  // Update local value when tokenFile changes (from external source)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    setLocalValue(JSON.stringify(tokenFile, null, 2));
    setIsSynced(true);
    setParseError(null);
  }, [tokenFile]);

  // Debounced sync to store
  const syncToStore = useCallback(
    (value: string) => {
      if (!activePage) return;

      try {
        const parsed = JSON.parse(value);
        setParseError(null);
        isInternalUpdate.current = true;
        updatePageTokens(activePage.id, parsed);
        setIsSynced(true);
      } catch (e) {
        setParseError((e as Error).message);
        setIsSynced(false);
      }
    },
    [activePage, updatePageTokens]
  );

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      if (!value) return;
      setLocalValue(value);
      setIsSynced(false);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce sync
      timeoutRef.current = setTimeout(() => {
        syncToStore(value);
      }, 500);
    },
    [syncToStore]
  );

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    // Configure JSON schema for design tokens
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [
        {
          uri: 'https://design-tokens.github.io/community-group/format/schema.json',
          fileMatch: ['*'],
          schema: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    $value: {},
                    $type: {
                      type: 'string',
                      enum: [
                        'color',
                        'dimension',
                        'fontFamily',
                        'fontWeight',
                        'duration',
                        'cubicBezier',
                        'number',
                        'strokeStyle',
                        'border',
                        'transition',
                        'shadow',
                        'gradient',
                        'typography',
                      ],
                    },
                    $description: { type: 'string' },
                    $extensions: { type: 'object' },
                  },
                  required: ['$value'],
                },
                {
                  type: 'object',
                  additionalProperties: true,
                },
              ],
            },
          },
        },
      ],
    });

    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      lineNumbers: 'on',
      folding: true,
      wordWrap: 'on',
      formatOnPaste: true,
      formatOnType: true,
    });
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(localValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [localValue]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(localValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setLocalValue(formatted);
    } catch {
      // Can't format invalid JSON
    }
  }, [localValue]);

  // Show loading skeleton until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 bg-white dark:bg-gray-900" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
            {filename}
          </span>
          {isSynced ? (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              Synced
            </span>
          ) : parseError ? (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Editing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            className="h-7 px-2 text-xs"
          >
            Format
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {parseError && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-mono">
            {parseError}
          </p>
        </div>
      )}


      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={localValue}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-light"
          options={{
            fontSize: 13,
            tabSize: 2,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
