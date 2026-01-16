import { NextResponse } from 'next/server';
import { TeamRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkTeamAccess } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

// GET /api/teams/[teamId]/members - List team members
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/members - Add team member (by email)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role = 'EDITOR' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They must sign up first.' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId,
        role: role as TeamRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[teamId]/members - Update member role
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: role as TeamRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId]/members - Remove member
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const access = await checkTeamAccess(teamId, 'ADMIN');
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Prevent removing the last admin
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (member?.role === 'ADMIN') {
      const adminCount = await prisma.teamMember.count({
        where: { teamId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        );
      }
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
