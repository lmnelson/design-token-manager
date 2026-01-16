import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TokenPipeline,
  PipelineVariable,
  PipelineLayer,
  PipelinePage,
  BuildConfig,
  ResolvedBuildPath,
  LayerViewContext,
} from '@/types/pipeline';
import {
  PIPELINE_TEMPLATES,
  getAllBuildConfigs,
  getLayerSlots,
  resolveBuildPath,
  findPageForLayerAndConfig,
  formatSlotName,
  getSchemaKeys,
  getExtendedKeys,
  getDefaultVariableValue,
} from '@/types/pipeline';
import type { DesignTokenFile } from '@/types/tokens';
import { flattenTokens } from '@/lib/tokens/schema';
import type {
  BuildSettings,
  BuildPlatform,
  Transform,
  OutputConfig,
  OutputFormat,
} from '@/types/build';
import { DEFAULT_BUILD_SETTINGS } from '@/types/build';
import { buildPreview as buildPreviewFn, buildForPlatform } from '@/lib/build/engine';

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Deep clone helper
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Deep merge (later values override earlier)
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue) &&
      !('$value' in sourceValue)
    ) {
      deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      target[key] = deepClone(sourceValue);
    }
  }
}

interface PipelineStore {
  // Pipeline configuration
  pipeline: TokenPipeline;
  pages: PipelinePage[];

  // Project context (when loaded from database)
  projectId: string | null;
  versionId: string | null;

  // Loading/saving state
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;

  // UI State
  activePageId: string | null;
  selectedBuildConfig: BuildConfig | null;
  viewContext: LayerViewContext | null;
  newlyCreatedTokenPath: string[] | null;
  sidebarSelectedTokenPath: string[] | null;

  // View context management
  setViewContext: (context: LayerViewContext | null) => void;
  getViewContext: () => LayerViewContext | null;

  // Pipeline management
  setPipeline: (pipeline: TokenPipeline) => void;
  createFromTemplate: (templateIndex: number) => void;

  // Variable management
  addVariable: (variable: Omit<PipelineVariable, 'id'>) => void;
  updateVariable: (id: string, updates: Partial<PipelineVariable>) => void;
  removeVariable: (id: string) => void;
  addVariableValue: (variableId: string, value: string) => void;
  removeVariableValue: (variableId: string, value: string) => void;

