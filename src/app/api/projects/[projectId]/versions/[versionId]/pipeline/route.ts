import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkProjectAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ projectId: string; versionId: string }>;
}

// GET /api/projects/[projectId]/versions/[versionId]/pipeline - Get pipeline
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pipeline = await prisma.pipeline.findUnique({
      where: { versionId },
      include: { pages: true },
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/versions/[versionId]/pipeline - Update pipeline data
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Pipeline data is required' },
        { status: 400 }
      );
    }

    // Upsert pipeline (create if doesn't exist)
    const pipeline = await prisma.pipeline.upsert({
      where: { versionId },
      update: { data },
      create: {
        versionId,
        data,
      },
    });

    // Update the version's updatedAt timestamp
    await prisma.version.update({
      where: { id: versionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Error updating pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline' },
      { status: 500 }
    );
  }
}
