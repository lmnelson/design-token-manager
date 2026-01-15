// Style Dictionary configuration import/export utilities
// Allows interoperability with existing Style Dictionary setups

import type {
  BuildSettings,
  BuildPlatform,
  Transform,
  OutputConfig,
  TransformType,
  OutputFormat,
} from '@/types/build';

// ============================================
// Style Dictionary Config Types
// ============================================

interface StyleDictionaryConfig {
  source?: string[];
  include?: string[];
  platforms?: Record<string, StyleDictionaryPlatform>;
}

interface StyleDictionaryPlatform {
  transformGroup?: string;
  transforms?: string[];
  buildPath?: string;
  prefix?: string;
  files?: StyleDictionaryFile[];
  options?: Record<string, unknown>;
}

interface StyleDictionaryFile {
  destination: string;
  format: string;
  filter?: unknown;
  options?: Record<string, unknown>;
}

// ============================================
// Transform Mapping
// ============================================

// Map Style Dictionary transform names to our transform types
const SD_TRANSFORM_MAP: Record<string, TransformType> = {
  // Name transforms
  'name/cti/camel': 'name/camel',
  'name/cti/kebab': 'name/kebab',
  'name/cti/snake': 'name/snake',
  'name/cti/constant': 'name/constant',
  'name/cti/pascal': 'name/pascal',
  'name/camel': 'name/camel',
  'name/kebab': 'name/kebab',
  'name/snake': 'name/snake',
  'name/constant': 'name/constant',
  'name/pascal': 'name/pascal',

  // Color transforms
  'color/hex': 'color/hex',
  'color/rgb': 'color/rgb',
  'color/hsl': 'color/hsl',
  'color/UIColor': 'color/rgba',
  'color/UIColorSwift': 'color/rgba',
  'color/css': 'color/hex',

  // Size transforms
  'size/px': 'size/px',
  'size/rem': 'size/rem',
  'size/remToPx': 'size/px',
  'size/pxToRem': 'size/rem',

  // Time transforms
  'time/seconds': 'time/s',
  'time/milliseconds': 'time/ms',
};

// Reverse map for export
const TRANSFORM_TO_SD_MAP: Record<TransformType, string> = {
  'name/camel': 'name/cti/camel',
  'name/kebab': 'name/cti/kebab',
  'name/snake': 'name/cti/snake',
  'name/constant': 'name/cti/constant',
  'name/pascal': 'name/cti/pascal',
  'color/hex': 'color/hex',
  'color/rgb': 'color/rgb',
  'color/rgba': 'color/UIColorSwift',
  'color/hsl': 'color/hsl',
  'size/px': 'size/px',
  'size/rem': 'size/rem',
  'size/em': 'size/rem',
  'time/ms': 'time/milliseconds',
  'time/s': 'time/seconds',
};

// Map Style Dictionary format names to our output formats
const SD_FORMAT_MAP: Record<string, OutputFormat> = {
  'css/variables': 'css',
  'scss/variables': 'scss',
  'scss/map-flat': 'scss',
  'scss/map-deep': 'scss',
  'json': 'json',
  'json/flat': 'json',
  'json/nested': 'json',
  'javascript/module': 'json',
  'javascript/es6': 'json',
  'ios-swift/class.swift': 'ios-swift',
  'ios-swift/enum.swift': 'ios-swift',
  'android/resources': 'android-xml',
  'android/colors': 'android-xml',
};

// Reverse map for export
const FORMAT_TO_SD_MAP: Record<OutputFormat, string> = {
  'css': 'css/variables',
  'scss': 'scss/variables',
  'tailwind': 'javascript/module',
  'json': 'json/nested',
  'xml': 'json',
  'ios-swift': 'ios-swift/class.swift',
  'android-xml': 'android/resources',
};

// Standard transform groups
const SD_TRANSFORM_GROUPS: Record<string, TransformType[]> = {
  'web': ['name/kebab', 'color/hex', 'size/px'],
  'css': ['name/kebab', 'color/hex', 'size/px'],
  'scss': ['name/kebab', 'color/hex', 'size/px'],
  'less': ['name/kebab', 'color/hex', 'size/px'],
  'js': ['name/camel', 'color/hex', 'size/px'],
  'ios': ['name/pascal', 'color/rgba', 'size/px'],
  'ios-swift': ['name/camel', 'color/rgba', 'size/px'],
  'ios-swift-separate': ['name/camel', 'color/rgba', 'size/px'],
  'android': ['name/snake', 'color/hex', 'size/px'],
};

// ============================================
// Import Functions
// ============================================

/**
 * Import a Style Dictionary configuration and convert to BuildSettings
 */
export function importStyleDictionaryConfig(config: unknown): BuildSettings {
  const sdConfig = config as StyleDictionaryConfig & Record<string, unknown>;

  if (!sdConfig || typeof sdConfig !== 'object') {
    throw new Error('Invalid Style Dictionary configuration');
  }

  const platforms: BuildPlatform[] = [];

  if (sdConfig.platforms) {
    for (const [platformName, platformConfig] of Object.entries(sdConfig.platforms)) {
      const platform = importPlatform(platformName, platformConfig);
      platforms.push(platform);
    }
  }

  // If no platforms defined, create a default one
  if (platforms.length === 0) {
    platforms.push({
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
      ],
    });
  }

  return {
    platforms,
    package: {
      name: 'design-tokens',
      version: '1.0.0',
    },
    styleDictionaryConfig: sdConfig,
  };
}

