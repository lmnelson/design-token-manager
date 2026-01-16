export type TeamRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithVersions extends Project {
  versions: Version[];
  _count?: {
    versions: number;
  };
}

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Version {
  id: string;
  projectId: string;
  name: string;
  status: VersionStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface VersionWithPipeline extends Version {
  pipeline: {
    id: string;
    versionId: string;
    data: unknown;
    pages: {
      id: string;
      pipelineId: string;
      layerId: string;
      variableValues: Record<string, string>;
      tokens: unknown;
    }[];
  } | null;
}
