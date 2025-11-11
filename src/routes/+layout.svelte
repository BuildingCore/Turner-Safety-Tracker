<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Navbar />
<Breadcrumb />

{@render children()}
