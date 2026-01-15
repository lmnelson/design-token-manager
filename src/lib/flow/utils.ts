import type { Node, Edge, XYPosition } from '@xyflow/react';
import type { FlattenedToken, TokenType, TokenGroup, DesignTokenFile } from '@/types/tokens';
import type { TokenFlowNode, TokenFlowEdge } from '@/types/flow';
import { isDesignToken, isTokenGroup } from '@/types/tokens';

// Layout mode for compact formatting
export type LayoutMode = 'tree' | 'compact' | 'grid';

// Apply compact layout to nodes - minimal spacing
export function applyCompactLayout(
  nodes: TokenFlowNode[],
  options: {
    nodeWidth?: number;
    nodeHeight?: number;
    horizontalGap?: number;
    verticalGap?: number;
    groupGap?: number;
    startX?: number;
    startY?: number;
  } = {}
): TokenFlowNode[] {
  const {
    nodeWidth = 180,
    nodeHeight = 32,
    horizontalGap = 8,
    verticalGap = 4,
    groupGap = 16,
    startX = 20,
    startY = 20,
  } = options;

  // Separate groups and tokens
  const groups = nodes.filter(n => n.type === 'tokenGroup');
  const tokens = nodes.filter(n => n.type !== 'tokenGroup');

  // Sort groups by path depth, then alphabetically
  groups.sort((a, b) => {
    const pathA = (a.data.path as string[]) || [];
    const pathB = (b.data.path as string[]) || [];
    if (pathA.length !== pathB.length) return pathA.length - pathB.length;
    return pathA.join('.').localeCompare(pathB.join('.'));
  });

  // Sort tokens by their parent group path, then alphabetically
  tokens.sort((a, b) => {
    const pathA = (a.data.path as string[]) || [];
    const pathB = (b.data.path as string[]) || [];
    const parentA = pathA.slice(0, -1).join('.');
    const parentB = pathB.slice(0, -1).join('.');
    if (parentA !== parentB) return parentA.localeCompare(parentB);
    return pathA.join('.').localeCompare(pathB.join('.'));
  });

  const updatedNodes: TokenFlowNode[] = [];
  let currentY = startY;
  let currentX = startX;
  let maxYInRow = 0;
  let lastParentPath = '';

  // Position groups first (as headers)
  for (const group of groups) {
    const groupPath = (group.data.path as string[]).join('.');

    // Add extra spacing between top-level groups
    if (lastParentPath && !groupPath.startsWith(lastParentPath)) {
      currentY += groupGap;
    }

    updatedNodes.push({
      ...group,
      position: { x: startX, y: currentY },
    });

    currentY += nodeHeight + verticalGap;
    lastParentPath = groupPath;
  }

  // Add spacing before tokens
  if (groups.length > 0) {
    currentY += groupGap;
  }

  // Position tokens in a grid under their groups
  let tokensPerRow = 3;
  let tokenIndex = 0;
  lastParentPath = '';

  for (const token of tokens) {
    const tokenPath = (token.data.path as string[]) || [];
    const parentPath = tokenPath.slice(0, -1).join('.');

    // New row for different parent group
    if (parentPath !== lastParentPath && tokenIndex > 0) {
      currentY += maxYInRow + groupGap;
      currentX = startX;
      tokenIndex = 0;
      maxYInRow = 0;
    }

    // New row when reaching max per row
    if (tokenIndex > 0 && tokenIndex % tokensPerRow === 0) {
      currentY += nodeHeight + verticalGap;
      currentX = startX;
    }

    updatedNodes.push({
      ...token,
      position: { x: currentX, y: currentY },
    });

    currentX += nodeWidth + horizontalGap;
    maxYInRow = Math.max(maxYInRow, nodeHeight);
    tokenIndex++;
    lastParentPath = parentPath;
  }

  return updatedNodes;
}

