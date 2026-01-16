import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkTeamAccess } from '@/lib/auth';
import { PIPELINE_TEMPLATES, getLayerSlots } from '@/types/pipeline';
import type { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

// GET /api/teams/[teamId]/projects - List team projects
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { teamId },
      include: {
        versions: {
          where: { status: 'DRAFT' },
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Seed data for different layer types
function getSeedTokens(
  layerName: string,
  variableValues: Record<string, string>
): Record<string, unknown> {
  const mode = variableValues.mode;
  const brand = variableValues.brand;

  // Primitives layer - base values
  if (layerName.toLowerCase() === 'primitives') {
    return {
      colors: {
        $description: 'Color primitives',
        gray: {
          50: { $value: '#f9fafb', $type: 'color' },
          100: { $value: '#f3f4f6', $type: 'color' },
          200: { $value: '#e5e7eb', $type: 'color' },
          300: { $value: '#d1d5db', $type: 'color' },
          400: { $value: '#9ca3af', $type: 'color' },
          500: { $value: '#6b7280', $type: 'color' },
          600: { $value: '#4b5563', $type: 'color' },
          700: { $value: '#374151', $type: 'color' },
          800: { $value: '#1f2937', $type: 'color' },
          900: { $value: '#111827', $type: 'color' },
          950: { $value: '#030712', $type: 'color' },
        },
        blue: {
          50: { $value: '#eff6ff', $type: 'color' },
          100: { $value: '#dbeafe', $type: 'color' },
          200: { $value: '#bfdbfe', $type: 'color' },
          300: { $value: '#93c5fd', $type: 'color' },
          400: { $value: '#60a5fa', $type: 'color' },
          500: { $value: '#3b82f6', $type: 'color' },
          600: { $value: '#2563eb', $type: 'color' },
          700: { $value: '#1d4ed8', $type: 'color' },
          800: { $value: '#1e40af', $type: 'color' },
          900: { $value: '#1e3a8a', $type: 'color' },
        },
        green: {
          500: { $value: '#22c55e', $type: 'color' },
          600: { $value: '#16a34a', $type: 'color' },
        },
        red: {
          500: { $value: '#ef4444', $type: 'color' },
          600: { $value: '#dc2626', $type: 'color' },
        },
        white: { $value: '#ffffff', $type: 'color' },
        black: { $value: '#000000', $type: 'color' },
      },
      spacing: {
        $description: 'Spacing scale',
        0: { $value: '0px', $type: 'dimension' },
        1: { $value: '4px', $type: 'dimension' },
        2: { $value: '8px', $type: 'dimension' },
        3: { $value: '12px', $type: 'dimension' },
        4: { $value: '16px', $type: 'dimension' },
        5: { $value: '20px', $type: 'dimension' },
        6: { $value: '24px', $type: 'dimension' },
        8: { $value: '32px', $type: 'dimension' },
        10: { $value: '40px', $type: 'dimension' },
        12: { $value: '48px', $type: 'dimension' },
        16: { $value: '64px', $type: 'dimension' },
      },
      fontSize: {
        $description: 'Font size scale',
        xs: { $value: '12px', $type: 'dimension' },
        sm: { $value: '14px', $type: 'dimension' },
        base: { $value: '16px', $type: 'dimension' },
        lg: { $value: '18px', $type: 'dimension' },
        xl: { $value: '20px', $type: 'dimension' },
        '2xl': { $value: '24px', $type: 'dimension' },
        '3xl': { $value: '30px', $type: 'dimension' },
        '4xl': { $value: '36px', $type: 'dimension' },
      },
      fontWeight: {
        $description: 'Font weights',
        normal: { $value: '400', $type: 'fontWeight' },
        medium: { $value: '500', $type: 'fontWeight' },
        semibold: { $value: '600', $type: 'fontWeight' },
        bold: { $value: '700', $type: 'fontWeight' },
      },
      borderRadius: {
        $description: 'Border radius scale',
        none: { $value: '0px', $type: 'dimension' },
        sm: { $value: '4px', $type: 'dimension' },
        md: { $value: '6px', $type: 'dimension' },
        lg: { $value: '8px', $type: 'dimension' },
        xl: { $value: '12px', $type: 'dimension' },
        full: { $value: '9999px', $type: 'dimension' },
      },
    };
  }

  // Semantic layer - mode-aware tokens
  if (layerName.toLowerCase() === 'semantic') {
    const isLight = mode === 'light' || !mode;
    const brandColor = brand === 'brand-b' ? 'green' : brand === 'brand-c' ? 'red' : 'blue';

    if (isLight) {
      return {
        color: {
          $description: 'Semantic colors',
          background: {
            primary: { $value: '{colors.white}', $type: 'color' },
            secondary: { $value: '{colors.gray.50}', $type: 'color' },
            tertiary: { $value: '{colors.gray.100}', $type: 'color' },
          },
          text: {
            primary: { $value: '{colors.gray.900}', $type: 'color' },
            secondary: { $value: '{colors.gray.600}', $type: 'color' },
            tertiary: { $value: '{colors.gray.400}', $type: 'color' },
            inverse: { $value: '{colors.white}', $type: 'color' },
          },
          border: {
            primary: { $value: '{colors.gray.200}', $type: 'color' },
            secondary: { $value: '{colors.gray.300}', $type: 'color' },
          },
          accent: {
            primary: { $value: `{colors.${brandColor}.500}`, $type: 'color' },
            secondary: { $value: `{colors.${brandColor}.600}`, $type: 'color' },
            background: { $value: `{colors.${brandColor}.50}`, $type: 'color' },
          },
          status: {
            success: { $value: '{colors.green.500}', $type: 'color' },
            error: { $value: '{colors.red.500}', $type: 'color' },
          },
        },
      };
    } else {
      return {
        color: {
          $description: 'Semantic colors',
          background: {
            primary: { $value: '{colors.gray.900}', $type: 'color' },
            secondary: { $value: '{colors.gray.800}', $type: 'color' },
            tertiary: { $value: '{colors.gray.700}', $type: 'color' },
          },
          text: {
            primary: { $value: '{colors.gray.50}', $type: 'color' },
            secondary: { $value: '{colors.gray.300}', $type: 'color' },
            tertiary: { $value: '{colors.gray.500}', $type: 'color' },
            inverse: { $value: '{colors.gray.900}', $type: 'color' },
          },
          border: {
            primary: { $value: '{colors.gray.700}', $type: 'color' },
            secondary: { $value: '{colors.gray.600}', $type: 'color' },
          },
          accent: {
            primary: { $value: `{colors.${brandColor}.400}`, $type: 'color' },
            secondary: { $value: `{colors.${brandColor}.500}`, $type: 'color' },
            background: { $value: `{colors.${brandColor}.900}`, $type: 'color' },
          },
          status: {
            success: { $value: '{colors.green.500}', $type: 'color' },
            error: { $value: '{colors.red.500}', $type: 'color' },
          },
        },
      };
    }
  }

  // Components layer - component-specific tokens
  if (layerName.toLowerCase() === 'components') {
    return {
      button: {
        $description: 'Button component tokens',
        primary: {
          background: { $value: '{color.accent.primary}', $type: 'color' },
          text: { $value: '{color.text.inverse}', $type: 'color' },
          borderRadius: { $value: '{borderRadius.md}', $type: 'dimension' },
          paddingX: { $value: '{spacing.4}', $type: 'dimension' },
          paddingY: { $value: '{spacing.2}', $type: 'dimension' },
          fontSize: { $value: '{fontSize.sm}', $type: 'dimension' },
          fontWeight: { $value: '{fontWeight.medium}', $type: 'fontWeight' },
        },
        secondary: {
          background: { $value: '{color.background.secondary}', $type: 'color' },
          text: { $value: '{color.text.primary}', $type: 'color' },
          border: { $value: '{color.border.primary}', $type: 'color' },
          borderRadius: { $value: '{borderRadius.md}', $type: 'dimension' },
          paddingX: { $value: '{spacing.4}', $type: 'dimension' },
          paddingY: { $value: '{spacing.2}', $type: 'dimension' },
        },
      },
      card: {
        $description: 'Card component tokens',
        background: { $value: '{color.background.primary}', $type: 'color' },
        border: { $value: '{color.border.primary}', $type: 'color' },
        borderRadius: { $value: '{borderRadius.lg}', $type: 'dimension' },
        padding: { $value: '{spacing.6}', $type: 'dimension' },
        shadow: {
          $value: {
            offsetX: '0px',
            offsetY: '1px',
            blur: '3px',
            spread: '0px',
            color: '#0000001a',
          },
          $type: 'shadow',
        },
      },
      input: {
        $description: 'Input component tokens',
        background: { $value: '{color.background.primary}', $type: 'color' },
        border: { $value: '{color.border.primary}', $type: 'color' },
        borderRadius: { $value: '{borderRadius.md}', $type: 'dimension' },
        paddingX: { $value: '{spacing.3}', $type: 'dimension' },
        paddingY: { $value: '{spacing.2}', $type: 'dimension' },
        fontSize: { $value: '{fontSize.sm}', $type: 'dimension' },
        text: { $value: '{color.text.primary}', $type: 'color' },
        placeholder: { $value: '{color.text.tertiary}', $type: 'color' },
      },
    };
  }

  // Platform layer
  if (layerName.toLowerCase() === 'platform') {
    const platform = variableValues.platform;
    if (platform === 'ios') {
      return {
        borderRadius: {
          md: { $value: '10px', $type: 'dimension' },
          lg: { $value: '14px', $type: 'dimension' },
        },
        fontSize: {
          base: { $value: '17px', $type: 'dimension' },
        },
      };
    }
    if (platform === 'android') {
      return {
        borderRadius: {
          md: { $value: '4px', $type: 'dimension' },
          lg: { $value: '8px', $type: 'dimension' },
        },
      };
    }
    return {};
  }

  // Theme layer
  if (layerName.toLowerCase() === 'theme') {
    return {
      spacing: {
        $description: 'Theme-adjusted spacing',
        base: { $value: '{spacing.4}', $type: 'dimension' },
      },
    };
  }

  return {};
}

// POST /api/teams/[teamId]/projects - Create new project
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, templateIndex, customLayers, includeSeedData = true } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    let variables: Array<{ id: string; name: string; key: string; values: string[] }> = [];
    let layers: Array<{ id: string; name: string; order: number; variables: string[]; required: boolean; description?: string }> = [];

    // Custom layers mode
    if (customLayers && Array.isArray(customLayers) && customLayers.length > 0) {
      // Layer definitions for custom setup
      const layerDefinitions: Record<string, { name: string; description: string }> = {
        primitives: { name: 'Primitives', description: 'Base color scales, spacing, typography values' },
        semantic: { name: 'Semantic', description: 'Purpose-based tokens' },
        components: { name: 'Components', description: 'Component-specific tokens' },
        platform: { name: 'Platform', description: 'Platform-specific overrides' },
        theme: { name: 'Theme', description: 'Theme variations' },
      };

      layers = customLayers.map((layerId: string, index: number) => {
        const def = layerDefinitions[layerId] || { name: layerId, description: '' };
        return {
          id: generateId('layer'),
          name: def.name,
          order: index,
          variables: [],
          required: true,
          description: def.description,
        };
      });
    } else {
      // Use template
      const template = PIPELINE_TEMPLATES[templateIndex ?? 0] || PIPELINE_TEMPLATES[0];

      variables = template.variables.map((v) => ({
        id: generateId('var'),
        name: v.name,
        key: v.key,
        values: v.values,
      }));

      layers = template.layers.map((l, index) => ({
        id: generateId('layer'),
        name: l.name,
        order: index,
        variables: (l.variables || []).map((vKey) => vKey),
        required: l.required ?? true,
        description: l.description,
      }));
    }

    // Build settings
    const buildSettings = {
      platforms: [
        {
          id: 'web',
          name: 'Web',
          prefix: '--',
          transforms: [],
          outputs: [
            {
              id: 'css',
              format: 'css',
              enabled: true,
              fileName: 'tokens.css',
              options: {},
            },
            {
              id: 'json',
              format: 'json',
              enabled: true,
              fileName: 'tokens.json',
              options: {},
            },
          ],
        },
      ],
      package: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
      },
    };

    // Pipeline data to store
    const pipelineData = {
      variables,
      layers,
      buildSettings,
    };

    // Create project with initial draft version and pipeline
    const project = await prisma.project.create({
      data: {
        teamId,
        name,
        description,
        versions: {
          create: {
            name: 'draft',
            status: 'DRAFT',
            pipeline: {
              create: {
                data: pipelineData as unknown as Prisma.InputJsonValue,
              },
            },
          },
        },
      },
      include: {
        versions: {
          include: {
            pipeline: true,
          },
        },
      },
    });

    // Now create pages for each layer/variable combination
    const pipelineId = project.versions[0]?.pipeline?.id;
    if (pipelineId) {
      const pagesToCreate: Array<{
        pipelineId: string;
        layerId: string;
        variableValues: Prisma.InputJsonValue;
        tokens: Prisma.InputJsonValue;
      }> = [];

      for (const layer of layers) {
        // Get all variable combinations for this layer
        const slots = getLayerSlots(
          { ...layer, variables: layer.variables || [] },
          variables
        );

        for (const variableValues of slots) {
          // Generate a name for this page based on layer and variables
          let pageName = layer.name;
          if (Object.keys(variableValues).length > 0) {
            const varParts = Object.values(variableValues).join('-');
            pageName = `${layer.name} (${varParts})`;
          }

          // Get seed tokens if enabled
          const seedTokens = includeSeedData
            ? getSeedTokens(layer.name, variableValues)
            : {};

          pagesToCreate.push({
            pipelineId,
            layerId: layer.id,
            variableValues: variableValues as Prisma.InputJsonValue,
            tokens: { $name: pageName, ...seedTokens } as Prisma.InputJsonValue,
          });
        }
      }

      // Batch create all pages
      if (pagesToCreate.length > 0) {
        await prisma.page.createMany({
          data: pagesToCreate,
        });
      }
    }

    // Fetch the complete project with pages
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        versions: {
          include: {
            pipeline: {
              include: {
                pages: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(completeProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