  // Layer management
  addLayer: (layer: Omit<PipelineLayer, 'id' | 'order'>) => void;
  updateLayer: (id: string, updates: Partial<PipelineLayer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Layer variants (simplified API)
  getLayerVariants: (layerId: string) => string[];
  addVariantToLayer: (layerId: string, variantName: string) => void;
  removeVariantFromLayer: (layerId: string, variantName: string) => void;

  // Page management
  getOrCreatePage: (layerId: string, variableValues: Record<string, string>) => PipelinePage;
  updatePageTokens: (pageId: string, tokens: DesignTokenFile) => void;
  setActivePage: (pageId: string | null) => void;
  getActivePage: () => PipelinePage | null;

  // Build configuration
  setSelectedBuildConfig: (config: BuildConfig | null) => void;
  getAllBuildConfigs: () => BuildConfig[];
  resolveBuildPath: (config: BuildConfig) => ResolvedBuildPath;
  buildTokens: (config: BuildConfig) => DesignTokenFile;
  buildAllTokens: () => Array<{ config: BuildConfig; tokens: DesignTokenFile }>;

  // Helpers
  getLayerSlots: (layer: PipelineLayer) => Array<Record<string, string>>;
  getPageStatus: (layerId: string, variableValues: Record<string, string>) => 'exists' | 'empty';
  getLayerCompletionStatus: (layerId: string) => { total: number; filled: number };

  // Schema and extension helpers
  getLayerSchemaKeys: (layerId: string) => string[];
  getPageExtendedKeys: (pageId: string) => string[];
  getSiblingPages: (layerId: string) => PipelinePage[];

  // Build settings management
  updateBuildSettings: (settings: Partial<BuildSettings>) => void;
  addBuildPlatform: (platform: Omit<BuildPlatform, 'id'>) => void;
  updateBuildPlatform: (platformId: string, updates: Partial<BuildPlatform>) => void;
  removeBuildPlatform: (platformId: string) => void;

  // Transform management
  addTransform: (platformId: string, transform: Omit<Transform, 'id'>) => void;
  removeTransform: (platformId: string, transformId: string) => void;
  updateTransform: (platformId: string, transformId: string, updates: Partial<Transform>) => void;

  // Output management
  addOutput: (platformId: string, output: Omit<OutputConfig, 'id'>) => void;
  updateOutput: (platformId: string, outputId: string, updates: Partial<OutputConfig>) => void;
  removeOutput: (platformId: string, outputId: string) => void;

  // Build preview
  getBuildPreview: (platformId: string | null, format: OutputFormat) => string;

  // Newly created token tracking (for auto-focus in sidebar)
  setNewlyCreatedTokenPath: (path: string[] | null) => void;
  clearNewlyCreatedTokenPath: () => void;

  // Sidebar selection (for canvas highlighting)
  setSidebarSelectedTokenPath: (path: string[] | null) => void;

  // Project/API operations
  loadProject: (projectId: string, versionId?: string) => Promise<void>;
  saveChanges: () => Promise<void>;
  resetToLocal: () => void;
}

// Default pipeline (Simple Light/Dark)
const defaultPipeline: TokenPipeline = {
  id: 'default-pipeline',
  name: 'My Design System',
  description: 'Design tokens with light and dark mode',
  variables: [
    { id: 'var-mode', name: 'Mode', key: 'mode', values: ['light', 'dark'] },
  ],
  layers: [
    { id: 'layer-primitives', name: 'Primitives', order: 0, variables: [], required: true, description: 'Base color scales, spacing, typography' },
    { id: 'layer-semantic', name: 'Semantic', order: 1, variables: ['mode'], required: true, description: 'Semantic tokens (per mode)' },
    { id: 'layer-components', name: 'Components', order: 2, variables: [], required: true, description: 'Component tokens' },
  ],
  buildSettings: deepClone(DEFAULT_BUILD_SETTINGS),
};

// Default pages with sample tokens
const defaultPages: PipelinePage[] = [
  {
    id: 'page-primitives',
    layerId: 'layer-primitives',
    variableValues: {},
    tokens: {
      $name: 'Primitives',
      colors: {
        $type: 'color',
        blue: {
          '500': { $value: '#0066FF' },
          '600': { $value: '#0052CC' },
          '700': { $value: '#003D99' },
        },
        gray: {
          '50': { $value: '#F9FAFB' },
          '100': { $value: '#F3F4F6' },
          '500': { $value: '#6B7280' },
          '800': { $value: '#1F2937' },
          '900': { $value: '#111827' },
        },
        white: { $value: '#FFFFFF' },
        black: { $value: '#000000' },
      },
      spacing: {
        $type: 'dimension',
        '1': { $value: { value: 4, unit: 'px' } },
        '2': { $value: { value: 8, unit: 'px' } },
        '4': { $value: { value: 16, unit: 'px' } },
        '6': { $value: { value: 24, unit: 'px' } },
        '8': { $value: { value: 32, unit: 'px' } },
      },
    },
  },
  {
    id: 'page-semantic-light',
    layerId: 'layer-semantic',
    variableValues: { mode: 'light' },
    tokens: {
      $name: 'Semantic (light)',
      colors: {
        $type: 'color',
        primary: { $value: '{colors.blue.500}' },
        secondary: { $value: '{colors.gray.500}' },
        background: { $value: '{colors.white}' },
        foreground: { $value: '{colors.gray.900}' },
        surface: { $value: '{colors.gray.50}' },
      },
    },
  },
  {
    id: 'page-semantic-dark',
    layerId: 'layer-semantic',
    variableValues: { mode: 'dark' },
    tokens: {
      $name: 'Semantic (dark)',
      colors: {
        $type: 'color',
        primary: { $value: '{colors.blue.500}' },
        secondary: { $value: '{colors.gray.500}' },
        background: { $value: '{colors.gray.900}' },
        foreground: { $value: '{colors.white}' },
        surface: { $value: '{colors.gray.800}' },
      },
    },
  },
  {
    id: 'page-components',
    layerId: 'layer-components',
    variableValues: {},
    tokens: {
      $name: 'Components',
      button: {
        background: { $value: '{colors.primary}', $type: 'color' },
        text: { $value: '{colors.foreground}', $type: 'color' },
        padding: { $value: '{spacing.4}', $type: 'dimension' },
      },
    },
  },
];

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      pipeline: defaultPipeline,
      pages: defaultPages,