// Apply grid layout - tokens in a uniform grid
export function applyGridLayout(
  nodes: TokenFlowNode[],
  options: {
    nodeWidth?: number;
    nodeHeight?: number;
    horizontalGap?: number;
    verticalGap?: number;
    columns?: number;
    startX?: number;
    startY?: number;
  } = {}
): TokenFlowNode[] {
  const {
    nodeWidth = 180,
    nodeHeight = 32,
    horizontalGap = 12,
    verticalGap = 8,
    columns = 4,
    startX = 20,
    startY = 20,
  } = options;

  // Sort all nodes by path
  const sortedNodes = [...nodes].sort((a, b) => {
    const pathA = (a.data.path as string[]) || [];
    const pathB = (b.data.path as string[]) || [];
    return pathA.join('.').localeCompare(pathB.join('.'));
  });

  return sortedNodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: startX + col * (nodeWidth + horizontalGap),
        y: startY + row * (nodeHeight + verticalGap),
      },
    };
  });
}

// Check if a node should be visible based on expanded groups
export function isNodeVisible(
  path: string[],
  expandedGroups: Set<string>
): boolean {
  // Root level items are always visible
  if (path.length <= 1) return true;

  // Check if all parent groups are expanded
  for (let i = 1; i < path.length; i++) {
    const parentPath = path.slice(0, i).join('.');
    if (!expandedGroups.has(parentPath)) {
      return false;
    }
  }
  return true;
}

