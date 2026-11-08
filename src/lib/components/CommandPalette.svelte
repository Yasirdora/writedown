<script lang="ts">
	import { store } from '$lib/state/app.svelte';
	import type { PaletteCommand } from '$lib/palette';
	import Icon from './Icon.svelte';

	let { commands }: { commands: PaletteCommand[] } = $props();

	let query = $state('');
	let selected = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	let filtered = $derived(
		commands.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
	);

	$effect(() => {
		if (store.paletteOpen) {
			query = '';
			selected = 0;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	$effect(() => {
		if (selected >= filtered.length) selected = Math.max(0, filtered.length - 1);
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			store.setPalette(false);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(selected + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(selected - 1, 0);
		} else if (e.key === 'Enter' && filtered[selected]) {
			e.preventDefault();
			store.setPalette(false);
			filtered[selected].run();
		}
	}

	function choose(cmd: PaletteCommand) {
		store.setPalette(false);
		cmd.run();
	}
</script>

{#if store.paletteOpen}
	<div
		class="palette-backdrop"
		role="presentation"
		onclick={() => store.setPalette(false)}
		onkeydown={() => {}}
	>
		<div
			class="palette"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-label="Command palette"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<div class="palette-input">
				<Icon name="search" size={16} />
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={onKeydown}
					placeholder="Type a command…"
					aria-label="Command search"
				/>
				<kbd>esc</kbd>
			</div>
			<div class="palette-list" role="listbox">
				{#each filtered as cmd, i (cmd.id)}
					<button
						class="palette-item"
						class:active={i === selected}
						role="option"
						aria-selected={i === selected}
						onmouseenter={() => (selected = i)}
						onclick={() => choose(cmd)}
					>
						<span>{cmd.title}</span>
						{#if cmd.hint}<kbd>{cmd.hint}</kbd>{/if}
					</button>
				{:else}
					<div class="palette-empty">No matching commands</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
