import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// We are hardcoding these to match your working repo method.
// This guarantees the client initializes immediately without waiting for the server.
const supabaseUrl = "https://jmnjkxfxenrudpvjprcu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbmpreGZ4ZW5ydWRwdmpwcmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODkzNzUsImV4cCI6MjA4MDc2NTM3NX0.X4ZdxzHF0b9GnHklObpIHqnhWvtKjdZnLoah0EVTvHs";

// --- Sanity Check ---
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase keys are missing!");
    throw new Error("Supabase credentials are missing");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Global auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    if (!window.location.pathname.includes('/auth/login')) {
      console.log('🔒 Session expired - redirecting to login');
      window.location.replace('/auth/login.html');
    }
  }
});
