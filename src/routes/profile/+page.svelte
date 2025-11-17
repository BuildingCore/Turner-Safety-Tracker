<script lang="ts">
	import type { PageData, ActionData } from './$types'
	import { enhance } from '$app/forms'
	import { invalidateAll } from '$app/navigation'
	
	let { data, form }: { data: PageData; form: ActionData } = $props()
	
	let fullName = $state(data.profile?.full_name || '')
	let jobTitle = $state(data.profile?.job_title || '')
	let isEditing = $state(false)
	
	// Update local state when data changes
	$effect(() => {
		fullName = data.profile?.full_name || ''
		jobTitle = data.profile?.job_title || ''
	})
</script>

<div class="container mx-auto p-8 max-w-2xl">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-3xl font-bold">My Profile</h1>
		<a href="/" class="btn btn-ghost btn-sm">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
			</svg>
			Back
		</a>
	</div>

	{#if form?.success}
		<div class="alert alert-success mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{form.message}</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{form.error}</span>
		</div>
	{/if}

	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-xl mb-4">Account Information</h2>
			
			<div class="space-y-4">
				<!-- Email (Read-only) -->
				<div class="form-control">
					<label class="label pb-1" for="email">
						<span class="label-text font-semibold">Email Address</span>
					</label>
					<input 
						type="email" 
						id="email"
						value={data.user?.email || ''} 
						class="input input-bordered w-full" 
						disabled 
					/>
					<span class="label label-text-alt text-base-content/70">Email cannot be changed</span>
				</div>

				<!-- Profile Form -->
				<form method="POST" action="?/updateProfile" use:enhance={() => {
					return async ({ update }) => {
						await update();
						await import('$app/navigation').then(mod => mod.invalidateAll());
						isEditing = false;
					};
				}}>
					<!-- Full Name -->
					<div class="form-control mb-4">
						<label class="label pb-1" for="fullName">
							<span class="label-text font-semibold">Full Name</span>
						</label>
						<input 
							type="text"
							id="fullName"
							name="fullName"
							bind:value={fullName}
							class="input input-bordered w-full"
							disabled={!isEditing}
							required
						/>
					</div>

					<!-- Job Title -->
					<div class="form-control mb-6">
						<label class="label pb-1" for="jobTitle">
							<span class="label-text font-semibold">Job Title</span>
						</label>
						<input 
							type="text"
							id="jobTitle"
							name="jobTitle"
							bind:value={jobTitle}
							class="input input-bordered w-full"
							disabled={!isEditing}
							required
						/>
					</div>

					<!-- Action Buttons -->
					<div class="flex gap-2">
						{#if isEditing}
							<button type="submit" class="btn btn-primary">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
									<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
								</svg>
								Save Changes
							</button>
							<button type="button" class="btn btn-ghost" onclick={() => {
								fullName = data.profile?.full_name || '';
								jobTitle = data.profile?.job_title || '';
								isEditing = false;
							}}>
								Cancel
							</button>
						{:else}
							<button type="button" class="btn btn-primary" onclick={() => isEditing = true}>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
									<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
								</svg>
								Edit Profile
							</button>
						{/if}
					</div>
				</form>
			</div>
			
			<!-- Profile Metadata -->
			{#if data.profile}
				<div class="divider"></div>
				<div class="text-xs text-base-content/70">
					<p>Profile created: {new Date(data.profile.created_at).toLocaleString()}</p>
					<p>Last updated: {new Date(data.profile.updated_at).toLocaleString()}</p>
				</div>
			{/if}
		</div>
	</div>
</div>
