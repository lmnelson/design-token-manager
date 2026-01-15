// Core build engine for transforming tokens to various output formats
// Coordinates between token resolution, transforms, and formatters

import type {
  BuildPlatform,
  BuildResult,
  ResolvedToken,
  TransformedToken,
  OutputFormat,
} from '@/types/build';
import type { DesignTokenFile } from '@/types/tokens';
import { isDesignToken } from '@/types/tokens';
import { applyTransforms } from './transforms';
import { formatOutput } from './formatters';

// ============================================
// Token Resolution
// ============================================

/**
 * Flatten a token file to a list of resolved tokens
 */
export function resolveTokens(
  tokens: DesignTokenFile,
  inheritedType?: string
): ResolvedToken[] {
  const result: ResolvedToken[] = [];

  function flatten(
    obj: Record<string, unknown>,
    path: string[] = [],
    parentType?: string
  ) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;

      const currentPath = [...path, key];

      if (isDesignToken(value)) {
        const tokenValue = value.$value;
        const tokenType = value.$type || parentType;

        // Resolve aliases if the value is a reference
        let resolvedValue = tokenValue;
        if (typeof tokenValue === 'string' && tokenValue.startsWith('{') && tokenValue.endsWith('}')) {
          // This is an alias - for preview we'll show the reference
          // In a full implementation, we'd resolve the actual value
          resolvedValue = tokenValue;
        }

        result.push({
          path: currentPath,
          name: currentPath.join('.'),
          value: resolvedValue,
          type: tokenType,
          original: value,
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // It's a group, recurse
        const groupType = (value as Record<string, unknown>).$type as string | undefined;
        flatten(value as Record<string, unknown>, currentPath, groupType || parentType);
      }
    }
  }

  flatten(tokens as Record<string, unknown>, [], inheritedType);
  return result;
}

/**
 * Resolve alias references in tokens
 */
export function resolveAliases(
  tokens: ResolvedToken[],
  allTokens: DesignTokenFile
): ResolvedToken[] {
  const tokenMap = new Map<string, ResolvedToken>();
  for (const token of tokens) {
    tokenMap.set(token.name, token);
  }

  return tokens.map(token => {
    let value = token.value;

    // Resolve alias chain (up to 10 levels to prevent infinite loops)
    let depth = 0;
    while (typeof value === 'string' && value.startsWith('{') && value.endsWith('}') && depth < 10) {
      const aliasPath = value.slice(1, -1);
      const aliasedToken = tokenMap.get(aliasPath);

      if (aliasedToken) {
        value = aliasedToken.value;
      } else {
        // Try to resolve from the original tokens
        const resolvedFromSource = resolvePathValue(allTokens, aliasPath.split('.'));
        if (resolvedFromSource !== undefined) {
          value = resolvedFromSource;
        } else {
          break; // Can't resolve, keep as-is
        }
      }
      depth++;
    }

    return {
      ...token,
      value,
    };
  });
}

/**
 * Get a value from a nested object by path
 */
function resolvePathValue(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  if (current && typeof current === 'object' && '$value' in current) {
    return (current as Record<string, unknown>).$value;
  }

  return current;
}

// ============================================
// Build Functions
// ============================================

/**
 * Build tokens for a specific platform
 */
export function buildForPlatform(
  tokens: DesignTokenFile,
  platform: BuildPlatform
): BuildResult {
  // Resolve all tokens
  const resolved = resolveTokens(tokens);

  // Resolve alias references
  const resolvedWithAliases = resolveAliases(resolved, tokens);

  // Apply transforms
  const transformed = applyTransforms(resolvedWithAliases, platform.transforms);

  // Generate outputs
  const outputs = platform.outputs
    .filter(output => output.enabled)
    .map(output => ({
      format: output.format,
      fileName: output.fileName,
      content: formatOutput(transformed, output, platform.prefix),
    }));

  return {
    platform: platform.name,
    outputs,
  };
}

/**
 * Build tokens for all platforms
 */
export function buildAll(
  tokens: DesignTokenFile,
  platforms: BuildPlatform[]
): BuildResult[] {
  return platforms.map(platform => buildForPlatform(tokens, platform));
}

/**
 * Build preview for a specific format (used in the live preview panel)
 */
export function buildPreview(
  tokens: DesignTokenFile,
  platform: BuildPlatform,
  format: OutputFormat
): string {
  // Resolve all tokens
  const resolved = resolveTokens(tokens);

  // Resolve alias references
  const resolvedWithAliases = resolveAliases(resolved, tokens);

  // Apply transforms
  const transformed = applyTransforms(resolvedWithAliases, platform.transforms);

  // Find the output config for this format
  const outputConfig = platform.outputs.find(o => o.format === format) || {
    id: 'preview',
    format,
    enabled: true,
    fileName: `tokens.${format}`,
    options: {},
  };

  return formatOutput(transformed, outputConfig, platform.prefix);
}

/**
 * Get a simple preview of tokens in a specific format
 * Used when no platform is configured yet
 */
export function buildSimplePreview(
  tokens: DesignTokenFile,
  format: OutputFormat
): string {
  // Resolve all tokens
  const resolved = resolveTokens(tokens);

  // Basic transforms for preview
  const transformed: TransformedToken[] = resolved.map(token => ({
    ...token,
    transformedName: token.path.join('-'),
    transformedValue: String(token.value),
  }));

  const outputConfig = {
    id: 'preview',
    format,
    enabled: true,
    fileName: `tokens.${format}`,
    options: {},
  };

  return formatOutput(transformed, outputConfig);
}

// ============================================
// ZIP Export
// ============================================

/**
 * Create a ZIP file containing all build outputs
 * Returns base64-encoded ZIP data
 * Note: Requires jszip to be installed
 */
export async function createBuildZip(
  tokens: DesignTokenFile,
  platforms: BuildPlatform[]
): Promise<Blob> {
  const results = buildAll(tokens, platforms);

  // Dynamically import jszip for ZIP generation
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const result of results) {
      const folder = zip.folder(result.platform.toLowerCase().replace(/\s+/g, '-'));
      if (folder) {
        for (const output of result.outputs) {
          folder.file(output.fileName, output.content);
        }
      }
    }

    return zip.generateAsync({ type: 'blob' });
  } catch {
    // Fallback: create a simple JSON blob with all outputs
    const exportData = {
      message: 'Install jszip for ZIP export support',
      platforms: results.map(r => ({
        name: r.platform,
        files: r.outputs.map(o => ({
          fileName: o.fileName,
          content: o.content,
        })),
      })),
    };
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  }
}
