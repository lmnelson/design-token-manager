import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'tokens' | 'components';
export type EditorLayout = 'split' | 'visual' | 'json';

interface ProjectStore {
  // Project meta
  projectName: string;
  lastSaved: Date | null;
  isDirty: boolean;

  // UI state
  currentView: ViewMode;
  editorLayout: EditorLayout;
  sidebarOpen: boolean;
  sidebarWidth: number;
  jsonPanelWidth: number;

  // Preferences
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Actions
  setProjectName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  markSaved: () => void;

  setCurrentView: (view: ViewMode) => void;
  setEditorLayout: (layout: EditorLayout) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setJsonPanelWidth: (width: number) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAutoSave: (autoSave: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      // Initial state
      projectName: 'Untitled Project',
      lastSaved: null,
      isDirty: false,

      currentView: 'tokens',
      editorLayout: 'split',
      sidebarOpen: true,
      sidebarWidth: 280,
      jsonPanelWidth: 400,

      theme: 'system',
      autoSave: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20,

      // Actions
      setProjectName: (name) => set({ projectName: name, isDirty: true }),
      setDirty: (dirty) => set({ isDirty: dirty }),
      markSaved: () => set({ lastSaved: new Date(), isDirty: false }),

      setCurrentView: (view) => set({ currentView: view }),
      setEditorLayout: (layout) => set({ editorLayout: layout }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setJsonPanelWidth: (width) => set({ jsonPanelWidth: width }),

      setTheme: (theme) => set({ theme }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setShowGrid: (show) => set({ showGrid: show }),
      setSnapToGrid: (snap) => set({ snapToGrid: snap }),
      setGridSize: (size) => set({ gridSize: size }),
    }),
    {
      name: 'design-token-studio-project',
      partialize: (state) => ({
        projectName: state.projectName,
        editorLayout: state.editorLayout,
        sidebarWidth: state.sidebarWidth,
        jsonPanelWidth: state.jsonPanelWidth,
        theme: state.theme,
        autoSave: state.autoSave,
        showGrid: state.showGrid,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
      }),
    }
  )
);
