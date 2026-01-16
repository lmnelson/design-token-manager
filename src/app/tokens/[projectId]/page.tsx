'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePipelineStore } from '@/stores/pipelineStore';
import TokensPage from '../page';

export default function ProjectTokensPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { loadProject, isLoading, saveError, projectId: currentProjectId } = usePipelineStore();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && currentProjectId !== projectId) {
      setLoadError(null);
      // loadProject will find the draft version automatically
      loadProject(projectId).catch((err) => {
        setLoadError(err.message || 'Failed to load project');
      });
    }
  }, [projectId, loadProject, currentProjectId]);

  if (loadError || saveError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-6">{loadError || saveError}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  // Render the main tokens page with project context
  return <TokensPage />;
}
