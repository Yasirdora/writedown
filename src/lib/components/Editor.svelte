<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView } from 'codemirror';
	import { Compartment, EditorState } from '@codemirror/state';
	import { baseExtensions } from '$lib/editor/setup';
	import { themeExtension } from '$lib/editor/theme';
	import { livePreviewExtension, focusExtension } from '$lib/editor/live-preview';
	import { store } from '$lib/state/app.svelte';

	let { view = $bindable(null) }: { view: EditorView | null } = $props();

	let host: HTMLDivElement | undefined = $state();
	const themeComp = new Compartment();
	const seamlessComp = new Compartment();
	const focusComp = new Compartment();
	let mountedId = '';

	onMount(() => {
		const v = new EditorView({
			parent: host as HTMLElement,
			state: EditorState.create({
				doc: store.active?.content ?? '',
				extensions: [
					baseExtensions({
						onChange: (text) => store.updateContent(text),
						onCursor: (line, col) => store.setCursor(line, col),
						onNotice: (msg) => store.showNotice(msg)
					}),
					themeComp.of(themeExtension(store.resolvedDark)),
					seamlessComp.of(livePreviewExtension(store.seamless)),
					focusComp.of(focusExtension(store.focus))
				]
			})
		});
		view = v;
		mountedId = store.activeId;
		return () => {
			v.destroy();
			if (view === v) view = null;
		};
	});

	// Swap the buffer when the active document changes.
	$effect(() => {
		const id = store.activeId;
		const v = view;
		if (!v || id === mountedId) return;
		mountedId = id;
		const text = store.active?.content ?? '';
		if (v.state.doc.toString() !== text) {
			v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
		}
		v.focus();
	});

	// Reconfigure toggleable features live.
	$effect(() => {
		const dark = store.resolvedDark;
		view?.dispatch({ effects: themeComp.reconfigure(themeExtension(dark)) });
	});
	$effect(() => {
		const on = store.seamless;
		view?.dispatch({ effects: seamlessComp.reconfigure(livePreviewExtension(on)) });
	});
	$effect(() => {
		const on = store.focus;
		view?.dispatch({ effects: focusComp.reconfigure(focusExtension(on)) });
	});
</script>

<div class="editor-host" bind:this={host}></div>
