<script lang="ts">
	import { onMount } from 'svelte';
	import type { EditorView } from '@codemirror/view';
	import { store } from '$lib/state/app.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Preview from '$lib/components/Preview.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import type { PaletteCommand } from '$lib/palette';
	import { downloadText, exportHtml, openMarkdownFile, slug } from '$lib/utils/export';
	import { insertLink, insertTable, insertMathBlock, insertCodeBlock } from '$lib/editor/commands';

	let view = $state<EditorView | null>(null);

	// Reflect theme on <html> so every component (and native UI) follows.
	$effect(() => {
		document.documentElement.dataset.theme = store.resolvedDark ? 'dark' : 'light';
		document.documentElement.style.colorScheme = store.resolvedDark ? 'dark' : 'light';
	});

	$effect(() => {
		const title = store.active ? store.titleOf(store.active) : '';
		document.title = title && title !== 'Untitled' ? `${title} — Writedown` : 'Writedown';
	});

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		store.systemDark = mq.matches;
		const onMq = (e: MediaQueryListEvent) => (store.systemDark = e.matches);
		mq.addEventListener('change', onMq);

		const onKey = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (!mod) return;
			switch (e.key.toLowerCase()) {
				case 'k':
					e.preventDefault();
					e.stopPropagation();
					store.setPalette(!store.paletteOpen);
					break;
				case 's':
					e.preventDefault();
					saveMd();
					break;
				case '1':
					e.preventDefault();
					store.setViewMode('write');
					break;
				case '2':
					e.preventDefault();
					store.setViewMode('split');
					break;
				case '3':
					e.preventDefault();
					store.setViewMode('read');
					break;
				case '\\':
					e.preventDefault();
					store.toggleSidebar();
					break;
				case 'f':
					if (e.shiftKey) {
						e.preventDefault();
						store.toggleFocus();
					}
					break;
			}
		};
		window.addEventListener('keydown', onKey, { capture: true });

		// Drop a .md file anywhere to import it.
		const onDrop = async (e: DragEvent) => {
			const file = e.dataTransfer?.files?.[0];
			if (!file) return;
			if (/\.(md|markdown|mdown|txt)$/i.test(file.name) || file.type.startsWith('text/')) {
				e.preventDefault();
				store.importDocument(await file.text());
			}
		};
		const onDragOver = (e: DragEvent) => e.preventDefault();
		window.addEventListener('drop', onDrop);
		window.addEventListener('dragover', onDragOver);

		return () => {
			mq.removeEventListener('change', onMq);
			window.removeEventListener('keydown', onKey, { capture: true });
			window.removeEventListener('drop', onDrop);
			window.removeEventListener('dragover', onDragOver);
		};
	});

	function saveMd() {
		const doc = store.active;
		if (!doc) return;
		downloadText(`${slug(store.titleOf(doc))}.md`, doc.content);
		store.showNotice('Markdown file downloaded');
	}

	function saveHtml() {
		exportHtml(store.active?.content ?? '');
		store.showNotice('HTML file downloaded');
	}

	async function openFile() {
		const file = await openMarkdownFile();
		if (file) store.importDocument(file.content);
	}

	/** Clicking a task checkbox in the preview flips it in the source. */
	function toggleTaskFromPreview(nth: number) {
		const text = view ? view.state.doc.toString() : (store.active?.content ?? '');
		const re = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/gm;
		let m: RegExpExecArray | null;
		let seen = -1;
		while ((m = re.exec(text))) {
			seen += 1;
			if (seen !== nth) continue;
			if (view) {
				const markPos = m.index + m[1].length + 1;
				view.dispatch({
					changes: { from: markPos, to: markPos + 1, insert: m[2] === ' ' ? 'x' : ' ' }
				});
			} else {
				store.toggleTask(nth);
			}
			return;
		}
	}

	const runInEditor = (fn: (v: EditorView) => boolean) => () => {
		if (view) {
			fn(view);
			view.focus();
		}
	};

	const commands: PaletteCommand[] = [
		{ id: 'new', title: 'New document', run: () => store.newDocument() },
		{ id: 'open', title: 'Open markdown file…', run: openFile },
		{ id: 'save', title: 'Save as Markdown', hint: '⌘S', run: saveMd },
		{ id: 'html', title: 'Export as HTML', run: saveHtml },
		{ id: 'print', title: 'Print / Save as PDF', run: () => window.print() },
		{ id: 'mode-write', title: 'Write mode', hint: '⌘1', run: () => store.setViewMode('write') },
		{ id: 'mode-split', title: 'Split mode', hint: '⌘2', run: () => store.setViewMode('split') },
		{ id: 'mode-read', title: 'Read mode', hint: '⌘3', run: () => store.setViewMode('read') },
		{ id: 'focus', title: 'Toggle Focus mode', hint: '⌘⇧F', run: () => store.toggleFocus() },
		{ id: 'live', title: 'Toggle live preview', run: () => store.toggleSeamless() },
		{ id: 'theme', title: 'Cycle theme — light · dark · system', run: () => store.cycleTheme() },
		{ id: 'sidebar', title: 'Toggle sidebar', hint: '⌘\\', run: () => store.toggleSidebar() },
		{ id: 'link', title: 'Insert link', run: runInEditor(insertLink) },
		{ id: 'table', title: 'Insert table', run: runInEditor(insertTable) },
		{ id: 'math', title: 'Insert math block', run: runInEditor(insertMathBlock) },
		{ id: 'codeblock', title: 'Insert code block', run: runInEditor(insertCodeBlock) },
		{
			id: 'delete',
			title: 'Delete current document',
			run: () => {
				const doc = store.active;
				if (doc && confirm('Delete this document? This cannot be undone.')) {
					store.deleteDocument(doc.id);
				}
			}
		}
	];
</script>

<div class="app">
	<Sidebar />
	<main class="main">
		<Toolbar {view} />
		<div class="workspace mode-{store.viewMode}">
			{#if store.viewMode !== 'read'}
				<div class="editor-pane">
					<Editor bind:view />
				</div>
			{/if}
			{#if store.viewMode !== 'write'}
				<Preview content={store.active?.content ?? ''} onToggleTask={toggleTaskFromPreview} />
			{/if}
		</div>
		<StatusBar />
	</main>
	<CommandPalette {commands} />
</div>