// Filter nodes and edges based on visibility
export function filterVisibleNodesAndEdges(
  nodes: TokenFlowNode[],
  edges: TokenFlowEdge[],
  expandedGroups: Set<string>
): { visibleNodes: TokenFlowNode[]; visibleEdges: TokenFlowEdge[] } {
  const visibleNodeIds = new Set<string>();

  const visibleNodes = nodes.filter(node => {
    const path = node.data.path as string[];
    const visible = isNodeVisible(path, expandedGroups);
    if (visible) {
      visibleNodeIds.add(node.id);
    }
    return visible;
  });

  // Only show edges where both source and target are visible
  const visibleEdges = edges.filter(edge =>
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  return { visibleNodes, visibleEdges };
}

// Generate a grid layout for tokens
export function generateGridLayout(
  tokens: FlattenedToken[],
  options: {
    startX?: number;
    startY?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    horizontalGap?: number;
    verticalGap?: number;
    nodesPerRow?: number;
  } = {}
): Map<string, XYPosition> {
  const {
    startX = 50,
    startY = 50,
    nodeWidth = 200,
    nodeHeight = 100,
    horizontalGap = 30,
    verticalGap = 30,
    nodesPerRow = 4,
  } = options;

  const positions = new Map<string, XYPosition>();

  tokens.forEach((token, index) => {
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;

    positions.set(token.path.join('.'), {
      x: startX + col * (nodeWidth + horizontalGap),
      y: startY + row * (nodeHeight + verticalGap),
    });
  });

  return positions;
}

// Generate a hierarchical tree layout for tokens
// When inheritanceMap is provided with layer order info, arranges layers as columns (left to right)
// with tokens cascading vertically within each column
// When expandedGroups is provided, collapsed groups' children are skipped (no vertical space allocated)
// When isSchemaView is true, all tokens are marked as schema-only (keys without editable values)
// When extendedKeys is provided, tokens with paths in that set are marked as extensions
export function generateTreeLayout(
  tokenFile: DesignTokenFile | TokenGroup,
  options: {
    startX?: number;
    startY?: number;
    levelIndent?: number;
    verticalGap?: number;
    groupHeight?: number;
    tokenHeight?: number;
    compact?: boolean;
    inheritanceMap?: Map<string, TokenInheritanceInfo>;
    layerColumnWidth?: number;
    expandedGroups?: Set<string>;
    isSchemaView?: boolean;
    extendedKeys?: Set<string>;
    childPageCount?: number;
  } = {}
): { positions: Map<string, XYPosition>; nodes: TokenFlowNode[] } {
  const compact = options.compact ?? false;
  const {
    startX = 50,
    startY = 50,
    levelIndent = 24,
    verticalGap = compact ? 4 : 10,
    groupHeight = compact ? 32 : 40,
    tokenHeight = compact ? 32 : 40,
    inheritanceMap,
    layerColumnWidth = 450,
    expandedGroups,
    isSchemaView = false,
    extendedKeys = new Set(),
    childPageCount = 0,
  } = options;

  const positions = new Map<string, XYPosition>();
  const nodes: TokenFlowNode[] = [];

  // If we have layer info, use horizontal layer-based layout
  if (inheritanceMap && inheritanceMap.size > 0) {
    // Get unique layer orders
    const layerOrders = new Set<number>();
    inheritanceMap.forEach(info => {
      if (info.sourceLayerOrder !== undefined) {
        layerOrders.add(info.sourceLayerOrder);
      }
    });
    const sortedLayerOrders = Array.from(layerOrders).sort((a, b) => a - b);

    // Create a map of layer order to column X position
    const layerColumnX = new Map<number, number>();
    sortedLayerOrders.forEach((order, index) => {
      layerColumnX.set(order, startX + index * layerColumnWidth);
    });

    // Track Y position for each layer column independently
    const layerCurrentY = new Map<number, number>();
    sortedLayerOrders.forEach(order => {
      layerCurrentY.set(order, startY);
    });

    // Check if all parent groups in path are expanded
    function isVisible(path: string[]): boolean {
      if (!expandedGroups || path.length <= 1) return true;
      // Check each parent path
      for (let i = 1; i < path.length; i++) {
        const parentPath = path.slice(0, i).join('.');
        if (!expandedGroups.has(parentPath)) {
          return false;
        }
      }
      return true;
    }

    // Traverse the token tree, placing each item in its layer's column
    // Top-level groups at column edge, sub-groups and tokens indented based on depth
    function traverse(obj: TokenGroup | DesignTokenFile, path: string[], depth: number) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;

        const currentPath = [...path, key];
        const pathStr = currentPath.join('.');

        // Skip if parent group is collapsed
        if (!isVisible(currentPath)) continue;

        const inheritanceInfo = inheritanceMap!.get(pathStr);
        const layerOrder = inheritanceInfo?.sourceLayerOrder ?? 0;

        const columnX = layerColumnX.get(layerOrder) ?? startX;
        const y = layerCurrentY.get(layerOrder) ?? startY;

        if (isDesignToken(value)) {
          // Tokens are indented based on depth (one more level than their parent group)
          const x = columnX + depth * levelIndent;
          positions.set(pathStr, { x, y });
          // Resolve alias value for visual display
          const resolvedValue = resolveAlias(value.$value, tokenFile as Record<string, unknown>);
          const isExtended = extendedKeys.has(pathStr);
          // Only show schema mode for tokens that belong to the current layer (not inherited)
          const showAsSchema = isSchemaView && !inheritanceInfo?.isInherited;
          nodes.push(createTokenNode(currentPath, value, { x, y }, inheritanceInfo, resolvedValue, showAsSchema, childPageCount, isExtended));
          layerCurrentY.set(layerOrder, y + tokenHeight + verticalGap);
        } else if (isTokenGroup(value)) {
          // Groups are indented based on depth (top-level at edge, sub-groups indented)
          const x = columnX + depth * levelIndent;
          positions.set(pathStr, { x, y });
          nodes.push(createGroupNode(currentPath, value, { x, y }, inheritanceInfo));
          layerCurrentY.set(layerOrder, y + groupHeight + verticalGap);

          // Only traverse children if this group is expanded
          const isExpanded = !expandedGroups || expandedGroups.has(pathStr);
          if (isExpanded) {
            traverse(value, currentPath, depth + 1);
          }
        }
      }
    }

    traverse(tokenFile, [], 0);
  } else {
    // Fallback to vertical layout when no inheritance info
    let currentY = startY;

    function traverse(obj: TokenGroup | DesignTokenFile, path: string[], level: number) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;

        const currentPath = [...path, key];
        const pathStr = currentPath.join('.');
        const x = startX + level * levelIndent;

        if (isDesignToken(value)) {
          positions.set(pathStr, { x, y: currentY });
          const resolvedValue = resolveAlias(value.$value, tokenFile as Record<string, unknown>);
          const isExtended = extendedKeys.has(pathStr);
          nodes.push(createTokenNode(currentPath, value, { x, y: currentY }, undefined, resolvedValue, isSchemaView, childPageCount, isExtended));
          currentY += tokenHeight + verticalGap;
        } else if (isTokenGroup(value)) {
          positions.set(pathStr, { x, y: currentY });
          nodes.push(createGroupNode(currentPath, value, { x, y: currentY }));
          currentY += groupHeight + verticalGap;
          traverse(value, currentPath, level + 1);
        }
      }
    }

    traverse(tokenFile, [], 0);
  }

  return { positions, nodes };
}

