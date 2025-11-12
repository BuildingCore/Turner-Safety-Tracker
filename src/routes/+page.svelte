
<script lang="ts">
	import type { PageData } from './$types'
	
	let { data }: { data: PageData } = $props()
</script>

<div class="grid grid-cols-1 place-items-center gap-6 mt-20">
        <h1 class="text-2xl font-bold">Welcome Turner to the Safety Tracker</h1>
        
        {#if data.session}
            <a href="/dashboard">
                <button class="btn btn-secondary">Subcontractor Safety Dashboard</button>
            </a>
            <a href="/srmp">
                <button class="btn btn-error">Safety Risk Management Plan</button>
            </a>
        {:else}
            <div class="text-center">
                <p class="text-lg mb-4">Please log in to access the Safety Tracker features</p>
            </div>
        {/if}
</div>