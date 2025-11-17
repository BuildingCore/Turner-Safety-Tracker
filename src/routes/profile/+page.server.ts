import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { supabase } from '$lib/server/db'

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession()
	
	if (!session) {
		throw redirect(303, '/login')
	}
	
	// Fetch profile from Supabase
	let profile = null;
	if (user) {
			const { data, error } = await supabase
				.from('user_profiles')
				.select('*')
			.eq('user_id', user.id)
				.single();
		if (error) {
			console.error('Failed to fetch user profile:', error.message);
		} else {
			profile = data || null;
		}
	}
	
	return { session, user, profile }
}

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { error: 'You must be logged in to update your profile' });
		}
		// Fetch user_profile by auth id
			const { data: profile } = await supabase
				.from('user_profiles')
				.select('id')
				.eq('id', user.id)
				.single();
		if (!profile) {
			return fail(404, { error: 'User profile not found' });
		}
		const formData = await request.formData();
		const fullName = formData.get('fullName') as string;
		const jobTitle = formData.get('jobTitle') as string;
		if (!fullName || !jobTitle) {
			return fail(400, { error: 'Full name and job title are required', fullName, jobTitle });
		}
		const { error: updateError, data: updateData } = await supabase
			.from('user_profiles')
			.update({
				full_name: fullName,
				job_title: jobTitle,
				updated_at: new Date().toISOString()
			})
			.eq('user_id', user.id);
		if (updateError) {
			console.error('Failed to update profile:', updateError.message);
			return fail(500, { error: 'Failed to update profile' });
		}
		if (!updateData) {
			return fail(404, { error: 'Profile not found' });
		}
		return { success: true, message: 'Profile updated successfully!' };
	},
};
