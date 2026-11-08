<script lang="ts">
	import { renderMarkdown } from '$lib/markdown/render';

	let {
		content,
		onToggleTask
	}: {
		content: string;
		onToggleTask: (index: number) => void;
	} = $props();

	let html = $derived(renderMarkdown(content));

	function handleClick(e: MouseEvent) {
		const target = e.target;
		if (
			target instanceof HTMLInputElement &&
			target.classList.contains('task-list-item-checkbox')
		) {
			e.preventDefault();
			const boxes = (e.currentTarget as HTMLElement).querySelectorAll(
				'.task-list-item-checkbox'
			);
			onToggleTask(Array.from(boxes).indexOf(target));
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="preview-pane markdown-body" onclick={handleClick} role="document">
	{@html html}
</div>