      // Project context
      projectId: null,
      versionId: null,

      // Loading/saving state
      isLoading: false,
      isSaving: false,
      lastSaved: null,
      saveError: null,

      // UI state
      activePageId: 'page-primitives',
      selectedBuildConfig: null,
      viewContext: null,
      newlyCreatedTokenPath: null,
      sidebarSelectedTokenPath: null,

      // View context management
      setViewContext: (context) => {
        set({ viewContext: context });
        // When switching to a child page view, also update activePageId
        if (context && !context.isSchemaView && context.variableValues) {
          const { pages, pipeline } = get();
          const layer = pipeline.layers.find(l => l.id === context.layerId);
          if (layer) {
            const page = pages.find(p => {
              if (p.layerId !== context.layerId) return false;
              const contextKeys = Object.keys(context.variableValues || {});
              const pageKeys = Object.keys(p.variableValues);
              if (contextKeys.length !== pageKeys.length) return false;
              return contextKeys.every(k => p.variableValues[k] === context.variableValues![k]);
            });
            if (page) {
              set({ activePageId: page.id });
            }
          }
        }
      },

      getViewContext: () => {
        return get().viewContext;
      },

      // Set entire pipeline
      setPipeline: (pipeline) => {
        set({ pipeline });
      },

      // Create from template
      createFromTemplate: (templateIndex) => {
        const template = PIPELINE_TEMPLATES[templateIndex];
        if (!template) return;

        const newPipeline: TokenPipeline = {
          ...deepClone(template),
          id: generateId('pipeline'),
          // Generate new IDs for variables and layers
          variables: template.variables.map(v => ({
            ...v,
            id: generateId('var'),
          })),
          layers: template.layers.map((l, i) => ({
            ...l,
            id: generateId('layer'),
            order: i,
          })),
        };

        // Create empty pages for required static layers
        const newPages: PipelinePage[] = newPipeline.layers
          .filter(l => l.variables.length === 0)
          .map(layer => ({
            id: generateId('page'),
            layerId: layer.id,
            variableValues: {},
            tokens: { $name: layer.name },
          }));

        set({
          pipeline: newPipeline,
          pages: newPages,
          activePageId: newPages[0]?.id || null,
        });
      },

