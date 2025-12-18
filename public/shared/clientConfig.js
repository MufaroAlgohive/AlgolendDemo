const loadClientConfig = () => {
    try {
        const request = new XMLHttpRequest();
        request.open('GET', '/api/public-config', false);
        request.setRequestHeader('Accept', 'application/json');
        request.send(null);

        if (request.status >= 200 && request.status < 400) {
            const payload = JSON.parse(request.responseText || '{}');

            if (!payload.supabaseUrl || !payload.supabaseAnonKey) {
                throw new Error('Supabase configuration missing from server response.');
            }

            return payload;
        }

        throw new Error(`Failed to fetch client configuration (status ${request.status}).`);
    } catch (error) {
        console.error('Unable to load client configuration:', error);

        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff5f5; color: #c53030; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
                    <h1 style="font-size: 1.5rem; font-weight: bold;">Configuration Error</h1>
                    <p>We could not securely load the environment configuration. Please verify the backend <code>/api/public-config</code> endpoint.</p>
                </div>
            `;
        }

        throw error;
    }
};

// Synchronous request ensures configuration is ready before dependent modules run.
export const clientConfig = loadClientConfig();

export const getClientConfigValue = (key, fallback = null) => {
    if (!clientConfig || typeof clientConfig !== 'object') {
        return fallback;
    }

    return key in clientConfig ? clientConfig[key] : fallback;
};
