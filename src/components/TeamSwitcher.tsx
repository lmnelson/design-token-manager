'use client';

import { useState } from 'react';
import { useTeamStore } from '@/stores/teamStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { TeamMembersDialog } from '@/components/TeamMembersDialog';
import { ChevronDown, Plus, Check, Users, UserPlus } from 'lucide-react';

export function TeamSwitcher() {
  const { teams, currentTeam, setCurrentTeam } = useTeamStore();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="max-w-[150px] truncate">
              {currentTeam?.name || 'Select Team'}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => setCurrentTeam(team.id)}
              className="gap-2"
            >
              <span className="flex-1 truncate">{team.name}</span>
              {currentTeam?.id === team.id && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          ))}
          {teams.length > 0 && <DropdownMenuSeparator />}
          {currentTeam && (
            <DropdownMenuItem onClick={() => setShowMembers(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Manage Members
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowCreateTeam(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamDialog
        open={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
      />

      <TeamMembersDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
      />
    </>
  );
}
