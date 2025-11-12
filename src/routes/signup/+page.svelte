<script lang="ts">
	import type { ActionData } from './$types'
	
	let { form }: { form: ActionData } = $props()
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
	<div class="card w-96 bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-2xl font-bold text-center justify-center">Sign Up</h2>
			
			{#if form?.error}
				<div class="alert alert-error">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{form.error}</span>
				</div>
			{/if}
			
			{#if form?.success}
				<div class="alert alert-success">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{form.message}</span>
				</div>
			{/if}
			
			<form method="POST" action="?/signup" class="space-y-4">
				<div class="form-control">
					<label class="label" for="fullName">
						<span class="label-text">Full Name</span>
					</label>
					<input
						type="text"
						id="fullName"
						name="fullName"
						placeholder="John Doe"
						class="input input-bordered"
						value={form?.fullName ?? ''}
						required
					/>
				</div>
				
				<div class="form-control">
					<label class="label" for="jobTitle">
						<span class="label-text">Job Title</span>
					</label>
					<input
						type="text"
						id="jobTitle"
						name="jobTitle"
						placeholder="Safety Manager"
						class="input input-bordered"
						value={form?.jobTitle ?? ''}
						required
					/>
				</div>
				
				<div class="form-control">
					<label class="label" for="email">
						<span class="label-text">Email</span>
					</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder="email@example.com"
						class="input input-bordered"
						value={form?.email ?? ''}
						required
					/>
				</div>
				
				<div class="form-control">
					<label class="label" for="password">
						<span class="label-text">Password</span>
					</label>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="••••••••"
						class="input input-bordered"
						required
					/>
					<label class="label">
						<span class="label-text-alt">At least 6 characters</span>
					</label>
				</div>
				
				<div class="form-control">
					<label class="label" for="confirmPassword">
						<span class="label-text">Confirm Password</span>
					</label>
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						placeholder="••••••••"
						class="input input-bordered"
						required
					/>
				</div>
				
				<div class="form-control mt-6">
					<button type="submit" class="btn btn-primary">Sign Up</button>
				</div>
			</form>
			
			<div class="divider">OR</div>
			
			<div class="text-center">
				<p class="text-sm">
					Already have an account?
					<a href="/login" class="link link-primary">Login</a>
				</p>
			</div>
		</div>
	</div>
</div>
