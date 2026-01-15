'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Undo2,
  Redo2,
  Download,
  Upload,
  Layout,
  PanelLeftClose,
  PanelLeft,
  Package,
  Hand,
  MousePointer2,
  FileArchive,
  Settings,
  Palette,
  Ruler,
  Type,
  Hash,
  Clock,
  Square,
  Sparkles,
  CircleDot,
  Layers,
  FolderPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  ColorTokenNode,
  TokenGroupNode,
  TypographyTokenNode,
  SpacingTokenNode,
  ShadowTokenNode,
  GenericTokenNode,
  LayerContainerNode,
} from '@/components/flow/nodes';
import { NodeContextMenu } from '@/components/flow/NodeContextMenu';
import { NewTokenMenu } from '@/components/flow/NewTokenMenu';
import { JsonEditor } from '@/components/editors/JsonEditor';
import { PipelineSidebar } from '@/components/PipelineSidebar';
import { ExportDialog } from '@/components/ExportDialog';
import { BuildOutputPanel } from '@/components/BuildOutputPanel';
import { PipelineSettingsModal } from '@/components/settings/PipelineSettingsModal';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useProjectStore } from '@/stores/projectStore';
import { getLayerSlots } from '@/types/pipeline';
import { ExpandedGroupsProvider, useExpandedGroups } from '@/contexts/ExpandedGroupsContext';
import { generateTreeLayout, createAliasEdges, createHierarchyEdges, generateMultiLayerLayout, type TokenInheritanceInfo, type LayerDisplayInfo } from '@/lib/flow/utils';
import { flattenTokens } from '@/lib/tokens/schema';
import { isDesignToken, isTokenGroup } from '@/types/tokens';
import type { TokenFlowNode, TokenFlowEdge } from '@/types/flow';
import type { DesignTokenFile } from '@/types/tokens';

// Compute effective tokens and inheritance map for the canvas
function computeEffectiveTokensForCanvas(
  pipeline: { layers: Array<{ id: string; name: string; order: number; variables: string[] }> },
  pages: Array<{ id: string; layerId: string; variableValues: Record<string, string>; tokens: DesignTokenFile }>,
  activePageId: string | null
): { mergedTokens: DesignTokenFile; inheritanceMap: Map<string, TokenInheritanceInfo> } {
  const inheritanceMap = new Map<string, TokenInheritanceInfo>();
  const mergedTokens: DesignTokenFile = {};

  if (!activePageId) return { mergedTokens, inheritanceMap };

  const activePage = pages.find(p => p.id === activePageId);
  if (!activePage) return { mergedTokens, inheritanceMap };

  const activeLayer = pipeline.layers.find(l => l.id === activePage.layerId);
  if (!activeLayer) return { mergedTokens, inheritanceMap };

  // Get layers in order up to and including the active layer
  const relevantLayers = [...pipeline.layers]
    .filter(l => l.order <= activeLayer.order)
    .sort((a, b) => a.order - b.order);

  // Deep merge helper
  const deepMerge = (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    currentPath: string[],
    layerName: string,
    layerOrder: number,
    isInherited: boolean
  ) => {
    for (const key of Object.keys(source)) {
      if (key.startsWith('$') && key !== '$type') {
        target[key] = source[key];
        continue;
      }
      if (key.startsWith('$')) continue;

      const path = [...currentPath, key];
      const pathStr = path.join('.');
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isDesignToken(sourceValue)) {
        // Tokens always get updated with the latest layer's info (later layers override)
        target[key] = JSON.parse(JSON.stringify(sourceValue));
        inheritanceMap.set(pathStr, { isInherited, sourceLayerName: layerName, sourceLayerOrder: layerOrder });
      } else if (isTokenGroup(sourceValue)) {
        const isNewGroup = !targetValue || typeof targetValue !== 'object';
        if (isNewGroup) {
          target[key] = {};
        }
        // Groups keep the info from where they were first defined (base layer)
        // Only set inheritance info if this group doesn't exist yet
        if (!inheritanceMap.has(pathStr)) {
          inheritanceMap.set(pathStr, { isInherited, sourceLayerName: layerName, sourceLayerOrder: layerOrder });
        }
        deepMerge(target[key] as Record<string, unknown>, sourceValue as Record<string, unknown>, path, layerName, layerOrder, isInherited);
      }
    }
  };

  // Merge layers in order
  for (const layer of relevantLayers) {
    // Find the matching page for this layer
    const matchingPage = pages.find(p => {
      if (p.layerId !== layer.id) return false;
      if (layer.variables.length === 0) {
        return Object.keys(p.variableValues).length === 0;
      }
      for (const varKey of layer.variables) {
        if (p.variableValues[varKey] !== activePage.variableValues[varKey]) {
          return false;
        }
      }
      return true;
    });

    if (!matchingPage) continue;

    const isInherited = layer.id !== activeLayer.id;
    deepMerge(mergedTokens as Record<string, unknown>, matchingPage.tokens as Record<string, unknown>, [], layer.name, layer.order, isInherited);
  }

  return { mergedTokens, inheritanceMap };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  colorToken: ColorTokenNode,
  tokenGroup: TokenGroupNode,
  typographyToken: TypographyTokenNode,
  spacingToken: SpacingTokenNode,
  shadowToken: ShadowTokenNode,
  genericToken: GenericTokenNode,
  layerContainer: LayerContainerNode,
};

