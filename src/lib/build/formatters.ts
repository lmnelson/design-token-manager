// Output format generators for different platforms
// Generates CSS, SCSS, Tailwind, JSON, XML, Swift, and Android XML

import type { TransformedToken, OutputFormat, OutputConfig } from '@/types/build';

// ============================================
// CSS Output
// ============================================

export interface CSSOptions {
  selector?: string; // Root selector, defaults to ":root"
  prefix?: string;   // Variable prefix, defaults to "--"
}

export function generateCSS(
  tokens: TransformedToken[],
  options: CSSOptions = {}
): string {
  const selector = options.selector || ':root';
  const prefix = options.prefix || '--';

  const lines = tokens.map(token => {
    const name = `${prefix}${token.transformedName}`;
    return `  ${name}: ${token.transformedValue};`;
  });

  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

// ============================================
// SCSS Output
// ============================================

export interface SCSSOptions {
  prefix?: string; // Variable prefix, defaults to "$"
  useMap?: boolean; // Generate as SCSS map instead of variables
}

export function generateSCSS(
  tokens: TransformedToken[],
  options: SCSSOptions = {}
): string {
  const prefix = options.prefix || '$';

  if (options.useMap) {
    // Generate as SCSS map
    const entries = tokens.map(token => {
      return `  "${token.transformedName}": ${token.transformedValue}`;
    });
    return `$tokens: (\n${entries.join(',\n')}\n);\n`;
  }

  // Generate as individual variables
  const lines = tokens.map(token => {
    return `${prefix}${token.transformedName}: ${token.transformedValue};`;
  });

  return lines.join('\n') + '\n';
}

// ============================================
// Tailwind Output
// ============================================

export interface TailwindOptions {
  themeKey?: string; // The theme key to export (e.g., "colors", "spacing")
  format?: 'extend' | 'replace'; // How to integrate with existing config
}

export function generateTailwind(
  tokens: TransformedToken[],
  options: TailwindOptions = {}
): string {
  // Group tokens by their first path segment (assumed to be the category)
  const groups: Record<string, Record<string, string>> = {};

  for (const token of tokens) {
    const category = token.path[0] || 'misc';
    const name = token.path.slice(1).join('-') || token.transformedName;

    if (!groups[category]) {
      groups[category] = {};
    }
    groups[category][name] = token.transformedValue;
  }

  // Map categories to Tailwind theme keys
  const categoryToThemeKey: Record<string, string> = {
    colors: 'colors',
    color: 'colors',
    spacing: 'spacing',
    space: 'spacing',
    fontSize: 'fontSize',
    fontFamily: 'fontFamily',
    fontWeight: 'fontWeight',
    lineHeight: 'lineHeight',
    borderRadius: 'borderRadius',
    borderWidth: 'borderWidth',
    boxShadow: 'boxShadow',
    opacity: 'opacity',
    zIndex: 'zIndex',
  };

  const themeConfig: Record<string, Record<string, string>> = {};

  for (const [category, values] of Object.entries(groups)) {
    const themeKey = categoryToThemeKey[category] || category;
    themeConfig[themeKey] = values;
  }

  const format = options.format || 'extend';

  if (format === 'extend') {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: ${JSON.stringify(themeConfig, null, 2).replace(/"/g, "'").split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n')}
  }
}
`;
  }

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: ${JSON.stringify(themeConfig, null, 2).replace(/"/g, "'").split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')}
}
`;
}

// ============================================
// JSON Output
// ============================================

export interface JSONOptions {
  flat?: boolean;     // Flat structure vs nested
  includeMetadata?: boolean; // Include $type and $description
}

export function generateJSON(
  tokens: TransformedToken[],
  options: JSONOptions = {}
): string {
  if (options.flat) {
    // Flat structure: { "colors-brand-primary": "#FF0000" }
    const result: Record<string, unknown> = {};
    for (const token of tokens) {
      result[token.transformedName] = options.includeMetadata
        ? { value: token.transformedValue, type: token.type }
        : token.transformedValue;
    }
    return JSON.stringify(result, null, 2) + '\n';
  }

  // Nested structure: { colors: { brand: { primary: "#FF0000" } } }
  const result: Record<string, unknown> = {};

  for (const token of tokens) {
    let current = result;
    const path = token.path;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = path[path.length - 1];
    current[lastKey] = options.includeMetadata
      ? { $value: token.transformedValue, $type: token.type }
      : token.transformedValue;
  }

  return JSON.stringify(result, null, 2) + '\n';
}

// ============================================
// XML Output
// ============================================

export interface XMLOptions {
  rootElement?: string;
  tokenElement?: string;
}

