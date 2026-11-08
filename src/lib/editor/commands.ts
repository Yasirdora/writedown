import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

type Command = (view: EditorView) => boolean;

/** Wrap/unwrap the main selection with an inline marker (** **, * *, ~~ ~~, ` `). */
function toggleInline(marker: string): Command {
	return (view) => {
		const { from, to } = view.state.selection.main;
		const doc = view.state.doc;
		const len = marker.length;
		const isWrapped =
			from >= len &&
			doc.sliceString(from - len, from) === marker &&
			doc.sliceString(to, to + len) === marker;

		if (isWrapped) {
			view.dispatch({
				changes: [
					{ from: to, to: to + len, insert: '' },
					{ from: from - len, to: from, insert: '' }
				],
				selection: EditorSelection.range(from - len, to - len)
			});
		} else {
			const text = doc.sliceString(from, to);
			view.dispatch({
				changes: { from, to, insert: `${marker}${text}${marker}` },
				selection: text
					? EditorSelection.range(from + len, to + len)
					: EditorSelection.cursor(from + len)
			});
		}
		return true;
	};
}

export const toggleBold = toggleInline('**');
export const toggleItalic = toggleInline('*');
export const toggleStrikethrough = toggleInline('~~');
export const toggleCode = toggleInline('`');

export function insertLink(view: EditorView): boolean {
	const { from, to } = view.state.selection.main;
	const text = view.state.doc.sliceString(from, to) || 'link text';
	const insert = `[${text}](https://)`;
	const urlStart = from + text.length + 3;
	view.dispatch({
		changes: { from, to, insert },
		selection: EditorSelection.range(urlStart, urlStart + 8)
	});
	return true;
}

export function insertImage(view: EditorView): boolean {
	const { from, to } = view.state.selection.main;
	const text = view.state.doc.sliceString(from, to) || 'alt text';
	const insert = `![${text}](https://)`;
	const urlStart = from + text.length + 4;
	view.dispatch({
		changes: { from, to, insert },
		selection: EditorSelection.range(urlStart, urlStart + 8)
	});
	return true;
}

/** Apply a per-line transform over every line touching the selection. */
function eachSelectedLine(view: EditorView, fn: (text: string) => string): boolean {
	const { from, to } = view.state.selection.main;
	const doc = view.state.doc;
	const changes: Array<{ from: number; to: number; insert: string }> = [];
	let pos = doc.lineAt(from).from;
	const end = doc.lineAt(to).to;
	while (pos <= end) {
		const line = doc.lineAt(pos);
		const next = fn(line.text);
		if (next !== line.text) changes.push({ from: line.from, to: line.to, insert: next });
		pos = line.to + 1;
	}
	if (changes.length) view.dispatch({ changes });
	return true;
}

export function setHeading(level: number): Command {
	return (view) =>
		eachSelectedLine(view, (text) => {
			const stripped = text.replace(/^#{1,6}\s+/, '');
			if (!stripped.trim()) return stripped;
			const prefix = `${'#'.repeat(level)} `;
			return text.startsWith(prefix) ? stripped : prefix + stripped;
		});
}

export function toggleQuote(view: EditorView): boolean {
	return eachSelectedLine(view, (text) =>
		/^>\s?/.test(text) ? text.replace(/^>\s?/, '') : text.trim() ? `> ${text}` : text
	);
}

export function toggleBulletList(view: EditorView): boolean {
	return eachSelectedLine(view, (text) => {
		if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(text)) return text.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, '$1');
		if (/^\s*[-*+]\s+/.test(text)) return text.replace(/^(\s*)[-*+]\s+/, '$1');
		if (/^\s*\d+[.)]\s+/.test(text)) return text.replace(/^(\s*)\d+[.)]\s+/, '$1- ');
		return text.trim() ? `- ${text}` : text;
	});
}

export function toggleOrderedList(view: EditorView): boolean {
	let n = 0;
	return eachSelectedLine(view, (text) => {
		if (/^\s*[-*+]\s+/.test(text)) return text.replace(/^(\s*)[-*+]\s+(\[[ xX]\]\s+)?/, `$1${++n}. `);
		if (/^\s*\d+[.)]\s+/.test(text)) return text.replace(/^(\s*)\d+[.)]\s+/, '$1');
		return text.trim() ? `${++n}. ${text}` : text;
	});
}

export function toggleTaskList(view: EditorView): boolean {
	return eachSelectedLine(view, (text) => {
		if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(text))
			return text.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, '$1');
		if (/^\s*[-*+]\s+/.test(text)) return text.replace(/^(\s*)[-*+]\s+/, '$1- [ ] ');
		if (/^\s*\d+[.)]\s+/.test(text)) return text.replace(/^(\s*)\d+[.)]\s+/, '$1- [ ] ');
		return text.trim() ? `- [ ] ${text}` : text;
	});
}

/** Insert a block-level snippet on its own paragraph. */
function insertSnippet(view: EditorView, snippet: string, cursorOffset?: number): boolean {
	const { from, to } = view.state.selection.main;
	const line = view.state.doc.lineAt(from);
	const lead = line.text.trim() !== '' ? '\n\n' : '';
	const text = lead + snippet;
	const cursor =
		cursorOffset != null ? from + lead.length + cursorOffset : from + text.length;
	view.dispatch({
		changes: { from, to, insert: text },
		selection: EditorSelection.cursor(cursor)
	});
	return true;
}

export function insertTable(view: EditorView): boolean {
	return insertSnippet(
		view,
		'| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |'
	);
}

export function insertMathBlock(view: EditorView): boolean {
	return insertSnippet(view, '$$\n\n$$', 3);
}

export function insertCodeBlock(view: EditorView): boolean {
	return insertSnippet(view, '```\n\n```', 4);
}

export function insertRule(view: EditorView): boolean {
	return insertSnippet(view, '---\n');
}
