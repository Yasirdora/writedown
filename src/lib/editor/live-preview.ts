import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

/**
 * Live preview: markdown stays the source of truth, but formatting
 * markers are concealed and structures rendered as widgets on every line the
 * cursor is not touching.
 */

class ImageWidget extends WidgetType {
	constructor(
		readonly src: string,
		readonly alt: string
	) {
		super();
	}
	override eq(other: ImageWidget): boolean {
		return other.src === this.src && other.alt === this.alt;
	}
	toDOM(): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = 'cm-lp-image-wrap';
		const img = document.createElement('img');
		img.src = this.src;
		img.alt = this.alt;
		img.className = 'cm-lp-image';
		img.onerror = () => wrap.classList.add('cm-lp-image-broken');
		wrap.appendChild(img);
		return wrap;
	}
}

class RuleWidget extends WidgetType {
	override eq(): boolean {
		return true;
	}
	toDOM(): HTMLElement {
		const el = document.createElement('div');
		el.className = 'cm-lp-rule';
		return el;
	}
}

class CheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly pos: number
	) {
		super();
	}
	override eq(other: CheckboxWidget): boolean {
		return other.checked === this.checked && other.pos === this.pos;
	}
	toDOM(view: EditorView): HTMLElement {
		const box = document.createElement('input');
		box.type = 'checkbox';
		box.checked = this.checked;
		box.className = 'cm-lp-checkbox';
		box.setAttribute('aria-label', 'Toggle task');
		box.addEventListener('mousedown', (e) => e.preventDefault());
		box.addEventListener('change', () => {
			const current = view.state.doc.sliceString(this.pos, this.pos + 3);
			if (current === '[ ]' || current === '[x]' || current === '[X]') {
				view.dispatch({
					changes: { from: this.pos + 1, to: this.pos + 2, insert: this.checked ? ' ' : 'x' }
				});
			}
		});
		return box;
	}
}

interface DecoItem {
	from: number;
	to: number;
	deco: Decoration;
}

const CONCEALED = new Set(['EmphasisMark', 'CodeMark', 'StrikethroughMark']);
const SKIP = new Set(['FencedCode', 'CodeBlock', 'HTMLBlock']);

function buildDecorations(view: EditorView): DecorationSet {
	const { state } = view;
	const decos: DecoItem[] = [];

	const selectionTouchesLine = (pos: number): boolean => {
		const line = state.doc.lineAt(pos);
		return state.selection.ranges.some((r) => r.from <= line.to && r.to >= line.from);
	};
	const addLine = (linePos: number, cls: string) => {
		const line = state.doc.lineAt(linePos);
		decos.push({ from: line.from, to: line.from, deco: Decoration.line({ class: cls }) });
	};
	const conceal = (from: number, to: number) =>
		decos.push({ from, to, deco: Decoration.replace({}) });

	for (const { from, to } of view.visibleRanges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter(node) {
				const name = node.name;
				if (SKIP.has(name)) return false;

				const active = selectionTouchesLine(node.from);

				if (CONCEALED.has(name)) {
					if (!active) conceal(node.from, node.to);
					return false;
				}
				if (name === 'HeaderMark') {
					if (!active) {
						// ATX hashes plus the single following space
						let end = node.to;
						if (state.sliceDoc(end, end + 1) === ' ') end += 1;
						conceal(node.from, end);
					}
					return false;
				}
				if (/^(?:ATX|Setext)Heading[1-6]$/.test(name)) {
					addLine(node.from, `cm-lp-h${name.slice(-1)}`);
					return true;
				}
				if (name === 'Blockquote') {
					const first = state.doc.lineAt(node.from).number;
					const last = state.doc.lineAt(Math.min(node.to, state.doc.length)).number;
					for (let n = first; n <= last; n++) {
						addLine(state.doc.line(n).from, 'cm-lp-quote');
					}
					return true;
				}
				if (name === 'QuoteMark') {
					if (!active) {
						let end = node.to;
						if (state.sliceDoc(end, end + 1) === ' ') end += 1;
						conceal(node.from, end);
					}
					return false;
				}
				if (name === 'HorizontalRule') {
					if (!active) {
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new RuleWidget() })
						});
					}
					return false;
				}
				if (name === 'TaskMarker') {
					const checked = /[xX]/.test(state.sliceDoc(node.from, node.to));
					decos.push({
						from: node.from,
						to: node.to,
						deco: Decoration.replace({ widget: new CheckboxWidget(checked, node.from) })
					});
					return false;
				}
				if (name === 'Image') {
					if (!active) {
						const url = node.node.getChild('URL');
						const raw = state.sliceDoc(node.from, node.to);
						const alt = raw.match(/^!\[([^\]]*)\]/)?.[1] ?? 'image';
						const src = url ? state.sliceDoc(url.from, url.to) : '';
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new ImageWidget(src, alt) })
						});
					}
					return false;
				}
				if (name === 'LinkMark' || name === 'URL') {
					// Children of Link (Image returned above already); reveal on active lines
					if (!active) conceal(node.from, node.to);
					return false;
				}
				return true;
			}
		});
	}

	decos.sort((a, b) => a.from - b.from || a.deco.startSide - b.deco.startSide);
	const builder = new RangeSetBuilder<Decoration>();
	for (const d of decos) builder.add(d.from, d.to, d.deco);
	return builder.finish();
}

const livePreviewPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}
		update(u: ViewUpdate) {
			if (
				u.docChanged ||
				u.selectionSet ||
				u.viewportChanged ||
				syntaxTree(u.state) !== syntaxTree(u.startState)
			) {
				this.decorations = buildDecorations(u.view);
			}
		}
	},
	{ decorations: (v) => v.decorations }
);

export function livePreviewExtension(enabled: boolean): Extension {
	return enabled ? [livePreviewPlugin] : [];
}

/** Focus mode: dim every line except the one(s) holding the selection. */
function buildFocusDecorations(view: EditorView): DecorationSet {
	const { state } = view;
	const activeLines = new Set<number>();
	for (const r of state.selection.ranges) {
		const first = state.doc.lineAt(r.from).number;
		const last = state.doc.lineAt(r.to).number;
		for (let n = first; n <= last; n++) activeLines.add(n);
	}
	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = state.doc.lineAt(pos);
			if (!activeLines.has(line.number)) {
				builder.add(line.from, line.from, Decoration.line({ class: 'cm-dimmed' }));
			}
			if (line.to >= to) break;
			pos = line.to + 1;
		}
	}
	return builder.finish();
}

const focusPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildFocusDecorations(view);
		}
		update(u: ViewUpdate) {
			if (u.docChanged || u.selectionSet || u.viewportChanged) {
				this.decorations = buildFocusDecorations(u.view);
			}
		}
	},
	{ decorations: (v) => v.decorations }
);

export function focusExtension(enabled: boolean): Extension {
	return enabled ? [focusPlugin] : [];
}
