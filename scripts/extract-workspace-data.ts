import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const WORKSPACE_ROOT = resolve(import.meta.dirname, '../../');
const OUTPUT_PATH = resolve(import.meta.dirname, '../src/data/workspace-data.json');
const OVERRIDES_PATH = resolve(import.meta.dirname, '../src/data/overrides.json');

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.vscode', '.cursor', '.codebuddy',
  'dist', 'build', '__pycache__', '.next', '.astro',
  'node-v18.20.3-linux-x64', 'node-v20.18.1-linux-x64',
  'output', 'logs', '.openclaw', '.tapd-tracker', '.mr-review',
  'personal-card',
]);

interface ProjectInfo {
  slug: string;
  name: string;
  description: string;
  techStack: string[];
  category: string;
  status: 'production' | 'learning' | 'tool' | 'docs';
  hasDocker: boolean;
  hasMCP: boolean;
  languages: string[];
  dependencies: Record<string, string>;
}

interface AgentInfo {
  name: string;
  description: string;
  type: string;
}

interface WorkspaceData {
  projects: ProjectInfo[];
  agents: AgentInfo[];
  skills: { name: string; description: string; path: string }[];
  stats: {
    totalProjects: number;
    productionProjects: number;
    totalAgents: number;
    totalNotes: number;
    totalPatterns: number;
    totalSkills: number;
    totalExperienceArchives: number;
  };
  techStack: { name: string; count: number; category: string }[];
  timeline: { date: string; message: string; project: string }[];
  extractedAt: string;
}

function readJsonSafe(path: string): Record<string, any> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function readFirstParagraph(path: string): string {
  try {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');
    let paragraph = '';
    let started = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!started) {
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('---')) {
          started = true;
          paragraph = trimmed;
        }
        continue;
      }
      if (trimmed === '') break;
      paragraph += ' ' + trimmed;
    }

    return paragraph.slice(0, 300);
  } catch {
    return '';
  }
}

function extractTechStackFromPackageJson(pkg: Record<string, any>): string[] {
  const techs: Set<string> = new Set();
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  const techMap: Record<string, string> = {
    'react': 'React', 'react-dom': 'React', 'react-native': 'React Native',
    'next': 'Next.js', 'astro': 'Astro', 'vue': 'Vue.js', 'svelte': 'Svelte',
    'express': 'Express.js', 'fastify': 'Fastify', 'koa': 'Koa',
    'tailwindcss': 'Tailwind CSS', '@tailwindcss/vite': 'Tailwind CSS',
    'typescript': 'TypeScript', 'vite': 'Vite',
    '@modelcontextprotocol/sdk': 'MCP SDK',
    'expo': 'Expo', 'electron': 'Electron',
    'd3': 'D3.js', 'recharts': 'Recharts', 'three': 'Three.js',
    'prisma': 'Prisma', 'drizzle-orm': 'Drizzle',
    'zustand': 'Zustand', '@tanstack/react-query': 'TanStack Query',
    'axios': 'Axios', 'zod': 'Zod',
    'phaser': 'Phaser', 'socket.io': 'Socket.IO',
    'langfuse': 'Langfuse', 'ai': 'Vercel AI SDK',
  };

  for (const dep of Object.keys(allDeps)) {
    if (techMap[dep]) techs.add(techMap[dep]);
  }

  return [...techs];
}

function extractTechStackFromRequirements(path: string): string[] {
  try {
    const content = readFileSync(path, 'utf-8');
    const techs: Set<string> = new Set();
    const techMap: Record<string, string> = {
      'fastapi': 'FastAPI', 'django': 'Django', 'flask': 'Flask',
      'sqlalchemy': 'SQLAlchemy', 'celery': 'Celery',
      'httpx': 'httpx', 'aiohttp': 'aiohttp',
      'openai': 'OpenAI SDK', 'litellm': 'LiteLLM',
      'graphiti-core': 'Graphiti', 'neo4j': 'Neo4j',
      'apscheduler': 'APScheduler', 'pydantic': 'Pydantic',
      'pymysql': 'MySQL', 'psycopg2': 'PostgreSQL',
      'redis': 'Redis', 'mcp': 'MCP SDK',
    };

    for (const line of content.split('\n')) {
      const pkg = line.trim().split(/[=<>![\s]/)[0].toLowerCase();
      if (techMap[pkg]) techs.add(techMap[pkg]);
    }

    techs.add('Python');
    return [...techs];
  } catch {
    return [];
  }
}

function extractProject(dirPath: string, dirName: string): ProjectInfo | null {
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) return null;

  const pkgPath = join(dirPath, 'package.json');
  const reqPath = join(dirPath, 'requirements.txt');
  const readmePath = join(dirPath, 'README.md');
  const dockerPath = join(dirPath, 'docker-compose.yml');
  const dockerAltPath = join(dirPath, 'docker-compose.yaml');

  const hasPkg = existsSync(pkgPath);
  const hasReq = existsSync(reqPath);
  const hasReadme = existsSync(readmePath);
  const hasDocker = existsSync(dockerPath) || existsSync(dockerAltPath);

  if (!hasPkg && !hasReq && !hasReadme) return null;

  let techStack: string[] = [];
  let description = '';
  let name = dirName;
  const languages: string[] = [];
  const dependencies: Record<string, string> = {};

  if (hasPkg) {
    const pkg = readJsonSafe(pkgPath);
    if (pkg) {
      name = pkg.name || dirName;
      description = pkg.description || '';
      techStack = extractTechStackFromPackageJson(pkg);
      languages.push('JavaScript/TypeScript');
      if (pkg.dependencies) Object.assign(dependencies, pkg.dependencies);
    }
  }

  if (hasReq) {
    const pyTechs = extractTechStackFromRequirements(reqPath);
    techStack = [...new Set([...techStack, ...pyTechs])];
    if (!languages.includes('Python')) languages.push('Python');
  }

  if (hasReadme && !description) {
    description = readFirstParagraph(readmePath);
  }

  const hasMCP = techStack.includes('MCP SDK') || dirName.includes('mcp');

  return {
    slug: dirName,
    name,
    description: description || `${dirName} project`,
    techStack,
    category: 'uncategorized',
    status: hasDocker ? 'production' : 'learning',
    hasDocker,
    hasMCP,
    languages,
    dependencies,
  };
}

