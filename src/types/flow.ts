import { Node, Edge } from '@xyflow/react';
import { DesignToken, TokenType, FlattenedToken } from './tokens';

// Node types available in the flow
export type TokenNodeType =
  | 'colorToken'
  | 'typographyToken'
  | 'spacingToken'
  | 'shadowToken'
  | 'tokenGroup'
  | 'figmaComponent'
  | 'genericToken';

// Token tier type (re-exported for convenience)
export type { TokenTier } from './tokens';

// Base data structure for all token nodes
export interface BaseTokenNodeData {
  [key: string]: unknown;
  path: string[];
  name: string;
  description?: string;
  tier?: 'primitive' | 'semantic' | 'component';
  isInherited?: boolean; // Token is from a parent page
  sourcePageId?: string; // The page this token is defined in
}

// Color token node data
export interface ColorTokenNodeData extends BaseTokenNodeData {
  value: string; // hex, rgb, rgba, hsl
  opacity?: number;
  isAlias: boolean;
  aliasPath?: string[];
}

// Typography token node data
export interface TypographyTokenNodeData extends BaseTokenNodeData {
  fontFamily: string;
  fontSize: number;
  fontSizeUnit: 'px' | 'rem' | 'em';
  fontWeight: number | string;
  lineHeight: number | string;
  letterSpacing?: number;
  letterSpacingUnit?: 'px' | 'em' | '%';
  isAlias: boolean;
  aliasPath?: string[];
}

// Spacing/Dimension token node data
export interface SpacingTokenNodeData extends BaseTokenNodeData {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%';
  isAlias: boolean;
  aliasPath?: string[];
}

// Shadow token node data
export interface ShadowTokenNodeData extends BaseTokenNodeData {
  shadows: Array<{
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    inset: boolean;
  }>;
  isAlias: boolean;
  aliasPath?: string[];
}

// Token group node data (container for organizing tokens)
export interface TokenGroupNodeData extends BaseTokenNodeData {
  inheritedType?: TokenType;
  isExpanded: boolean;
  childCount: number;
}

// Generic token node for unsupported types
export interface GenericTokenNodeData extends BaseTokenNodeData {
  type: TokenType;
  value: unknown;
  isAlias: boolean;
  aliasPath?: string[];
}

// Figma component node data
export interface FigmaComponentNodeData {
  [key: string]: unknown;
  componentId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  properties: FigmaComponentProperty[];
}

export interface FigmaComponentProperty {
  nodeId: string;
  nodeName: string;
  propertyType: 'fill' | 'stroke' | 'effect' | 'text' | 'spacing';
  value: unknown;
  boundPosition?: { x: number; y: number }; // Position within component for edge targeting
}

// Union of all node data types
export type TokenFlowNodeData =
  | ColorTokenNodeData
  | TypographyTokenNodeData
  | SpacingTokenNodeData
  | ShadowTokenNodeData
  | TokenGroupNodeData
  | GenericTokenNodeData
  | FigmaComponentNodeData;

// Custom node type extending React Flow Node
export type TokenFlowNode = Node<TokenFlowNodeData, TokenNodeType>;

// Edge data for token mapping connections
export interface TokenMappingEdgeData {
  [key: string]: unknown;
  tokenPath: string;
  figmaProperty: string;
  figmaNodeId: string;
  confidence: number; // 0-1 match confidence
  matchType: 'exact' | 'approximate' | 'manual' | 'variable';
}

// Edge data for alias connections
export interface TokenAliasEdgeData {
  [key: string]: unknown;
  sourcePath: string[];
  targetPath: string[];
}

// Edge data for hierarchy connections (parent-child)
export interface TokenHierarchyEdgeData {
  [key: string]: unknown;
  isHierarchy: true;
}

// Union of edge data types
export type TokenFlowEdgeData = TokenMappingEdgeData | TokenAliasEdgeData | TokenHierarchyEdgeData;

// Custom edge type
export type TokenFlowEdge = Edge<TokenFlowEdgeData>;

// Helper to create a unique node ID from a token path
export function createNodeId(path: string[]): string {
  return `token-${path.join('-')}`;
}

// Helper to parse a node ID back to a path
export function parseNodeId(id: string): string[] | null {
  if (!id.startsWith('token-')) return null;
  return id.slice(6).split('-');
}

// Convert a flattened token to a flow node
export function tokenToFlowNode(
  flatToken: FlattenedToken,
  position: { x: number; y: number }
): TokenFlowNode {
  const baseData: BaseTokenNodeData = {
    path: flatToken.path,
    name: flatToken.name,
    description: flatToken.token.$description,
  };

  const nodeType = getNodeTypeForTokenType(flatToken.resolvedType);

  switch (flatToken.resolvedType) {
    case 'color':
      return {
        id: createNodeId(flatToken.path),
        type: 'colorToken',
        position,
        data: {
          ...baseData,
          value: flatToken.token.$value as string,
          isAlias: flatToken.isAlias,
          aliasPath: flatToken.aliasPath,
        } as ColorTokenNodeData,
      };

    case 'dimension':
      const dimValue = flatToken.token.$value as { value: number; unit: string } | string;
      return {
        id: createNodeId(flatToken.path),
        type: 'spacingToken',
        position,
        data: {
          ...baseData,
          value: typeof dimValue === 'object' ? dimValue.value : 0,
          unit: typeof dimValue === 'object' ? dimValue.unit : 'px',
          isAlias: flatToken.isAlias,
          aliasPath: flatToken.aliasPath,
        } as SpacingTokenNodeData,
      };

    default:
      return {
        id: createNodeId(flatToken.path),
        type: 'genericToken',
        position,
        data: {
          ...baseData,
          type: flatToken.resolvedType,
          value: flatToken.token.$value,
          isAlias: flatToken.isAlias,
          aliasPath: flatToken.aliasPath,
        } as GenericTokenNodeData,
      };
  }
}

// Get the appropriate node type for a token type
export function getNodeTypeForTokenType(tokenType: TokenType): TokenNodeType {
  switch (tokenType) {
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
