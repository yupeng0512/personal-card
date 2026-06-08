import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { createNoteLinkRewriter, type Note } from './notes';

const noteMarkdownProcessor = createMarkdownProcessor({
  syntaxHighlight: {
    type: 'shiki',
    excludeLangs: ['gitignore'],
  },
  shikiConfig: {
    langAlias: {
      env: 'dotenv',
    },
  },
  rehypePlugins: [createNoteLinkRewriter()],
});

export async function renderNoteMarkdown(note: Note, markdown: string) {
  const processor = await noteMarkdownProcessor;
  return processor.render(markdown, {
    frontmatter: {
      title: note.title,
      notePath: note.path,
    },
  });
}
