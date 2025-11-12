import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession()
	
	// If already logged in, redirect to dashboard
	if (session) {
		throw redirect(303, '/dashboard')
	}
	
	return { session, user }
}

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const formData = await request.formData()
		const email = formData.get('email') as string
		const password = formData.get('password') as string

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email })
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) {
			return fail(400, { error: error.message, email })
		}

		throw redirect(303, '/dashboard')
	},
}
