<script>
	export let icon;
	export let info;
	export let activity;
	export let isFA = false;
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	function handleMouseover() {
		dispatch('mouseover', info);
	}
	function handleClick() {
		dispatch('click', { icon, info });
	}
</script>

<div
	class="p-3 cursor-pointer text-center hover:bg-neutral-600 {$activity ? 'animate-pulse' : 'hover:text-gray-100'}"
	style="animation-duration: 0.5s"
	on:mouseenter={handleMouseover}
	on:click={handleClick}
>
	{#if isFA}
		<i class='{icon} fa-xl {$activity ? "text-amber-500" : ""}'></i>
	{:else}
		<img
			src={icon}
			alt=""
			class="w-6 h-6 mx-auto"
			style={$activity ? "filter: drop-shadow(0 0 4px #f59e0b);" : ""}
		/>
	{/if}
</div>