// Infer tier from path prefix or token extensions
function inferTier(path: string[], token: { $extensions?: { 'com.designtokenstudio'?: { tier?: string } } }): 'primitive' | 'semantic' | 'component' | undefined {
  // Check extensions first
  const extTier = token.$extensions?.['com.designtokenstudio']?.tier;
  if (extTier === 'primitive' || extTier === 'semantic' || extTier === 'component') {
    return extTier;
  }
  // Infer from path prefix
  const firstSegment = path[0]?.toLowerCase();
  if (firstSegment === 'primitive' || firstSegment === 'primitives') return 'primitive';
  if (firstSegment === 'semantic' || firstSegment === 'semantics') return 'semantic';
  if (firstSegment === 'component' || firstSegment === 'components') return 'component';
  return undefined;
}

// Token inheritance info for display
export interface TokenInheritanceInfo {
  isInherited: boolean;
  sourceLayerName?: string;
  sourceLayerOrder?: number;
}

// Resolve an alias value to its actual value
// e.g., "{colors.blue.500}" -> "#0066FF"
export function resolveAlias(
  value: unknown,
  tokenFile: Record<string, unknown>,
  maxDepth: number = 10
): unknown {
  if (typeof value !== 'string') return value;

  const aliasMatch = value.match(/^\{(.+)\}$/);
  if (!aliasMatch) return value;

  if (maxDepth <= 0) return value; // Prevent infinite loops

  const aliasPath = aliasMatch[1].split('.');
  let current: unknown = tokenFile;

  for (const segment of aliasPath) {
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return value; // Path not found, return original
    }
  }

  // If we found a token, get its value
  if (current && typeof current === 'object' && '$value' in current) {
    const resolvedValue = (current as { $value: unknown }).$value;
    // Recursively resolve if it's another alias
    return resolveAlias(resolvedValue, tokenFile, maxDepth - 1);
  }

  return value;
}

// Create a token node from token data
function createTokenNode(
  path: string[],
  token: { $value: unknown; $type?: TokenType; $description?: string; $extensions?: Record<string, unknown> },
  position: XYPosition,
  inheritanceInfo?: TokenInheritanceInfo,
  resolvedValue?: unknown,
  isSchemaOnly?: boolean,
  childValueCount?: number,
  isExtended?: boolean
): TokenFlowNode {
  const type = token.$type || inferTokenType(token.$value);
  const tier = inferTier(path, token as { $extensions?: { 'com.designtokenstudio'?: { tier?: string } } });
  const isAlias = typeof token.$value === 'string' && /^\{.+\}$/.test(token.$value);

  return {
    id: `token-${path.join('-')}`,
    type: getNodeType(type),
    position,
    data: {
      path,
      name: path[path.length - 1],
      description: token.$description,
      value: token.$value,
      resolvedValue: isAlias ? resolvedValue : token.$value,
      isAlias,
      aliasPath: isAlias ? (token.$value as string).slice(1, -1).split('.') : undefined,
      tier,
      isInherited: inheritanceInfo?.isInherited ?? false,
      sourceLayerName: inheritanceInfo?.sourceLayerName,
      // Schema view fields
      isSchemaOnly: isSchemaOnly ?? false,
      childValueCount: childValueCount ?? 0,
      isExtended: isExtended ?? false,
    },
  } as TokenFlowNode;
}

