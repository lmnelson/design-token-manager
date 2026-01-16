import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkProjectAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ projectId: string; versionId: string }>;
}

// GET /api/projects/[projectId]/versions/[versionId]/pages - Get all pages
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { versionId },
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const pages = await prisma.page.findMany({
      where: { pipelineId: pipeline.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/versions/[versionId]/pages - Create or update page
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { layerId, variableValues, tokens } = body;

    if (!layerId) {
      return NextResponse.json(
        { error: 'Layer ID is required' },
        { status: 400 }
      );
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { versionId },
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Find existing page with same layerId and variableValues
    const existingPage = await prisma.page.findFirst({
      where: {
        pipelineId: pipeline.id,
        layerId,
        variableValues: { equals: variableValues || {} },
      },
    });

    let page;
    if (existingPage) {
      // Update existing page
      page = await prisma.page.update({
        where: { id: existingPage.id },
        data: { tokens: tokens || {} },
      });
    } else {
      // Create new page
      page = await prisma.page.create({
        data: {
          pipelineId: pipeline.id,
          layerId,
          variableValues: variableValues || {},
          tokens: tokens || {},
        },
      });
    }

    // Update version timestamp
    await prisma.version.update({
      where: { id: versionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(page, { status: existingPage ? 200 : 201 });
  } catch (error) {
    console.error('Error saving page:', error);
    return NextResponse.json(
      { error: 'Failed to save page' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/versions/[versionId]/pages - Batch update all pages
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pages } = body;

    if (!Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Pages array is required' },
        { status: 400 }
      );
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { versionId },
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Delete existing pages and create new ones in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.page.deleteMany({
        where: { pipelineId: pipeline.id },
      });

      const createdPages = await tx.page.createMany({
        data: pages.map((p: { layerId: string; variableValues?: unknown; tokens?: unknown }) => ({
          pipelineId: pipeline.id,
          layerId: p.layerId,
          variableValues: p.variableValues || {},
          tokens: p.tokens || {},
        })),
      });

      return createdPages;
    });

    // Update version timestamp
    await prisma.version.update({
      where: { id: versionId },
      data: { updatedAt: new Date() },
    });

    // Fetch and return all pages
    const updatedPages = await prisma.page.findMany({
      where: { pipelineId: pipeline.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(updatedPages);
  } catch (error) {
    console.error('Error updating pages:', error);
    return NextResponse.json(
      { error: 'Failed to update pages' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/versions/[versionId]/pages - Delete a page
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      );
    }

    await prisma.page.delete({
      where: { id: pageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
