// Transform implementations for token names and values
// Based on Style Dictionary transform patterns

import type { TransformType, Transform, ResolvedToken, TransformedToken } from '@/types/build';

// ============================================
// Name Transforms
// ============================================

/**
 * Convert a token path to camelCase
 * e.g., ["colors", "brand", "primary"] -> "colorsBrandPrimary"
 */
export function toCamelCase(parts: string[]): string {
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/**
 * Convert a token path to kebab-case
 * e.g., ["colors", "brand", "primary"] -> "colors-brand-primary"
 */
export function toKebabCase(parts: string[]): string {
  return parts
    .map(part => part.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('-');
}

/**
 * Convert a token path to snake_case
 * e.g., ["colors", "brand", "primary"] -> "colors_brand_primary"
 */
export function toSnakeCase(parts: string[]): string {
  return parts
    .map(part => part.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''))
    .filter(Boolean)
    .join('_');
}

/**
 * Convert a token path to CONSTANT_CASE
 * e.g., ["colors", "brand", "primary"] -> "COLORS_BRAND_PRIMARY"
 */
export function toConstantCase(parts: string[]): string {
  return toSnakeCase(parts).toUpperCase();
}

/**
 * Convert a token path to PascalCase
 * e.g., ["colors", "brand", "primary"] -> "ColorsBrandPrimary"
 */
export function toPascalCase(parts: string[]): string {
  return parts
    .map(part => {
      const lower = part.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

// ============================================
// Color Transforms
// ============================================

/**
 * Parse a color string to RGB components
 */
function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const str = String(value).trim();

  // Hex format (#RGB, #RRGGBB, #RRGGBBAA)
  const hexMatch = str.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // RGB/RGBA format
  const rgbMatch = str.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // HSL format (basic support)
  const hslMatch = str.match(/^hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;

    // HSL to RGB conversion
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a,
    };
  }

  return null;
}

/**
 * Convert color to hex format
 */
export function colorToHex(value: string): string {
  const color = parseColor(value);
  if (!color) return value;

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  if (color.a < 1) {
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex(Math.round(color.a * 255))}`;
  }
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Convert color to rgb() format
 */
export function colorToRgb(value: string): string {
  const color = parseColor(value);
  if (!color) return value;
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert color to rgba() format
 */
export function colorToRgba(value: string): string {
  const color = parseColor(value);
  if (!color) return value;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

/**
 * Convert color to hsl() format
 */
export function colorToHsl(value: string): string {
  const color = parseColor(value);
  if (!color) return value;

  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// ============================================
// Size Transforms
// ============================================

/**
 * Parse a size value to pixels
 */
function parseSizeToPixels(value: string | number, baseFontSize = 16): number | null {
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  const match = str.match(/^([\d.]+)(px|rem|em|pt)?$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'px').toLowerCase();

  switch (unit) {
    case 'px':
      return num;
    case 'rem':
    case 'em':
      return num * baseFontSize;
    case 'pt':
      return num * (4 / 3);
    default:
      return num;
  }
}

/**
 * Convert size to px format
 */
export function sizeToPx(value: string | number): string {
  const px = parseSizeToPixels(value);
  if (px === null) return String(value);
  return `${px}px`;
}

/**
 * Convert size to rem format
 */
export function sizeToRem(value: string | number, baseFontSize = 16): string {
  const px = parseSizeToPixels(value, baseFontSize);
  if (px === null) return String(value);
  return `${px / baseFontSize}rem`;
}

/**
 * Convert size to em format
 */
export function sizeToEm(value: string | number, baseFontSize = 16): string {
  const px = parseSizeToPixels(value, baseFontSize);
  if (px === null) return String(value);
  return `${px / baseFontSize}em`;
}

// ============================================
// Time Transforms
// ============================================

/**
 * Parse a duration to milliseconds
 */
function parseDurationToMs(value: string | number): number | null {
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  const match = str.match(/^([\d.]+)(ms|s)?$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  return unit === 's' ? num * 1000 : num;
}

/**
 * Convert duration to ms format
 */
export function timeToMs(value: string | number): string {
  const ms = parseDurationToMs(value);
  if (ms === null) return String(value);
  return `${ms}ms`;
}

/**
 * Convert duration to s format
 */
export function timeToS(value: string | number): string {
  const ms = parseDurationToMs(value);
  if (ms === null) return String(value);
  return `${ms / 1000}s`;
}

// ============================================
// Transform Application
// ============================================

/**
 * Get the name transform function for a transform type
 */
function getNameTransformFn(type: TransformType): ((parts: string[]) => string) | null {
  switch (type) {
    case 'name/camel':
      return toCamelCase;
    case 'name/kebab':
      return toKebabCase;
    case 'name/snake':
      return toSnakeCase;
    case 'name/constant':
      return toConstantCase;
    case 'name/pascal':
      return toPascalCase;
    default:
      return null;
  }
}

/**
 * Get the value transform function for a transform type
 */
function getValueTransformFn(type: TransformType): ((value: string) => string) | null {
  switch (type) {
    case 'color/hex':
      return colorToHex;
    case 'color/rgb':
      return colorToRgb;
    case 'color/rgba':
      return colorToRgba;
    case 'color/hsl':
      return colorToHsl;
    case 'size/px':
      return (v) => sizeToPx(v);
    case 'size/rem':
      return (v) => sizeToRem(v);
    case 'size/em':
      return (v) => sizeToEm(v);
    case 'time/ms':
      return (v) => timeToMs(v);
    case 'time/s':
      return (v) => timeToS(v);
    default:
      return null;
  }
}

/**
 * Check if a transform should apply to a token based on its matcher
 */
function shouldApplyTransform(transform: Transform, token: ResolvedToken): boolean {
  if (!transform.matcher) return true;

  const matcher = transform.matcher.toLowerCase();
  const tokenType = (token.type || '').toLowerCase();

  // Direct type match
  if (tokenType === matcher) return true;

  // Name-based matching for name transforms
  if (transform.type.startsWith('name/')) return true;

  // Type-based matching for value transforms
  if (transform.type.startsWith('color/') && tokenType === 'color') return true;
  if (transform.type.startsWith('size/') && (tokenType === 'dimension' || tokenType === 'spacing')) return true;
  if (transform.type.startsWith('time/') && tokenType === 'duration') return true;

  return false;
}

/**
 * Apply transforms to a list of resolved tokens
 */
export function applyTransforms(
  tokens: ResolvedToken[],
  transforms: Transform[]
): TransformedToken[] {
  return tokens.map(token => {
    let transformedName = token.path.join('-');
    let transformedValue = String(token.value);

    for (const transform of transforms) {
      if (!shouldApplyTransform(transform, token)) continue;

      // Apply name transform
      const nameFn = getNameTransformFn(transform.type);
      if (nameFn) {
        transformedName = nameFn(token.path);
      }

      // Apply value transform
      const valueFn = getValueTransformFn(transform.type);
      if (valueFn) {
        transformedValue = valueFn(transformedValue);
      }
    }

    return {
      ...token,
      transformedName,
      transformedValue,
    };
  });
}