function importPlatform(name: string, config: StyleDictionaryPlatform): BuildPlatform {
  const transforms: Transform[] = [];

  // Get transforms from transform group or individual transforms
  let transformTypes: TransformType[] = [];

  if (config.transformGroup && SD_TRANSFORM_GROUPS[config.transformGroup]) {
    transformTypes = SD_TRANSFORM_GROUPS[config.transformGroup];
  } else if (config.transforms) {
    transformTypes = config.transforms
      .map(t => SD_TRANSFORM_MAP[t])
      .filter((t): t is TransformType => t !== undefined);
  }

  // Create transform objects
  transformTypes.forEach((type, index) => {
    transforms.push({
      id: `t${index + 1}`,
      name: formatTransformName(type),
      type,
    });
  });

  // If no transforms found, use defaults
  if (transforms.length === 0) {
    transforms.push(
      { id: 't1', name: 'Kebab Case', type: 'name/kebab' },
      { id: 't2', name: 'Hex Colors', type: 'color/hex' },
      { id: 't3', name: 'Pixels', type: 'size/px' }
    );
  }

  // Convert files to outputs
  const outputs: OutputConfig[] = [];

  if (config.files) {
    config.files.forEach((file, index) => {
      const format = SD_FORMAT_MAP[file.format];
      if (format) {
        outputs.push({
          id: `o${index + 1}`,
          format,
          enabled: true,
          fileName: file.destination.split('/').pop() || `tokens.${format}`,
          options: file.options || {},
        });
      }
    });
  }

  // If no outputs found, create default
  if (outputs.length === 0) {
    outputs.push({
      id: 'o1',
      format: 'css',
      enabled: true,
      fileName: 'tokens.css',
      options: {},
    });
  }

  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: formatPlatformName(name),
    prefix: config.prefix || (name.toLowerCase().includes('css') ? '--' : ''),
    transforms,
    outputs,
  };
}

function formatTransformName(type: TransformType): string {
  const names: Record<TransformType, string> = {
    'name/camel': 'Camel Case',
    'name/kebab': 'Kebab Case',
    'name/snake': 'Snake Case',
    'name/constant': 'Constant Case',
    'name/pascal': 'Pascal Case',
    'color/hex': 'Hex Colors',
    'color/rgb': 'RGB Colors',
    'color/rgba': 'RGBA Colors',
    'color/hsl': 'HSL Colors',
    'size/px': 'Pixels',
    'size/rem': 'REM Units',
    'size/em': 'EM Units',
    'time/ms': 'Milliseconds',
    'time/s': 'Seconds',
  };
  return names[type] || type;
}

function formatPlatformName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================
// Export Functions
// ============================================

/**
 * Export BuildSettings to Style Dictionary configuration format
 */
export function exportStyleDictionaryConfig(settings: BuildSettings): StyleDictionaryConfig {
  const platforms: Record<string, StyleDictionaryPlatform> = {};

  for (const platform of settings.platforms) {
    const sdPlatform = exportPlatform(platform);
    platforms[platform.id] = sdPlatform;
  }

  return {
    source: ['tokens/**/*.json'],
    platforms,
  };
}

function exportPlatform(platform: BuildPlatform): StyleDictionaryPlatform {
  // Convert transforms to SD transform names
  const transforms = platform.transforms
    .map(t => TRANSFORM_TO_SD_MAP[t.type])
    .filter(Boolean);

  // Convert outputs to SD files
  const files: StyleDictionaryFile[] = platform.outputs
    .filter(o => o.enabled)
    .map(output => ({
      destination: output.fileName,
      format: FORMAT_TO_SD_MAP[output.format] || 'json',
      options: output.options,
    }));

  return {
    transforms,
    prefix: platform.prefix,
    buildPath: `build/${platform.id}/`,
    files,
  };
}

// ============================================
// Validation
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a Style Dictionary configuration
 */
export function validateStyleDictionaryConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'], warnings: [] };
  }

  const sdConfig = config as StyleDictionaryConfig;

  // Check for platforms
  if (!sdConfig.platforms || Object.keys(sdConfig.platforms).length === 0) {
    warnings.push('No platforms defined. A default platform will be created.');
  }

  // Validate each platform
  if (sdConfig.platforms) {
    for (const [name, platform] of Object.entries(sdConfig.platforms)) {
      // Check for transform group or transforms
      if (!platform.transformGroup && (!platform.transforms || platform.transforms.length === 0)) {
        warnings.push(`Platform "${name}" has no transforms defined. Default transforms will be used.`);
      }

      // Check for files
      if (!platform.files || platform.files.length === 0) {
        warnings.push(`Platform "${name}" has no output files defined. Default output will be created.`);
      }

      // Check for unsupported formats
      if (platform.files) {
        for (const file of platform.files) {
          if (!SD_FORMAT_MAP[file.format]) {
            warnings.push(`Unsupported format "${file.format}" in platform "${name}". It will be converted to JSON.`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse a JSON string as Style Dictionary config
 */
export function parseStyleDictionaryJSON(json: string): {
  config: StyleDictionaryConfig | null;
  validation: ValidationResult;
} {
  try {
    const parsed = JSON.parse(json);
    const validation = validateStyleDictionaryConfig(parsed);
    return {
      config: validation.valid || validation.warnings.length > 0 ? parsed : null,
      validation,
    };
  } catch (e) {
    return {
      config: null,
      validation: {
        valid: false,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`],
        warnings: [],
      },
    };
  }
}