// Create a group node
function createGroupNode(
  path: string[],
  group: TokenGroup,
  position: XYPosition,
  inheritanceInfo?: TokenInheritanceInfo
): TokenFlowNode {
  const childCount = Object.keys(group).filter(k => !k.startsWith('$')).length;

  return {
    id: `group-${path.join('-')}`,
    type: 'tokenGroup',
    position,
    data: {
      path,
      name: path[path.length - 1],
      description: group.$description,
      inheritedType: group.$type,
      isExpanded: true,
      childCount,
      isInherited: inheritanceInfo?.isInherited ?? false,
      sourceLayerName: inheritanceInfo?.sourceLayerName,
    },
  } as TokenFlowNode;
}

// Get node type based on token type
function getNodeType(type: TokenType | undefined): string {
  switch (type) {
    case 'color':
      return 'colorToken';
    case 'typography':
      return 'typographyToken';
    case 'dimension':
      return 'spacingToken';
    case 'shadow':
      return 'shadowToken';
    default:
      return 'genericToken';
  }
}

// Infer token type from value
function inferTokenType(value: unknown): TokenType | undefined {
  if (typeof value === 'string') {
    // Check if it's a color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/.test(value)) {
      return 'color';
    }
    if (/^rgba?\(/.test(value) || /^hsla?\(/.test(value)) {
      return 'color';
    }
  }

  if (typeof value === 'object' && value !== null) {
    if ('value' in value && 'unit' in value) {
      return 'dimension';
    }
    if ('fontFamily' in value && 'fontSize' in value) {
      return 'typography';
    }
    if ('offsetX' in value && 'blur' in value) {
      return 'shadow';
    }
  }

  if (typeof value === 'number') {
    return 'number';
  }

  return undefined;
}

// Create edges for alias references
// Edges flow from referenced token (source, right side) to aliasing token (target, left side)
// This creates a left-to-right flow showing where values come from
export function createAliasEdges(tokens: FlattenedToken[]): TokenFlowEdge[] {
  const edges: TokenFlowEdge[] = [];

  for (const token of tokens) {
    if (token.isAlias && token.aliasPath) {
      const aliasingTokenId = `token-${token.path.join('-')}`;
      const referencedTokenId = `token-${token.aliasPath.join('-')}`;

      edges.push({
        id: `alias-${aliasingTokenId}-${referencedTokenId}`,
        // Edge starts from the referenced token (exits right side via source handle)
        source: referencedTokenId,
        // Edge ends at the aliasing token (enters left side via target handle)
        target: aliasingTokenId,
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
          sourcePath: token.aliasPath,  // The referenced token path
          targetPath: token.path,        // The aliasing token path
        },
      });
    }
  }

  return edges;
}

