import workspaceData from '../data/workspace-data.json';
import overrides from '../data/overrides.json';

export interface PortfolioProject {
  slug: string;
  name: string;
  description: string;
  techStack: string[];
  category: string;
  status: string;
  hasDocker: boolean;
  hasMCP: boolean;
  languages?: string[];
  dependencies?: Record<string, string>;
  featured?: boolean;
  featuredOrder?: number;
  highlights?: string[];
  valueStory?: {
    problem: string;
    solution: string;
    result: string;
  };
}

const overrideBySlug = new Map(
  (overrides.projects as PortfolioProject[]).map(project => [project.slug, project])
);

function normalizeProject(project: Partial<PortfolioProject> & { slug: string }): PortfolioProject {
  return {
    slug: project.slug,
    name: project.name || project.slug,
    description: project.description || '',
    techStack: project.techStack || [],
    category: project.category || 'uncategorized',
    status: project.status || 'production',
    hasDocker: project.hasDocker || false,
    hasMCP: project.hasMCP || false,
    languages: project.languages || [],
    dependencies: project.dependencies || {},
    featured: project.featured || false,
    featuredOrder: project.featuredOrder,
    highlights: project.highlights || [],
    valueStory: project.valueStory,
  };
}

export function getAllProjects(): PortfolioProject[] {
  const workspaceProjects = (workspaceData.projects as PortfolioProject[]).map(project => {
    const override = overrideBySlug.get(project.slug);
    return normalizeProject({ ...project, ...override });
  });

  const workspaceSlugs = new Set(workspaceProjects.map(project => project.slug));
  const overrideOnly = (overrides.projects as PortfolioProject[])
    .filter(project => !workspaceSlugs.has(project.slug))
    .map(project => normalizeProject(project));

  return [...workspaceProjects, ...overrideOnly].sort((a, b) => {
    if (a.featured && b.featured) {
      return (a.featuredOrder || 999) - (b.featuredOrder || 999);
    }
    if (a.featured) return -1;
    if (b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function getFeaturedProjects(): PortfolioProject[] {
  return getAllProjects().filter(project => project.featured);
}

export function getProjectBySlug(slug: string): PortfolioProject | undefined {
  return getAllProjects().find(project => project.slug === slug);
}

export function getProjectsByCategory(projects = getAllProjects()) {
  const projectsByCategory: Record<string, PortfolioProject[]> = {};
  for (const project of projects) {
    const cat = project.category || 'uncategorized';
    if (!projectsByCategory[cat]) projectsByCategory[cat] = [];
    projectsByCategory[cat].push(project);
  }
  return projectsByCategory;
}
