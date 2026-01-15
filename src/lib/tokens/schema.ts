import { z } from 'zod';
import type {
  DesignToken,
  TokenGroup,
  DesignTokenFile,
  FlattenedToken,
  TokenType,
} from '@/types/tokens';
import { isDesignToken, isTokenReference, parseTokenReference } from '@/types/tokens';

// Reference pattern - matches {path.to.token}
const referencePattern = /^\{[a-zA-Z0-9_.-]+(\.[a-zA-Z0-9_.-]+)*\}$/;

// Dimension value schema
const dimensionValueSchema = z.union([
  z.object({
    value: z.number(),
    unit: z.enum(['px', 'rem', 'em', '%']),
  }),
  z.string().regex(referencePattern),
]);

// Color value schema (hex, rgb, rgba, hsl, or reference)
const colorValueSchema = z.union([
  z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/),
  z.string().regex(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/),
  z.string().regex(/^hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+)?\s*\)$/),
  z.string().regex(referencePattern),
]);

// Font family schema
const fontFamilySchema = z.union([
  z.string(),
  z.array(z.string()),
  z.string().regex(referencePattern),
]);

// Font weight schema
const fontWeightSchema = z.union([
  z.number().min(1).max(1000),
  z.enum(['thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book', 'medium', 'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black', 'ultra-black']),
  z.string().regex(referencePattern),
]);

// Duration value schema
const durationValueSchema = z.union([
  z.object({
    value: z.number(),
    unit: z.enum(['ms', 's']),
  }),
  z.string().regex(referencePattern),
]);

// Cubic bezier schema
const cubicBezierSchema = z.union([
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
  z.string().regex(referencePattern),
]);

// Shadow value schema
const shadowValueSchema = z.union([
  z.object({
    color: colorValueSchema,
    offsetX: dimensionValueSchema,
    offsetY: dimensionValueSchema,
    blur: dimensionValueSchema,
    spread: dimensionValueSchema,
    inset: z.boolean().optional(),
  }),
  z.array(z.object({
    color: colorValueSchema,
    offsetX: dimensionValueSchema,
    offsetY: dimensionValueSchema,
    blur: dimensionValueSchema,
    spread: dimensionValueSchema,
    inset: z.boolean().optional(),
  })),
  z.string().regex(referencePattern),
]);

// Typography value schema
const typographyValueSchema = z.union([
  z.object({
    fontFamily: fontFamilySchema,
    fontSize: dimensionValueSchema,
    fontWeight: fontWeightSchema,
    letterSpacing: dimensionValueSchema.optional(),
    lineHeight: z.union([z.number(), dimensionValueSchema]).optional(),
  }),
  z.string().regex(referencePattern),
]);

