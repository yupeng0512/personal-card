import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

interface NoteInfo {
  title: string;
  date: string;
  category: string;
  subcategory: string;
  tags: string[];
  slug: string;
  path: string;
  summary: string;
  content: string;
}

interface SourceInfo {
  repository: string;
  ref: string;
  commit: string;
}

interface NotesData {
  notes: NoteInfo[];
  stats: {
    totalNotes: number;
  };
  source: SourceInfo;
  extractedAt: string;
}

interface ParsedFrontmatter {
  title?: string;
  date?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  public?: boolean;
  visibility?: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LEARNING_NOTES_DIR = resolve(SCRIPT_DIR, '../../learning-notes');
const LEARNING_NOTES_DIR = resolve(process.env.LEARNING_NOTES_DIR || DEFAULT_LEARNING_NOTES_DIR);
const OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/notes-data.json');

const EXCLUDED_BASENAMES = new Set([
  'README.md',
  'INDEX.md',
  'CLEANUP-REPORT.md',
  'DEPLOYMENT.md',
]);

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

const skippedByReason = new Map<string, number>();
const skippedExamples = new Map<string, string[]>();

function bumpSkip(reason: string, relPath?: string) {
  skippedByReason.set(reason, (skippedByReason.get(reason) || 0) + 1);
  if (relPath) {
    const examples = skippedExamples.get(reason) || [];
    if (examples.length < 5) examples.push(relPath);
    skippedExamples.set(reason, examples);
  }
}

function readJsonSafe<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function runGit(args: string[]): string {
  return execFileSync('git', ['-C', LEARNING_NOTES_DIR, ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function listTrackedMarkdownFiles(): string[] {
  return execFileSync('git', ['-C', LEARNING_NOTES_DIR, '-c', 'core.quotePath=false', 'ls-files', '-z', '*.md'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\0')
    .map(path => path.trim())
    .filter(Boolean);
}

function isExcludedPath(relPath: string): boolean {
  if (EXCLUDED_BASENAMES.has(basename(relPath))) return true;
  return relPath.split('/').includes('skill-from-masters-docs');
}

function normalizeScalar(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}

function parseBoolean(value: string): boolean | undefined {
  const normalized = normalizeScalar(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseNoteFrontmatter(content: string): ParsedFrontmatter {
  const result: ParsedFrontmatter = {};

  if (!content.startsWith('---')) return result;
  const endIdx = content.indexOf('---', 3);
  if (endIdx <= 0) return result;

  const fm = content.slice(3, endIdx);
  const titleMatch = fm.match(/^title:\s*(.+)$/m);
  if (titleMatch) result.title = normalizeScalar(titleMatch[1]);

  const dateMatch = fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
  if (dateMatch) result.date = dateMatch[1];

  const catMatch = fm.match(/^category:\s*(.+)$/m);
  if (catMatch) result.category = normalizeScalar(catMatch[1]);

  const subMatch = fm.match(/^subcategory:\s*(.+)$/m);
  if (subMatch) result.subcategory = normalizeScalar(subMatch[1]);

  const publicMatch = fm.match(/^public:\s*(.+)$/m);
  if (publicMatch) result.public = parseBoolean(publicMatch[1]);

  const visibilityMatch = fm.match(/^visibility:\s*(.+)$/m);
  if (visibilityMatch) result.visibility = normalizeScalar(visibilityMatch[1]).toLowerCase();

  const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]/m);
  if (tagsMatch) {
    result.tags = tagsMatch[1].split(',').map(t => normalizeScalar(t));
  } else {
    const yamlTags: string[] = [];
    const tagLines = fm.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
    if (tagLines) {
      for (const line of tagLines[1].split('\n')) {
        const m = line.match(/^\s+-\s+(.+)/);
        if (m) yamlTags.push(normalizeScalar(m[1]));
      }
      if (yamlTags.length) result.tags = yamlTags;
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
  let bodyStart = 0;
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    bodyStart = endIdx > 0 ? endIdx + 3 : 0;
  }
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

function stripFrontmatter(content: string): string {
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!frontmatterMatch) return content.trimStart();
  return content.slice(frontmatterMatch[0].length).trimStart();
}

function isPrivateNote(frontmatter: ParsedFrontmatter): boolean {
  return frontmatter.public === false || frontmatter.visibility === 'private';
}

function extractNote(relPath: string): NoteInfo | null {
  const fullPath = resolve(LEARNING_NOTES_DIR, relPath);
  const content = readFileSync(fullPath, 'utf-8');
  const fm = parseNoteFrontmatter(content);

  if (isPrivateNote(fm)) {
    bumpSkip('private', relPath);
    return null;
  }

  const inline = parseNoteInlineMetadata(content);
  const fileName = basename(relPath);
  const title = fm.title || inline.title || fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const dateFromFilename = fileName.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const date = fm.date || inline.date || dateFromFilename || '';

  if (!date) {
    bumpSkip('missing-date', relPath);
    return null;
  }

  const pathParts = relPath.split('/');
  const category = pathParts.length > 1 ? pathParts[0] : 'uncategorized';
  const subcategory = pathParts.length > 2 ? pathParts[1] : '';
  const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const summary = extractNoteSummary(content) || inline.summary || '';
  const noteContent = stripFrontmatter(content);
  const tags = fm.tags?.length ? fm.tags : [
    CATEGORY_LABELS[category],
    SUBCATEGORY_LABELS[subcategory],
  ].filter((tag): tag is string => Boolean(tag));

  return { title, date, category, subcategory, tags, slug, path: relPath, summary, content: noteContent };
}

function extractNotes(): NoteInfo[] {
  const notes: NoteInfo[] = [];

  for (const relPath of listTrackedMarkdownFiles()) {
    if (isExcludedPath(relPath)) {
      bumpSkip('excluded-path', relPath);
      continue;
    }

    try {
      const note = extractNote(relPath);
      if (note) notes.push(note);
    } catch {
      bumpSkip('read-error', relPath);
    }
  }

  return notes.sort((a, b) => b.date.localeCompare(a.date));
}

function assertDropGuard(previous: NotesData | null, nextCount: number) {
  const allowDrop = process.env.SYNC_NOTES_ALLOW_DROP === 'true';
  const previousCount = previous?.stats?.totalNotes || previous?.notes?.length || 0;
  if (!allowDrop && previousCount > 0 && nextCount < previousCount * 0.9) {
    throw new Error(
      `Refusing to reduce notes from ${previousCount} to ${nextCount}. ` +
      'Set SYNC_NOTES_ALLOW_DROP=true only after verifying the drop is intentional.'
    );
  }
}

function hasSameNotesContent(previous: NotesData | null, next: Pick<NotesData, 'notes' | 'stats'>): boolean {
  if (!previous) return false;
  return JSON.stringify({
    notes: previous.notes,
    stats: previous.stats,
  }) === JSON.stringify(next);
}

function buildSummary(data: NotesData, changed: boolean, checkedSource: SourceInfo): string {
  const latest = data.notes.slice(0, 5);
  const sourceLines = [
    `- Source checked: ${checkedSource.repository}@${checkedSource.commit}`,
    `- Ref checked: ${checkedSource.ref}`,
  ];

  if (JSON.stringify(data.source) !== JSON.stringify(checkedSource)) {
    sourceLines.push(
      `- Snapshot source: ${data.source.repository}@${data.source.commit}`,
      `- Snapshot ref: ${data.source.ref}`
    );
  }

  const skipLines = [...skippedByReason.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([reason, count]) => {
      const examples = skippedExamples.get(reason) || [];
      const suffix = examples.length ? ` (${examples.join(', ')})` : '';
      return `- ${reason}: ${count}${suffix}`;
    })
    .join('\n') || '- none: 0';

  return [
    '### Learning Notes Sync',
    '',
    ...sourceLines,
    `- Notes: ${data.stats.totalNotes}`,
    `- Changed: ${changed ? 'yes' : 'no'}`,
    '',
    'Latest notes:',
    ...latest.map(note => `- ${note.date} ${note.title}`),
    '',
    'Skipped:',
    skipLines,
    '',
  ].join('\n');
}

function main() {
  if (!existsSync(LEARNING_NOTES_DIR)) {
    throw new Error(`Learning notes directory does not exist: ${LEARNING_NOTES_DIR}`);
  }

  console.log('Syncing learning notes from:', LEARNING_NOTES_DIR);
  const previous = readJsonSafe<NotesData>(OUTPUT_PATH);
  const notes = extractNotes();
  const checkedSource = {
    repository: process.env.LEARNING_NOTES_REPOSITORY || 'yupeng0512/learning-notes',
    ref: process.env.LEARNING_NOTES_REF || runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: runGit(['rev-parse', 'HEAD']),
  };

  assertDropGuard(previous, notes.length);

  const nextNotesContent = {
    notes,
    stats: {
      totalNotes: notes.length,
    },
  };

  const unchanged = hasSameNotesContent(previous, nextNotesContent);
  const data: NotesData = {
    ...nextNotesContent,
    source: unchanged && previous?.source ? previous.source : checkedSource,
    extractedAt: unchanged && previous?.extractedAt ? previous.extractedAt : new Date().toISOString(),
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');

  const summary = buildSummary(data, !unchanged, checkedSource);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf-8');
  }
}

main();
