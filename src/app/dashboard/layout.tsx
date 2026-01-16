'use client';

import { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useTeamStore } from '@/stores/teamStore';
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isUserLoading } = useUser();
  const { loadTeams, isLoading: isTeamsLoading } = useTeamStore();

  useEffect(() => {
    if (user && !isUserLoading) {
      loadTeams();
    }
  }, [user, isUserLoading, loadTeams]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Design Token Studio</h1>
          <p className="text-gray-600 mb-6">Sign in to access your design tokens</p>
          <a
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Team Switcher */}
            <div className="flex items-center gap-4">
              <a href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Design Token Studio
              </a>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <TeamSwitcher />
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.name || user.email}
              </span>
              <Button variant="ghost" size="sm" asChild>
                <a href="/auth/logout">
                  <LogOut className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isTeamsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
