import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// 1. Pull variables from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Pro-Level Sanity Check
if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = !supabaseUrl ? "VITE_SUPABASE_URL is missing" : "VITE_SUPABASE_ANON_KEY is missing";
    console.error(`❌ Supabase Configuration Error: ${errorMessage}`);

    // Visual error overlay for faster debugging on live/preview builds
    if (typeof document !== 'undefined') {
        const body = document.querySelector('body');
        if (body) {
            const overlay = document.createElement('div');
            overlay.style.cssText = "padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff5f5; color: #c53030; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center;";
            overlay.innerHTML = `
                <h1 style="font-size: 1.8rem; font-weight: bold; margin-bottom: 1rem;">Admin Configuration Error</h1>
                <p style="font-size: 1.1rem; max-width: 600px;">
                    The environment variables <strong>VITE_SUPABASE_URL</strong> or <strong>VITE_SUPABASE_ANON_KEY</strong> were not found during the build process.
                </p>
                <div style="margin-top: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #feb2b2; border-radius: 8px; text-align: left; font-family: monospace;">
                    <p><strong>Common Fixes:</strong></p>
                    <ul style="margin-left: 1.5rem;">
                        <li>Ensure .env exists in /public/admin/ during build.</li>
                        <li>Prefix keys with <strong>VITE_</strong> in Vercel settings.</li>
                        <li>Run 'npm run build' inside the admin folder before pushing.</li>
                    </ul>
                </div>
            `;
            body.appendChild(overlay);
        }
    }
}

// 3. Initialize Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// 4. Global Auth Observer
// Automatically kicks user to login if the session is lost or invalid
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        if (!window.location.pathname.includes('/auth/login')) {
            console.log('🔒 Session invalid or expired - redirecting to login');
            window.location.replace('/auth/login.html');
        }
    }
});