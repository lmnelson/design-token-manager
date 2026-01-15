import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DesignToken,
  DesignTokenFile,
  FlattenedToken,
  TokenType,
  TokenMode,
  TokenTier,
  TokenPage,
  TokenStack,
} from '@/types/tokens';
import { flattenTokens, unflattenTokens, validateTokenFile } from '@/lib/tokens/schema';
import { isTokenReference, parseTokenReference, DEFAULT_PAGE_TEMPLATES } from '@/types/tokens';

// Generate unique IDs
function generateId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Flattened token with source page info
export interface FlattenedTokenWithSource extends FlattenedToken {
  sourcePageId: string;
  isInherited: boolean;
}

interface TokenStore {
  // Page/Stack system
  pages: TokenPage[];
  activePageId: string | null;

  // Computed from active page + inherited pages
  tokenFile: DesignTokenFile; // The resolved view (active page merged with inherited)
  flattenedTokens: FlattenedTokenWithSource[];

  // Modes/Brands
  modes: TokenMode[];
  activeMode: string | null; // null means "default" mode

  // UI state
  selectedTokenPath: string[] | null;
  expandedGroups: Set<string>;

  // Validation
  validationErrors: Array<{ path: string; message: string }>;

  // History for undo/redo
  history: DesignTokenFile[];
  historyIndex: number;

  // Actions
  setTokenFile: (file: DesignTokenFile) => void;
  updateToken: (path: string[], token: DesignToken) => void;
  deleteToken: (path: string[]) => void;
  createToken: (path: string[], token: DesignToken) => void;
  createGroup: (path: string[], type?: TokenType) => void;
  deleteGroup: (path: string[]) => void;
  renameToken: (oldPath: string[], newName: string) => void;

  // Alias management
  createAlias: (sourcePath: string[], targetPath: string[]) => void;
  removeAlias: (path: string[]) => void;

  // Tier management
  setTokenTier: (path: string[], tier: TokenTier) => void;

  // Token operations
  duplicateToken: (path: string[], newName?: string) => void;
  moveToken: (fromPath: string[], toGroupPath: string[]) => void;

  // Mode management
  addMode: (mode: TokenMode) => void;
  removeMode: (modeName: string) => void;
  setActiveMode: (modeName: string | null) => void;
  setTokenModeValue: (path: string[], modeName: string, value: unknown) => void;

  // Selection
  selectToken: (path: string[] | null) => void;

  // Groups
  toggleGroup: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Validation
  validate: () => void;

  // Import/Export
  importFromJson: (json: string) => { success: boolean; error?: string };
  exportToJson: () => string;

  // Page management
  addPage: (name: string, description?: string) => void;
  addPageFromTemplate: (templateIndex: number) => void;
  removePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setActivePage: (pageId: string | null) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  getInheritedTokens: () => FlattenedTokenWithSource[];
  getActivePageTokens: () => FlattenedTokenWithSource[];
}

// Helper to deeply set a value at a path in an object
function setAtPath(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current)) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

// Helper to delete a value at a path in an object
function deleteAtPath(obj: Record<string, unknown>, path: string[]): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current)) return;
    current = current[path[i]] as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
}

// Helper to get a value at a path
function getAtPath(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// Deep clone helper
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Merge multiple token files with later pages overriding earlier ones
function mergeTokenFiles(pages: TokenPage[]): DesignTokenFile {
  const merged: DesignTokenFile = {};

  for (const page of pages) {
    deepMerge(merged, page.tokens);
  }

  return merged;
}

// Deep merge objects (later values override earlier)
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
      !('$value' in sourceValue) // Don't merge tokens, replace them
    ) {
      deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      target[key] = deepClone(sourceValue);
    }
  }
}

// Flatten tokens with source page tracking
function flattenTokensWithSource(
  pages: TokenPage[],
  activePageId: string | null
): FlattenedTokenWithSource[] {
  const result: FlattenedTokenWithSource[] = [];
  const seenPaths = new Map<string, FlattenedTokenWithSource>();

  // Process pages from first (bottom) to last (top)
  for (const page of pages) {
    const pageTokens = flattenTokens(page.tokens);

    for (const token of pageTokens) {
      const pathStr = token.path.join('.');
      const tokenWithSource: FlattenedTokenWithSource = {
        ...token,
        sourcePageId: page.id,
        isInherited: page.id !== activePageId,
      };

      // Later pages override earlier ones
      seenPaths.set(pathStr, tokenWithSource);
    }
  }

  // Convert map to array, preserving path order
  return Array.from(seenPaths.values());
}

