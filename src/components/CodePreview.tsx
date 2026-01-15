'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodePreviewProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

export function CodePreview({
  code,
  language = 'text',
  showLineNumbers = true,
  maxHeight = '100%',
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split('\n');

  // Basic syntax highlighting based on language
  const highlightLine = (line: string): string => {
    if (language === 'css' || language === 'scss') {
      // Highlight CSS properties and values
      return line
        .replace(/(--[\w-]+):/g, '<span class="text-blue-400">$1</span>:')
        .replace(/(\$[\w-]+):/g, '<span class="text-pink-400">$1</span>:')
        .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="text-amber-400">$1</span>')
        .replace(/(\d+)(px|rem|em|%|ms|s)/g, '<span class="text-green-400">$1$2</span>');
    }

    if (language === 'json') {
      // Highlight JSON keys and strings
      return line
        .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
        .replace(/:\s*"([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
        .replace(/:\s*(\d+)/g, ': <span class="text-amber-400">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="text-pink-400">$1</span>');
    }

    if (language === 'javascript' || language === 'typescript') {
      // Highlight JS keywords and strings
      return line
        .replace(/\b(const|let|var|function|return|export|import|from|module)\b/g, '<span class="text-pink-400">$1</span>')
        .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>');
    }

    if (language === 'swift') {
      // Highlight Swift keywords
      return line
        .replace(/\b(public|static|let|var|func|struct|class|import)\b/g, '<span class="text-pink-400">$1</span>')
        .replace(/\b(Color|CGFloat|UIColor)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\d+\.?\d*)/g, '<span class="text-amber-400">$1</span>');
    }

    if (language === 'xml') {
      // Highlight XML tags and attributes
      return line
        .replace(/(<\/?[\w-]+)/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\s[\w-]+)=/g, '<span class="text-pink-400">$1</span>=')
        .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>');
    }

    return line;
  };

  return (
    <div
      className="relative rounded-lg bg-gray-900 text-gray-100 overflow-hidden"
      style={{ maxHeight }}
    >
      {/* Copy button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 px-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white z-10"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </>
        )}
      </Button>

      {/* Language badge */}
      {language !== 'text' && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 uppercase z-10">
          {language}
        </div>
      )}

      {/* Code content */}
      <div className="overflow-auto p-4 pt-10" style={{ maxHeight }}>
        <pre className="text-xs font-mono leading-relaxed">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              {showLineNumbers && (
                <span className="select-none text-gray-600 w-8 flex-shrink-0 text-right pr-4">
                  {index + 1}
                </span>
              )}
              <code
                dangerouslySetInnerHTML={{ __html: highlightLine(line) || '&nbsp;' }}
                className="flex-1"
              />
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
