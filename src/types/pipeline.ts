// Pipeline Types for Build Configuration
// Based on Style Dictionary patterns for multi-brand, multi-platform token builds

import type { BuildSettings } from './build';

/**
 * A variable/dimension that can be substituted in layer paths
 * Examples: brand, platform, mode
 */
export interface PipelineVariable {
  id: string;
  name: string;        // Display name: "Brand", "Platform", "Mode"
  key: string;         // Key used in paths: "brand", "platform", "mode"
  values: string[];    // Possible values: ["disney", "espn", "hulu"]
  defaultValue?: string; // Which value is default (first value if not specified)
}

/**
 * Context for what layer/page view is currently active
 * Used to distinguish between parent schema view and child page view
 */
export interface LayerViewContext {
  layerId: string;
  isSchemaView: boolean;  // true = viewing parent layer schema (keys only)
  variableValues?: Record<string, string>;  // set when viewing a specific child page
}

/**
 * A layer in the build pipeline
 * Layers are merged in order (bottom wins/overrides top)
 */
export interface PipelineLayer {
  id: string;
  name: string;        // Display name: "Brand Base", "Semantic Mode"
  order: number;       // Position in pipeline (0 = top/base, higher = bottom/overrides)

  /**
   * Which variables this layer depends on
   * [] = static layer, one page total (e.g., "Primitives")
   * ["mode"] = one page per mode value (e.g., "light", "dark")
   * ["brand", "mode"] = one page per brand×mode combination
   */
  variables: string[]; // Variable keys

  /**
   * If true, build fails when no page exists for this layer+variables combo
   * If false, missing pages are silently skipped
   */
  required: boolean;

  /**
   * Optional description for the layer
   */
  description?: string;
}

/**
 * The complete pipeline configuration
 */
export interface TokenPipeline {
  id: string;
  name: string;
  description?: string;
  variables: PipelineVariable[];
  layers: PipelineLayer[];
  buildSettings?: BuildSettings;

  // Database fields (when persisted)
  versionId?: string; // Parent version in database
}

/**
 * A page fills a "slot" in a layer
 * For layers with variables, multiple pages exist (one per variable combination)
 */
export interface PipelinePage {
  id: string;
  layerId: string;

  /**
   * The variable values this page represents
   * {} for static layers (no variables)
   * { mode: "light" } for mode-specific layer
   * { brand: "disney", mode: "light" } for brand×mode layer
   */
  variableValues: Record<string, string>;

  /**
   * The tokens defined in this page
   */
  tokens: import('./tokens').DesignTokenFile;

  // Database fields (when persisted)
  pipelineId?: string; // Parent pipeline in database
}

/**
 * A build configuration specifies which variable values to use
 */
export interface BuildConfig {
  id: string;
  name: string;

  /**
   * Selected value for each variable
   * { brand: "disney", platform: "mobile", mode: "light" }
   */
  selections: Record<string, string>;
}

/**
 * Result of resolving which pages to merge for a build config
 */
export interface ResolvedBuildPath {
  config: BuildConfig;
  pages: Array<{
    layer: PipelineLayer;
    page: PipelinePage | null;  // null if optional and missing
    status: 'found' | 'missing-optional' | 'missing-required';
  }>;
}

/**
 * Get all possible build configurations (cartesian product of variables)
 */
export function getAllBuildConfigs(pipeline: TokenPipeline): BuildConfig[] {
  const { variables } = pipeline;

  if (variables.length === 0) {
    return [{ id: 'default', name: 'Default', selections: {} }];
  }

  // Generate cartesian product of all variable values
  const configs: BuildConfig[] = [];

  function generate(index: number, current: Record<string, string>) {
    if (index >= variables.length) {
      const name = Object.values(current).join(' / ') || 'Default';
      configs.push({
        id: Object.entries(current).map(([k, v]) => `${k}-${v}`).join('_') || 'default',
        name,
        selections: { ...current },
      });
      return;
    }

    const variable = variables[index];
    for (const value of variable.values) {
      generate(index + 1, { ...current, [variable.key]: value });
    }
  }

  generate(0, {});
  return configs;
}

/**
 * Get the page slots needed for a layer
 * Returns all combinations of variable values that need pages
 */
