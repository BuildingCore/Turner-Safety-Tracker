import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll()
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				)
			},
		},
	})

	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error,
		} = await event.locals.supabase.auth.getUser()
		
		if (error || !user) {
			return { session: null, user: null }
		}

		// If we have a valid user, we can safely get the session
		// The session exists in cookies if getUser() succeeded
		const { data } = await event.locals.supabase.auth.getSession()

		return { session: data.session, user }
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		},
	})
}
