import { Session, SupabaseClient, User } from '@supabase/supabase-js'

export interface UserProfile {
	id: string
	full_name: string
	job_title: string
	created_at: string
	updated_at: string
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>
		}
		interface PageData {
			session: Session | null
			user: User | null
			profile: UserProfile | null
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
