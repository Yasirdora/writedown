import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { searchKeymap, search, highlightSelectionMatches } from '@codemirror/search';
import {
	keymap,
	drawSelection,
	dropCursor,
	highlightActiveLine,
	placeholder,
	EditorView
} from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { toggleBold, toggleItalic, toggleStrikethrough } from './commands';

export interface EditorCallbacks {
	onChange(text: string): void;
	onCursor(line: number, col: number): void;
	onNotice(message: string): void;
}

/** Everything the editor needs besides the toggleable compartments. */
export function baseExtensions(cb: EditorCallbacks): Extension {
	return [
		history(),
		drawSelection(),
		dropCursor(),
		highlightActiveLine(),
		EditorView.lineWrapping,
		markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
		search({ top: true }),
		highlightSelectionMatches(),
		placeholder('Start writing…'),
		keymap.of([
			{ key: 'Mod-b', run: toggleBold },
			{ key: 'Mod-i', run: toggleItalic },
			{ key: 'Mod-Shift-x', run: toggleStrikethrough },
			...defaultKeymap,
			...historyKeymap,
			...searchKeymap
		]),
		EditorView.updateListener.of((u) => {
			if (u.docChanged) cb.onChange(u.state.doc.toString());
			if (u.selectionSet || u.docChanged) {
				const head = u.state.selection.main.head;
				const line = u.state.doc.lineAt(head);
				cb.onCursor(line.number, head - line.from + 1);
			}
		}),
		EditorView.domEventHandlers({
			paste(event, view) {
				const files = event.clipboardData?.files;
				const file = files?.[0];
				if (!file || !file.type.startsWith('image/')) return false;
				event.preventDefault();
				if (file.size > 1_500_000) {
					cb.onNotice('Image is over 1.5 MB — too large to embed inline');
					return true;
				}
				const reader = new FileReader();
				reader.onload = () => {
					view.dispatch(
						view.state.replaceSelection(`![${file.name || 'image'}](${String(reader.result)})`)
					);
					cb.onNotice('Image embedded as data URL');
				};
				reader.readAsDataURL(file);
				return true;
			},
			drop(event, view) {
				const file = event.dataTransfer?.files?.[0];
				if (!file || !file.type.startsWith('image/')) return false;
				event.preventDefault();
				if (file.size > 1_500_000) {
					cb.onNotice('Image is over 1.5 MB — too large to embed inline');
					return true;
				}
				const reader = new FileReader();
				reader.onload = () => {
					const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
					const insert = `![${file.name || 'image'}](${String(reader.result)})`;
					view.dispatch({
						changes: { from: pos ?? view.state.selection.main.head, insert }
					});
				};
				reader.readAsDataURL(file);
				return true;
			}
		})
	];
}
