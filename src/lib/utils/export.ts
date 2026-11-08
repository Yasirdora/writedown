import { renderMarkdown, deriveTitle } from '$lib/markdown/render';

/** Trigger a browser download of a text file. */
export function downloadText(filename: string, content: string, mime = 'text/markdown'): void {
	const blob = new Blob([content], { type: `${mime};charset=utf-8` });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Export the rendered preview as a standalone, styled HTML file. */
export function exportHtml(source: string): void {
	const title = deriveTitle(source);
	const body = renderMarkdown(source);
	const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         max-width: 720px; margin: 0 auto; padding: 48px 24px; color: #1d1d1f; line-height: 1.7; }
  h1 { border-bottom: 1px solid rgba(0,0,0,.1); padding-bottom: .3em; }
  code { background: rgba(0,0,0,.05); border-radius: 4px; padding: .15em .4em; font-size: .9em; }
  pre { background: #f6f8fa; border-radius: 12px; padding: 16px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid rgba(0,0,0,.15); margin: 0; padding-left: 1em; color: #6e6e73; }
  img { max-width: 100%; border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid rgba(0,0,0,.12); padding: 6px 12px; text-align: left; }
  th { background: rgba(0,0,0,.03); }
  .table-wrap { overflow-x: auto; }
  .task-list-item { list-style: none; margin-left: -1.4em; }
  hr { border: none; border-top: 1px solid rgba(0,0,0,.1); margin: 2em 0; }
</style>
</head>
<body class="markdown-body">
${body}
</body>
</html>`;
	downloadText(`${slug(title)}.html`, doc, 'text/html');
}

/** Open a local markdown file via the File System Access API, with a fallback picker. */
export async function openMarkdownFile(): Promise<{ name: string; content: string } | null> {
	if ('showOpenFilePicker' in window) {
		try {
			const [handle] = await (
				window as unknown as {
					showOpenFilePicker: (o: object) => Promise<Array<{ getFile: () => Promise<File> }>>;
				}
			).showOpenFilePicker({
				types: [
					{
						description: 'Markdown',
						accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.txt'] }
					}
				],
				multiple: false
			});
			const file = await handle.getFile();
			return { name: file.name, content: await file.text() };
		} catch (err) {
			if ((err as DOMException).name === 'AbortError') return null;
			// fall through to input picker
		}
	}
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.md,.markdown,.mdown,.txt,text/markdown,text/plain';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return resolve(null);
			resolve({ name: file.name, content: await file.text() });
		};
		input.oncancel = () => resolve(null);
		input.click();
	});
}

export function slug(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'document'
	);
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
