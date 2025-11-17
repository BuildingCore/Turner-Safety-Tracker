import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { supabase } from '$lib/server/db'
import { randomUUID } from 'crypto'

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession()
	
	// If already logged in, redirect to dashboard
	if (session) {
		throw redirect(303, '/dashboard')
	}
	
	return { session, user }
}

export const actions: Actions = {
	signup: async ({ request, locals }) => {
		const formData = await request.formData()
		const fullName = formData.get('fullName') as string
		const jobTitle = formData.get('jobTitle') as string
		const email = formData.get('email') as string
		const password = formData.get('password') as string
		const confirmPassword = formData.get('confirmPassword') as string

		if (!fullName || !jobTitle || !email || !password || !confirmPassword) {
			return fail(400, { error: 'All fields are required', email, fullName, jobTitle })
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', email, fullName, jobTitle })
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters', email, fullName, jobTitle })
		}

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
		})

		if (error) {
			return fail(400, { error: error.message, email, fullName, jobTitle })
		}

		// Create user profile in local database
		if (data.user) {
			const { error: profileError } = await supabase
				.from('user_profiles')
				.insert({
					user_id: data.user.id,
					full_name: fullName,
					job_title: jobTitle
				});
			if (profileError) {
				console.error('Failed to create user profile:', profileError.message);
				// Continue anyway since the auth account was created
			}
		}

		return { success: true, message: 'Account created! Please check your email to verify your account.' }
	},
}