function extractAgents(agentsDir: string): AgentInfo[] {
  if (!existsSync(agentsDir)) return [];

  const agents: AgentInfo[] = [];

  function scanDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const readmePath = join(entryPath, 'README.md');
        const promptFiles = readdirSync(entryPath).filter(f =>
          f.endsWith('.md') || f.endsWith('.txt') || f === 'system-prompt.md'
        );

        if (promptFiles.length > 0 || existsSync(readmePath)) {
          const description = existsSync(readmePath)
            ? readFirstParagraph(readmePath)
            : `${entry.name} Agent`;

          agents.push({
            name: entry.name,
            description,
            type: categorizeAgent(entry.name, description),
          });
        }
      }
    }
  }

  scanDir(agentsDir);
  return agents;
}

function categorizeAgent(name: string, desc: string): string {
  const combined = `${name} ${desc}`.toLowerCase();
  if (combined.includes('review') || combined.includes('code') || combined.includes('writer'))
    return 'development';
  if (combined.includes('analy') || combined.includes('radar') || combined.includes('market') || combined.includes('trump'))
    return 'analysis';
  if (combined.includes('okr') || combined.includes('report') || combined.includes('resume') || combined.includes('tapd') || combined.includes('tracker'))
    return 'efficiency';
  if (combined.includes('skill') || combined.includes('command') || combined.includes('prompt') || combined.includes('generator'))
    return 'meta-tool';
  if (combined.includes('mcp') || combined.includes('builder') || combined.includes('draw'))
    return 'tooling';
  if (combined.includes('tutor') || combined.includes('learn'))
    return 'learning';
  return 'other';
}

function extractPlaybookStats(playbookDir: string) {
  const stats = { archives: 0, patterns: 0, skills: 0 };
  if (!existsSync(playbookDir)) return stats;

  const kbDir = join(playbookDir, 'knowledge-base');
  const patDir = join(playbookDir, 'patterns');
  const skillDir = join(playbookDir, 'skills');

  if (existsSync(kbDir)) {
    stats.archives = readdirSync(kbDir).filter(f => f.endsWith('.md')).length;
  }
  if (existsSync(patDir)) {
    stats.patterns = readdirSync(patDir).filter(f => f.endsWith('.md')).length;
  }
  if (existsSync(skillDir)) {
    const personal = join(skillDir, 'personal');
    const system = join(skillDir, 'cursor-system');
    if (existsSync(personal))
      stats.skills += readdirSync(personal).filter(f => f.endsWith('.md')).length;
    if (existsSync(system))
      stats.skills += readdirSync(system).filter(f => f.endsWith('.md')).length;
  }

  return stats;
}

function countNotes(notesDir: string): number {
  if (!existsSync(notesDir)) return 0;
  try {
    const readme = readFileSync(join(notesDir, 'README.md'), 'utf-8');
    const match = readme.match(/(\d+)\s*篇/);
    if (match) return parseInt(match[1], 10);
  } catch {}

  let count = 0;
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.md') && entry.name !== 'README.md') count++;
    }
  }
  walk(notesDir);
  return count;
}

function extractCursorSkills(skillsDir: string) {
  const skills: { name: string; description: string; path: string }[] = [];
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (existsSync(skillFile)) {
      const content = readFileSync(skillFile, 'utf-8');
      const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
      skills.push({
        name: entry.name,
        description: firstLine?.trim().slice(0, 200) || entry.name,
        path: skillFile,
      });
    }
  }
  return skills;
}