// Create edges connecting children to their parent groups (tree-style)
export function createHierarchyEdges(nodes: TokenFlowNode[]): TokenFlowEdge[] {
  const edges: TokenFlowEdge[] = [];
  const nodeIdByPath = new Map<string, string>();

  // Build a map of path -> nodeId
  for (const node of nodes) {
    const path = node.data.path as string[];
    nodeIdByPath.set(path.join('.'), node.id);
  }

  // Create edges from parent to child with tree-style step connections
  for (const node of nodes) {
    const path = node.data.path as string[];
    if (path.length > 1) {
      const parentPath = path.slice(0, -1).join('.');
      const parentId = nodeIdByPath.get(parentPath);

      if (parentId) {
        edges.push({
          id: `hierarchy-${parentId}-${node.id}`,
          source: parentId,
          sourceHandle: 'bottom',
          target: node.id,
          targetHandle: 'left',
          type: 'step',
          style: {
            stroke: '#d1d5db',
            strokeWidth: 1.5,
          },
          data: {
            isHierarchy: true,
          },
        });
      }
    }
  }

  return edges;
}

// Convert hex color to RGBA
export function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) / 255 : 1,
  };
}

// Convert RGBA to hex
export function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) {
    return hex + toHex(a * 255);
  }
  return hex;
}

// ============================================
// Multi-Layer Canvas Layout
// ============================================

// Deep merge helper for combining token files
function deepMergeTokens(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      !('$value' in sourceValue)
    ) {
      // It's a group (object without $value), merge recursively
      if (!targetValue || typeof targetValue !== 'object') {
        target[key] = {};
      }
      deepMergeTokens(target[key] as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      // It's a token or primitive value, overwrite
      target[key] = sourceValue;
    }
  }
}

export interface LayerDisplayInfo {
  layerId: string;
  layerName: string;
  layerOrder: number;
  variableValues: Record<string, string>;
  tokens: DesignTokenFile;
  isActive: boolean;
  availableSlots?: Record<string, string>[];
  onSlotChange?: (slot: Record<string, string>) => void;
}

export interface MultiLayerLayoutResult {
  nodes: TokenFlowNode[];
  containerNodes: TokenFlowNode[];
  layerBounds: Map<string, { x: number; y: number; width: number; height: number }>;
}

/**
 * Generate a multi-layer canvas layout with layer containers
 * Each layer gets its own container, arranged horizontally
 */