      // Variable management
      addVariable: (variable) => {
        const newVariable: PipelineVariable = {
          ...variable,
          id: generateId('var'),
        };
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            variables: [...state.pipeline.variables, newVariable],
          },
        }));
      },

      updateVariable: (id, updates) => {
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            variables: state.pipeline.variables.map(v =>
              v.id === id ? { ...v, ...updates } : v
            ),
          },
        }));
      },

      removeVariable: (id) => {
        const { pipeline } = get();
        const variable = pipeline.variables.find(v => v.id === id);
        if (!variable) return;

        set((state) => ({
          pipeline: {
            ...state.pipeline,
            variables: state.pipeline.variables.filter(v => v.id !== id),
            // Remove this variable from any layers that use it
            layers: state.pipeline.layers.map(l => ({
              ...l,
              variables: l.variables.filter(key => key !== variable.key),
            })),
          },
          // Remove pages that used this variable
          pages: state.pages.filter(p =>
            !Object.keys(p.variableValues).includes(variable.key)
          ),
        }));
      },

      addVariableValue: (variableId, value) => {
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            variables: state.pipeline.variables.map(v =>
              v.id === variableId && !v.values.includes(value)
                ? { ...v, values: [...v.values, value] }
                : v
            ),
          },
        }));
      },

      removeVariableValue: (variableId, value) => {
        const { pipeline, pages } = get();
        const variable = pipeline.variables.find(v => v.id === variableId);
        if (!variable) return;

        set((state) => ({
          pipeline: {
            ...state.pipeline,
            variables: state.pipeline.variables.map(v =>
              v.id === variableId
                ? { ...v, values: v.values.filter(val => val !== value) }
                : v
            ),
          },
          // Remove pages that used this value
          pages: state.pages.filter(p =>
            p.variableValues[variable.key] !== value
          ),
        }));
      },

      // Layer management
      addLayer: (layer) => {
        const { pipeline } = get();
        const maxOrder = Math.max(...pipeline.layers.map(l => l.order), -1);
        const newLayer: PipelineLayer = {
          ...layer,
          id: generateId('layer'),
          order: maxOrder + 1,
        };
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            layers: [...state.pipeline.layers, newLayer],
          },
        }));
      },

      updateLayer: (id, updates) => {
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            layers: state.pipeline.layers.map(l =>
              l.id === id ? { ...l, ...updates } : l
            ),
          },
        }));
      },

      removeLayer: (id) => {
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            layers: state.pipeline.layers.filter(l => l.id !== id),
          },
          pages: state.pages.filter(p => p.layerId !== id),
        }));
      },

      reorderLayers: (fromIndex, toIndex) => {
        set((state) => {
          const sortedLayers = [...state.pipeline.layers].sort((a, b) => a.order - b.order);
          const [moved] = sortedLayers.splice(fromIndex, 1);
          sortedLayers.splice(toIndex, 0, moved);

          // Reassign orders
          const reorderedLayers = sortedLayers.map((l, i) => ({ ...l, order: i }));

          return {
            pipeline: {
              ...state.pipeline,
              layers: reorderedLayers,
            },
          };
        });
      },

      // Layer variants (simplified API) - each layer gets its own variable
      getLayerVariants: (layerId) => {
        const { pipeline } = get();
        const layer = pipeline.layers.find(l => l.id === layerId);
        if (!layer) return [];

        // Get the layer's variable key (first one, since we're using simplified single-variable model)
        const varKey = (layer.variables || [])[0];
        if (!varKey) return [];

        // Find the variable and return its values
        const variable = pipeline.variables.find(v => v.key === varKey);
        return variable?.values || [];
      },

      addVariantToLayer: (layerId, variantName) => {
        const { pipeline } = get();
        const layer = pipeline.layers.find(l => l.id === layerId);
        if (!layer) return;

        const layerVars = layer.variables || [];
        const varKey = `${layerId}-variant`;

        // Check if layer already has a variable
        if (layerVars.length > 0) {
          // Add value to existing variable
          const existingVarKey = layerVars[0];
          const existingVar = pipeline.variables.find(v => v.key === existingVarKey);
          if (existingVar && !existingVar.values.includes(variantName)) {
            get().addVariableValue(existingVar.id, variantName);
          }
        } else {
          // Create new variable for this layer
          get().addVariable({
            name: `${layer.name} Variant`,
            key: varKey,
            values: [variantName],
          });

          // Assign variable to layer
          get().updateLayer(layerId, {
            variables: [varKey],
          });
        }
      },

      removeVariantFromLayer: (layerId, variantName) => {
        const { pipeline } = get();
        const layer = pipeline.layers.find(l => l.id === layerId);
        if (!layer) return;

        const layerVars = layer.variables || [];
        if (layerVars.length === 0) return;

        const varKey = layerVars[0];
        const variable = pipeline.variables.find(v => v.key === varKey);
        if (!variable) return;

        if (variable.values.length <= 1) {
          // Last variant - remove the variable entirely and make layer static
          get().removeVariable(variable.id);
          get().updateLayer(layerId, { variables: [] });
        } else {
          // Remove just this variant value
          get().removeVariableValue(variable.id, variantName);
        }
      },

      // Page management
      getOrCreatePage: (layerId, variableValues) => {
        const { pages, pipeline } = get();
        const layer = pipeline.layers.find(l => l.id === layerId);

        // Find existing page
        const existing = pages.find(p => {
          if (p.layerId !== layerId) return false;
          const keys = Object.keys(variableValues);
          const pageKeys = Object.keys(p.variableValues);
          if (keys.length !== pageKeys.length) return false;
          return keys.every(k => p.variableValues[k] === variableValues[k]);
        });

        if (existing) return existing;

        // Create new page
        const newPage: PipelinePage = {
          id: generateId('page'),
          layerId,
          variableValues: { ...variableValues },
          tokens: {
            $name: layer ? `${layer.name} - ${formatSlotName(variableValues)}` : 'New Page',
          },
        };

        set((state) => ({
          pages: [...state.pages, newPage],
        }));

        return newPage;
      },

      updatePageTokens: (pageId, tokens) => {
        set((state) => ({
          pages: state.pages.map(p =>
            p.id === pageId ? { ...p, tokens } : p
          ),
        }));
      },

      setActivePage: (pageId) => {
        set({ activePageId: pageId });
      },

      getActivePage: () => {
        const { pages, activePageId, setActivePage } = get();
        const activePage = pages.find(p => p.id === activePageId);

        // If active page doesn't exist, auto-select the first available page
        if (!activePage && pages.length > 0) {
          // Use setTimeout to avoid updating state during render
          setTimeout(() => setActivePage(pages[0].id), 0);
          return pages[0];
        }

        return activePage || null;
      },

      // Build configuration
      setSelectedBuildConfig: (config) => {
        set({ selectedBuildConfig: config });
      },

      getAllBuildConfigs: () => {
        return getAllBuildConfigs(get().pipeline);
      },

      resolveBuildPath: (config) => {
        const { pipeline, pages } = get();
        return resolveBuildPath(pipeline, pages, config);
      },

      buildTokens: (config) => {
        const { pipeline, pages } = get();
        const sortedLayers = [...pipeline.layers].sort((a, b) => a.order - b.order);

        let result: Record<string, unknown> = {};

        for (const layer of sortedLayers) {
          const page = findPageForLayerAndConfig(layer, config, pages);

          if (page) {
            deepMerge(result, page.tokens as Record<string, unknown>);
          } else if (layer.required) {
            console.warn(`Missing required page for layer: ${layer.name}`);
          }
        }

        return result as DesignTokenFile;
      },

      buildAllTokens: () => {
        const configs = get().getAllBuildConfigs();
        return configs.map(config => ({
          config,
          tokens: get().buildTokens(config),
        }));
      },

      // Helpers
      getLayerSlots: (layer) => {
        return getLayerSlots(layer, get().pipeline.variables);
      },

      getPageStatus: (layerId, variableValues) => {
        const { pages } = get();
        const exists = pages.some(p => {
          if (p.layerId !== layerId) return false;
          const keys = Object.keys(variableValues);
          const pageKeys = Object.keys(p.variableValues);
          if (keys.length !== pageKeys.length) return false;
          return keys.every(k => p.variableValues[k] === variableValues[k]);
        });
        return exists ? 'exists' : 'empty';
      },

      getLayerCompletionStatus: (layerId) => {
        const { pipeline, pages } = get();
        const layer = pipeline.layers.find(l => l.id === layerId);
        if (!layer) return { total: 0, filled: 0 };

        const slots = getLayerSlots(layer, pipeline.variables);
        const filled = slots.filter(slot => {
          return pages.some(p => {
            if (p.layerId !== layerId) return false;
            const keys = Object.keys(slot);
            const pageKeys = Object.keys(p.variableValues);
            if (keys.length !== pageKeys.length) return false;
            return keys.every(k => p.variableValues[k] === slot[k]);
          });
        }).length;

        return { total: slots.length, filled };
      },

      // Schema and extension helpers
      getLayerSchemaKeys: (layerId) => {
        const { pages } = get();
        return getSchemaKeys(layerId, pages);
      },

      getPageExtendedKeys: (pageId) => {
        const { pages } = get();
        const page = pages.find(p => p.id === pageId);
        if (!page) return [];
        const siblingPages = pages.filter(p => p.layerId === page.layerId);
        return getExtendedKeys(page, siblingPages);
      },

      getSiblingPages: (layerId) => {
        const { pages } = get();
        return pages.filter(p => p.layerId === layerId);
      },

      // Build settings management
      updateBuildSettings: (settings) => {
        set((state) => ({
          pipeline: {
            ...state.pipeline,
            buildSettings: {
              ...state.pipeline.buildSettings,
              ...settings,
            } as BuildSettings,
          },
        }));
      },

      addBuildPlatform: (platform) => {
        const newPlatform: BuildPlatform = {
          ...platform,
          id: generateId('platform'),
        };
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: [...currentSettings.platforms, newPlatform],
              },
            },
          };
        });
      },

      updateBuildPlatform: (platformId, updates) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId ? { ...p, ...updates } : p
                ),
              },
            },
          };
        });
      },

      removeBuildPlatform: (platformId) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.filter(p => p.id !== platformId),
              },
            },
          };
        });
      },

      // Transform management
      addTransform: (platformId, transform) => {
        const newTransform: Transform = {
          ...transform,
          id: generateId('transform'),
        };
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? { ...p, transforms: [...p.transforms, newTransform] }
                    : p
                ),
              },
            },
          };
        });
      },

      removeTransform: (platformId, transformId) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? { ...p, transforms: p.transforms.filter(t => t.id !== transformId) }
                    : p
                ),
              },
            },
          };
        });
      },

      updateTransform: (platformId, transformId, updates) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? {
                        ...p,
                        transforms: p.transforms.map(t =>
                          t.id === transformId ? { ...t, ...updates } : t
                        ),
                      }
                    : p
                ),
              },
            },
          };
        });
      },

      // Output management
      addOutput: (platformId, output) => {
        const newOutput: OutputConfig = {
          ...output,
          id: generateId('output'),
        };
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? { ...p, outputs: [...p.outputs, newOutput] }
                    : p
                ),
              },
            },
          };
        });
      },

      updateOutput: (platformId, outputId, updates) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? {
                        ...p,
                        outputs: p.outputs.map(o =>
                          o.id === outputId ? { ...o, ...updates } : o
                        ),
                      }
                    : p
                ),
              },
            },
          };
        });
      },

      removeOutput: (platformId, outputId) => {
        set((state) => {
          const currentSettings = state.pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;
          return {
            pipeline: {
              ...state.pipeline,
              buildSettings: {
                ...currentSettings,
                platforms: currentSettings.platforms.map(p =>
                  p.id === platformId
                    ? { ...p, outputs: p.outputs.filter(o => o.id !== outputId) }
                    : p
                ),
              },
            },
          };
        });
      },

      // Build preview
      getBuildPreview: (platformId, format) => {
        const { pipeline, selectedBuildConfig } = get();
        const settings = pipeline.buildSettings || DEFAULT_BUILD_SETTINGS;

        // Get merged tokens for preview
        const buildConfig = selectedBuildConfig || get().getAllBuildConfigs()[0];
        if (!buildConfig) return '';

        const tokens = get().buildTokens(buildConfig);

        // Find platform
        const platform = platformId
          ? settings.platforms.find(p => p.id === platformId)
          : settings.platforms[0];

        if (!platform) {
          // Use a simple preview if no platform configured
          const { buildSimplePreview } = require('@/lib/build/engine');
          return buildSimplePreview(tokens, format);
        }

        return buildPreviewFn(tokens, platform, format);
      },

      // Newly created token tracking
      setNewlyCreatedTokenPath: (path) => {
        set({ newlyCreatedTokenPath: path });
      },

      clearNewlyCreatedTokenPath: () => {
        set({ newlyCreatedTokenPath: null });
      },

      // Sidebar selection
      setSidebarSelectedTokenPath: (path) => {
        set({ sidebarSelectedTokenPath: path });
      },

      // Load project from API
      loadProject: async (projectId, versionId) => {
        set({ isLoading: true, saveError: null });
        try {
          // First get project to find the draft version if not specified
          const projectRes = await fetch(`/api/projects/${projectId}`);
          if (!projectRes.ok) {
            throw new Error('Failed to load project');
          }
          const project = await projectRes.json();

          // Use provided versionId or find draft version
          const targetVersionId =
            versionId ||
            project.versions.find((v: { status: string }) => v.status === 'DRAFT')?.id ||
            project.versions[0]?.id;

          if (!targetVersionId) {
            throw new Error('No version found');
          }

          // Load version with pipeline and pages
          const versionRes = await fetch(
            `/api/projects/${projectId}/versions/${targetVersionId}`
          );
          if (!versionRes.ok) {
            throw new Error('Failed to load version');
          }
          const version = await versionRes.json();

          // Transform data for store
          const pipelineData = version.pipeline?.data || {};
          // Normalize layers to ensure variables is always an array
          const normalizedLayers = (pipelineData.layers || []).map((layer: PipelineLayer) => ({
            ...layer,
            variables: layer.variables || [],
          }));
          const pipeline: TokenPipeline = {
            id: version.pipeline?.id || generateId('pipeline'),
            name: project.name,
            description: project.description,
            variables: pipelineData.variables || [],
            layers: normalizedLayers,
            buildSettings: pipelineData.buildSettings,
            versionId: targetVersionId,
          };

          const pages: PipelinePage[] = (version.pipeline?.pages || []).map(
            (p: { id: string; layerId: string; variableValues: Record<string, string>; tokens: DesignTokenFile }) => ({
              id: p.id,
              layerId: p.layerId,
              variableValues: p.variableValues || {},
              tokens: p.tokens || {},
              pipelineId: version.pipeline?.id,
            })
          );

          set({
            projectId,
            versionId: targetVersionId,
            pipeline,
            pages,
            activePageId: pages[0]?.id || null,
            isLoading: false,
            lastSaved: new Date(),
          });
        } catch (error) {
          set({
            isLoading: false,
            saveError: error instanceof Error ? error.message : 'Failed to load project',
          });
        }
      },

      // Save changes to API
      saveChanges: async () => {
        const { projectId, versionId, pipeline, pages, isSaving } = get();

        // Only save if we have a project loaded
        if (!projectId || !versionId || isSaving) return;

        set({ isSaving: true, saveError: null });

        try {
          // Save pipeline data
          const pipelineRes = await fetch(
            `/api/projects/${projectId}/versions/${versionId}/pipeline`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  variables: pipeline.variables,
                  layers: pipeline.layers,
                  buildSettings: pipeline.buildSettings,
                },
              }),
            }
          );

          if (!pipelineRes.ok) {
            throw new Error('Failed to save pipeline');
          }

          // Save pages
          const pagesRes = await fetch(
            `/api/projects/${projectId}/versions/${versionId}/pages`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pages: pages.map((p) => ({
                  layerId: p.layerId,
                  variableValues: p.variableValues,
                  tokens: p.tokens,
                })),
              }),
            }
          );

          if (!pagesRes.ok) {
            throw new Error('Failed to save pages');
          }

          set({ isSaving: false, lastSaved: new Date() });
        } catch (error) {
          set({
            isSaving: false,
            saveError: error instanceof Error ? error.message : 'Failed to save',
          });
        }
      },

      // Reset to local mode (clears project context)
      resetToLocal: () => {
        set({
          projectId: null,
          versionId: null,
          pipeline: defaultPipeline,
          pages: defaultPages,
          activePageId: 'page-primitives',
          isLoading: false,
          isSaving: false,
          lastSaved: null,
          saveError: null,
        });
      },
    }),
    {
      name: 'design-token-studio-pipeline',
      partialize: (state) => ({
        pipeline: state.pipeline,
        pages: state.pages,
        activePageId: state.activePageId,
        viewContext: state.viewContext,
      }),
    }
  )
);
