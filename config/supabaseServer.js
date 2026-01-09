const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (must be set via environment variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Validate that required credentials are set
if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
	process.exit(1);
}

// Create Supabase client for server-side operations
// Note: Using anon key - RLS policies must allow inserts
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseStorage = createClient(supabaseUrl, supabaseServiceRoleKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key for storage operations.');
}

const createAuthedClient = (accessToken) => {
	if (!accessToken) {
		return supabase;
	}

	return createClient(supabaseUrl, supabaseAnonKey, {
		global: {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	});
};

module.exports = { supabase, supabaseStorage, supabaseService, createAuthedClient };
