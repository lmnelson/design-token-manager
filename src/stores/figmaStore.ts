import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FigmaFile,
  FigmaNode,
  FigmaComponentNode,
  FigmaVariable,
  FigmaVariableCollection,
} from '@/types/figma';

// Parsed component with extracted style information
export interface ParsedComponent {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  node: FigmaComponentNode;
  styleBindings: StyleBinding[];
}

// A binding between a Figma node property and a potential token
export interface StyleBinding {
  nodeId: string;
  nodeName: string;
  nodePath: string[]; // Path within the component tree
  property: 'fill' | 'stroke' | 'effect' | 'typography' | 'spacing' | 'cornerRadius';
  value: unknown;
  variableId?: string; // If bound to a Figma variable
  styleId?: string; // If using a Figma style
  position: { x: number; y: number }; // Relative position in component
}

// Token mapping result
export interface TokenMapping {
  binding: StyleBinding;
  tokenPath: string[];
  confidence: number;
  matchType: 'exact' | 'approximate' | 'variable' | 'manual';
}

interface FigmaStore {
  // Authentication
  accessToken: string | null;
  isAuthenticated: boolean;

  // Current file
  currentFileKey: string | null;
  currentFile: FigmaFile | null;
  isLoading: boolean;
  error: string | null;

  // Components
  components: ParsedComponent[];
  selectedComponentId: string | null;

  // Variables (for token matching)
  variableCollections: FigmaVariableCollection[];
  variables: FigmaVariable[];

  // Token mappings
  tokenMappings: Map<string, TokenMapping[]>; // componentId -> mappings

  // Actions
  setAccessToken: (token: string | null) => void;
  setCurrentFile: (fileKey: string, file: FigmaFile) => void;
  clearCurrentFile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Components
  addComponent: (component: ParsedComponent) => void;
  removeComponent: (componentId: string) => void;
  selectComponent: (componentId: string | null) => void;
  clearComponents: () => void;

  // Variables
  setVariables: (collections: FigmaVariableCollection[], variables: FigmaVariable[]) => void;

  // Mappings
  setMappings: (componentId: string, mappings: TokenMapping[]) => void;
  addManualMapping: (componentId: string, mapping: TokenMapping) => void;
  removeMapping: (componentId: string, bindingNodeId: string, tokenPath: string[]) => void;
  clearMappings: (componentId: string) => void;
}

export const useFigmaStore = create<FigmaStore>()(
  persist(
    (set, get) => ({
      // Initial state
      accessToken: null,
      isAuthenticated: false,
      currentFileKey: null,
      currentFile: null,
      isLoading: false,
      error: null,
      components: [],
      selectedComponentId: null,
      variableCollections: [],
      variables: [],
      tokenMappings: new Map(),

      // Auth
      setAccessToken: (token) => {
        set({
          accessToken: token,
          isAuthenticated: !!token,
        });
      },

      // File management
      setCurrentFile: (fileKey, file) => {
        set({
          currentFileKey: fileKey,
          currentFile: file,
          error: null,
        });
      },

      clearCurrentFile: () => {
        set({
          currentFileKey: null,
          currentFile: null,
          components: [],
          selectedComponentId: null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),

      // Components
      addComponent: (component) => {
        set((state) => ({
          components: [...state.components.filter(c => c.id !== component.id), component],
        }));
      },

      removeComponent: (componentId) => {
        set((state) => ({
          components: state.components.filter(c => c.id !== componentId),
          selectedComponentId:
            state.selectedComponentId === componentId ? null : state.selectedComponentId,
        }));
      },

      selectComponent: (componentId) => set({ selectedComponentId: componentId }),

      clearComponents: () => set({ components: [], selectedComponentId: null }),

      // Variables
      setVariables: (collections, variables) => {
        set({
          variableCollections: collections,
          variables: variables,
        });
      },

      // Mappings
      setMappings: (componentId, mappings) => {
        set((state) => {
          const newMappings = new Map(state.tokenMappings);
          newMappings.set(componentId, mappings);
          return { tokenMappings: newMappings };
        });
      },

      addManualMapping: (componentId, mapping) => {
        set((state) => {
          const newMappings = new Map(state.tokenMappings);
          const existing = newMappings.get(componentId) || [];
          newMappings.set(componentId, [...existing, mapping]);
          return { tokenMappings: newMappings };
        });
      },

      removeMapping: (componentId, bindingNodeId, tokenPath) => {
        set((state) => {
          const newMappings = new Map(state.tokenMappings);
          const existing = newMappings.get(componentId) || [];
          const filtered = existing.filter(
            (m) =>
              !(
                m.binding.nodeId === bindingNodeId &&
                m.tokenPath.join('.') === tokenPath.join('.')
              )
          );
          newMappings.set(componentId, filtered);
          return { tokenMappings: newMappings };
        });
      },

      clearMappings: (componentId) => {
        set((state) => {
          const newMappings = new Map(state.tokenMappings);
          newMappings.delete(componentId);
          return { tokenMappings: newMappings };
        });
      },
    }),
    {
      name: 'design-token-studio-figma',
      partialize: (state) => ({
        accessToken: state.accessToken,
        components: state.components,
        // Convert Map to array for storage
        tokenMappings: Array.from(state.tokenMappings.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert tokenMappings array back to Map
          if (Array.isArray(state.tokenMappings)) {
            state.tokenMappings = new Map(state.tokenMappings as [string, TokenMapping[]][]);
          }
          state.isAuthenticated = !!state.accessToken;
        }
      },
    }
  )
);
