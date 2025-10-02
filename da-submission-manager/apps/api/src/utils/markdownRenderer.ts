import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeStringify)
    .process(markdown);

  return processed.value.toString();
}

