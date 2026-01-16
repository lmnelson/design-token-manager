'use client';

import { useState, useEffect } from 'react';
import { useTeamStore } from '@/stores/teamStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, Shield, Pencil, Eye, Trash2, Loader2, Copy, Check, X } from 'lucide-react';
import type { TeamMember, TeamRole } from '@/types/team';

interface TeamMembersDialogProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_CONFIG: Record<TeamRole, { label: string; icon: React.ReactNode; description: string }> = {
  ADMIN: {
    label: 'Admin',
    icon: <Shield className="w-4 h-4 text-amber-600" />,
    description: 'Can manage team members and all projects',
  },
  EDITOR: {
    label: 'Editor',
    icon: <Pencil className="w-4 h-4 text-blue-600" />,
    description: 'Can edit tokens and create projects',
  },
  VIEWER: {
    label: 'Viewer',
    icon: <Eye className="w-4 h-4 text-gray-500" />,
    description: 'Can view projects but not edit',
  },
};

export function TeamMembersDialog({ open, onClose }: TeamMembersDialogProps) {
  const { currentTeam, loadMembers, addMember, updateMemberRole, removeMember } = useTeamStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add member form
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('EDITOR');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedEmail, setAddedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get current user's role in this team
  const currentUserRole = currentTeam?.role;
  const isAdmin = currentUserRole === 'ADMIN';

  // Load members when dialog opens
  useEffect(() => {
    if (open && currentTeam) {
      setIsLoading(true);
      setError(null);
      loadMembers(currentTeam.id)
        .then(setMembers)
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [open, currentTeam, loadMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !newEmail.trim()) return;

    setIsAdding(true);
    setAddError(null);
    setAddedEmail(null);

    try {
      const emailToAdd = newEmail.trim();
      const member = await addMember(currentTeam.id, emailToAdd, newRole);
      setMembers((prev) => [...prev, member]);
      setNewEmail('');
      setNewRole('EDITOR');
      setAddedEmail(emailToAdd);
      setCopied(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopyLink = async () => {
    const signupUrl = `${window.location.origin}/dashboard`;
    await navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dismissSuccess = () => {
    setAddedEmail(null);
  };

  const handleUpdateRole = async (memberId: string, role: TeamRole) => {
    if (!currentTeam) return;

    try {
      await updateMemberRole(currentTeam.id, memberId, role);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentTeam) return;

    try {
      await removeMember(currentTeam.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Team Members</DialogTitle>
          <DialogDescription>
            Manage who has access to {currentTeam?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add member form (admin only) */}
          {isAdmin && (
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as TeamRole)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={isAdding || !newEmail.trim()}>
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {addError && (
                <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
              )}
            </form>
          )}

          {/* Success message after adding member */}
          {addedEmail && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Added {addedEmail}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Share this link so they can sign up and access the team:
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-700 truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard'}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={dismissSuccess}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No members found</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                >
                  {/* Avatar */}
                  {member.user.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {member.user.name || member.user.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.user.email}
                    </p>
                  </div>

                  {/* Role badge */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    {ROLE_CONFIG[member.role].icon}
                    <span className="text-xs font-medium">
                      {ROLE_CONFIG[member.role].label}
                    </span>
                  </div>

                  {/* Actions (admin only) */}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'ADMIN')}
                          disabled={member.role === 'ADMIN'}
                        >
                          <Shield className="w-4 h-4 mr-2 text-amber-600" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'EDITOR')}
                          disabled={member.role === 'EDITOR'}
                        >
                          <Pencil className="w-4 h-4 mr-2 text-blue-600" />
                          Make Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'VIEWER')}
                          disabled={member.role === 'VIEWER'}
                        >
                          <Eye className="w-4 h-4 mr-2 text-gray-500" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Role descriptions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 mb-2">Role permissions</p>
            <div className="space-y-1">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <div key={role} className="flex items-center gap-2 text-xs text-gray-500">
                  {config.icon}
                  <span className="font-medium">{config.label}:</span>
                  <span>{config.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
