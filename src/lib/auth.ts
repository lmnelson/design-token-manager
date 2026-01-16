import { TeamRole } from '@prisma/client';
import { auth0 } from './auth0';
import { prisma } from './db';

/**
 * Get or create user from Auth0 session.
 * Call this in server components or API routes to get the current user.
 */
export async function getCurrentUser() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const user = await prisma.user.upsert({
    where: { auth0Id: session.user.sub },
    update: {
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.picture,
    },
    create: {
      auth0Id: session.user.sub,
      email: session.user.email!,
      name: session.user.name,
      avatarUrl: session.user.picture,
    },
  });

  return user;
}

/**
 * Check if user has access to a team with at least the specified role.
 */
export async function checkTeamAccess(
  teamId: string,
  minRole: TeamRole = 'VIEWER'
) {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
    include: { team: true },
  });

  if (!membership) return null;

  const roleHierarchy: Record<TeamRole, number> = {
    ADMIN: 3,
    EDITOR: 2,
    VIEWER: 1,
  };

  if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
    return null;
  }

  return { user, membership, team: membership.team };
}

/**
 * Check if user has access to a project with at least the specified role.
 */
export async function checkProjectAccess(
  projectId: string,
  minRole: TeamRole = 'VIEWER'
) {
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { team: true },
  });

  if (!project) return null;

  const access = await checkTeamAccess(project.teamId, minRole);
  if (!access) return null;

  return { ...access, project };
}

/**
 * Get all teams the current user is a member of.
 */
export async function getUserTeams() {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id },
    include: { team: true },
    orderBy: { team: { name: 'asc' } },
  });

  return memberships.map((m) => ({
    ...m.team,
    role: m.role,
  }));
}
