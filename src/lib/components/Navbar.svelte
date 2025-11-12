<script lang="ts">
	import type { LayoutData } from '../../routes/$types'
	
	let { data }: { data: LayoutData } = $props()
</script>

<div class="navbar bg-base-100 shadow-sm">
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">Turner Safety Tracker</a>
  </div>
  <div class="flex-none gap-2">
    {#if data.session}
      <div class="dropdown dropdown-end me-12">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
          <div class="bg-neutral text-neutral-content w-10 rounded-lg flex items-center justify-center">
            <span class="text-xl">{data.user?.email?.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <ul class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
          <li class="menu-title">{data.user?.email}</li>
          <li>
            <a href="/profile">
              Profile
            </a>
          </li>
          <li>
            <form method="POST" action="/?/logout">
              <button type="submit" class="w-full text-left">
                Logout
              </button>
            </form>
          </li>
        </ul>
      </div>
    {:else}
      <a href="/login" class="btn btn-primary btn-sm">Login</a>
      <a href="/signup" class="btn btn-accent btn-sm">Sign Up</a>
    {/if}
  </div>
</div>