export function generateXML(
  tokens: TransformedToken[],
  options: XMLOptions = {}
): string {
  const rootElement = options.rootElement || 'tokens';
  const tokenElement = options.tokenElement || 'token';

  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&apos;');

  const lines = tokens.map(token => {
    return `  <${tokenElement} name="${escapeXml(token.transformedName)}" type="${escapeXml(token.type || 'unknown')}">${escapeXml(token.transformedValue)}</${tokenElement}>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<${rootElement}>
${lines.join('\n')}
</${rootElement}>
`;
}

// ============================================
// iOS Swift Output
// ============================================

export interface SwiftOptions {
  className?: string;
  useSwiftUI?: boolean;
}

export function generateSwift(
  tokens: TransformedToken[],
  options: SwiftOptions = {}
): string {
  const className = options.className || 'DesignTokens';
  const useSwiftUI = options.useSwiftUI ?? true;

  const colorTokens = tokens.filter(t => t.type === 'color');
  const dimensionTokens = tokens.filter(t => t.type === 'dimension' || t.type === 'spacing');
  const otherTokens = tokens.filter(t => t.type !== 'color' && t.type !== 'dimension' && t.type !== 'spacing');

  const lines: string[] = [];

  if (useSwiftUI) {
    lines.push('import SwiftUI');
  } else {
    lines.push('import UIKit');
  }

  lines.push('');
  lines.push(`public struct ${className} {`);

  // Colors
  if (colorTokens.length > 0) {
    lines.push('    // MARK: - Colors');
    for (const token of colorTokens) {
      const rgba = parseColorToRGBA(token.transformedValue);
      if (rgba && useSwiftUI) {
        lines.push(`    public static let ${token.transformedName} = Color(red: ${rgba.r.toFixed(3)}, green: ${rgba.g.toFixed(3)}, blue: ${rgba.b.toFixed(3)}, opacity: ${rgba.a.toFixed(3)})`);
      } else if (rgba) {
        lines.push(`    public static let ${token.transformedName} = UIColor(red: ${rgba.r.toFixed(3)}, green: ${rgba.g.toFixed(3)}, blue: ${rgba.b.toFixed(3)}, alpha: ${rgba.a.toFixed(3)})`);
      }
    }
    lines.push('');
  }

  // Dimensions
  if (dimensionTokens.length > 0) {
    lines.push('    // MARK: - Dimensions');
    for (const token of dimensionTokens) {
      const value = parseFloat(token.transformedValue);
      if (!isNaN(value)) {
        lines.push(`    public static let ${token.transformedName}: CGFloat = ${value}`);
      }
    }
    lines.push('');
  }

  // Other values
  if (otherTokens.length > 0) {
    lines.push('    // MARK: - Other');
    for (const token of otherTokens) {
      lines.push(`    public static let ${token.transformedName} = "${token.transformedValue}"`);
    }
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// Helper to parse color to normalized RGBA
function parseColorToRGBA(value: string): { r: number; g: number; b: number; a: number } | null {
  const str = String(value).trim();

  // Hex format
  const hexMatch = str.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) / 255,
        g: parseInt(hex[1] + hex[1], 16) / 255,
        b: parseInt(hex[2] + hex[2], 16) / 255,
        a: 1,
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: 1,
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // RGBA format
  const rgbaMatch = str.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return null;
}

// ============================================
// Android XML Output
// ============================================

export interface AndroidOptions {
  resourceType?: 'values' | 'colors' | 'dimens';
}

export function generateAndroidXML(
  tokens: TransformedToken[],
  options: AndroidOptions = {}
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push('<resources>');

  const colorTokens = tokens.filter(t => t.type === 'color');
  const dimensionTokens = tokens.filter(t => t.type === 'dimension' || t.type === 'spacing');
  const stringTokens = tokens.filter(t => t.type !== 'color' && t.type !== 'dimension' && t.type !== 'spacing');

  // Colors
  for (const token of colorTokens) {
    const value = token.transformedValue.startsWith('#')
      ? token.transformedValue
      : `#${token.transformedValue}`;
    lines.push(`    <color name="${token.transformedName}">${value}</color>`);
  }

  // Dimensions
  for (const token of dimensionTokens) {
    const value = token.transformedValue.endsWith('px') || token.transformedValue.endsWith('dp')
      ? token.transformedValue.replace('px', 'dp')
      : `${token.transformedValue}dp`;
    lines.push(`    <dimen name="${token.transformedName}">${value}</dimen>`);
  }

  // Strings
  for (const token of stringTokens) {
    lines.push(`    <string name="${token.transformedName}">${escapeAndroidString(token.transformedValue)}</string>`);
  }

  lines.push('</resources>');
  lines.push('');

  return lines.join('\n');
}

function escapeAndroidString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

// ============================================
// Main Format Output Function
// ============================================

export function formatOutput(
  tokens: TransformedToken[],
  output: OutputConfig,
  prefix?: string
): string {
  switch (output.format) {
    case 'css':
      return generateCSS(tokens, { prefix, ...output.options as CSSOptions });
    case 'scss':
      return generateSCSS(tokens, output.options as SCSSOptions);
    case 'tailwind':
      return generateTailwind(tokens, output.options as TailwindOptions);
    case 'json':
      return generateJSON(tokens, output.options as JSONOptions);
    case 'xml':
      return generateXML(tokens, output.options as XMLOptions);
    case 'ios-swift':
      return generateSwift(tokens, output.options as SwiftOptions);
    case 'android-xml':
      return generateAndroidXML(tokens, output.options as AndroidOptions);
    default:
      return generateJSON(tokens);
  }
}
