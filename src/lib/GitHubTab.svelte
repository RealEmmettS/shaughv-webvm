<script>
	import PanelButton from './PanelButton.svelte';
	import GitHubStarCount from 'labs/packages/astro-theme/components/nav/GitHubStarCount.svelte'
</script>

<h1 class="text-lg font-bold">GitHub</h1>
<PanelButton buttonImage="assets/github-mark-white.svg" clickUrl="https://github.com/RealEmmettS/shaughv-webvm" buttonText="GitHub repo">
	<i class='fas fa-star fa-xs ml-auto'></i>
	<span class="ml-1"><GitHubStarCount repo="RealEmmettS/shaughv-webvm"/></span>
</PanelButton>
<p>Like this project? <a class="underline" href="https://github.com/RealEmmettS/shaughv-webvm" target="_blank">Give it a star!</a></p>
<p>This is a fork of <a class="underline" href="https://github.com/leaningtech/webvm" target="_blank">leaningtech/webvm</a></p>
<p>Found a bug? Please open a <a class="underline" href="https://github.com/RealEmmettS/shaughv-webvm/issues" target="_blank">GitHub issue</a></p>
