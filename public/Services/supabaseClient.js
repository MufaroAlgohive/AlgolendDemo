import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// Internal function to load config synchronously
const loadConfig = () => {
    try {
        const request = new XMLHttpRequest();
        // Request the config from your backend
        request.open('GET', '/api/public-config', false); // false = synchronous
        request.setRequestHeader('Accept', 'application/json');
        request.send(null);

        if (request.status === 200) {
            return JSON.parse(request.responseText);
        }
    } catch (e) {
        console.error("Config load failed", e);
    }
    return null;
};

// 1. Load the keys
const config = loadConfig();

// 2. Safety Check (This prevents the "Export Missing" error)
const supabaseUrl = config?.supabaseUrl;
const supabaseAnonKey = config?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Failed to load Supabase config from /api/public-config");
    // Show a visible error on the white screen
    document.body.innerHTML = `
        <div style="color:red; padding:20px; text-align:center; font-family:sans-serif;">
            <h1>Connection Error</h1>
            <p>Could not load backend configuration.</p>
            <p>Check the console for details.</p>
        </div>`;
    throw new Error("Supabase Configuration Missing");
}

// 3. Create and Export Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});