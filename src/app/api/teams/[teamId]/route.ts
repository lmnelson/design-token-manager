import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkTeamAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

// GET /api/teams/[teamId] - Get team details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { projects: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[teamId] - Update team
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId] - Delete team
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
