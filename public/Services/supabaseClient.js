import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';


const getEnv = (key) => {
    // 1. Check for Vite-style environment variables
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    // 2. Check for standard Node/Express style (rarely available in pure browser)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return "";
};

// Use the helper to resolve values
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

// --- Configuration Health Check ---
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase Client Error: Environment variables are missing.");
    
    if (typeof document !== 'undefined') {
        const body = document.querySelector('body');
        if (body) {
            const overlay = document.createElement('div');
            overlay.style.cssText = "padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff5f5; color: #c53030; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center;";
            overlay.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #feb2b2;">
                    <h1 style="margin: 0 0 1rem 0; font-size: 1.25rem;">Configuration Required</h1>
                    <p style="color: #4a5568; font-size: 0.9rem;">The Supabase connection variables could not be resolved.</p>
                    <p style="margin-top: 1rem; font-family: monospace; font-size: 0.75rem; background: #edf2f7; padding: 0.5rem; border-radius: 4px;">
                        Check: .env | Vercel Dash | Build Logs
                    </p>
                </div>
            `;
            body.appendChild(overlay);
        }
    }
    throw new Error("Missing Supabase credentials.");
}

// Initialize Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth Observer
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    if (!window.location.pathname.includes('/auth/login')) {
      window.location.replace('/auth/login.html');
    }
  }
});