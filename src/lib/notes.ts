import notesData from '../data/notes-data.json';
import { posix as path } from 'node:path';

export const CATEGORY_LABELS: Record<string, string> = {
  'ai-tools': 'AI 工具',
  'ai-agent': 'AI Agent',
  'ai-ml': 'AI/ML',
  'ai-research': 'AI 研究',
  'programming': '编程',
  'dev-tools': '开发工具',
  'tools': '命令行',
  'self-growth': '自我成长',
  'sociology': '社会学',
  'weterm-ai-architecture': 'AI 架构',
  'shares': '分享',
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  'ai-ide': 'AI IDE',
  'claude-code': 'Claude Code',
  'mcp': 'MCP',
  'agent-skill': 'Agent & Skill',
  'agent-architecture': 'Agent 架构',
  'ai-model': '模型应用',
  'ai-video': '视频生成',
  'browser-automation': '浏览器自动化',
  'productivity': '效率工具',
  'ai-productivity': 'AI 生产力',
  'writing': '写作',
  'case-study': '案例',
  'industry': '行业洞察',
  'osint-tools': 'OSINT',
  'career-development': '职业发展',
  'prompt-engineering': 'Prompt',
  'vibe-engineering': 'Vibe Engineering',
  'team-collaboration': '协作',
  'web-scraping': 'Web Scraping',
  'deep-research': '深度研究',
  'translation': '翻译',
  'models': '模型',
  'behavior-change': '行为改变',
  'health-optimization': '健康',
};

export interface Note {
  title: string;
  date: string;
  category: string;
  subcategory: string;
  tags: string[];
  slug: string;
  path: string;
  summary: string;
  content?: string;
}

export interface NotesSource {
  repository: string;
  ref: string;
  commit: string;
}

const data = notesData as {
  notes?: Note[];
  source?: NotesSource;
};

const notes = data.notes || [];
const notePathToSlug = new Map(notes.map(note => [normalizeRepoPath(note.path), note.slug]));
const notePathToNote = new Map(notes.map(note => [normalizeRepoPath(note.path), note]));

export function getAllNotes(): Note[] {
  return notes;
}

export function getNotesSource(): NotesSource {
  return data.source || {
    repository: 'yupeng0512/learning-notes',
    ref: 'main',
    commit: 'main',
  };
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function getSubcategoryLabel(subcategory: string): string {
  return SUBCATEGORY_LABELS[subcategory] || subcategory;
}

export function formatNoteDate(date: string): string {
  return date.slice(5);
}

export function getNoteUrl(note: Note): string {
  return `/blog/${note.slug}`;
}

export function getNoteSourceUrl(note: Note): string {
  const source = getNotesSource();
  return `https://github.com/${source.repository}/blob/${source.commit}/${note.path}`;
}

export function getRenderableNoteContent(note: Note): string {
  const content = note.content || '';
  const trimmed = content.trimStart();
  const [firstLine = '', ...rest] = trimmed.split(/\r?\n/);
  if (firstLine.startsWith('# ') && firstLine.slice(2).trim() === note.title) {
    return rest.join('\n').trimStart();
  }
  return trimmed;
}

export function resolveNoteHref(currentNote: Note, href: string): string {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href;
  }

  const githubPath = extractGithubLearningNotesPath(href);
  if (githubPath) {
    return hrefForRepoPath(githubPath, href);
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith('//')) {
    return href;
  }

  const [hrefPath, suffix = ''] = splitHrefSuffix(href);
  const repoPath = toRepoRelativePath(currentNote, hrefPath);
  if (!repoPath) return href;

  const slug = notePathToSlug.get(repoPath);
  return slug ? `/blog/${slug}${suffix}` : href;
}

export function createNoteLinkRewriter() {
  return function rehypeRewriteNoteLinks() {
    return function transformer(tree: unknown, file: unknown) {
      const currentNote = getNoteFromVFile(file);
      if (!currentNote) return;

      visitElements(tree, node => {
        if (node.tagName !== 'a' && node.tagName !== 'img') return;
        const propName = node.tagName === 'a' ? 'href' : 'src';
        const value = node.properties?.[propName];
        if (typeof value !== 'string') return;
        node.properties[propName] = resolveNoteHref(currentNote, value);
      });
    };
  };
}

function getNoteFromVFile(file: unknown): Note | null {
  const frontmatter = (file as { data?: { astro?: { frontmatter?: Record<string, unknown> } } })
    ?.data
    ?.astro
    ?.frontmatter;
  const notePath = frontmatter?.notePath;
  if (typeof notePath !== 'string') return null;
  return notePathToNote.get(normalizeRepoPath(notePath)) || null;
}

function splitHrefSuffix(href: string): [string, string?] {
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  return [match?.[1] || href, match?.[2]];
}

function extractGithubLearningNotesPath(href: string): string | null {
  try {
    const url = new URL(href);
    const match = url.pathname.match(/^\/yupeng0512\/learning-notes\/blob\/[^/]+\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]) + url.search + url.hash;
  } catch {
    return null;
  }
}

function hrefForRepoPath(repoPathWithSuffix: string, fallback: string): string {
  const [repoPath, suffix = ''] = splitHrefSuffix(repoPathWithSuffix);
  const slug = notePathToSlug.get(normalizeRepoPath(repoPath));
  return slug ? `/blog/${slug}${suffix}` : fallback;
}

function toRepoRelativePath(currentNote: Note, hrefPath: string): string | null {
  if (!hrefPath.endsWith('.md')) return null;

  let rawPath = safeDecodeURIComponent(hrefPath);
  const localRoot = '/Users/yupeng/learning-notes/';
  if (rawPath.startsWith(localRoot)) {
    rawPath = rawPath.slice(localRoot.length);
  } else if (rawPath.startsWith('/')) {
    rawPath = rawPath.slice(1);
  } else {
    rawPath = path.join(path.dirname(currentNote.path), rawPath);
  }

  return normalizeRepoPath(rawPath);
}

function normalizeRepoPath(value: string): string {
  return path.normalize(value).replace(/^\.\//, '');
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

type ElementNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
};

function visitElements(node: unknown, callback: (node: ElementNode) => void) {
  if (!node || typeof node !== 'object') return;
  const element = node as ElementNode;
  if (element.type === 'element') callback(element);
  if (Array.isArray(element.children)) {
    for (const child of element.children) visitElements(child, callback);
  }
}
