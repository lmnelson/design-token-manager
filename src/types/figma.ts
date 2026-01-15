// Figma API Types
// Based on Figma REST API v1

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaDocument;
  components: Record<string, FigmaComponentMeta>;
  styles: Record<string, FigmaStyleMeta>;
}

export interface FigmaDocument {
  id: string;
  name: string;
  type: 'DOCUMENT';
  children: FigmaNode[];
}

export type FigmaNode =
  | FigmaFrameNode
  | FigmaGroupNode
  | FigmaComponentNode
  | FigmaInstanceNode
  | FigmaRectangleNode
  | FigmaTextNode
  | FigmaVectorNode
  | FigmaEllipseNode
  | FigmaLineNode;

export interface FigmaBaseNode {
  id: string;
  name: string;
  visible?: boolean;
  locked?: boolean;
  absoluteBoundingBox?: FigmaBoundingBox;
  absoluteRenderBounds?: FigmaBoundingBox;
  constraints?: FigmaConstraints;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  effects?: FigmaEffect[];
  blendMode?: string;
  opacity?: number;
}

export interface FigmaFrameNode extends FigmaBaseNode {
  type: 'FRAME';
  children: FigmaNode[];
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  clipsContent?: boolean;
}

export interface FigmaGroupNode extends FigmaBaseNode {
  type: 'GROUP';
  children: FigmaNode[];
}

export interface FigmaComponentNode extends FigmaBaseNode {
  type: 'COMPONENT';
  children: FigmaNode[];
  componentPropertyDefinitions?: Record<string, FigmaComponentPropertyDef>;
}

export interface FigmaInstanceNode extends FigmaBaseNode {
  type: 'INSTANCE';
  children: FigmaNode[];
  componentId: string;
  componentProperties?: Record<string, FigmaComponentPropertyValue>;
}

export interface FigmaRectangleNode extends FigmaBaseNode {
  type: 'RECTANGLE';
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
}

export interface FigmaTextNode extends FigmaBaseNode {
  type: 'TEXT';
  characters: string;
  style?: FigmaTextStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, FigmaTextStyle>;
}

export interface FigmaVectorNode extends FigmaBaseNode {
  type: 'VECTOR';
}

export interface FigmaEllipseNode extends FigmaBaseNode {
  type: 'ELLIPSE';
}

export interface FigmaLineNode extends FigmaBaseNode {
  type: 'LINE';
}

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaConstraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: string;
  gradientStops?: FigmaGradientStop[];
  gradientHandlePositions?: FigmaVector[];
  scaleMode?: string;
  imageRef?: string;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaGradientStop {
  color: FigmaColor;
  position: number;
}

export interface FigmaVector {
  x: number;
  y: number;
}

export interface FigmaEffect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  blendMode?: string;
  offset?: FigmaVector;
  spread?: number;
  showShadowBehindNode?: boolean;
}

export interface FigmaTextStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
  fills?: FigmaPaint[];
}

export interface FigmaComponentMeta {
  key: string;
  name: string;
  description: string;
  documentationLinks?: string[];
}

export interface FigmaStyleMeta {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface FigmaComponentPropertyDef {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: unknown;
  variantOptions?: string[];
}

export interface FigmaComponentPropertyValue {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP';
  value: unknown;
}

// Figma Variables (Design Tokens in Figma)
export interface FigmaVariablesResponse {
  status: number;
  error: boolean;
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, FigmaVariableValue>;
  remote: boolean;
  description: string;
  hiddenFromPublishing: boolean;
  scopes: string[];
  codeSyntax: Record<string, string>;
}

export type FigmaVariableValue =
  | boolean
  | number
  | string
  | FigmaColor
  | { type: 'VARIABLE_ALIAS'; id: string };

// API Response types
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaDocument;
  components: Record<string, FigmaComponentMeta>;
  styles: Record<string, FigmaStyleMeta>;
}

export interface FigmaComponentsResponse {
  meta: {
    components: FigmaComponentMeta[];
  };
}

export interface FigmaImageResponse {
  images: Record<string, string | null>;
}

// Helper to convert Figma color to hex
export function figmaColorToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper to parse Figma file URL
export function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  // Match patterns like:
  // https://www.figma.com/file/ABC123/File-Name
  // https://www.figma.com/design/ABC123/File-Name
  // https://www.figma.com/file/ABC123/File-Name?node-id=1:2
  const fileMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (!fileMatch) return null;

  const nodeMatch = url.match(/node-id=([^&]+)/);
  return {
    fileKey: fileMatch[1],
    nodeId: nodeMatch ? decodeURIComponent(nodeMatch[1]) : undefined,
  };
}
