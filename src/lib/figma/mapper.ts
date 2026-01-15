import type { FlattenedToken, TokenType, TypographyValue, DimensionValue } from '@/types/tokens';
import type { StyleBinding, TokenMapping } from '@/stores/figmaStore';
import { hexToRgba, rgbaToHex } from '@/lib/flow/utils';

// Color distance using CIE76 formula (simple Euclidean in Lab space)
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgba(hex1);
  const rgb2 = hexToRgba(hex2);

  if (!rgb1 || !rgb2) return Infinity;

  // Simple RGB distance (not perceptually uniform, but fast)
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  const da = (rgb1.a - rgb2.a) * 255;

  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

// Check if two colors are "close enough" to be considered a match
function isColorMatch(hex1: string, hex2: string, threshold: number = 5): boolean {
  return colorDistance(hex1, hex2) < threshold;
}

// Normalize a hex color to lowercase 6-digit format
function normalizeHex(hex: string): string {
  const rgba = hexToRgba(hex);
  if (!rgba) return hex.toLowerCase();
  return rgbaToHex(rgba.r, rgba.g, rgba.b, rgba.a).toLowerCase();
}

// Match a color binding to tokens
function matchColorBinding(
  binding: StyleBinding,
  tokens: FlattenedToken[]
): TokenMapping | null {
  const bindingColor = normalizeHex(binding.value as string);
  const colorTokens = tokens.filter((t) => t.resolvedType === 'color');

  // First, look for exact matches
  for (const token of colorTokens) {
    if (typeof token.token.$value === 'string') {
      const tokenColor = normalizeHex(token.token.$value);
      if (bindingColor === tokenColor) {
        return {
          binding,
          tokenPath: token.path,
          confidence: 1,
          matchType: 'exact',
        };
      }
    }
  }

  // Then look for approximate matches
  let bestMatch: { token: FlattenedToken; distance: number } | null = null;

  for (const token of colorTokens) {
    if (typeof token.token.$value === 'string') {
      const tokenColor = normalizeHex(token.token.$value);
      const distance = colorDistance(bindingColor, tokenColor);

      if (distance < 30 && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { token, distance };
      }
    }
  }

  if (bestMatch) {
    const confidence = Math.max(0, 1 - bestMatch.distance / 30);
    return {
      binding,
      tokenPath: bestMatch.token.path,
      confidence,
      matchType: 'approximate',
    };
  }

  return null;
}

// Match a typography binding to tokens
function matchTypographyBinding(
  binding: StyleBinding,
  tokens: FlattenedToken[]
): TokenMapping | null {
  const bindingStyle = binding.value as {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
  };

  const typographyTokens = tokens.filter((t) => t.resolvedType === 'typography');

  for (const token of typographyTokens) {
    const tokenValue = token.token.$value as TypographyValue;

    // Compare font properties
    let matchScore = 0;
    let totalChecks = 0;

    // Font family
    if (bindingStyle.fontFamily && tokenValue.fontFamily) {
      totalChecks++;
      const tokenFont =
        typeof tokenValue.fontFamily === 'string'
          ? tokenValue.fontFamily
          : tokenValue.fontFamily[0];
      if (
        bindingStyle.fontFamily.toLowerCase().includes(tokenFont.toLowerCase()) ||
        tokenFont.toLowerCase().includes(bindingStyle.fontFamily.toLowerCase())
      ) {
        matchScore++;
      }
    }

    // Font size
    if (bindingStyle.fontSize && tokenValue.fontSize) {
      totalChecks++;
      const tokenSize =
        typeof tokenValue.fontSize === 'object'
          ? (tokenValue.fontSize as DimensionValue).value
          : tokenValue.fontSize;
      if (Math.abs(bindingStyle.fontSize - (tokenSize as number)) < 2) {
        matchScore++;
      }
    }

    // Font weight
    if (bindingStyle.fontWeight && tokenValue.fontWeight) {
      totalChecks++;
      const tokenWeight =
        typeof tokenValue.fontWeight === 'number'
          ? tokenValue.fontWeight
          : weightNameToNumber(tokenValue.fontWeight as string);
      if (Math.abs(bindingStyle.fontWeight - tokenWeight) < 100) {
        matchScore++;
      }
    }

    if (totalChecks > 0 && matchScore / totalChecks >= 0.5) {
      return {
        binding,
        tokenPath: token.path,
        confidence: matchScore / totalChecks,
        matchType: matchScore === totalChecks ? 'exact' : 'approximate',
      };
    }
  }

  return null;
}