function TokenEditorContent() {
  const {
    pipeline,
    pages,
    activePageId,
    viewContext,
    getActivePage,
    updatePageTokens,
    buildAllTokens,
    setViewContext,
    getLayerSchemaKeys,
    getPageExtendedKeys,
    sidebarSelectedTokenPath,
    setSidebarSelectedTokenPath,
    setNewlyCreatedTokenPath,
  } = usePipelineStore();

  const {
    editorLayout,
    setEditorLayout,
    sidebarOpen,
    toggleSidebar,
    jsonPanelWidth,
  } = useProjectStore();

  // Build settings dialog
  const [buildSettingsOpen, setBuildSettingsOpen] = useState(false);

  // Export dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Build output panel
  const [showBuildOutput, setShowBuildOutput] = useState(true);
  const [buildOutputHeight, setBuildOutputHeight] = useState(250);

  // Interaction mode: 'pan' for panning, 'select' for box selection
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');

  // Keyboard shortcuts for interaction mode (V = select, H = hand/pan, Space = toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setInteractionMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setInteractionMode('pan');
      } else if (e.key === ' ') {
        // Space toggles between modes
        e.preventDefault();
        setInteractionMode(prev => prev === 'pan' ? 'select' : 'pan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Multi-layer view: track which variant is selected for each layer with variables
  // Key is layerId, value is the selected variable values for that layer
  const [layerSelections, setLayerSelections] = useState<Record<string, Record<string, string>>>({});

  // Expanded groups for tree view (from context)
  const { expandedGroups, toggleGroup } = useExpandedGroups();

  // Get active page and its tokens
  const activePage = getActivePage();

  // Determine if we're in schema view
  const isSchemaView = viewContext?.isSchemaView ?? false;
  const activeLayerId = viewContext?.layerId;
  const activeLayer = activeLayerId ? pipeline.layers.find(l => l.id === activeLayerId) : null;

  // Get sibling slots for the current layer (for the dropdown switcher)
  const siblingSlots = useMemo(() => {
    if (!activeLayer || activeLayer.variables.length === 0) return [];
    return getLayerSlots(activeLayer, pipeline.variables);
  }, [activeLayer, pipeline.variables]);

  // Get extended keys for current page (tokens not in sibling pages)
  const extendedKeys = useMemo(() => {
    if (isSchemaView || !activePage) return new Set<string>();
    return new Set(getPageExtendedKeys(activePage.id));
  }, [isSchemaView, activePage, getPageExtendedKeys]);

  // Initialize layer selections with defaults (first variant for each layer)
  useEffect(() => {
    const newSelections: Record<string, Record<string, string>> = {};
    let needsUpdate = false;

    for (const layer of pipeline.layers) {
      if (layer.variables.length > 0 && !layerSelections[layer.id]) {
        // Use the active page's variable values if it matches this layer, otherwise use first values
        const defaultValues: Record<string, string> = {};
        for (const varKey of layer.variables) {
          const variable = pipeline.variables.find(v => v.key === varKey);
          if (variable && variable.values.length > 0) {
            // Check if viewContext has a value for this variable
            defaultValues[varKey] = viewContext?.variableValues?.[varKey] || variable.values[0];
          }
        }
        newSelections[layer.id] = defaultValues;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      setLayerSelections(prev => ({ ...prev, ...newSelections }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline.layers, pipeline.variables, viewContext?.variableValues, layerSelections]);

  // Helper to update a layer's variant selection
  const updateLayerSelection = useCallback((layerId: string, variableValues: Record<string, string>) => {
    setLayerSelections(prev => ({
      ...prev,
      [layerId]: variableValues,
    }));
  }, []);

  // Compute layers to display with their tokens
  const layersToDisplay = useMemo((): LayerDisplayInfo[] => {
    const result: LayerDisplayInfo[] = [];

    for (const layer of pipeline.layers) {
      // Get the variable values for this layer
      const variableValues = layer.variables.length > 0
        ? layerSelections[layer.id] || {}
        : {};

      // Get available slots for this layer
      const availableSlots = layer.variables.length > 0
        ? getLayerSlots(layer, pipeline.variables)
        : [];

      // Find the page that matches this layer and variable selection
      const matchingPage = pages.find(p => {
        if (p.layerId !== layer.id) return false;
        if (layer.variables.length === 0) {
          return Object.keys(p.variableValues).length === 0;
        }
        // Check all variables match
        for (const varKey of layer.variables) {
          if (p.variableValues[varKey] !== variableValues[varKey]) {
            return false;
          }
        }
        return true;
      });

      if (matchingPage) {
        result.push({
          layerId: layer.id,
          layerName: layer.name,
          layerOrder: layer.order,
          variableValues,
          tokens: matchingPage.tokens,
          isActive: matchingPage.id === activePageId,
          availableSlots,
          onSlotChange: (slot: Record<string, string>) => {
            updateLayerSelection(layer.id, slot);
          },
        });
      }
    }

    return result;
  }, [pipeline.layers, pipeline.variables, pages, layerSelections, activePageId, updateLayerSelection]);

  // Generate multi-layer layout with containers
  const { containerNodes, tokenNodes, allFlattenedTokens } = useMemo(() => {
    const { nodes, containerNodes } = generateMultiLayerLayout(layersToDisplay, {
      expandedGroups,
    });

    // Flatten tokens from all layers for edge creation
    const allFlattened: ReturnType<typeof flattenTokens> = [];
    for (const layer of layersToDisplay) {
      const flattened = flattenTokens(layer.tokens);
      // Prefix paths with layer ID for edge matching
      for (const token of flattened) {
        allFlattened.push({
          ...token,
          // Store original path for alias resolution
          path: token.path,
        });
      }
    }

    return {
      containerNodes,
      tokenNodes: nodes,
      allFlattenedTokens: allFlattened,
    };
  }, [layersToDisplay, expandedGroups]);

  // Combine container and token nodes
  const visibleNodes = useMemo(() => {
    // Container nodes first (background), then token nodes
    return [...containerNodes, ...tokenNodes];
  }, [containerNodes, tokenNodes]);

  // Generate edges for visible nodes only
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Create hierarchy edges
    const hierarchyEdges = createHierarchyEdges(tokenNodes).filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    // Create alias edges for multi-layer view
    // Need to handle cross-layer aliases where referenced token may be in a different layer
    const aliasEdges: TokenFlowEdge[] = [];

    // Build a map of token path -> node ID for quick lookup
    const pathToNodeId = new Map<string, string>();
    for (const node of tokenNodes) {
      if (node.id.includes('-token-')) {
        const data = node.data as { path?: string[] };
        if (data.path) {
          const pathStr = data.path.join('.');
          // Store node ID - later layers override earlier ones (for cross-layer references)
          pathToNodeId.set(pathStr, node.id);
        }
      }
    }

    // For each token node, check if it's an alias and create edge
    for (const node of tokenNodes) {
      const data = node.data as { isAlias?: boolean; aliasPath?: string[]; path?: string[] };
      if (data.isAlias && data.aliasPath && data.path) {
        const referencedPath = data.aliasPath.join('.');
        const referencedNodeId = pathToNodeId.get(referencedPath);

        if (referencedNodeId && visibleNodeIds.has(node.id) && visibleNodeIds.has(referencedNodeId)) {
          aliasEdges.push({
            id: `alias-${node.id}-${referencedNodeId}`,
            source: referencedNodeId,
            target: node.id,
            targetHandle: 'left',
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: 'arrowclosed' as const,
              color: '#6366f1',
              width: 20,
              height: 20,
            },
            style: {
              stroke: '#6366f1',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            data: {
              sourcePath: data.aliasPath,
              targetPath: data.path,
            },
          });
        }
      }
    }

    return [...hierarchyEdges, ...aliasEdges];
  }, [visibleNodes, tokenNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState<TokenFlowNode>(visibleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<TokenFlowEdge>(visibleEdges);

  // Track selected node IDs
  const selectedNodeIds = useMemo(() => {
    return new Set(nodes.filter(n => n.selected).map(n => n.id));
  }, [nodes]);

  // Update edges with highlighted styles when connected to selected nodes
  const styledEdges = useMemo(() => {
    return visibleEdges.map(edge => {
      const isConnectedToSelected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      const isAliasEdge = edge.id.startsWith('alias-');

      if (isAliasEdge && isConnectedToSelected) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#f59e0b', // Amber/orange highlight
          },
          markerEnd: {
            type: 'arrowclosed' as const,
            color: '#f59e0b',
            width: 20,
            height: 20,
          },
          zIndex: 1000,
          animated: true,
        };
      }
      return edge;
    });
  }, [visibleEdges, selectedNodeIds]);

  // Track previous expanded groups to detect expand/collapse changes
  const prevExpandedGroupsRef = useRef<Set<string>>(expandedGroups);
  const prevNodeCountRef = useRef<number>(visibleNodes.length);

  // Update nodes when tokens or visibility changes
  // Preserve positions only when token values change, not when structure changes
  useEffect(() => {
    const expandedGroupsChanged = prevExpandedGroupsRef.current !== expandedGroups;
    const nodeCountChanged = prevNodeCountRef.current !== visibleNodes.length;

    // Update refs for next comparison
    prevExpandedGroupsRef.current = expandedGroups;
    prevNodeCountRef.current = visibleNodes.length;

    // If structure changed (expand/collapse or node count), use new positions
    if (expandedGroupsChanged || nodeCountChanged) {
      setNodes(visibleNodes);
      return;
    }

    // Otherwise preserve existing positions (value-only changes)
    setNodes((currentNodes) => {
      const currentPositions = new Map(
        currentNodes.map(n => [n.id, n.position])
      );

      return visibleNodes.map(newNode => {
        const existingPosition = currentPositions.get(newNode.id);
        if (existingPosition) {
          return { ...newNode, position: existingPosition };
        }
        return newNode;
      });
    });
  }, [visibleNodes, expandedGroups, setNodes]);

  // Update edges when styled edges change
  useEffect(() => {
    setEdges(styledEdges);
  }, [styledEdges, setEdges]);

  // Track last selected path to avoid infinite loops
  const lastSelectedPathRef = useRef<string | null>(null);

  // Select canvas node when sidebar selection changes
  useEffect(() => {
    if (!sidebarSelectedTokenPath || sidebarSelectedTokenPath.length === 0) {
      return;
    }

    const pathStr = sidebarSelectedTokenPath.join('.');

    // Skip if we already processed this selection
    if (lastSelectedPathRef.current === pathStr) {
      return;
    }
    lastSelectedPathRef.current = pathStr;

    // Select the matching node using functional update to avoid dependency on nodes
    setNodes((nds) => {
      const matchingNodeId = nds.find(node => {
        const data = node.data as { path?: string[] };
        return data.path && data.path.join('.') === pathStr;
      })?.id;

      if (!matchingNodeId) return nds;

      return nds.map((n) => ({
        ...n,
        selected: n.id === matchingNodeId,
      }));
    });
  }, [sidebarSelectedTokenPath, setNodes]);

  // Helper to set a value at a path in tokens object
  const setAtPath = useCallback((obj: Record<string, unknown>, path: string[], value: unknown) => {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;
  }, []);

  // Create alias between tokens
  // aliasTokenPath = the token that will have the alias reference (e.g., button.background)
  // referencedTokenPath = the token being referenced (e.g., colors.blue.500)
  // pageId = the page containing the alias token
  const createAliasInPage = useCallback((pageId: string, aliasTokenPath: string[], referencedTokenPath: string[]) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const newTokens = JSON.parse(JSON.stringify(page.tokens));

    // Navigate to alias token, creating path if needed
    let current: any = newTokens;
    for (let i = 0; i < aliasTokenPath.length - 1; i++) {
      if (!current[aliasTokenPath[i]]) {
        current[aliasTokenPath[i]] = {};
      }
      current = current[aliasTokenPath[i]];
    }

    const tokenKey = aliasTokenPath[aliasTokenPath.length - 1];

    // Get existing token or create new one
    let aliasToken = current[tokenKey];
    if (!aliasToken || typeof aliasToken !== 'object') {
      // Create a new token with the alias
      aliasToken = {
        $value: `{${referencedTokenPath.join('.')}}`,
        $type: 'color', // Default type, could be inferred from target
      };
    } else if ('$value' in aliasToken) {
      // Update existing token's value to be an alias
      aliasToken.$value = `{${referencedTokenPath.join('.')}}`;
    } else {
      // It's a group, not a token - can't create alias
      return;
    }

    current[tokenKey] = aliasToken;
    updatePageTokens(pageId, newTokens);
  }, [pages, updatePageTokens]);

  // Handle connection drawing between nodes
  // User drags FROM source (right handle) TO target (left handle)
  // The TARGET node becomes an alias pointing to the SOURCE node
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceId = connection.source;
      const targetId = connection.target;

      if (!sourceId || !targetId) return;

      // Find the nodes to get their data
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);

      if (!sourceNode || !targetNode) return;

      const sourceData = sourceNode.data as { path?: string[]; layerId?: string };
      const targetData = targetNode.data as { path?: string[]; layerId?: string };

      // Both must be token nodes with paths
      if (!sourceData.path || !targetData.path) return;
      if (!sourceId.includes('-token-') || !targetId.includes('-token-')) return;

      // Find the page for the target node (the one that will become an alias)
      const targetLayerId = targetData.layerId;
      if (!targetLayerId) return;

      // Find the page that matches the target layer and current selection
      const targetLayer = pipeline.layers.find(l => l.id === targetLayerId);
      if (!targetLayer) return;

      const targetVariableValues = layerSelections[targetLayerId] || {};
      const targetPage = pages.find(p => {
        if (p.layerId !== targetLayerId) return false;
        if (targetLayer.variables.length === 0) {
          return Object.keys(p.variableValues).length === 0;
        }
        return targetLayer.variables.every(varKey =>
          p.variableValues[varKey] === targetVariableValues[varKey]
        );
      });

      if (!targetPage) return;

      // Create the alias: target node references source node
      createAliasInPage(targetPage.id, targetData.path, sourceData.path);
    },
    [nodes, pages, pipeline.layers, layerSelections, createAliasInPage]
  );

  // Handle file import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (activePage) {
            updatePageTokens(activePage.id, parsed);
          }
        } catch (err) {
          alert(`Failed to import: ${(err as Error).message}`);
        }
      }
    };
    input.click();
  }, [activePage, updatePageTokens]);

  // Handle file export
  const handleExport = useCallback(() => {
    if (!activePage) return;
    const json = JSON.stringify(activePage.tokens, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePage.tokens.$name || 'tokens'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activePage]);

  // Handle export all builds
  const handleExportAllBuilds = useCallback(() => {
    const allBuilds = buildAllTokens();
    const exportData = {
      pipeline: {
        name: pipeline.name,
        variables: pipeline.variables.map(v => ({ name: v.name, key: v.key, values: v.values })),
        layers: pipeline.layers.map(l => ({ name: l.name, variables: l.variables, required: l.required })),
      },
      builds: allBuilds.map(({ config, tokens }) => ({
        name: config.name,
        selections: config.selections,
        tokens,
      })),
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pipeline.name.toLowerCase().replace(/\s+/g, '-')}-all-builds.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildAllTokens, pipeline]);

  // Token type definitions with default values
  const TOKEN_TYPES = useMemo(() => [
    { type: 'color', label: 'Color', icon: <Palette className="w-4 h-4" />, defaultValue: '#000000' },
    { type: 'dimension', label: 'Dimension', icon: <Ruler className="w-4 h-4" />, defaultValue: '16px' },
    { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, defaultValue: 0 },
    { type: 'fontFamily', label: 'Font Family', icon: <Type className="w-4 h-4" />, defaultValue: 'Inter' },
    { type: 'fontWeight', label: 'Font Weight', icon: <Type className="w-4 h-4" />, defaultValue: 400 },
    { type: 'duration', label: 'Duration', icon: <Clock className="w-4 h-4" />, defaultValue: '200ms' },
    { type: 'shadow', label: 'Shadow', icon: <Layers className="w-4 h-4" />, defaultValue: '0 2px 4px rgba(0,0,0,0.1)' },
    { type: 'border', label: 'Border', icon: <Square className="w-4 h-4" />, defaultValue: '1px solid #000000' },
    { type: 'gradient', label: 'Gradient', icon: <Sparkles className="w-4 h-4" />, defaultValue: 'linear-gradient(90deg, #000 0%, #fff 100%)' },
    { type: 'cubicBezier', label: 'Easing', icon: <CircleDot className="w-4 h-4" />, defaultValue: [0.4, 0, 0.2, 1] },
  ], []);

  // Create new token with auto-generated name
  const handleCreateToken = useCallback(
    (type: string, defaultValue: unknown) => {
      if (!activePage) return;

      // Generate unique name
      const baseName = `new-${type}`;
      let name = baseName;
      let counter = 1;

      // Check if name exists at root level
      while (activePage.tokens[name] !== undefined) {
        name = `${baseName}-${counter}`;
        counter++;
      }

      const path = [name];
      const token = { $value: defaultValue, $type: type };

      const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
      setAtPath(newTokens, path, token);
      updatePageTokens(activePage.id, newTokens);

      // Trigger auto-focus in sidebar
      setNewlyCreatedTokenPath(path);
    },
    [activePage, updatePageTokens, setAtPath, setNewlyCreatedTokenPath]
  );

  // Handle creating a group with auto-generated name
  const handleCreateGroup = useCallback(() => {
    if (!activePage) return;

    // Generate unique name
    const baseName = 'new-group';
    let name = baseName;
    let counter = 1;

    while (activePage.tokens[name] !== undefined) {
      name = `${baseName}-${counter}`;
      counter++;
    }

    const path = [name];

    const newTokens = JSON.parse(JSON.stringify(activePage.tokens));
    setAtPath(newTokens, path, {});
    updatePageTokens(activePage.id, newTokens);

    // Trigger auto-focus in sidebar
    setNewlyCreatedTokenPath(path);
  }, [activePage, updatePageTokens, setAtPath, setNewlyCreatedTokenPath]);

  // Node context menu state (for right-clicking on tokens)
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    nodePath: string[];
    nodeType: string;
    isAlias: boolean;
    aliasPath?: string[];
    position: { x: number; y: number };
  } | null>(null);

  // Pane context menu state (for right-clicking on empty canvas)
  const [paneContextMenu, setPaneContextMenu] = useState<{
    position: { x: number; y: number };
  } | null>(null);

  // Handle right-click on nodes
  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      setPaneContextMenu(null); // Close pane menu if open
      const data = node.data as { path?: string[]; isAlias?: boolean; aliasPath?: string[] };
      setContextMenu({
        nodeId: node.id,
        nodePath: data.path || [],
        nodeType: node.type || 'genericToken',
        isAlias: data.isAlias || false,
        aliasPath: data.aliasPath,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  // Handle right-click on empty canvas
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(null); // Close node menu if open
    setPaneContextMenu({
      position: { x: event.clientX, y: event.clientY },
    });
  }, []);

  // Close context menus on click outside
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setPaneContextMenu(null);
  }, []);

  const showSidebar = sidebarOpen && editorLayout !== 'json';
  const showFlow = editorLayout !== 'json';
  const showJson = editorLayout !== 'visual';

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="mr-2"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeft className="w-4 h-4" />
          )}
        </Button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

        {/* Undo/Redo - TODO: Implement with pipeline store */}
        <Button
          variant="ghost"
          size="sm"
          disabled
          title="Undo (coming soon)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled
          title="Redo (coming soon)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

        {/* Import/Export */}
        <Button variant="ghost" size="sm" onClick={handleImport}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Current Page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportAllBuilds}>
              <Package className="w-4 h-4 mr-2" />
              Export All Builds (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <FileArchive className="w-4 h-4 mr-2" />
              Export as ZIP...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

        {/* Build Settings */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBuildSettingsOpen(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Build Settings
        </Button>

        <div className="flex-1" />

        {/* Layout toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
          <Button
            variant={editorLayout === 'visual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditorLayout('visual')}
          >
            <Layout className="w-4 h-4" />
          </Button>
          <Button
            variant={editorLayout === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditorLayout('split')}
          >
            Split
          </Button>
          <Button
            variant={editorLayout === 'json' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditorLayout('json')}
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-auto">
            <PipelineSidebar />
          </div>
        )}

        {/* Flow canvas */}
        {showFlow && (
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeContextMenu={onNodeContextMenu}
              onPaneContextMenu={onPaneContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-50 dark:bg-gray-900"
              // Selection mode configuration
              selectionOnDrag={interactionMode === 'select'}
              panOnDrag={interactionMode === 'pan'}
              selectionMode={SelectionMode.Partial}
              // Allow multi-selection with shift+click in both modes
              multiSelectionKeyCode="Shift"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#d1d5db"
              />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.type) {
                    case 'colorToken':
                      return '#ec4899';
                    case 'typographyToken':
                      return '#8b5cf6';
                    case 'spacingToken':
                      return '#3b82f6';
                    case 'shadowToken':
                      return '#6b7280';
                    case 'tokenGroup':
                      return '#f59e0b';
                    default:
                      return '#9ca3af';
                  }
                }}
                maskColor="rgba(0,0,0,0.1)"
              />
            </ReactFlow>

            {/* Interaction Mode Toggle - Fixed at bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
                {/* Mode toggle buttons */}
                <Button
                  variant={interactionMode === 'pan' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setInteractionMode('pan')}
                  title="Pan mode (H)"
                  className="h-8 w-8 p-0"
                >
                  <Hand className="w-4 h-4" />
                </Button>
                <Button
                  variant={interactionMode === 'select' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setInteractionMode('select')}
                  title="Select mode (V)"
                  className="h-8 w-8 p-0"
                >
                  <MousePointer2 className="w-4 h-4" />
                </Button>

                {/* Separator */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Add token dropdown - opens upward */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Add token or group"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="center">
                    {TOKEN_TYPES.map((tokenType) => (
                      <DropdownMenuItem
                        key={tokenType.type}
                        onClick={() => handleCreateToken(tokenType.type, tokenType.defaultValue)}
                      >
                        {tokenType.icon}
                        <span className="ml-2">{tokenType.label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCreateGroup}>
                      <FolderPlus className="w-4 h-4" />
                      <span className="ml-2">Group</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Node Context Menu */}
            {contextMenu && (
              <NodeContextMenu
                nodeId={contextMenu.nodeId}
                nodePath={contextMenu.nodePath}
                nodeType={contextMenu.nodeType}
                isAlias={contextMenu.isAlias}
                aliasPath={contextMenu.aliasPath}
                position={contextMenu.position}
                onClose={() => setContextMenu(null)}
              />
            )}

            {/* Pane Context Menu (right-click on empty canvas) */}
            {paneContextMenu && (
              <NewTokenMenu
                position={paneContextMenu.position}
                parentPath={[]}
                onClose={() => setPaneContextMenu(null)}
              />
            )}
          </div>
        )}

        {/* JSON Editor with Build Output */}
        {showJson && (
          <div
            className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden"
            style={{ width: editorLayout === 'json' ? '100%' : jsonPanelWidth }}
          >
            {/* JSON Editor - use calculated height when build output is shown */}
            <div
              className="min-h-0 overflow-hidden"
              style={{
                height: showBuildOutput ? `calc(100% - ${buildOutputHeight}px)` : '100%'
              }}
            >
              <JsonEditor />
            </div>

            {/* Build Output Panel */}
            {showBuildOutput && (
              <BuildOutputPanel
                height={buildOutputHeight}
                onHeightChange={setBuildOutputHeight}
                minHeight={150}
                maxHeight={500}
              />
            )}
          </div>
        )}
      </div>

      {/* Build Settings Dialog */}
      <PipelineSettingsModal open={buildSettingsOpen} onClose={() => setBuildSettingsOpen(false)} />

      {/* Export Dialog */}
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
    </div>
  );
}

export default function TokenEditorPage() {
  return (
    <ReactFlowProvider>
      <ExpandedGroupsProvider initialExpanded={['colors', 'spacing', 'typography', 'button']}>
        <TokenEditorContent />
      </ExpandedGroupsProvider>
    </ReactFlowProvider>
  );
}
