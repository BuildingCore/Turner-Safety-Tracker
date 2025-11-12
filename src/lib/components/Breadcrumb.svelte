<script lang="ts">
  import { page } from '$app/stores';
  import { breadcrumbLabels } from '$lib/breadcrumb-labels';
  
  interface BreadcrumbItem {
    label: string;
    href: string;
  }
  
  const breadcrumbs = $derived(() => {
    const path = $page.url.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Don't show breadcrumbs on home page
    if (segments.length === 0) return [];
    
    const crumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];
    
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Use custom label if available, otherwise format segment
      const label = breadcrumbLabels[currentPath] || 
        segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      
      crumbs.push({
        label,
        href: currentPath
      });
    });
    
    return crumbs;
  });
</script>

{#if breadcrumbs().length > 0 && $page.url.pathname !== '/profile'}
  <div class="breadcrumbs text-sm px-6 py-4">
    <ul>
      {#each breadcrumbs() as crumb, index}
        <li>
          {#if index === breadcrumbs().length - 1}
            <span class="font-semibold">{crumb.label}</span>
          {:else}
            <a href={crumb.href} class="hover:underline">{crumb.label}</a>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}