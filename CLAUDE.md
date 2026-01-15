# Design Token Studio

A visual design token management application built with Next.js, React Flow, and Zustand.

## Project Overview

This is a design token studio that allows users to:
- Create and manage design tokens (colors, spacing, typography, shadows, etc.)
- Organize tokens into layers (Primitives → Semantic → Components)
- Create aliases between tokens by drawing connections
- Export tokens to multiple formats (CSS, SCSS, JSON, Tailwind, Swift, Android XML)
- Configure build pipelines with Style Dictionary-compatible transforms

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS 4, Radix UI primitives
- **Canvas**: React Flow (@xyflow/react) for visual token editing
- **State**: Zustand for global state management
- **Code Editor**: Monaco Editor for JSON editing

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── tokens/            # Main token editor page
│   └── components/        # Component library page
├── components/
│   ├── flow/nodes/        # React Flow node components (ColorTokenNode, etc.)
│   ├── settings/          # Settings modal tabs (PlatformsTab, TransformsTab, etc.)
│   ├── editors/           # JSON editor component
│   └── ui/                # Shadcn UI components
├── lib/
│   ├── build/             # Build system (transforms, formatters, engine)
│   ├── flow/              # React Flow utilities (layout generation)
│   └── tokens/            # Token utilities (flattening, schema)
├── stores/
│   ├── pipelineStore.ts   # Main store for tokens, layers, pages, build settings
│   ├── tokenStore.ts      # Token selection state
│   └── projectStore.ts    # UI state (sidebar, layout)
├── types/
│   ├── tokens.ts          # Design token types (DTCG format)
│   ├── pipeline.ts        # Pipeline, layer, page types
│   ├── build.ts           # Build configuration types
│   └── flow.ts            # React Flow node/edge types
└── contexts/
    └── ExpandedGroupsContext.tsx  # Tree expand/collapse state
```

## Key Concepts

### Pipeline Architecture
- **Pipeline**: Contains layers and variables
- **Layer**: A tier of tokens (e.g., "Primitives", "Semantic", "Components")
- **Variables**: Define variations (e.g., "brand" with values ["A", "B"])
- **Page**: A specific combination of layer + variable values, contains actual tokens

### Multi-Layer Canvas
- All layers are displayed simultaneously on the canvas
- Each layer has a colored container with a header
- Tokens can reference tokens in other layers via aliases
- Drawing a connection from source (right handle) to target (left handle) creates an alias

### Token Types (DTCG Format)
Tokens follow the Design Token Community Group format:
```typescript
{
  $value: "#ff0000",
  $type: "color",
  $description?: "Primary brand color"
}
```

Supported types: color, dimension, number, fontFamily, fontWeight, duration, shadow, border, gradient, cubicBezier

### Alias References
Tokens can reference other tokens using curly brace syntax:
```typescript
{
  $value: "{colors.primary}",
  $type: "color"
}
```

## State Management

The main store is `pipelineStore.ts` which manages:
- `pipeline`: The pipeline configuration (layers, variables, build settings)
- `pages`: All token pages (each page = layer + variable combination)
- `activePageId`: Currently selected page
- `viewContext`: Current view state (which layer, schema view vs edit view)

## Build System

Located in `src/lib/build/`:
- **transforms.ts**: Name transforms (camelCase, kebab-case) and value transforms (color formats, units)
- **formatters.ts**: Output generators for CSS, SCSS, JSON, Tailwind, Swift, Android XML
- **engine.ts**: Orchestrates the build process

## Common Patterns

### Adding a new token type
1. Add type to `TokenType` union in `types/tokens.ts`
2. Create node component in `components/flow/nodes/`
3. Register in `nodeTypes` in `app/tokens/page.tsx`
4. Add default value in `TOKEN_TYPES` array

### Adding a new output format
1. Add format to `OutputFormat` type in `types/build.ts`
2. Implement formatter in `lib/build/formatters.ts`
3. Add to `FORMAT_TABS` in `BuildOutputPanel.tsx`

## Keyboard Shortcuts

- `H` - Hand/Pan mode
- `V` - Select/Pointer mode
- `Space` - Toggle between pan and select modes

## Testing Changes

Run before committing:
```bash
npm run check  # Runs typecheck, lint, and build
```
