<script lang="ts">
	import { store } from '$lib/state/app.svelte';
</script>

<footer class="statusbar">
	<div class="status-left">
		{#if store.notice}
			<span class="notice">{store.notice}</span>
		{:else}
			<span>{store.words.toLocaleString()} words</span>
			<span class="dot">·</span>
			<span>{store.chars.toLocaleString()} characters</span>
			<span class="dot">·</span>
			<span>{store.readingMinutes} min read</span>
		{/if}
	</div>
	<div class="status-right">
		{#if store.focus}<span class="chip">Focus</span>{/if}
		{#if store.viewMode !== 'read'}
			<span>Ln {store.cursor.line}, Col {store.cursor.col}</span>
			<span class="dot">·</span>
		{/if}
		<span class="chip">{store.viewMode === 'write' ? 'Write' : store.viewMode === 'split' ? 'Split' : 'Read'}</span>
	</div>
</footer>