export function getLayerSlots(
  layer: PipelineLayer,
  variables: PipelineVariable[]
): Array<Record<string, string>> {
  const layerVarKeys = layer.variables || [];
  if (layerVarKeys.length === 0) {
    return [{}]; // Static layer, one slot
  }

  // Get the variables this layer uses
  const layerVars = layerVarKeys.map(key =>
    variables.find(v => v.key === key)
  ).filter((v): v is PipelineVariable => v !== undefined);

  if (layerVars.length === 0) {
    return [{}];
  }

  // Generate combinations
  const slots: Array<Record<string, string>> = [];

  function generate(index: number, current: Record<string, string>) {
    if (index >= layerVars.length) {
      slots.push({ ...current });
      return;
    }

    const variable = layerVars[index];
    for (const value of variable.values) {
      generate(index + 1, { ...current, [variable.key]: value });
    }
  }

  generate(0, {});
  return slots;
}

/**
 * Find the page that matches a layer and build config
 */
export function findPageForLayerAndConfig(
  layer: PipelineLayer,
  config: BuildConfig,
  pages: PipelinePage[]
): PipelinePage | undefined {
  // Get the variable values needed for this layer from the config
  const neededValues: Record<string, string> = {};
  const layerVarKeys = layer.variables || [];
  for (const varKey of layerVarKeys) {
    if (config.selections[varKey]) {
      neededValues[varKey] = config.selections[varKey];
    }
  }

  // Find a page that matches this layer and variable values
  return pages.find(page => {
    if (page.layerId !== layer.id) return false;

    // Check all variable values match
    for (const [key, value] of Object.entries(neededValues)) {
      if (page.variableValues[key] !== value) return false;
    }

    // Check page doesn't have extra variables
    for (const key of Object.keys(page.variableValues)) {
      if (!neededValues.hasOwnProperty(key)) return false;
    }

    return true;
  });
}

/**
 * Resolve the build path for a configuration
 * Returns which pages will be merged and in what order
 */
export function resolveBuildPath(
  pipeline: TokenPipeline,
  pages: PipelinePage[],
  config: BuildConfig
): ResolvedBuildPath {
  const sortedLayers = [...pipeline.layers].sort((a, b) => a.order - b.order);

  return {
    config,
    pages: sortedLayers.map(layer => {
      const page = findPageForLayerAndConfig(layer, config, pages);

      let status: 'found' | 'missing-optional' | 'missing-required';
      if (page) {
        status = 'found';
      } else if (layer.required) {
        status = 'missing-required';
      } else {
        status = 'missing-optional';
      }

      return { layer, page: page || null, status };
    }),
  };
}

/**
 * Format a slot's variable values as a display string
 */
export function formatSlotName(slot: Record<string, string>): string {
  const values = Object.values(slot);
  if (values.length === 0) return '(default)';
  return values.join(' / ');
}

/**
 * Format a slot's variable values as a path-like string
 */
export function formatSlotPath(slot: Record<string, string>): string {
  const values = Object.values(slot);
  if (values.length === 0) return 'default';
  return values.join('/');
}

// ============================================
// Schema and Extension Utilities
// ============================================

/**
 * Get the default value for a variable (first value if not specified)
 */
export function getDefaultVariableValue(variable: PipelineVariable): string {
  return variable.defaultValue || variable.values[0] || '';
}

/**
 * Flatten tokens to get all paths
 */
function flattenTokenPaths(
  obj: Record<string, unknown>,
  prefix: string[] = []
): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;

    const currentPath = [...prefix, key];

    if (value && typeof value === 'object' && '$value' in value) {
      // It's a token
      paths.push(currentPath.join('.'));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // It's a group, recurse
      paths.push(...flattenTokenPaths(value as Record<string, unknown>, currentPath));
    }
  }

  return paths;
}

/**
 * Get the schema keys for a layer (union of all token paths across child pages)
 */
export function getSchemaKeys(
  layerId: string,
  pages: PipelinePage[]
): string[] {
  const childPages = pages.filter(p => p.layerId === layerId);
  const allKeys = new Set<string>();

  for (const page of childPages) {
    const paths = flattenTokenPaths(page.tokens as Record<string, unknown>);
    paths.forEach(p => allKeys.add(p));
  }

  return Array.from(allKeys).sort();
}

/**
 * Get extended keys for a specific page (keys that don't exist in sibling pages)
 * Extended keys are tokens added by this child that aren't in the shared schema
 */
