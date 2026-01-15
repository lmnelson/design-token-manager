// Build Configuration Types for Style Dictionary-compatible output
// Supports multiple platforms, transforms, and output formats

/**
 * Output format types
 */
export type OutputFormat =
  | 'css'
  | 'scss'
  | 'tailwind'
  | 'json'
  | 'xml'
  | 'ios-swift'
  | 'android-xml';

/**
 * Transform types (matches Style Dictionary naming conventions)
 */
export type TransformType =
  // Name transforms
  | 'name/camel'
  | 'name/kebab'
  | 'name/snake'
  | 'name/constant'
  | 'name/pascal'
  // Color transforms
  | 'color/hex'
  | 'color/rgb'
  | 'color/rgba'
  | 'color/hsl'
  // Size transforms
  | 'size/px'
  | 'size/rem'
  | 'size/em'
  // Time transforms
  | 'time/ms'
  | 'time/s';

/**
 * A transform configuration
 */
export interface Transform {
  id: string;
  name: string;
  type: TransformType;
  matcher?: string; // Token type matcher (e.g., "color", "dimension")
}

/**
 * Output configuration for a specific format
 */
export interface OutputConfig {
  id: string;
  format: OutputFormat;
  enabled: boolean;
  fileName: string;
  options: Record<string, unknown>;
}

/**
 * A build platform configuration (e.g., "Web", "iOS", "Android")
 */
export interface BuildPlatform {
  id: string;
  name: string;
  transforms: Transform[];
  outputs: OutputConfig[];
  prefix?: string; // Token prefix (e.g., "--" for CSS, "$" for SCSS)
}

/**
 * Package configuration for distribution
 */
export interface PackageConfig {
  name: string;
  version: string;
  description?: string;
  // NPM specific
  npmScope?: string;
  npmRegistry?: string;
  // CocoaPods specific
  podName?: string;
  // Android specific
  androidPackage?: string;
}

/**
 * Complete build settings for a pipeline
 */
export interface BuildSettings {
  platforms: BuildPlatform[];
  package: PackageConfig;
  styleDictionaryConfig?: Record<string, unknown>; // Raw SD config for import/export
}

/**
 * Result of building tokens for a platform
 */
export interface BuildResult {
  platform: string;
  outputs: Array<{
    format: OutputFormat;
    fileName: string;
    content: string;
  }>;
}

/**
 * A flattened, resolved token ready for transformation
 */
export interface ResolvedToken {
  path: string[];
  name: string;
  value: unknown;
  type?: string;
  original?: unknown;
}

/**
 * A token after transforms have been applied
 */
export interface TransformedToken extends ResolvedToken {
  transformedName: string;
  transformedValue: string;
}

// ============================================
// Predefined Transform Presets
// ============================================

export const TRANSFORM_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  transforms: Omit<Transform, 'id'>[];
}> = [
  {
    id: 'web',
    name: 'Web (CSS)',
    description: 'Kebab-case names, hex colors, pixel sizes',
    transforms: [
      { name: 'Kebab Case', type: 'name/kebab' },
      { name: 'Hex Colors', type: 'color/hex' },
      { name: 'Pixels', type: 'size/px' },
    ],
  },
  {
    id: 'web-rem',
    name: 'Web (CSS with REM)',
    description: 'Kebab-case names, hex colors, rem sizes',
    transforms: [
      { name: 'Kebab Case', type: 'name/kebab' },
      { name: 'Hex Colors', type: 'color/hex' },
      { name: 'REM Units', type: 'size/rem' },
    ],
  },
  {
    id: 'scss',
    name: 'SCSS',
    description: 'Kebab-case names with $ prefix',
    transforms: [
      { name: 'Kebab Case', type: 'name/kebab' },
      { name: 'Hex Colors', type: 'color/hex' },
      { name: 'Pixels', type: 'size/px' },
    ],
  },
  {
    id: 'ios',
    name: 'iOS (Swift)',
    description: 'Camel-case names, RGBA colors',
    transforms: [
      { name: 'Camel Case', type: 'name/camel' },
      { name: 'RGBA Colors', type: 'color/rgba' },
      { name: 'Pixels', type: 'size/px' },
    ],
  },
  {
    id: 'android',
    name: 'Android',
    description: 'Snake-case names, hex colors',
    transforms: [
      { name: 'Snake Case', type: 'name/snake' },
      { name: 'Hex Colors', type: 'color/hex' },
      { name: 'Pixels', type: 'size/px' },
    ],
  },
  {
    id: 'js',
    name: 'JavaScript/TypeScript',
    description: 'Camel-case names for JS modules',
    transforms: [
      { name: 'Camel Case', type: 'name/camel' },
      { name: 'Hex Colors', type: 'color/hex' },
      { name: 'Pixels', type: 'size/px' },
    ],
  },
];

// ============================================
// Output Format Metadata
// ============================================

export const OUTPUT_FORMATS: Array<{
  id: OutputFormat;
  label: string;
  description: string;
  extension: string;
  language: string; // For syntax highlighting
}> = [
  {
    id: 'css',
    label: 'CSS',
    description: 'CSS custom properties',
    extension: '.css',
    language: 'css',
  },
  {
    id: 'scss',
    label: 'SCSS',
    description: 'SCSS variables',
    extension: '.scss',
    language: 'scss',
  },
  {
    id: 'tailwind',
    label: 'Tailwind',
    description: 'Tailwind CSS config',
    extension: '.js',
    language: 'javascript',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'JSON tokens',
    extension: '.json',
    language: 'json',
  },
  {
    id: 'xml',
    label: 'XML',
    description: 'XML format',
    extension: '.xml',
    language: 'xml',
  },
  {
    id: 'ios-swift',
    label: 'iOS Swift',
    description: 'Swift UIColor/CGFloat extensions',
    extension: '.swift',
    language: 'swift',
  },
  {
    id: 'android-xml',
    label: 'Android XML',
    description: 'Android resource XML',
    extension: '.xml',
    language: 'xml',
  },
];

// ============================================
// Default Build Settings
// ============================================

export const DEFAULT_BUILD_SETTINGS: BuildSettings = {
  platforms: [
    {
      id: 'web',
      name: 'Web',
      prefix: '--',
      transforms: [
        { id: 't1', name: 'Kebab Case', type: 'name/kebab' },
        { id: 't2', name: 'Hex Colors', type: 'color/hex' },
        { id: 't3', name: 'Pixels', type: 'size/px' },
      ],
      outputs: [
        { id: 'o1', format: 'css', enabled: true, fileName: 'tokens.css', options: {} },
        { id: 'o2', format: 'json', enabled: true, fileName: 'tokens.json', options: {} },
      ],
    },
  ],
  package: {
    name: 'design-tokens',
    version: '1.0.0',
  },
};
