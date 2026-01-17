<script>
import { onMount } from 'svelte';
import WebVM from '$lib/WebVM.svelte';
import * as configObj from '/config_terminal';
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
	// Log the first 5 processes, to get an idea of the level of interaction from the public
	if(processCount <= 5)
	{
		tryPlausible(`Process started: ${processCount}`);
	}
}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<WebVM configObj={configObj} processCallback={handleProcessCreated} cacheId="blocks_terminal">
	<p>Looking for a complete desktop experience? Try the <a class="underline" href="https://shaughvm.com/alpine" target="_blank">Alpine Linux</a> graphical ShaughVM</p>
</WebVM>
