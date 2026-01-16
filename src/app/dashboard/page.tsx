'use client';

import { useState } from 'react';
import { useTeamStore } from '@/stores/teamStore';
import { ProjectCard } from '@/components/ProjectCard';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';

export default function DashboardPage() {
  const { currentTeam, projects, teams } = useTeamStore();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // No teams yet - show create team prompt
  if (teams.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <FolderOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Welcome to Design Token Studio</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Create your first team to get started. Teams help you organize projects and collaborate with others.
        </p>
        <Button onClick={() => setShowCreateTeam(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
        <CreateTeamDialog
          open={showCreateTeam}
          onClose={() => setShowCreateTeam(false)}
        />
      </div>
    );
  }

  // No current team selected
  if (!currentTeam) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">
          Select a team to view projects
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {currentTeam.name}
          </p>
        </div>
        <Button onClick={() => setShowCreateProject(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first project to start managing design tokens
          </p>
          <Button onClick={() => setShowCreateProject(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Create project dialog */}
      <CreateProjectDialog
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </div>
  );
}
