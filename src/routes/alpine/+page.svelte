<script>
import { onMount } from 'svelte';
import WebVM from '$lib/WebVM.svelte';
import * as configObj from '/config_public_alpine';
import { tryPlausible } from '$lib/plausible.js';

let title = 'ShaughVM';

onMount(() => {
	let timeout;
	function cycle() {
		if (title === 'ShaughVM') {
			title = 'hellooooooooooooooo';
			timeout = setTimeout(cycle, 2000);
		} else {
			title = 'ShaughVM';
			timeout = setTimeout(cycle, 10000);
		}
	}
	timeout = setTimeout(cycle, 10000);
	return () => clearTimeout(timeout);
});

function handleProcessCreated(processCount)
{
	// Log only the first process, as a proxy for successful startup
	if(processCount == 1)
	{
		tryPlausible("Alpine init");
	}
}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<WebVM configObj={configObj} processCallback={handleProcessCreated} cacheId="blocks_alpine">
	<p>Looking for something different? Try the classic <a class="underline" href="https://shaughvm.com/" target="_blank">Debian Linux</a> terminal-based ShaughVM</p>
</WebVM>
