import type {
  FigmaFileResponse,
  FigmaImageResponse,
  FigmaVariablesResponse,
  FigmaNode,
  FigmaComponentNode,
  FigmaPaint,
  FigmaEffect,
  FigmaTextStyle,
  FigmaColor,
} from '@/types/figma';
import { figmaColorToHex, parseFigmaUrl } from '@/types/figma';
import type { StyleBinding, ParsedComponent } from '@/stores/figmaStore';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export class FigmaApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Figma API error: ${response.status}`);
    }

    return response.json();
  }

  async getFile(fileKey: string): Promise<FigmaFileResponse> {
    return this.fetch<FigmaFileResponse>(`/files/${fileKey}`);
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaFileResponse> {
    const ids = nodeIds.join(',');
    return this.fetch<FigmaFileResponse>(`/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`);
  }

  async getImages(
    fileKey: string,
    nodeIds: string[],
    options: { format?: 'jpg' | 'png' | 'svg'; scale?: number } = {}
  ): Promise<FigmaImageResponse> {
    const { format = 'png', scale = 2 } = options;
    const ids = nodeIds.join(',');
    return this.fetch<FigmaImageResponse>(
      `/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`
    );
  }

  async getVariables(fileKey: string): Promise<FigmaVariablesResponse> {
    return this.fetch<FigmaVariablesResponse>(`/files/${fileKey}/variables/local`);
  }
}

// Parse a Figma URL and extract file key and optional node ID
export function parseFigmaFileUrl(url: string): { fileKey: string; nodeId?: string } | null {
  return parseFigmaUrl(url);
}

// Find all components in a Figma file
export function findComponents(
  node: FigmaNode | { children?: FigmaNode[] },
  results: FigmaComponentNode[] = []
): FigmaComponentNode[] {
  if ('type' in node && node.type === 'COMPONENT') {
    results.push(node as FigmaComponentNode);
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      findComponents(child, results);
    }
  }

  return results;
}

// Extract style bindings from a Figma node
export function extractStyleBindings(
  node: FigmaNode,
  parentPath: string[] = [],
  componentBounds?: { x: number; y: number; width: number; height: number }
): StyleBinding[] {
  const bindings: StyleBinding[] = [];
  const nodePath = [...parentPath, node.name];

  // Calculate relative position within component
  let position = { x: 0, y: 0 };
  if (componentBounds && node.absoluteBoundingBox) {
    position = {
      x: (node.absoluteBoundingBox.x - componentBounds.x + node.absoluteBoundingBox.width / 2) / componentBounds.width,
      y: (node.absoluteBoundingBox.y - componentBounds.y + node.absoluteBoundingBox.height / 2) / componentBounds.height,
    };
  }

  // Extract fills
  if ('fills' in node && node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
        bindings.push({
          nodeId: node.id,
          nodeName: node.name,
          nodePath,
          property: 'fill',
          value: figmaColorToHex(fill.color),
          position,
        });
      }
    }
  }

  // Extract strokes
  if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if (stroke.visible !== false && stroke.type === 'SOLID' && stroke.color) {
        bindings.push({
          nodeId: node.id,
          nodeName: node.name,
          nodePath,
          property: 'stroke',
          value: figmaColorToHex(stroke.color),
          position,
        });
      }
    }
  }

  // Extract effects (shadows)
  if ('effects' in node && node.effects && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (
        effect.visible !== false &&
        (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
      ) {
        bindings.push({
          nodeId: node.id,
          nodeName: node.name,
          nodePath,
          property: 'effect',
          value: {
            type: effect.type,
            color: effect.color ? figmaColorToHex(effect.color) : undefined,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
          },
          position,
        });
      }
    }
  }

  // Extract text styles
  if (node.type === 'TEXT' && 'style' in node && node.style) {
    const style = node.style as FigmaTextStyle;
    bindings.push({
      nodeId: node.id,
      nodeName: node.name,
      nodePath,
      property: 'typography',
      value: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeightPx,
      },
      position,
    });
  }

  // Extract spacing (for auto-layout frames)
  if (node.type === 'FRAME' && 'layoutMode' in node && node.layoutMode !== 'NONE') {
    const frame = node as any;
    if (frame.itemSpacing !== undefined) {
      bindings.push({
        nodeId: node.id,
        nodeName: node.name,
        nodePath,
        property: 'spacing',
        value: { itemSpacing: frame.itemSpacing },
        position,
      });
    }
    if (frame.paddingLeft !== undefined || frame.paddingTop !== undefined) {
      bindings.push({
        nodeId: node.id,
        nodeName: node.name,
        nodePath,
        property: 'spacing',
        value: {
          paddingLeft: frame.paddingLeft,
          paddingRight: frame.paddingRight,
          paddingTop: frame.paddingTop,
          paddingBottom: frame.paddingBottom,
        },
        position,
      });
    }
  }

  // Extract corner radius
  if ('cornerRadius' in node && node.cornerRadius !== undefined) {
    bindings.push({
      nodeId: node.id,
      nodeName: node.name,
      nodePath,
      property: 'cornerRadius',
      value: node.cornerRadius,
      position,
    });
  }

  // Recurse into children
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      bindings.push(...extractStyleBindings(child, nodePath, componentBounds));
    }
  }

  return bindings;
}

// Parse a Figma component into our internal format
export function parseComponent(node: FigmaComponentNode, thumbnailUrl?: string): ParsedComponent {
  const bounds = node.absoluteBoundingBox || { x: 0, y: 0, width: 100, height: 100 };

  return {
    id: node.id,
    name: node.name,
    thumbnailUrl,
    width: bounds.width,
    height: bounds.height,
    node,
    styleBindings: extractStyleBindings(node, [], bounds),
  };
}
