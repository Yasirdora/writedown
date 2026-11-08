<script lang="ts">
	import { store } from '$lib/state/app.svelte';
	import { plainText } from '$lib/markdown/render';
	import Icon from './Icon.svelte';

	let query = $state('');

	let filtered = $derived(
		store.docs.filter((d) => {
			const q = query.trim().toLowerCase();
			return !q || d.content.toLowerCase().includes(q);
		})
	);

	function formatDate(ts: number): string {
		const d = new Date(ts);
		const now = new Date();
		if (d.toDateString() === now.toDateString()) {
			return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
		}
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function snippet(content: string): string {
		const text = plainText(content);
		return text.length > 64 ? `${text.slice(0, 64)}…` : text || 'Empty document';
	}

	function remove(id: string) {
		if (confirm('Delete this document? This cannot be undone.')) {
			store.deleteDocument(id);
		}
	}
</script>

{#if store.sidebarOpen}
	<aside class="sidebar" aria-label="Documents">
		<div class="sidebar-header">
			<span class="logo">Writedown</span>
			<button class="icon-btn" title="New document" onclick={() => store.newDocument()}>
				<Icon name="plus" />
			</button>
		</div>
		<div class="sidebar-search">
			<Icon name="search" size={13} />
			<input bind:value={query} placeholder="Search" aria-label="Search documents" />
		</div>
		<div class="doc-list" role="list">
			{#each filtered as doc (doc.id)}
				<div
					class="doc-item"
					class:active={doc.id === store.activeId}
					role="button"
					tabindex="0"
					onclick={() => store.selectDocument(doc.id)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && store.selectDocument(doc.id)}
				>
					<div class="doc-title">{store.titleOf(doc)}</div>
					<div class="doc-meta">{formatDate(doc.updatedAt)} · {snippet(doc.content)}</div>
					<button
						class="doc-delete"
						title="Delete document"
						aria-label="Delete document"
						onclick={(e) => {
							e.stopPropagation();
							remove(doc.id);
						}}
					>
						<Icon name="close" size={11} />
					</button>
				</div>
			{:else}
				<div class="doc-empty">No documents found</div>
			{/each}
		</div>
	</aside>
{/if}
