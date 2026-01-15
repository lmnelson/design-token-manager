'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Figma,
  Upload,
  RefreshCw,
  Link2,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings,
  Download,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  ColorTokenNode,
  TypographyTokenNode,
  SpacingTokenNode,
  FigmaComponentNode,
  GenericTokenNode,
} from '@/components/flow/nodes';
import { TokenMappingEdge } from '@/components/flow/edges/TokenMappingEdge';
import { useTokenStore } from '@/stores/tokenStore';
import { useFigmaStore, ParsedComponent, TokenMapping } from '@/stores/figmaStore';
import { FigmaApiClient, parseFigmaFileUrl, findComponents, parseComponent } from '@/lib/figma/api';
import { matchBindingsToTokens, groupMappingsByConfidence } from '@/lib/figma/mapper';
import type { TokenFlowNode, TokenFlowEdge, FigmaComponentNodeData, TokenMappingEdgeData } from '@/types/flow';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  colorToken: ColorTokenNode,
  typographyToken: TypographyTokenNode,
  spacingToken: SpacingTokenNode,
  genericToken: GenericTokenNode,
  figmaComponent: FigmaComponentNode,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: any = {
  tokenMapping: TokenMappingEdge,
};

function ComponentMapperContent() {
  const { flattenedTokens } = useTokenStore();
  const {
    accessToken,
    setAccessToken,
    components,
    addComponent,
    selectedComponentId,
    selectComponent,
    tokenMappings,
    setMappings,
    isLoading,
    setLoading,
    error,
    setError,
  } = useFigmaStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<TokenFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<TokenFlowEdge>([]);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [showMappings, setShowMappings] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempToken, setTempToken] = useState(accessToken || '');

  // Generate nodes and edges when component or tokens change
  useEffect(() => {
    if (!selectedComponentId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const component = components.find((c) => c.id === selectedComponentId);
    if (!component) return;

    const mappings = tokenMappings.get(selectedComponentId) || [];

    // Create component node (center)
    const componentNode: TokenFlowNode = {
      id: `component-${component.id}`,
      type: 'figmaComponent',
      position: { x: 400, y: 200 },
      data: {
        componentId: component.id,
        name: component.name,
        description: component.description,
        thumbnailUrl: component.thumbnailUrl,
        width: component.width,
        height: component.height,
        properties: component.styleBindings.map((b) => ({
          nodeId: b.nodeId,
          nodeName: b.nodeName,
          propertyType: b.property as any,
          value: b.value,
          boundPosition: b.position,
        })),
      } as FigmaComponentNodeData,
    };

    // Create token nodes around the component
    const tokenNodes: TokenFlowNode[] = [];
    const newEdges: TokenFlowEdge[] = [];
    const usedTokenPaths = new Set<string>();

    // Position tokens in a circle around the component
    const uniqueMappings = mappings.filter((m) => {
      const pathStr = m.tokenPath.join('.');
      if (usedTokenPaths.has(pathStr)) return false;
      usedTokenPaths.add(pathStr);
      return true;
    });

    const radius = 350;
    const centerX = 400;
    const centerY = 200;

    uniqueMappings.forEach((mapping, index) => {
      const angle = (index / uniqueMappings.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const token = flattenedTokens.find(
        (t) => t.path.join('.') === mapping.tokenPath.join('.')
      );

      if (token) {
        const nodeId = `token-${mapping.tokenPath.join('-')}`;

        // Create token node
        let nodeType: string;
        switch (token.resolvedType) {
          case 'color':
            nodeType = 'colorToken';
            break;
          case 'typography':
            nodeType = 'typographyToken';
            break;
          case 'dimension':
            nodeType = 'spacingToken';
            break;
          default:
            nodeType = 'genericToken';
        }

        tokenNodes.push({
          id: nodeId,
          type: nodeType,
          position: { x, y },
          data: {
            path: token.path,
            name: token.name,
            value: token.token.$value,
            description: token.token.$description,
            isAlias: token.isAlias,
            aliasPath: token.aliasPath,
          },
        } as TokenFlowNode);

        // Create edge from token to component
        if (showMappings) {
          newEdges.push({
            id: `edge-${nodeId}-${component.id}`,
            source: nodeId,
            target: `component-${component.id}`,
            type: 'tokenMapping',
            data: {
              tokenPath: mapping.tokenPath.join('.'),
              figmaProperty: mapping.binding.property,
              figmaNodeId: mapping.binding.nodeId,
              confidence: mapping.confidence,
              matchType: mapping.matchType,
            } as TokenMappingEdgeData,
          } as TokenFlowEdge);
        }
      }
    });

    setNodes([componentNode, ...tokenNodes]);
    setEdges(newEdges);
  }, [selectedComponentId, components, tokenMappings, flattenedTokens, showMappings, setNodes, setEdges]);

  // Import component from Figma
  const handleImportFromFigma = useCallback(async () => {
    if (!accessToken) {
      setError('Please set your Figma access token first');
      setSettingsOpen(true);
      return;
    }

    if (!figmaUrl) {
      setError('Please enter a Figma file URL');
      return;
    }

    const parsed = parseFigmaFileUrl(figmaUrl);
    if (!parsed) {
      setError('Invalid Figma URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = new FigmaApiClient(accessToken);
      const file = await client.getFile(parsed.fileKey);

      // Find all components in the file
      const figmaComponents = findComponents(file.document);

      if (figmaComponents.length === 0) {
        setError('No components found in this file');
        setLoading(false);
        return;
      }

      // Get thumbnails for components
      const componentIds = figmaComponents.map((c) => c.id);
      const images = await client.getImages(parsed.fileKey, componentIds, {
        format: 'png',
        scale: 2,
      });

      // Parse each component
      for (const figmaComponent of figmaComponents) {
        const thumbnailUrl = images.images[figmaComponent.id] || undefined;
        const parsedComponent = parseComponent(figmaComponent, thumbnailUrl || undefined);

        // Run token matching
        const mappings = matchBindingsToTokens(
          parsedComponent.styleBindings,
          flattenedTokens
        );

        addComponent(parsedComponent);
        setMappings(parsedComponent.id, mappings);
      }

      // Select the first component
      if (figmaComponents.length > 0) {
        selectComponent(figmaComponents[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, figmaUrl, flattenedTokens, addComponent, setMappings, selectComponent, setLoading, setError]);

  // Save access token
  const handleSaveToken = useCallback(() => {
    setAccessToken(tempToken);
    setSettingsOpen(false);
  }, [tempToken, setAccessToken]);

  // Re-run token matching for selected component
  const handleRefreshMappings = useCallback(() => {
    if (!selectedComponentId) return;

    const component = components.find((c) => c.id === selectedComponentId);
    if (!component) return;

    const mappings = matchBindingsToTokens(
      component.styleBindings,
      flattenedTokens
    );
    setMappings(selectedComponentId, mappings);
  }, [selectedComponentId, components, flattenedTokens, setMappings]);

  // Get mapping stats
  const mappingStats = useMemo(() => {
    if (!selectedComponentId) return null;
    const mappings = tokenMappings.get(selectedComponentId) || [];
    return groupMappingsByConfidence(mappings);
  }, [selectedComponentId, tokenMappings]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-3">
        <Link href="/" className="mr-2">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Figma URL input */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <Figma className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <Input
            placeholder="Paste Figma file URL..."
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            className="h-9"
          />
          <Button
            size="sm"
            onClick={handleImportFromFigma}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="ml-2">Import</span>
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMappings(!showMappings)}
        >
          {showMappings ? (
            <Eye className="w-4 h-4 mr-2" />
          ) : (
            <EyeOff className="w-4 h-4 mr-2" />
          )}
          Mappings
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshMappings}
          disabled={!selectedComponentId}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Re-match
        </Button>

        <div className="flex-1" />

        {/* Settings */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Figma Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="token">Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Enter your Figma PAT..."
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Get your token from Figma → Account Settings → Personal access
                  tokens
                </p>
              </div>
              <Button onClick={handleSaveToken} className="w-full">
                Save Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Component list sidebar */}
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Components
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {components.length} imported
            </p>
          </div>

          {components.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Figma className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No components imported</p>
              <p className="text-xs mt-1">
                Paste a Figma URL above to import components
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {components.map((component) => (
                <button
                  key={component.id}
                  onClick={() => selectComponent(component.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-md transition-colors',
                    selectedComponentId === component.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {component.thumbnailUrl ? (
                      <img
                        src={component.thumbnailUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {component.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {component.styleBindings.length} properties
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flow canvas */}
        <div className="flex-1 relative">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-50 dark:bg-gray-900"
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
                if (node.type === 'figmaComponent') return '#8b5cf6';
                if (node.type === 'colorToken') return '#ec4899';
                if (node.type === 'typographyToken') return '#8b5cf6';
                if (node.type === 'spacingToken') return '#3b82f6';
                return '#9ca3af';
              }}
              maskColor="rgba(0,0,0,0.1)"
            />

            {/* Stats panel */}
            {mappingStats && (
              <Panel position="top-right" className="m-4">
                <Card className="w-64">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Token Mappings</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Exact matches
                        </span>
                        <span className="font-medium">
                          {mappingStats.exact.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Approximate
                        </span>
                        <span className="font-medium">
                          {mappingStats.approximate.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Manual
                        </span>
                        <span className="font-medium">
                          {mappingStats.manual.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Panel>
            )}
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Link2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No Component Selected
                </h3>
                <p className="text-gray-500 text-sm max-w-md">
                  Import a Figma file to see how your design tokens map to
                  component properties
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComponentMapperPage() {
  return (
    <ReactFlowProvider>
      <ComponentMapperContent />
    </ReactFlowProvider>
  );
}