// Match a spacing binding to tokens
function matchSpacingBinding(
  binding: StyleBinding,
  tokens: FlattenedToken[]
): TokenMapping | null {
  const spacingTokens = tokens.filter((t) => t.resolvedType === 'dimension');

  // Extract numeric values from the binding
  const bindingValues: number[] = [];
  const value = binding.value as Record<string, number>;

  if (typeof value === 'number') {
    bindingValues.push(value);
  } else if (typeof value === 'object') {
    Object.values(value).forEach((v) => {
      if (typeof v === 'number') {
        bindingValues.push(v);
      }
    });
  }

  // Try to match each value
  for (const bindingValue of bindingValues) {
    for (const token of spacingTokens) {
      const tokenValue = token.token.$value as DimensionValue | string;

      if (typeof tokenValue === 'object' && 'value' in tokenValue) {
        if (tokenValue.value === bindingValue) {
          return {
            binding,
            tokenPath: token.path,
            confidence: 1,
            matchType: 'exact',
          };
        }
        // Allow small variance for approximate matches
        if (Math.abs(tokenValue.value - bindingValue) <= 2) {
          return {
            binding,
            tokenPath: token.path,
            confidence: 0.8,
            matchType: 'approximate',
          };
        }
      }
    }
  }

  return null;
}

// Convert font weight name to number
function weightNameToNumber(weight: string): number {
  const weights: Record<string, number> = {
    thin: 100,
    hairline: 100,
    'extra-light': 200,
    'ultra-light': 200,
    light: 300,
    normal: 400,
    regular: 400,
    book: 400,
    medium: 500,
    'semi-bold': 600,
    'demi-bold': 600,
    bold: 700,
    'extra-bold': 800,
    'ultra-bold': 800,
    black: 900,
    heavy: 900,
  };
  return weights[weight.toLowerCase()] || 400;
}

// Main function to match all bindings to tokens
export function matchBindingsToTokens(
  bindings: StyleBinding[],
  tokens: FlattenedToken[]
): TokenMapping[] {
  const mappings: TokenMapping[] = [];

  for (const binding of bindings) {
    let mapping: TokenMapping | null = null;

    switch (binding.property) {
      case 'fill':
      case 'stroke':
        if (typeof binding.value === 'string') {
          mapping = matchColorBinding(binding, tokens);
        }
        break;

      case 'typography':
        mapping = matchTypographyBinding(binding, tokens);
        break;

      case 'spacing':
      case 'cornerRadius':
        mapping = matchSpacingBinding(binding, tokens);
        break;

      case 'effect':
        // Shadow matching would go here
        // For now, try to match the color part of the shadow
        const effectValue = binding.value as { color?: string };
        if (effectValue.color) {
          const colorBinding = { ...binding, value: effectValue.color };
          mapping = matchColorBinding(colorBinding, tokens);
        }
        break;
    }

    if (mapping) {
      mappings.push(mapping);
    }
  }

  return mappings;
}

// Group mappings by confidence level
export function groupMappingsByConfidence(mappings: TokenMapping[]): {
  exact: TokenMapping[];
  approximate: TokenMapping[];
  manual: TokenMapping[];
} {
  return {
    exact: mappings.filter((m) => m.confidence === 1),
    approximate: mappings.filter((m) => m.confidence > 0 && m.confidence < 1),
    manual: mappings.filter((m) => m.matchType === 'manual'),
  };
}

// Generate a report of token usage
export function generateTokenUsageReport(
  mappings: TokenMapping[]
): Map<string, { count: number; properties: string[] }> {
  const usage = new Map<string, { count: number; properties: string[] }>();

  for (const mapping of mappings) {
    const tokenPath = mapping.tokenPath.join('.');
    const existing = usage.get(tokenPath);

    if (existing) {
      existing.count++;
      if (!existing.properties.includes(mapping.binding.property)) {
        existing.properties.push(mapping.binding.property);
      }
    } else {
      usage.set(tokenPath, {
        count: 1,
        properties: [mapping.binding.property],
      });
    }
  }

  return usage;
}
