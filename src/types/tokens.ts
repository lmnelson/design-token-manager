// W3C Design Tokens Format (DTCG) Type Definitions
// https://design-tokens.github.io/community-group/format/

// Token tier/level for organizing the design system hierarchy
export type TokenTier = 'primitive' | 'semantic' | 'component';

// Brand/mode for multi-brand token support
export interface TokenMode {
  name: string;
  description?: string;
}

// Mode values - different values per mode/brand
export interface ModeValues {
  [modeName: string]: unknown; // The value for this mode
}

export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography';

// Color value - hex, rgb, rgba, hsl, or reference
export type ColorValue = string;

// Dimension value - number with unit
export interface DimensionValue {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%';
}

// Font family - string or array of strings
export type FontFamilyValue = string | string[];

// Font weight - number (100-900) or named weight
export type FontWeightValue = number | 'thin' | 'hairline' | 'extra-light' | 'ultra-light' | 'light' | 'normal' | 'regular' | 'book' | 'medium' | 'semi-bold' | 'demi-bold' | 'bold' | 'extra-bold' | 'ultra-bold' | 'black' | 'heavy' | 'extra-black' | 'ultra-black';

// Duration value - number with unit
export interface DurationValue {
  value: number;
  unit: 'ms' | 's';
}

// Cubic bezier - array of 4 numbers
export type CubicBezierValue = [number, number, number, number];

// Stroke style
export type StrokeStyleValue = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'outset' | 'inset' | {
  dashArray: (string | DimensionValue)[];
  lineCap: 'round' | 'butt' | 'square';
};

// Border composite value
export interface BorderValue {
  color: ColorValue | string; // string for references
  width: DimensionValue | string;
  style: StrokeStyleValue | string;
}

// Transition composite value
export interface TransitionValue {
  duration: DurationValue | string;
  delay: DurationValue | string;
  timingFunction: CubicBezierValue | string;
}

// Shadow value
export interface ShadowValue {
  color: ColorValue | string;
  offsetX: DimensionValue | string;
  offsetY: DimensionValue | string;
  blur: DimensionValue | string;
  spread: DimensionValue | string;
  inset?: boolean;
}

// Gradient stop
export interface GradientStop {
  color: ColorValue | string;
  position: number; // 0-1
}

// Gradient value
export interface GradientValue {
  type: 'linear' | 'radial' | 'conic';
  angle?: number; // for linear
  stops: GradientStop[];
}

// Typography composite value
export interface TypographyValue {
  fontFamily: FontFamilyValue | string;
  fontSize: DimensionValue | string;
  fontWeight: FontWeightValue | string;
  letterSpacing: DimensionValue | string;
  lineHeight: number | DimensionValue | string;
}

// Union of all possible token values
export type TokenValue =
  | ColorValue
  | DimensionValue
  | FontFamilyValue
  | FontWeightValue
  | DurationValue
  | CubicBezierValue
  | number
  | StrokeStyleValue
  | BorderValue
  | TransitionValue
  | ShadowValue
  | ShadowValue[]
  | GradientValue
  | TypographyValue
  | string; // For references like "{colors.primary}"

// Design Token
export interface DesignToken {
  $value: TokenValue;
  $type?: TokenType;
  $description?: string;
  $extensions?: {
    // Figma integration
    'com.figma'?: {
      variableId?: string;
      styleId?: string;
      scopes?: string[];
    };
    // Design Token Studio extensions
    'com.designtokenstudio'?: {
      tier?: TokenTier;
      // Mode-specific values (key is mode name, value is the token value for that mode)
      modes?: ModeValues;
    };
    [key: string]: unknown;
  };
}

// Token Group - can contain tokens or nested groups
export interface TokenGroup {
  [key: string]: DesignToken | TokenGroup | TokenType | string | undefined;
  $type?: TokenType;
  $description?: string;
}

// Full Design Token File
export interface DesignTokenFile {
  $name?: string;
  $description?: string;
  [key: string]: TokenGroup | DesignToken | string | undefined;
}

// Flattened token with full path
export interface FlattenedToken {
  path: string[];
  name: string;
  token: DesignToken;
  resolvedType: TokenType;
  isAlias: boolean;
  aliasPath?: string[];
  tier?: TokenTier;
}

// Check if a value is a reference/alias
export function isTokenReference(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\{[^}]+\}$/.test(value);
}

// Parse a reference path from a reference string
export function parseTokenReference(ref: string): string[] | null {
  const match = ref.match(/^\{([^}]+)\}$/);
  if (!match) return null;
  return match[1].split('.');
}

// Check if an object is a DesignToken
export function isDesignToken(obj: unknown): obj is DesignToken {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '$value' in obj
  );
}

// Check if an object is a TokenGroup
export function isTokenGroup(obj: unknown): obj is TokenGroup {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !('$value' in obj)
  );
}

// Token Page - a single file/layer in the token stack
export interface TokenPage {
  id: string;
  name: string;
  description?: string;
  // The tokens defined in this page
  tokens: DesignTokenFile;
  // Whether this page is a system/template page
  isTemplate?: boolean;
}

// Token Stack - ordered collection of pages (first = top/base, last = bottom/overrides)
export interface TokenStack {
  pages: TokenPage[];
  activePageId: string | null;
}

// Predefined page templates for common token structures
export const DEFAULT_PAGE_TEMPLATES: Omit<TokenPage, 'id'>[] = [
  {
    name: 'Primitives',
    description: 'Base design tokens - colors, spacing, typography scales',
    isTemplate: true,
    tokens: {
      $name: 'Primitives',
      $description: 'Base design tokens',
    },
  },
  {
    name: 'Semantic / Base',
    description: 'Semantic tokens that reference primitives',
    isTemplate: true,
    tokens: {
      $name: 'Semantic Base',
      $description: 'Base semantic tokens',
    },
  },
  {
    name: 'Semantic / Light',
    description: 'Light theme overrides',
    isTemplate: true,
    tokens: {
      $name: 'Semantic Light',
      $description: 'Light theme tokens',
    },
  },
  {
    name: 'Semantic / Dark',
    description: 'Dark theme overrides',
    isTemplate: true,
    tokens: {
      $name: 'Semantic Dark',
      $description: 'Dark theme tokens',
    },
  },
  {
    name: 'Components',
    description: 'Component-specific tokens',
    isTemplate: true,
    tokens: {
      $name: 'Components',
      $description: 'Component tokens',
    },
  },
];
