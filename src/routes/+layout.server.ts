import type { LayoutServerLoad } from './$types'
import { supabase } from '$lib/server/db'
import type { UserProfile } from '../app.d'

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession()
	
	let profile: UserProfile | null = null
	if (user) {
		const { data, error } = await supabase
			.from('user_profiles')
			.select('*')
			.eq('user_id', user.id)
			.single();
		if (error) {
			console.error('Failed to fetch user profile:', error.message);
		} else {
			profile = data as UserProfile || null;
		}
	}
	
	return { session, user, profile }
}
