import MarkdownIt, { type RendererRule } from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import katex from '@traptitech/markdown-it-katex';

const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true,
	breaks: false,
	highlight(str: string, lang: string): string {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
			} catch {
				// fall through to escaped output
			}
		}
		return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
	}
});

md.use(footnote);
md.use(taskLists, { enabled: true, label: true });
md.use(katex);

// External links open in a new tab, never navigate the editor away.
const defaultLinkOpen: RendererRule =
	md.renderer.rules.link_open ??
	((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	tokens[idx].attrSet('target', '_blank');
	tokens[idx].attrSet('rel', 'noopener noreferrer');
	return defaultLinkOpen(tokens, idx, options, env, self);
};

// Wrap tables so wide ones scroll horizontally instead of breaking layout.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
md.renderer.rules.table_close = () => '</table></div>';

/** Render markdown source to sanitized, safe HTML for the preview pane. */
export function renderMarkdown(src: string): string {
	const html = md.render(src);
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true, mathMl: true },
		ADD_TAGS: ['input'],
		ADD_ATTR: ['checked', 'disabled', 'type', 'target', 'rel', 'for', 'aria-hidden']
	});
}

/** Rough plain-text extraction for word counts and snippets. */
export function plainText(src: string): string {
	return src
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/\$\$[\s\S]*?\$\$/g, ' ')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[[ xX]\]\s+/gm, '$1')
		.replace(/[*_~`]+/g, '')
		.replace(/<[^>]+>/g, ' ')
		.trim();
}

export function countWords(src: string): number {
	const text = plainText(src);
	const matches = text.match(/[\p{L}\p{N}'’-]+/gu);
	return matches ? matches.length : 0;
}

/** First meaningful line of a document, used as its title. */
export function deriveTitle(src: string): string {
	for (const raw of src.split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		const text = plainText(line).slice(0, 80);
		if (text) return text;
	}
	return 'Untitled';
}
