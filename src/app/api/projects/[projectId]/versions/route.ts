import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkProjectAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId]/versions - List versions
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const access = await checkProjectAccess(projectId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const versions = await prisma.version.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/versions - Create version (copy from existing)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, sourceVersionId } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Version name is required' },
        { status: 400 }
      );
    }

    // Check if version name already exists
    const existing = await prisma.version.findFirst({
      where: { projectId, name },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 400 }
      );
    }

    // If sourceVersionId provided, copy from that version
    let pipelineData: Prisma.InputJsonValue = {};
    let pages: Prisma.PageCreateWithoutPipelineInput[] = [];

    if (sourceVersionId) {
      const sourceVersion = await prisma.version.findUnique({
        where: { id: sourceVersionId },
        include: {
          pipeline: {
            include: { pages: true },
          },
        },
      });

      if (sourceVersion?.pipeline) {
        pipelineData = sourceVersion.pipeline.data as Prisma.InputJsonValue;
        pages = sourceVersion.pipeline.pages.map((p) => ({
          layerId: p.layerId,
          variableValues: p.variableValues as Prisma.InputJsonValue,
          tokens: p.tokens as Prisma.InputJsonValue,
        }));
      }
    }

    // Create new version with copied data
    const version = await prisma.version.create({
      data: {
        projectId,
        name,
        status: 'DRAFT',
        pipeline: {
          create: {
            data: pipelineData,
            pages: {
              create: pages,
            },
          },
        },
      },
      include: {
        pipeline: {
          include: { pages: true },
        },
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
