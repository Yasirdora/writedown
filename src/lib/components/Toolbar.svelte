<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import { store } from '$lib/state/app.svelte';
	import type { ViewMode } from '$lib/state/app.svelte';
	import * as cmd from '$lib/editor/commands';
	import { downloadText, exportHtml, openMarkdownFile, slug } from '$lib/utils/export';
	import Icon from './Icon.svelte';

	let { view }: { view: EditorView | null } = $props();

	let menuOpen = $state(false);
	const editing = $derived(store.viewMode !== 'read' && !!view);

	const run = (fn: (v: EditorView) => boolean) => () => {
		if (view) {
			fn(view);
			view.focus();
		}
	};

	async function openFile() {
		const file = await openMarkdownFile();
		if (file) store.importDocument(file.content);
	}
	function saveMd() {
		const doc = store.active;
		if (!doc) return;
		downloadText(`${slug(store.titleOf(doc))}.md`, doc.content);
	}
	function saveHtml() {
		exportHtml(store.active?.content ?? '');
	}
	function removeActive() {
		const doc = store.active;
		if (doc && confirm('Delete this document? This cannot be undone.')) {
			store.deleteDocument(doc.id);
		}
	}

	const modes: Array<[ViewMode, string]> = [
		['write', 'Write'],
		['split', 'Split'],
		['read', 'Read']
	];
</script>

<header class="toolbar">
	<button class="icon-btn" title="Toggle sidebar (⌘\)" onclick={() => store.toggleSidebar()}>
		<Icon name="sidebar" />
	</button>

	{#if editing}
		<span class="toolbar-divider"></span>
		<div class="toolbar-group">
			<button class="icon-btn" title="Bold (⌘B)" onclick={run(cmd.toggleBold)}><Icon name="bold" /></button>
			<button class="icon-btn" title="Italic (⌘I)" onclick={run(cmd.toggleItalic)}><Icon name="italic" /></button>
			<button class="icon-btn" title="Strikethrough (⌘⇧X)" onclick={run(cmd.toggleStrikethrough)}><Icon name="strike" /></button>
			<button class="icon-btn" title="Inline code" onclick={run(cmd.toggleCode)}><Icon name="code" /></button>
			<button class="icon-btn" title="Link" onclick={run(cmd.insertLink)}><Icon name="link" /></button>
			<button class="icon-btn" title="Image" onclick={run(cmd.insertImage)}><Icon name="image" /></button>
		</div>
		<span class="toolbar-divider"></span>
		<div class="toolbar-group">
			<button class="text-btn" title="Heading 1" onclick={run(cmd.setHeading(1))}>H1</button>
			<button class="text-btn" title="Heading 2" onclick={run(cmd.setHeading(2))}>H2</button>
			<button class="text-btn" title="Heading 3" onclick={run(cmd.setHeading(3))}>H3</button>
			<button class="icon-btn" title="Quote" onclick={run(cmd.toggleQuote)}><Icon name="quote" /></button>
			<button class="icon-btn" title="Bullet list" onclick={run(cmd.toggleBulletList)}><Icon name="list" /></button>
			<button class="icon-btn" title="Numbered list" onclick={run(cmd.toggleOrderedList)}><Icon name="ordered" /></button>
			<button class="icon-btn" title="Task list" onclick={run(cmd.toggleTaskList)}><Icon name="task" /></button>
		</div>
		<span class="toolbar-divider"></span>
		<div class="toolbar-group">
			<button class="icon-btn" title="Table" onclick={run(cmd.insertTable)}><Icon name="table" /></button>
			<button class="icon-btn" title="Math block" onclick={run(cmd.insertMathBlock)}><Icon name="math" /></button>
			<button class="icon-btn" title="Code block" onclick={run(cmd.insertCodeBlock)}><Icon name="codeblock" /></button>
		</div>
	{/if}

	<div class="toolbar-spacer"></div>

	<div class="segmented" role="tablist" aria-label="View mode">
		{#each modes as [mode, label] (mode)}
			<button
				role="tab"
				aria-selected={store.viewMode === mode}
				class:active={store.viewMode === mode}
				onclick={() => store.setViewMode(mode)}>{label}</button
			>
		{/each}
	</div>

	<button
		class="icon-btn"
		class:active={store.seamless}
		title="Live preview — render markdown as you type"
		onclick={() => store.toggleSeamless()}
	>
		<Icon name="sparkles" />
	</button>
	<button
		class="icon-btn"
		class:active={store.focus}
		title="Focus mode (⌘⇧F)"
		onclick={() => store.toggleFocus()}
	>
		<Icon name="focus" />
	</button>
	<button
		class="icon-btn"
		title="Theme: {store.theme}"
		onclick={() => store.cycleTheme()}
	>
		<Icon name={store.theme === 'light' ? 'sun' : store.theme === 'dark' ? 'moon' : 'auto'} />
	</button>

	<div class="menu-wrap">
		<button class="icon-btn" title="More actions" onclick={() => (menuOpen = !menuOpen)}>
			<Icon name="more" />
		</button>
		{#if menuOpen}
			<button class="menu-backdrop" aria-label="Close menu" onclick={() => (menuOpen = false)}
			></button>
			<div class="menu" role="menu">
				<button onclick={() => ((menuOpen = false), openFile())}>
					<Icon name="folder" size={15} /> Open file…
				</button>
				<button onclick={() => ((menuOpen = false), saveMd())}>
					<Icon name="download" size={15} /> Save as Markdown <kbd>⌘S</kbd>
				</button>
				<button onclick={() => ((menuOpen = false), saveHtml())}>
					<Icon name="globe" size={15} /> Export as HTML
				</button>
				<button onclick={() => ((menuOpen = false), window.print())}>
					<Icon name="print" size={15} /> Print / Save as PDF
				</button>
				<hr />
				<button class="danger" onclick={() => ((menuOpen = false), removeActive())}>
					<Icon name="trash" size={15} /> Delete document
				</button>
			</div>
		{/if}
	</div>
</header>
