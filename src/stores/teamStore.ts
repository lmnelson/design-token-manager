import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Team,
  TeamWithRole,
  TeamMember,
  Project,
  ProjectWithVersions,
} from '@/types/team';

interface TeamStore {
  // State
  teams: TeamWithRole[];
  currentTeamId: string | null;
  currentTeam: TeamWithRole | null;
  projects: ProjectWithVersions[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTeams: () => Promise<void>;
  setCurrentTeam: (teamId: string) => void;
  createTeam: (name: string) => Promise<Team>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;

  // Project actions
  loadProjects: (teamId: string) => Promise<void>;
  createProject: (
    teamId: string,
    name: string,
    description?: string,
    templateIndex?: number,
    customLayers?: string[],
    includeSeedData?: boolean
  ) => Promise<Project>;
  updateProject: (
    projectId: string,
    updates: Partial<Project>
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Member actions
  loadMembers: (teamId: string) => Promise<TeamMember[]>;
  addMember: (
    teamId: string,
    email: string,
    role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  ) => Promise<TeamMember>;
  updateMemberRole: (
    teamId: string,
    memberId: string,
    role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  ) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      // Initial state
      teams: [],
      currentTeamId: null,
      currentTeam: null,
      projects: [],
      isLoading: false,
      error: null,

      // Load all teams for current user
      loadTeams: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/teams');
          if (!response.ok) {
            throw new Error('Failed to load teams');
          }
          const teams = await response.json();

          const { currentTeamId } = get();
          let currentTeam = teams.find((t: TeamWithRole) => t.id === currentTeamId) || null;

          // If no current team selected, select the first one
          if (!currentTeam && teams.length > 0) {
            currentTeam = teams[0];
          }

          set({
            teams,
            currentTeam,
            currentTeamId: currentTeam?.id || null,
            isLoading: false,
          });

          // Load projects for current team
          if (currentTeam) {
            get().loadProjects(currentTeam.id);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Set current team
      setCurrentTeam: (teamId: string) => {
        const { teams } = get();
        const team = teams.find((t) => t.id === teamId);
        if (team) {
          set({ currentTeamId: teamId, currentTeam: team, projects: [] });
          get().loadProjects(teamId);
        }
      },

      // Create a new team
      createTeam: async (name: string) => {
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create team');
        }

        const team = await response.json();

        // Refresh teams list
        await get().loadTeams();

        return team;
      },

      // Update team
      updateTeam: async (teamId: string, updates: Partial<Team>) => {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update team');
        }

        // Refresh teams list
        await get().loadTeams();
      },

      // Delete team
      deleteTeam: async (teamId: string) => {
        const response = await fetch(`/api/teams/${teamId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete team');
        }

        // If deleted team was current, clear selection
        const { currentTeamId } = get();
        if (currentTeamId === teamId) {
          set({ currentTeamId: null, currentTeam: null, projects: [] });
        }

        // Refresh teams list
        await get().loadTeams();
      },

      // Load projects for a team
      loadProjects: async (teamId: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`/api/teams/${teamId}/projects`);
          if (!response.ok) {
            throw new Error('Failed to load projects');
          }
          const projects = await response.json();
          set({ projects, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Create a new project
      createProject: async (
        teamId: string,
        name: string,
        description?: string,
        templateIndex?: number,
        customLayers?: string[],
        includeSeedData?: boolean
      ) => {
        const response = await fetch(`/api/teams/${teamId}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, templateIndex, customLayers, includeSeedData }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create project');
        }

        const project = await response.json();

        // Refresh projects list
        await get().loadProjects(teamId);

        return project;
      },

      // Update project
      updateProject: async (projectId: string, updates: Partial<Project>) => {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update project');
        }

        // Refresh projects list
        const { currentTeamId } = get();
        if (currentTeamId) {
          await get().loadProjects(currentTeamId);
        }
      },

      // Delete project
      deleteProject: async (projectId: string) => {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete project');
        }

        // Refresh projects list
        const { currentTeamId } = get();
        if (currentTeamId) {
          await get().loadProjects(currentTeamId);
        }
      },

      // Load team members
      loadMembers: async (teamId: string) => {
        const response = await fetch(`/api/teams/${teamId}/members`);
        if (!response.ok) {
          throw new Error('Failed to load members');
        }
        return response.json();
      },

      // Add team member
      addMember: async (
        teamId: string,
        email: string,
        role: 'ADMIN' | 'EDITOR' | 'VIEWER'
      ) => {
        const response = await fetch(`/api/teams/${teamId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add member');
        }

        return response.json();
      },

      // Update member role
      updateMemberRole: async (
        teamId: string,
        memberId: string,
        role: 'ADMIN' | 'EDITOR' | 'VIEWER'
      ) => {
        const response = await fetch(`/api/teams/${teamId}/members`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, role }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update member');
        }
      },

      // Remove member
      removeMember: async (teamId: string, memberId: string) => {
        const response = await fetch(
          `/api/teams/${teamId}/members?memberId=${memberId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to remove member');
        }
      },

      // Reset store
      reset: () => {
        set({
          teams: [],
          currentTeamId: null,
          currentTeam: null,
          projects: [],
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'team-store',
      partialize: (state) => ({
        currentTeamId: state.currentTeamId,
      }),
    }
  )
);