export function getExtendedKeys(
  page: PipelinePage,
  siblingPages: PipelinePage[]
): string[] {
  // If there's only one page (no siblings), nothing is "extended"
  // Extended only makes sense when comparing variants (light vs dark, etc.)
  const actualSiblings = siblingPages.filter(p => p.id !== page.id);
  if (actualSiblings.length === 0) {
    return [];
  }

  const pageKeys = new Set(flattenTokenPaths(page.tokens as Record<string, unknown>));

  // Get keys that exist in at least one sibling
  const siblingKeys = new Set<string>();
  for (const sibling of actualSiblings) {
    const paths = flattenTokenPaths(sibling.tokens as Record<string, unknown>);
    paths.forEach(p => siblingKeys.add(p));
  }

  // Extended keys = keys in this page that don't exist in any sibling
  return Array.from(pageKeys).filter(key => !siblingKeys.has(key));
}

/**
 * Get shared schema keys (keys that exist in ALL child pages)
 */
export function getSharedSchemaKeys(
  layerId: string,
  pages: PipelinePage[]
): string[] {
  const childPages = pages.filter(p => p.layerId === layerId);
  if (childPages.length === 0) return [];
  if (childPages.length === 1) {
    return flattenTokenPaths(childPages[0].tokens as Record<string, unknown>);
  }

  // Start with keys from first page
  const firstPageKeys = new Set(
    flattenTokenPaths(childPages[0].tokens as Record<string, unknown>)
  );

  // Intersect with keys from other pages
  for (let i = 1; i < childPages.length; i++) {
    const pageKeys = new Set(
      flattenTokenPaths(childPages[i].tokens as Record<string, unknown>)
    );
    for (const key of firstPageKeys) {
      if (!pageKeys.has(key)) {
        firstPageKeys.delete(key);
      }
    }
  }

  return Array.from(firstPageKeys).sort();
}

// ============================================
// Predefined Pipeline Templates
// ============================================

export const PIPELINE_TEMPLATES: Omit<TokenPipeline, 'id'>[] = [
  {
    name: 'Simple Light/Dark Mode',
    description: 'Basic setup with light and dark mode support',
    variables: [
      { id: 'var-mode', name: 'Mode', key: 'mode', values: ['light', 'dark'] },
    ],
    layers: [
      { id: 'layer-1', name: 'Primitives', order: 0, variables: [], required: true, description: 'Base color scales, spacing, typography' },
      { id: 'layer-2', name: 'Semantic', order: 1, variables: ['mode'], required: true, description: 'Semantic tokens (per mode)' },
      { id: 'layer-3', name: 'Components', order: 2, variables: [], required: true, description: 'Component-specific tokens' },
    ],
  },
  {
    name: 'Multi-Brand',
    description: 'Multiple brands with shared primitives and light/dark modes',
    variables: [
      { id: 'var-brand', name: 'Brand', key: 'brand', values: ['brand-a', 'brand-b'] },
      { id: 'var-mode', name: 'Mode', key: 'mode', values: ['light', 'dark'] },
    ],
    layers: [
      { id: 'layer-1', name: 'Primitives', order: 0, variables: [], required: true, description: 'Shared base tokens' },
      { id: 'layer-2', name: 'Semantic', order: 1, variables: ['brand', 'mode'], required: true, description: 'Semantic tokens (per brand + mode)' },
      { id: 'layer-3', name: 'Components', order: 2, variables: [], required: true, description: 'Component tokens' },
    ],
  },
  {
    name: 'Enterprise (Brand × Platform × Mode)',
    description: 'Full enterprise setup with brands, platforms, and modes',
    variables: [
      { id: 'var-brand', name: 'Brand', key: 'brand', values: ['brand-a', 'brand-b', 'brand-c'] },
      { id: 'var-platform', name: 'Platform', key: 'platform', values: ['web', 'ios', 'android'] },
      { id: 'var-mode', name: 'Mode', key: 'mode', values: ['light', 'dark'] },
    ],
    layers: [
      { id: 'layer-1', name: 'Primitives', order: 0, variables: [], required: true, description: 'Shared base tokens' },
      { id: 'layer-2', name: 'Semantic', order: 1, variables: ['brand', 'mode'], required: true, description: 'Semantic tokens (per brand + mode)' },
      { id: 'layer-3', name: 'Platform', order: 2, variables: ['platform'], required: false, description: 'Platform-specific overrides' },
      { id: 'layer-4', name: 'Components', order: 3, variables: [], required: true, description: 'Component tokens' },
    ],
  },
];
