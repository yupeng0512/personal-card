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
  'personal-card', 'bk-sap-api', 'bk-sap-mcp',
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

interface NoteInfo {
  title: string;
  date: string;
  category: string;
  subcategory: string;
  tags: string[];
  slug: string;
  path: string;
  summary: string;
}

interface WorkspaceData {
  projects: ProjectInfo[];
  agents: AgentInfo[];
  skills: { name: string; description: string; path: string }[];
  notes: NoteInfo[];
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

const CATEGORY_LABELS: Record<string, string> = {
  'ai-tools': 'AI 工具与效率',
  'ai-agent': 'AI Agent',
  'ai-ml': 'AI/ML 技术',
  'ai-research': 'AI 研究',
  'programming': '编程技术',
  'dev-tools': '开发工具',
  'tools': '命令行工具',
  'self-growth': '自我成长',
  'sociology': '社会学',
  'weterm-ai-architecture': 'AI 架构',
  'shares': '分享',
  'learning-notes': '学习笔记',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  'ai-ide': 'AI IDE',
  'claude-code': 'Claude Code',
  'mcp': 'MCP 工具',
  'agent-skill': 'Agent & Skill',
  'agent-architecture': 'Agent 架构',
  'ai-model': 'AI 模型应用',
  'ai-video': 'AI 视频生成',
  'browser-automation': '浏览器自动化',
  'productivity': '效率工具',
  'ai-productivity': 'AI 生产力',
  'writing': 'AI 写作',
  'case-study': '开发案例',
  'industry': '行业洞察',
  'osint-tools': 'OSINT 工具',
  'career-development': '职业发展',
  'prompt-engineering': 'Prompt 工程',
  'vibe-engineering': 'Vibe Engineering',
  'team-collaboration': '团队协作',
  'web-scraping': 'Web Scraping',
  'deep-research': '深度研究',
  'translation': '翻译模型',
  'models': '模型',
  'behavior-change': '行为改变',
  'health-optimization': '健康优化',
};

function parseNoteFrontmatter(content: string): { title?: string; date?: string; category?: string; subcategory?: string; tags?: string[] } {
  const result: { title?: string; date?: string; category?: string; subcategory?: string; tags?: string[] } = {};

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx > 0) {
      const fm = content.slice(3, endIdx);
      const titleMatch = fm.match(/^title:\s*(.+)$/m);
      if (titleMatch) result.title = titleMatch[1].trim().replace(/^["']|["']$/g, '');

      const dateMatch = fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
      if (dateMatch) result.date = dateMatch[1];

      const catMatch = fm.match(/^category:\s*(.+)$/m);
      if (catMatch) result.category = catMatch[1].trim();

      const subMatch = fm.match(/^subcategory:\s*(.+)$/m);
      if (subMatch) result.subcategory = subMatch[1].trim();

      const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
      if (tagsMatch) {
        result.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
      } else {
        const yamlTags: string[] = [];
        const tagLines = fm.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
        if (tagLines) {
          for (const line of tagLines[1].split('\n')) {
            const m = line.match(/^\s+-\s+(.+)/);
            if (m) yamlTags.push(m[1].trim().replace(/^["']|["']$/g, ''));
          }
          if (yamlTags.length) result.tags = yamlTags;
        }
      }
    }
  }

  return result;
}

function parseNoteInlineMetadata(content: string): { title?: string; date?: string; summary?: string } {
  const result: { title?: string; date?: string; summary?: string } = {};
  const lines = content.split('\n');

  for (const line of lines) {
    if (!result.title && line.startsWith('# ')) {
      result.title = line.slice(2).trim();
    }
    if (!result.date) {
      const dateMatch = line.match(/学习日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) result.date = dateMatch[1];
    }
    if (!result.summary) {
      const summaryMatch = line.match(/一句话总结[》】]*[：:]\s*(.+)/);
      if (summaryMatch) result.summary = summaryMatch[1].trim().replace(/^["'「]|["'」]$/g, '');
    }
  }

  return result;
}

function extractNoteSummary(content: string): string {
  const bodyStart = content.startsWith('---')
    ? content.indexOf('---', 3) + 3
    : 0;
  const body = content.slice(bodyStart);

  const summaryMatch = body.match(/一句话(?:总结|概括)[》】]*[：:]\s*(.+)/);
  if (summaryMatch) return summaryMatch[1].trim().replace(/^["'「]|["'」]$/g, '').slice(0, 200);

  const rootMatch = body.match(/根节点命题[》】]*\s*\n+>\s*\*\*(.+?)\*\*/);
  if (rootMatch) return rootMatch[1].trim().slice(0, 200);

  const blockquoteMatch = body.match(/^>\s*(.{20,})/m);
  if (blockquoteMatch) {
    const q = blockquoteMatch[1].trim();
    if (!q.match(/学习日期|来源|分类|标签|📅|🔗|📂|🏷️/)) return q.slice(0, 200);
  }

  return '';
}

function extractNotes(notesDir: string): NoteInfo[] {
  if (!existsSync(notesDir)) return [];
  const notes: NoteInfo[] = [];

  function walk(dir: string, relDir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'skill-from-masters-docs') continue;
      const fullPath = join(dir, entry.name);
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.name.endsWith('.md') && entry.name !== 'README.md' && entry.name !== 'INDEX.md' && entry.name !== 'CLEANUP-REPORT.md' && entry.name !== 'DEPLOYMENT.md') {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const fm = parseNoteFrontmatter(content);
          const inline = parseNoteInlineMetadata(content);

          const title = fm.title || inline.title || entry.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
          const dateFromFilename = entry.name.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
          const date = fm.date || inline.date || dateFromFilename || '';

          if (!date) return;

          const pathParts = relPath.split('/');
          const category = pathParts.length > 1 ? pathParts[0] : 'uncategorized';
          const subcategory = pathParts.length > 2 ? pathParts[1] : '';

          const slug = entry.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
          const summary = extractNoteSummary(content) || inline.summary || '';

          const tags: string[] = fm.tags || [];
          if (!tags.length) {
            const catLabel = CATEGORY_LABELS[category];
            if (catLabel) tags.push(catLabel);
            const subLabel = SUBCATEGORY_LABELS[subcategory];
            if (subLabel) tags.push(subLabel);
          }

          notes.push({ title, date, category, subcategory, tags, slug, path: relPath, summary });
        } catch {}
      }
    }
  }

  walk(notesDir, '');
  return notes.sort((a, b) => b.date.localeCompare(a.date));
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
  const notes = extractNotes(join(WORKSPACE_ROOT, 'learning-notes'));
  console.log(`Found ${notes.length} notes`);

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
    notes,
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