// Sample pages for initial state
const initialPages: TokenPage[] = [
  {
    id: 'page-primitives',
    name: 'Primitives',
    description: 'Base design tokens - colors, spacing, typography scales',
    tokens: {
      $name: 'Primitives',
      $description: 'Base design tokens',
      colors: {
        $type: 'color',
        blue: {
          '500': { $value: '#0066FF', $description: 'Blue 500' },
          '600': { $value: '#0052CC', $description: 'Blue 600' },
          '700': { $value: '#003D99', $description: 'Blue 700' },
        },
        gray: {
          '100': { $value: '#F3F4F6', $description: 'Gray 100' },
          '500': { $value: '#6B7280', $description: 'Gray 500' },
          '900': { $value: '#111827', $description: 'Gray 900' },
        },
        white: { $value: '#FFFFFF', $description: 'Pure white' },
        black: { $value: '#000000', $description: 'Pure black' },
      },
      spacing: {
        $type: 'dimension',
        '1': { $value: { value: 4, unit: 'px' } },
        '2': { $value: { value: 8, unit: 'px' } },
        '4': { $value: { value: 16, unit: 'px' } },
        '6': { $value: { value: 24, unit: 'px' } },
        '8': { $value: { value: 32, unit: 'px' } },
      },
      typography: {
        $type: 'typography',
        fontFamily: {
          sans: { $value: 'Inter, system-ui, sans-serif', $type: 'fontFamily' },
          mono: { $value: 'JetBrains Mono, monospace', $type: 'fontFamily' },
        },
      },
    },
  },
  {
    id: 'page-semantic',
    name: 'Semantic',
    description: 'Semantic tokens that reference primitives',
    tokens: {
      $name: 'Semantic',
      $description: 'Semantic tokens',
      colors: {
        $type: 'color',
        primary: { $value: '{colors.blue.500}', $description: 'Primary brand color' },
        secondary: { $value: '{colors.gray.500}', $description: 'Secondary color' },
        background: { $value: '{colors.white}', $description: 'Background color' },
        text: { $value: '{colors.gray.900}', $description: 'Primary text color' },
      },
      spacing: {
        $type: 'dimension',
        xs: { $value: '{spacing.1}' },
        sm: { $value: '{spacing.2}' },
        md: { $value: '{spacing.4}' },
        lg: { $value: '{spacing.6}' },
        xl: { $value: '{spacing.8}' },
      },
    },
  },
];

// Computed initial merged file
const initialMergedFile = mergeTokenFiles(initialPages);

