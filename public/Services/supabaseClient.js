import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

let supabaseInstance = null;

try {
    // 1. Synchronous Fetch of Configuration
    const request = new XMLHttpRequest();
    request.open('GET', '/api/public-config', false); // false = synchronous
    request.setRequestHeader('Accept', 'application/json');
    request.send(null);

    // 2. Validate Response
    if (request.status === 200) {
        const config = JSON.parse(request.responseText);
        
        if (config.supabaseUrl && config.supabaseAnonKey) {
            // 3. Create Client
            supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: {
                    storage: window.sessionStorage,
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });
        }
    } else {
        console.error("Backend Config Error: Status", request.status);
    }

} catch (error) {
    console.error("Supabase Client Init Failed:", error);
}

// 4. Fallback if initialization failed
if (!supabaseInstance) {
    // Show a visible error on screen so we know exactly what happened
    const body = document.querySelector('body');
    if (body) {
        body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #c53030; background: #fff5f5; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <h1 style="font-size: 2rem;">Connection Failed</h1>
                <p>Could not connect to the backend (api/public-config).</p>
                <p>Please check the console for the specific error.</p>
            </div>
        `;
    }
    // Create a dummy client to prevent "export not found" crashes
    supabaseInstance = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: new Error("Client failed to load") }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error("Client failed to load") }) }) }) })
    };
}

// 5. Export is now guaranteed to exist
export const supabase = supabaseInstance;