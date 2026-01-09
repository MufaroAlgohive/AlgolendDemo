import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || "https://itnmsmxzkizlnoaurxsj.supabase.co";
const supabaseAnonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bm1zbXh6a2l6bG5vYXVyeHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODAxNTksImV4cCI6MjA4MTU1NjE1OX0.10VO8HUxbGSqSK0_qiLBS0J9_HCpWKKZi6BXZlzCtlo";

// --- Sanity Check ---
// This check ensures the variables are filled.
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    // A more visible error for the user in case keys are still missing.
    const body = document.querySelector('body');
    if (body) {
        body.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff5f5; color: #c53030; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
                <h1 style="font-size: 1.5rem; font-weight: bold;">Configuration Error</h1>
                <p>Your Supabase URL and Key are not set correctly. Please update them in <strong>js/shared/supabaseClient.js</strong>.</p>
            </div>
        `;
    }
    throw new Error("Supabase credentials are missing or are still placeholders!");
}

// Create and export the Supabase client with session-only storage
// This ensures tokens are cleared when browser closes (production security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Session expires on browser close
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Global auth state listener - logs out admin if session becomes invalid
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
    // Only redirect if we're not already on login page
    if (!window.location.pathname.includes('/auth/login')) {
      console.log('🔒 Admin session expired - redirecting to login');
      window.location.replace('/auth/login.html');
    }
  }
});