export const useTokenStore = create<TokenStore>()(
  persist(
    (set, get) => ({
      // Initial state - Pages
      pages: initialPages,
      activePageId: 'page-semantic', // Start with semantic page active
      tokenFile: initialMergedFile,
      flattenedTokens: flattenTokensWithSource(initialPages, 'page-semantic'),
      modes: [
        { name: 'light', description: 'Light theme' },
        { name: 'dark', description: 'Dark theme' },
      ],
      activeMode: null,
      selectedTokenPath: null,
      expandedGroups: new Set(['colors', 'spacing', 'typography', 'colors.blue', 'colors.gray', 'typography.fontFamily']),
      validationErrors: [],
      history: [initialMergedFile],
      historyIndex: 0,

      // Set the active page's token file and recompute merged view
      setTokenFile: (file) => {
        const { pages, activePageId } = get();

        // Update the active page's tokens
        const updatedPages = pages.map(page =>
          page.id === activePageId
            ? { ...page, tokens: file }
            : page
        );

        // Recompute merged file
        const mergedFile = mergeTokenFiles(updatedPages);
        const flattened = flattenTokensWithSource(updatedPages, activePageId);
        const { valid, errors } = validateTokenFile(mergedFile);

        set((state) => ({
          pages: updatedPages,
          tokenFile: mergedFile,
          flattenedTokens: flattened,
          validationErrors: errors,
          history: [...state.history.slice(0, state.historyIndex + 1), mergedFile],
          historyIndex: state.historyIndex + 1,
        }));
      },

      // Get active page's tokens (for editing operations)
      getActivePageTokens: () => {
        const { pages, activePageId, flattenedTokens } = get();
        return flattenedTokens.filter(t => t.sourcePageId === activePageId);
      },

      // Get inherited tokens (from pages below active)
      getInheritedTokens: () => {
        const { flattenedTokens, activePageId } = get();
        return flattenedTokens.filter(t => t.sourcePageId !== activePageId);
      },

      // Update a single token (on active page)
      updateToken: (path, token) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        setAtPath(newFile as Record<string, unknown>, path, token);
        get().setTokenFile(newFile);
      },

      // Delete a token (from active page)
      deleteToken: (path) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        deleteAtPath(newFile as Record<string, unknown>, path);
        get().setTokenFile(newFile);
      },

      // Create a new token (on active page)
      createToken: (path, token) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        setAtPath(newFile as Record<string, unknown>, path, token);
        get().setTokenFile(newFile);
      },

      // Create a new group (on active page)
      createGroup: (path, type) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        const group: Record<string, unknown> = {};
        if (type) group.$type = type;
        setAtPath(newFile as Record<string, unknown>, path, group);
        get().setTokenFile(newFile);
      },

      // Delete a group (from active page)
      deleteGroup: (path) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        deleteAtPath(newFile as Record<string, unknown>, path);
        get().setTokenFile(newFile);
      },

      // Rename a token (on active page)
      renameToken: (oldPath, newName) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        const token = getAtPath(newFile as Record<string, unknown>, oldPath);
        if (!token) return;

        deleteAtPath(newFile as Record<string, unknown>, oldPath);
        const newPath = [...oldPath.slice(0, -1), newName];
        setAtPath(newFile as Record<string, unknown>, newPath, token);
        get().setTokenFile(newFile);
      },

      // Create an alias from source to target (source will reference target)
      createAlias: (sourcePath, targetPath) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        const sourceToken = getAtPath(newFile as Record<string, unknown>, sourcePath) as DesignToken | undefined;

        if (!sourceToken || !('$value' in sourceToken)) return;

        // Create the reference string
        const referenceStr = `{${targetPath.join('.')}}`;

        // Update the source token to reference the target
        sourceToken.$value = referenceStr;

        setAtPath(newFile as Record<string, unknown>, sourcePath, sourceToken);
        get().setTokenFile(newFile);
      },

      // Remove alias (convert back to direct value)
      removeAlias: (path) => {
        const { flattenedTokens, pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const flatToken = flattenedTokens.find(t => t.path.join('.') === path.join('.'));
        if (!flatToken || !flatToken.isAlias || !flatToken.aliasPath) return;

        // Find the resolved value by following the alias chain
        let resolvedToken = flattenedTokens.find(t => t.path.join('.') === flatToken.aliasPath?.join('.'));
        while (resolvedToken?.isAlias && resolvedToken.aliasPath) {
          resolvedToken = flattenedTokens.find(t => t.path.join('.') === resolvedToken?.aliasPath?.join('.'));
        }

        if (!resolvedToken) return;

        const newFile = deepClone(activePage.tokens);
        const token = getAtPath(newFile as Record<string, unknown>, path) as DesignToken;
        if (token) {
          token.$value = resolvedToken.token.$value;
          setAtPath(newFile as Record<string, unknown>, path, token);
          get().setTokenFile(newFile);
        }
      },

      // Set token tier (on active page)
      setTokenTier: (path, tier) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        const token = getAtPath(newFile as Record<string, unknown>, path) as DesignToken | undefined;

        if (!token || !('$value' in token)) return;

        // Ensure $extensions exists
        if (!token.$extensions) {
          token.$extensions = {};
        }
        if (!token.$extensions['com.designtokenstudio']) {
          token.$extensions['com.designtokenstudio'] = {};
        }
        token.$extensions['com.designtokenstudio'].tier = tier;

        setAtPath(newFile as Record<string, unknown>, path, token);
        get().setTokenFile(newFile);
      },

      // Duplicate a token (on active page)
      duplicateToken: (path, newName) => {
        const { pages, activePageId, tokenFile } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        // Get the token from merged view (might be inherited)
        const token = getAtPath(tokenFile as Record<string, unknown>, path);
        if (!token) return;

        // Generate new name if not provided
        const originalName = path[path.length - 1];
        const duplicateName = newName || `${originalName}-copy`;
        const newPath = [...path.slice(0, -1), duplicateName];

        // Add duplicated token to active page
        const newFile = deepClone(activePage.tokens);
        const duplicatedToken = deepClone(token);
        setAtPath(newFile as Record<string, unknown>, newPath, duplicatedToken);
        get().setTokenFile(newFile);
      },

      // Move a token to a different group (on active page)
      moveToken: (fromPath, toGroupPath) => {
        const { pages, activePageId } = get();
        const activePage = pages.find(p => p.id === activePageId);
        if (!activePage) return;

        const newFile = deepClone(activePage.tokens);
        const token = getAtPath(newFile as Record<string, unknown>, fromPath);

        if (!token) return;

        // Delete from original location
        deleteAtPath(newFile as Record<string, unknown>, fromPath);

        // Add to new location
        const tokenName = fromPath[fromPath.length - 1];
        const newPath = [...toGroupPath, tokenName];
        setAtPath(newFile as Record<string, unknown>, newPath, token);

        get().setTokenFile(newFile);
      },

      // Mode management
      addMode: (mode) => {
        set((state) => ({
          modes: [...state.modes, mode],
        }));
      },

      removeMode: (modeName) => {
        set((state) => ({
          modes: state.modes.filter(m => m.name !== modeName),
          activeMode: state.activeMode === modeName ? null : state.activeMode,
        }));
      },

      setActiveMode: (modeName) => {
        set({ activeMode: modeName });
      },

      setTokenModeValue: (path, modeName, value) => {
        const newFile = deepClone(get().tokenFile);
        const token = getAtPath(newFile as Record<string, unknown>, path) as DesignToken | undefined;

        if (!token || !('$value' in token)) return;

        // Ensure $extensions exists
        if (!token.$extensions) {
          token.$extensions = {};
        }
        if (!token.$extensions['com.designtokenstudio']) {
          token.$extensions['com.designtokenstudio'] = {};
        }
        if (!token.$extensions['com.designtokenstudio'].modes) {
          token.$extensions['com.designtokenstudio'].modes = {};
        }
        token.$extensions['com.designtokenstudio'].modes[modeName] = value;

        setAtPath(newFile as Record<string, unknown>, path, token);
        get().setTokenFile(newFile);
      },

      // Selection
      selectToken: (path) => set({ selectedTokenPath: path }),

      // Groups
      toggleGroup: (path) => {
        set((state) => {
          const newExpanded = new Set(state.expandedGroups);
          if (newExpanded.has(path)) {
            newExpanded.delete(path);
          } else {
            newExpanded.add(path);
          }
          return { expandedGroups: newExpanded };
        });
      },

      expandAll: () => {
        const allGroups = new Set<string>();
        const traverse = (obj: unknown, path: string[] = []) => {
          if (typeof obj !== 'object' || obj === null) return;
          for (const [key, value] of Object.entries(obj)) {
            if (key.startsWith('$')) continue;
            if (typeof value === 'object' && value !== null && !('$value' in value)) {
              const groupPath = [...path, key].join('.');
              allGroups.add(groupPath);
              traverse(value, [...path, key]);
            }
          }
        };
        traverse(get().tokenFile);
        set({ expandedGroups: allGroups });
      },

      collapseAll: () => set({ expandedGroups: new Set() }),

      // History (simplified - tracks merged token file snapshots)
      // Note: Full page-aware undo/redo would require tracking page states
      undo: () => {
        const { history, historyIndex, pages, activePageId } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const file = history[newIndex];
          // Recompute flattened tokens with source info for current view
          const flattenedWithSource = flattenTokensWithSource(pages, activePageId);
          set({
            tokenFile: file,
            flattenedTokens: flattenedWithSource,
            historyIndex: newIndex,
          });
        }
      },

      redo: () => {
        const { history, historyIndex, pages, activePageId } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const file = history[newIndex];
          const flattenedWithSource = flattenTokensWithSource(pages, activePageId);
          set({
            tokenFile: file,
            flattenedTokens: flattenedWithSource,
            historyIndex: newIndex,
          });
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Validation
      validate: () => {
        const { valid, errors } = validateTokenFile(get().tokenFile);
        set({ validationErrors: errors });
      },

      // Import/Export
      importFromJson: (json) => {
        try {
          const parsed = JSON.parse(json);
          const { valid, errors } = validateTokenFile(parsed);
          if (!valid && errors.length > 0) {
            // Still import but show errors
            console.warn('Token file has validation errors:', errors);
          }
          get().setTokenFile(parsed);
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      },

      exportToJson: () => {
        return JSON.stringify(get().tokenFile, null, 2);
      },

      // Page management
      addPage: (name, description) => {
        const newPage: TokenPage = {
          id: generateId(),
          name,
          description,
          tokens: {
            $name: name,
            $description: description,
          },
        };

        set((state) => {
          const updatedPages = [...state.pages, newPage];
          return {
            pages: updatedPages,
            activePageId: newPage.id,
            tokenFile: mergeTokenFiles(updatedPages),
            flattenedTokens: flattenTokensWithSource(updatedPages, newPage.id),
          };
        });
      },

      addPageFromTemplate: (templateIndex) => {
        const template = DEFAULT_PAGE_TEMPLATES[templateIndex];
        if (!template) return;

        const newPage: TokenPage = {
          ...template,
          id: generateId(),
        };

        set((state) => {
          const updatedPages = [...state.pages, newPage];
          return {
            pages: updatedPages,
            activePageId: newPage.id,
            tokenFile: mergeTokenFiles(updatedPages),
            flattenedTokens: flattenTokensWithSource(updatedPages, newPage.id),
          };
        });
      },

      removePage: (pageId) => {
        set((state) => {
          const updatedPages = state.pages.filter(p => p.id !== pageId);
          if (updatedPages.length === 0) {
            // Don't allow removing the last page
            return state;
          }

          const newActiveId = state.activePageId === pageId
            ? updatedPages[updatedPages.length - 1].id
            : state.activePageId;

          return {
            pages: updatedPages,
            activePageId: newActiveId,
            tokenFile: mergeTokenFiles(updatedPages),
            flattenedTokens: flattenTokensWithSource(updatedPages, newActiveId),
          };
        });
      },

      renamePage: (pageId, name) => {
        set((state) => {
          const updatedPages = state.pages.map(p =>
            p.id === pageId ? { ...p, name } : p
          );
          return { pages: updatedPages };
        });
      },

      setActivePage: (pageId) => {
        set((state) => {
          const mergedFile = mergeTokenFiles(state.pages);
          return {
            activePageId: pageId,
            tokenFile: mergedFile,
            flattenedTokens: flattenTokensWithSource(state.pages, pageId),
          };
        });
      },

      reorderPages: (fromIndex, toIndex) => {
        set((state) => {
          const updatedPages = [...state.pages];
          const [movedPage] = updatedPages.splice(fromIndex, 1);
          updatedPages.splice(toIndex, 0, movedPage);

          return {
            pages: updatedPages,
            tokenFile: mergeTokenFiles(updatedPages),
            flattenedTokens: flattenTokensWithSource(updatedPages, state.activePageId),
          };
        });
      },
    }),
    {
      name: 'design-token-studio-tokens',
      partialize: (state) => ({
        pages: state.pages,
        activePageId: state.activePageId,
        expandedGroups: Array.from(state.expandedGroups),
        modes: state.modes,
        activeMode: state.activeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert expandedGroups array back to Set
          if (Array.isArray(state.expandedGroups)) {
            state.expandedGroups = new Set(state.expandedGroups as unknown as string[]);
          }
          // Recompute merged token file and flattened tokens from pages
          if (state.pages && state.pages.length > 0) {
            state.tokenFile = mergeTokenFiles(state.pages);
            state.flattenedTokens = flattenTokensWithSource(state.pages, state.activePageId);
          }
        }
      },
    }
  )
);