export function generateMultiLayerLayout(
  layers: LayerDisplayInfo[],
  options: {
    startX?: number;
    startY?: number;
    containerPadding?: number;
    containerGap?: number;
    minContainerWidth?: number;
    levelIndent?: number;
    verticalGap?: number;
    groupHeight?: number;
    tokenHeight?: number;
    expandedGroups?: Set<string>;
  } = {}
): MultiLayerLayoutResult {
  const {
    startX = 50,
    startY = 50,
    containerPadding = 20,
    containerGap = 40,
    minContainerWidth = 300,
    levelIndent = 24,
    verticalGap = 8,
    groupHeight = 36,
    tokenHeight = 36,
    expandedGroups = new Set<string>(),
  } = options;

  const containerNodes: TokenFlowNode[] = [];
  const tokenNodes: TokenFlowNode[] = [];
  const layerBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

  let currentX = startX;
  const headerHeight = 40;

  // Sort layers by order
  const sortedLayers = [...layers].sort((a, b) => a.layerOrder - b.layerOrder);

  // Merge all layer tokens for alias resolution across layers
  // Earlier layers get overwritten by later layers (so aliases resolve to the most specific value)
  const mergedTokensForAliasResolution: Record<string, unknown> = {};
  for (const layer of sortedLayers) {
    deepMergeTokens(mergedTokensForAliasResolution, layer.tokens as Record<string, unknown>);
  }

  for (const layer of sortedLayers) {
    const layerTokenNodes: TokenFlowNode[] = [];
    let maxWidth = minContainerWidth - containerPadding * 2;
    let currentY = containerPadding + headerHeight;

    // Check if all parent groups in path are expanded
    // Uses unscoped paths for now (groups expand/collapse across all layers)
    function isVisible(path: string[]): boolean {
      if (path.length <= 1) return true;
      for (let i = 1; i < path.length; i++) {
        const parentPath = path.slice(0, i).join('.');
        if (!expandedGroups.has(parentPath)) {
          return false;
        }
      }
      return true;
    }

    // Traverse tokens for this layer
    function traverse(obj: TokenGroup | DesignTokenFile, path: string[], depth: number) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;

        const currentPath = [...path, key];
        const pathStr = currentPath.join('.');

        // Skip if parent group is collapsed
        if (!isVisible(currentPath)) continue;

        const x = containerPadding + depth * levelIndent;
        const nodeWidth = 200 + (6 - depth) * 20; // Wider at root level
        maxWidth = Math.max(maxWidth, x + nodeWidth);

        if (isDesignToken(value)) {
          // Use merged tokens so cross-layer aliases resolve correctly
          const resolvedValue = resolveAlias(value.$value, mergedTokensForAliasResolution);
          const node = createTokenNode(
            currentPath,
            value,
            { x, y: currentY },
            { isInherited: false, sourceLayerName: layer.layerName, sourceLayerOrder: layer.layerOrder },
            resolvedValue,
            false,
            0,
            false
          );
          // Prefix node ID with layer ID to avoid conflicts
          node.id = `${layer.layerId}-${node.id}`;
          node.data.layerId = layer.layerId;
          layerTokenNodes.push(node);
          currentY += tokenHeight + verticalGap;
        } else if (isTokenGroup(value)) {
          const node = createGroupNode(
            currentPath,
            value,
            { x, y: currentY },
            { isInherited: false, sourceLayerName: layer.layerName, sourceLayerOrder: layer.layerOrder }
          );
          // Prefix node ID with layer ID
          node.id = `${layer.layerId}-${node.id}`;
          node.data.layerId = layer.layerId;
          layerTokenNodes.push(node);
          currentY += groupHeight + verticalGap;

          // Only traverse children if this group is expanded
          const isExpanded = expandedGroups.has(pathStr);
          if (isExpanded) {
            traverse(value, currentPath, depth + 1);
          }
        }
      }
    }

    traverse(layer.tokens, [], 0);

    // Calculate container dimensions
    const containerWidth = Math.max(minContainerWidth, maxWidth + containerPadding);
    const containerHeight = Math.max(200, currentY + containerPadding);

    // Store layer bounds
    layerBounds.set(layer.layerId, {
      x: currentX,
      y: startY,
      width: containerWidth,
      height: containerHeight,
    });

    // Create container node (cast to any since it has different data shape)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const containerNode: any = {
      id: `layer-container-${layer.layerId}`,
      type: 'layerContainer',
      position: { x: currentX, y: startY },
      data: {
        layerName: layer.layerName,
        variableValues: layer.variableValues,
        tokenCount: layerTokenNodes.length,
        layerOrder: layer.layerOrder,
        isActive: layer.isActive,
        width: containerWidth,
        height: containerHeight,
        availableSlots: layer.availableSlots,
        onSlotChange: layer.onSlotChange,
      },
      style: {
        width: containerWidth,
        height: containerHeight,
      },
      // Container nodes should not be draggable to keep layout stable
      draggable: false,
    };
    containerNodes.push(containerNode);

    // Offset token nodes to be inside the container
    for (const node of layerTokenNodes) {
      node.position.x += currentX;
      node.position.y += startY;
      tokenNodes.push(node);
    }

    currentX += containerWidth + containerGap;
  }

  return {
    nodes: tokenNodes,
    containerNodes,
    layerBounds,
  };
}

// Check if a color is light or dark (for contrast)
export function isLightColor(hex: string): boolean {
  const rgba = hexToRgba(hex);
  if (!rgba) return true;

  // Using relative luminance formula
  const luminance = (0.299 * rgba.r + 0.587 * rgba.g + 0.114 * rgba.b) / 255;
  return luminance > 0.5;
}

// Generate a contrasting text color
export function getContrastColor(hex: string): string {
  return isLightColor(hex) ? '#000000' : '#ffffff';
}
