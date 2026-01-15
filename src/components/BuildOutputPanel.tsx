'use client';

import React, { useState, useMemo } from 'react';
import { Settings, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PipelineSettingsModal } from '@/components/settings/PipelineSettingsModal';
import { usePipelineStore } from '@/stores/pipelineStore';
import { OUTPUT_FORMATS, DEFAULT_BUILD_SETTINGS } from '@/types/build';
import type { OutputFormat } from '@/types/build';

interface BuildOutputPanelProps {
  height?: number;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

const FORMAT_TABS: { id: OutputFormat; label: string }[] = [
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'ios-swift', label: 'Swift' },
  { id: 'android-xml', label: 'Android' },
];

export function BuildOutputPanel({
  height = 300,
  onHeightChange,
  minHeight = 150,
  maxHeight = 600,
}: BuildOutputPanelProps) {
  const {
    pipeline,
    pages,
    selectedBuildConfig,
    setSelectedBuildConfig,
    getAllBuildConfigs,
    getBuildPreview,
  } = usePipelineStore();

  const allConfigs = getAllBuildConfigs();
  const [previewFormat, setPreviewFormat] = useState<OutputFormat>('css');
  const [previewPlatform, setPreviewPlatform] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
  const platforms = settings.platforms;

  // Auto-select first config if none selected
  React.useEffect(() => {
    if (!selectedBuildConfig && allConfigs.length > 0) {
      setSelectedBuildConfig(allConfigs[0]);
    }
  }, [selectedBuildConfig, allConfigs, setSelectedBuildConfig]);

  // Get preview code - includes `pages` dependency for realtime updates
  const previewCode = useMemo(() => {
    if (!selectedBuildConfig) return '// Select a build configuration';
    return getBuildPreview(previewPlatform, previewFormat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuildConfig, previewPlatform, previewFormat, getBuildPreview, pages, pipeline.buildSettings]);

  // Get language for syntax highlighting
  const getLanguage = (format: OutputFormat): string => {
    const formatInfo = OUTPUT_FORMATS.find(f => f.id === format);
    return formatInfo?.language || 'text';
  };

  const language = getLanguage(previewFormat);

  // Basic syntax highlighting
  const highlightCode = (code: string, lang: string): string => {
    if (lang === 'css' || lang === 'scss') {
      return code
        .replace(/(--[\w-]+):/g, '<span class="text-blue-400">$1</span>:')
        .replace(/(\$[\w-]+):/g, '<span class="text-pink-400">$1</span>:')
        .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-amber-400">$1</span>')
        .replace(/(\d+)(px|rem|em|%|ms|s)/g, '<span class="text-green-400">$1$2</span>');
    }
    if (lang === 'json') {
      return code
        .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
        .replace(/:\s*"([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
        .replace(/:\s*(\d+)/g, ': <span class="text-amber-400">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="text-pink-400">$1</span>');
    }
    if (lang === 'swift') {
      return code
        .replace(/\b(public|static|let|var|func|struct|class|import)\b/g, '<span class="text-pink-400">$1</span>')
        .replace(/\b(Color|CGFloat|UIColor)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\d+\.?\d*)/g, '<span class="text-amber-400">$1</span>');
    }
    if (lang === 'xml') {
      return code
        .replace(/(<\/?[\w-]+)/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\s[\w-]+)=/g, '<span class="text-pink-400">$1</span>=')
        .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>');
    }
    return code;
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(previewCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle resize drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
      onHeightChange?.(newHeight);
      // Trigger resize event so Monaco editor recalculates its layout
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Final resize event to ensure Monaco is properly laid out
      window.dispatchEvent(new Event('resize'));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const lines = previewCode.split('\n');

  return (
    <>
      <div
        className="flex flex-col border-t border-gray-200 dark:border-gray-700 bg-gray-900"
        style={{ height: isCollapsed ? 'auto' : height }}
      >
        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="h-1.5 bg-gray-700 hover:bg-blue-500 cursor-ns-resize transition-colors flex-shrink-0"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Header row 1: Title and controls */}
        <div className="h-9 border-b border-gray-700 flex items-center justify-between px-2 bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
            <span className="text-xs font-medium text-gray-300">
              Build Output
            </span>
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              {/* Build config selector */}
              <Select
                value={selectedBuildConfig?.id || ''}
                onValueChange={(id) => {
                  const config = allConfigs.find(c => c.id === id);
                  if (config) setSelectedBuildConfig(config);
                }}
              >
                <SelectTrigger className="h-6 w-[120px] text-[11px] bg-gray-700 border-gray-600 text-gray-200">
                  <SelectValue placeholder="Config" />
                </SelectTrigger>
                <SelectContent>
                  {allConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Platform selector */}
              {platforms.length > 0 && (
                <Select
                  value={previewPlatform || platforms[0]?.id || ''}
                  onValueChange={setPreviewPlatform}
                >
                  <SelectTrigger className="h-6 w-[80px] text-[11px] bg-gray-700 border-gray-600 text-gray-200">
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

              {/* Copy button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>

              {/* Settings button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Header row 2: Format tabs */}
        {!isCollapsed && (
          <div className="h-8 border-b border-gray-700 flex items-center px-2 bg-gray-800/50 flex-shrink-0 gap-1 overflow-x-auto">
            {FORMAT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPreviewFormat(tab.id)}
                className={`
                  px-2 py-1 text-[11px] rounded transition-colors whitespace-nowrap
                  ${previewFormat === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Code preview */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto p-2 min-h-0">
            <pre className="text-xs font-mono leading-relaxed text-gray-100">
              {lines.map((line, index) => (
                <div key={index} className="flex hover:bg-gray-800/50">
                  <code
                    dangerouslySetInnerHTML={{ __html: highlightCode(line, language) || '&nbsp;' }}
                    className="flex-1"
                  />
                </div>
              ))}
            </pre>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <PipelineSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
