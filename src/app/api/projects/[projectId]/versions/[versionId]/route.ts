import { NextResponse } from 'next/server';
import { VersionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkProjectAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ projectId: string; versionId: string }>;
}

// GET /api/projects/[projectId]/versions/[versionId] - Get version with pipeline and pages
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const version = await prisma.version.findUnique({
      where: { id: versionId },
      include: {
        pipeline: {
          include: { pages: true },
        },
      },
    });

    if (!version || version.projectId !== projectId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId]/versions/[versionId] - Update version (name, status)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'EDITOR');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, status } = body;

    // Validate status if provided
    if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: { name?: string; status?: VersionStatus; publishedAt?: Date } = {};
    if (name) updateData.name = name;
    if (status) {
      updateData.status = status as VersionStatus;
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
    }

    const version = await prisma.version.update({
      where: { id: versionId },
      data: updateData,
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/versions/[versionId] - Delete version
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { projectId, versionId } = await params;
    const access = await checkProjectAccess(projectId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Don't allow deleting the last version
    const versionCount = await prisma.version.count({
      where: { projectId },
    });
    if (versionCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last version' },
        { status: 400 }
      );
    }

    await prisma.version.delete({
      where: { id: versionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