function aggregateTechStack(projects: ProjectInfo[]): { name: string; count: number; category: string }[] {
  const techCounts = new Map<string, number>();
  for (const p of projects) {
    for (const tech of p.techStack) {
      techCounts.set(tech, (techCounts.get(tech) || 0) + 1);
    }
  }

  const categoryMap: Record<string, string> = {
    'React': 'Frontend', 'React Native': 'Mobile', 'Next.js': 'Frontend',
    'Vue.js': 'Frontend', 'Astro': 'Frontend', 'Svelte': 'Frontend',
    'Tailwind CSS': 'Frontend', 'Vite': 'Build Tool', 'TypeScript': 'Language',
    'Python': 'Language', 'JavaScript/TypeScript': 'Language',
    'FastAPI': 'Backend', 'Django': 'Backend', 'Express.js': 'Backend',
    'Flask': 'Backend', 'Koa': 'Backend',
    'SQLAlchemy': 'Database', 'MySQL': 'Database', 'PostgreSQL': 'Database',
    'Redis': 'Database', 'Neo4j': 'Database', 'Prisma': 'Database',
    'MCP SDK': 'AI/Agent', 'OpenAI SDK': 'AI/Agent', 'LiteLLM': 'AI/Agent',
    'Graphiti': 'AI/Agent', 'Vercel AI SDK': 'AI/Agent', 'Langfuse': 'AI/Agent',
    'Docker': 'DevOps', 'Expo': 'Mobile', 'Electron': 'Desktop',
    'Phaser': 'Game', 'Socket.IO': 'Realtime',
    'Zustand': 'State Management', 'TanStack Query': 'Data Fetching',
    'Pydantic': 'Validation', 'Zod': 'Validation',
    'APScheduler': 'Scheduler', 'Celery': 'Scheduler',
  };

  return [...techCounts.entries()]
    .map(([name, count]) => ({ name, count, category: categoryMap[name] || 'Other' }))
    .sort((a, b) => b.count - a.count);
}

function extractRecentCommits(workspaceRoot: string, limit = 50): { date: string; message: string; project: string }[] {
  const timeline: { date: string; message: string; project: string }[] = [];

  for (const dirName of readdirSync(workspaceRoot)) {
    if (SKIP_DIRS.has(dirName)) continue;
    const dirPath = join(workspaceRoot, dirName);
    const gitDir = join(dirPath, '.git');
    if (!existsSync(gitDir)) continue;

    try {
      const output = execSync(
        `git -C "${dirPath}" log --format="%aI|||%s" -n 10 2>/dev/null`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      for (const line of output.trim().split('\n')) {
        if (!line) continue;
        const [date, message] = line.split('|||');
        if (date && message) {
          timeline.push({ date: date.slice(0, 10), message, project: dirName });
        }
      }
    } catch {}
  }

  return timeline
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

function main() {
  console.log('Extracting workspace data from:', WORKSPACE_ROOT);

  const projects: ProjectInfo[] = [];
  for (const dirName of readdirSync(WORKSPACE_ROOT)) {
    if (SKIP_DIRS.has(dirName) || dirName.startsWith('.')) continue;
    const dirPath = join(WORKSPACE_ROOT, dirName);
    const project = extractProject(dirPath, dirName);
    if (project) projects.push(project);
  }

  console.log(`Found ${projects.length} projects`);

  const agents = extractAgents(join(WORKSPACE_ROOT, 'agents'));
  console.log(`Found ${agents.length} agents`);

  const playbookStats = extractPlaybookStats(join(WORKSPACE_ROOT, 'engineering-playbook'));
  const totalNotes = countNotes(join(WORKSPACE_ROOT, 'learning-notes'));
  const cursorSkills = extractCursorSkills('/data/home/archerpyu/.cursor/skills');

  const techStack = aggregateTechStack(projects);
  const timeline = extractRecentCommits(WORKSPACE_ROOT);

  const productionProjects = projects.filter(p => p.status === 'production').length;

  let overrides: Record<string, any> = {};
  if (existsSync(OVERRIDES_PATH)) {
    overrides = readJsonSafe(OVERRIDES_PATH) || {};
  }

  if (overrides.projects) {
    for (const override of overrides.projects as any[]) {
      const project = projects.find(p => p.slug === override.slug);
      if (project) {
        Object.assign(project, override);
      }
    }
  }

  const data: WorkspaceData = {
    projects,
    agents,
    skills: cursorSkills,
    stats: {
      totalProjects: projects.length,
      productionProjects,
      totalAgents: agents.length,
      totalNotes,
      totalPatterns: playbookStats.patterns,
      totalSkills: playbookStats.skills + cursorSkills.length,
      totalExperienceArchives: playbookStats.archives,
    },
    techStack,
    timeline,
    extractedAt: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Data written to: ${OUTPUT_PATH}`);
  console.log('Stats:', JSON.stringify(data.stats, null, 2));
}

main();