// Border value schema
const borderValueSchema = z.union([
  z.object({
    color: colorValueSchema,
    width: dimensionValueSchema,
    style: z.union([
      z.enum(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset']),
      z.string().regex(referencePattern),
    ]),
  }),
  z.string().regex(referencePattern),
]);

// Token type enum schema
const tokenTypeSchema = z.enum([
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
]);

// Generic token value schema (accepts any valid value)
const tokenValueSchema = z.union([
  colorValueSchema,
  dimensionValueSchema,
  fontFamilySchema,
  fontWeightSchema,
  durationValueSchema,
  cubicBezierSchema,
  shadowValueSchema,
  typographyValueSchema,
  borderValueSchema,
  z.number(),
  z.string(),
]);

// Design token schema
const designTokenSchema = z.object({
  $value: tokenValueSchema,
  $type: tokenTypeSchema.optional(),
  $description: z.string().optional(),
  $extensions: z.record(z.string(), z.unknown()).optional(),
});

// Validate a design token
export function validateToken(token: unknown): token is DesignToken {
  const result = designTokenSchema.safeParse(token);
  return result.success;
}

// Validate token value for a specific type
export function validateTokenValue(value: unknown, type: TokenType): boolean {
  try {
    switch (type) {
      case 'color':
        return colorValueSchema.safeParse(value).success;
      case 'dimension':
        return dimensionValueSchema.safeParse(value).success;
      case 'fontFamily':
        return fontFamilySchema.safeParse(value).success;
      case 'fontWeight':
        return fontWeightSchema.safeParse(value).success;
      case 'duration':
        return durationValueSchema.safeParse(value).success;
      case 'cubicBezier':
        return cubicBezierSchema.safeParse(value).success;
      case 'number':
        return typeof value === 'number' || isTokenReference(value);
      case 'shadow':
        return shadowValueSchema.safeParse(value).success;
      case 'typography':
        return typographyValueSchema.safeParse(value).success;
      case 'border':
        return borderValueSchema.safeParse(value).success;
      default:
        return true;
    }
  } catch {
    return false;
  }
}

// Flatten a token file into a list of tokens with their paths
export function flattenTokens(
  obj: TokenGroup | DesignTokenFile,
  parentPath: string[] = [],
  inheritedType?: TokenType
): FlattenedToken[] {
  const tokens: FlattenedToken[] = [];
  const currentType = obj.$type || inheritedType;

  for (const [key, value] of Object.entries(obj)) {
    // Skip meta properties
    if (key.startsWith('$')) continue;

    const path = [...parentPath, key];

    if (isDesignToken(value)) {
      const tokenType = (value.$type || currentType) as TokenType | undefined;
      const isAlias = isTokenReference(value.$value);
      const aliasPath = isAlias ? parseTokenReference(value.$value as string) : undefined;

      tokens.push({
        path,
        name: key,
        token: value,
        resolvedType: tokenType || 'color', // Default to color if no type specified
        isAlias,
        aliasPath: aliasPath || undefined,
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into groups
      tokens.push(...flattenTokens(value as TokenGroup, path, currentType as TokenType | undefined));
    }
  }

  return tokens;
}

// Unflatten tokens back into a nested structure
export function unflattenTokens(flatTokens: FlattenedToken[]): DesignTokenFile {
  const result: DesignTokenFile = {};

  for (const flatToken of flatTokens) {
    let current: Record<string, unknown> = result;

    // Navigate/create path
    for (let i = 0; i < flatToken.path.length - 1; i++) {
      const segment = flatToken.path[i];
      if (!(segment in current)) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    // Set the token at the final path segment
    const finalKey = flatToken.path[flatToken.path.length - 1];
    current[finalKey] = flatToken.token;
  }

  return result;
}

// Resolve a token reference
export function resolveTokenReference(
  refPath: string[],
  tokens: FlattenedToken[],
  visited: Set<string> = new Set()
): FlattenedToken | null {
  const pathStr = refPath.join('.');

  // Detect circular references
  if (visited.has(pathStr)) {
    console.warn(`Circular reference detected: ${pathStr}`);
    return null;
  }

  visited.add(pathStr);

  const token = tokens.find(t => t.path.join('.') === pathStr);
  if (!token) return null;

  // If this token is also an alias, resolve it recursively
  if (token.isAlias && token.aliasPath) {
    return resolveTokenReference(token.aliasPath, tokens, visited);
  }

  return token;
}

// Validate entire token file
export function validateTokenFile(file: unknown): {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
} {
  const errors: Array<{ path: string; message: string }> = [];

  if (typeof file !== 'object' || file === null) {
    return { valid: false, errors: [{ path: '', message: 'Token file must be an object' }] };
  }

  const flatTokens = flattenTokens(file as TokenGroup);

  for (const flatToken of flatTokens) {
    const pathStr = flatToken.path.join('.');

    // Validate token structure
    if (!validateToken(flatToken.token)) {
      errors.push({ path: pathStr, message: 'Invalid token structure' });
      continue;
    }

    // Validate value matches type
    if (flatToken.resolvedType && !flatToken.isAlias) {
      if (!validateTokenValue(flatToken.token.$value, flatToken.resolvedType)) {
        errors.push({
          path: pathStr,
          message: `Value does not match type "${flatToken.resolvedType}"`,
        });
      }
    }

    // Validate references exist
    if (flatToken.isAlias && flatToken.aliasPath) {
      const resolved = resolveTokenReference(flatToken.aliasPath, flatTokens);
      if (!resolved) {
        errors.push({
          path: pathStr,
          message: `Reference "${flatToken.aliasPath.join('.')}" not found`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
