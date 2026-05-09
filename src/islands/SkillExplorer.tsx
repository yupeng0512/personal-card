import { useMemo, useState } from 'react';

interface SkillRecord {
  name: string;
  title?: string;
  description: string;
  category?: string;
  tags?: string[];
  sourcePath?: string;
  hasScripts?: boolean;
  hasReferences?: boolean;
  validation?: {
    lineCount?: number;
    tokenTier?: string;
    issues?: string[];
  };
}

interface Props {
  skills: SkillRecord[];
  categoryLabels: Record<string, string>;
}

const tokenBadges: Record<string, { label: string; className: string }> = {
  excellent: {
    label: '优秀',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
  },
  good: {
    label: '良好',
    className: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
  },
  watch: {
    label: '关注',
    className: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  },
  optimize: {
    label: '待优化',
    className: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  },
};

export default function SkillExplorer({ skills, categoryLabels }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [mode, setMode] = useState<'all' | 'scripts' | 'references'>('all');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of skills) {
      const key = skill.category || 'other';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [skills]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const matchesCategory = category === 'all' || (skill.category || 'other') === category;
      const matchesMode =
        mode === 'all' ||
        (mode === 'scripts' && skill.hasScripts) ||
        (mode === 'references' && skill.hasReferences);
      const text = [
        skill.name,
        skill.title,
        skill.description,
        skill.category,
        ...(skill.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && matchesMode && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [category, mode, query, skills]);

  return (
    <div className="space-y-6">
      <section className="glass rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">搜索 Skill</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="review / video / figma / trading..."
              className="mt-2 w-full rounded-lg border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
            />
          </label>

          <div className="grid grid-cols-3 gap-2 lg:w-[360px]">
            {[
              { id: 'all', label: '全部' },
              { id: 'scripts', label: '带脚本' },
              { id: 'references', label: '带资料' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as typeof mode)}
                className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  mode === item.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              category === 'all'
                ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            全部 {skills.length}
          </button>
          {categories.map(([id, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                category === id
                  ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
              }`}
            >
              {categoryLabels[id] || id} {count}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">
          {category === 'all' ? '全部 Skill' : categoryLabels[category] || category}
          <span className="ml-2 text-sm font-normal text-surface-400">({filtered.length})</span>
        </h2>
        <span className="hidden text-xs text-surface-400 sm:inline">
          点击卡片查看安装命令和 registry 信息
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-lg p-8 text-center">
          <div className="text-base font-semibold text-surface-900 dark:text-white">没有匹配的 Skill</div>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">换一个关键词或清空筛选条件。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => {
            const tokenBadge = tokenBadges[skill.validation?.tokenTier || ''] || {
              label: '未评级',
              className: 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700',
            };

            return (
            <a key={skill.name} href={`/skills/${skill.name}`} className="glass card-hover block h-full rounded-lg p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-base font-bold text-surface-900 dark:text-white">{skill.title || skill.name}</h3>
                  <p className="mt-1 text-xs text-surface-400">{skill.name}</p>
                </div>
                <span
                  className={`min-w-[3.75rem] shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-center text-xs font-semibold leading-none ring-1 ${tokenBadge.className}`}
                >
                  {tokenBadge.label}
                </span>
              </div>
              <p className="line-clamp-4 text-sm text-surface-500 dark:text-surface-400">{skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(skill.tags || []).slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-100 px-2 py-1 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300"
                  >
                    {tag}
                  </span>
                ))}
                {skill.hasScripts && (
                  <span className="rounded-full bg-accent-500/10 px-2 py-1 text-xs text-accent-600 dark:text-accent-400">
                    scripts
                  </span>
                )}
              </div>
            </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
