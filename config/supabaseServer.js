const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Supabase client environment variables are missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
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
