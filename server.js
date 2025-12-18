const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
// Your .env config is correct
require('dotenv').config({ path: path.join(__dirname, 'public', 'user', '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json({
    verify: (req, res, buf) => {
        const url = req.originalUrl || '';
        if (url.startsWith('/api/docuseal/webhook')) {
            req.rawBody = Buffer.from(buf);
        }
    }
}));
 
// --- User Portal API routes (Your code) ---
const tillSlipRoute = require('./public/user/routes/tillSlipRoute');
const bankStatementRoute = require('./public/user/routes/bankStatementRoute');
const idcardRoute = require('./public/user/routes/idcardRoute');
const kyc = require(path.join(__dirname, 'public', 'user', 'kycService'));
const creditCheckService = require('./services/creditCheckService');
const { supabase, supabaseService } = require('./config/supabaseServer');
const { startNotificationScheduler } = require('./services/notificationScheduler');

const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY;
const DOCUSEAL_TEMPLATE_ID = process.env.DOCUSEAL_TEMPLATE_ID;
const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.com';

const isDocuSealReady = () => Boolean(DOCUSEAL_API_KEY && DOCUSEAL_TEMPLATE_ID);

const docuSealHeaders = {
    'Content-Type': 'application/json',
    'X-Auth-Token': DOCUSEAL_API_KEY || ''
};

const DEFAULT_AUTH_OVERLAY_COLOR = '#EA580C';

const DEFAULT_CAROUSEL_SLIDES = [
    {
        title: 'A Leap to\nFinancial Freedom',
        text: 'We offer credit of up to R200,000, with repayment terms extending up to a maximum of 36 months.'
    },
    {
        title: 'Flexible Repayments',
        text: "Repayment terms are tailored to each client's cash flow, risk profile, and agreed-upon conditions."
    },
    {
        title: 'Save on Interest',
        text: 'Our interest rates and fees are highly competitive, ensuring great value for our clients.'
    }
];

const DEFAULT_SYSTEM_SETTINGS = {
    id: 'global',
    primary_color: '#E7762E',
    secondary_color: '#F97316',
    tertiary_color: '#FACC15',
    theme_mode: 'light',
    company_logo_url: null,
    auth_background_url: null,
    auth_background_flip: false,
    auth_overlay_color: DEFAULT_AUTH_OVERLAY_COLOR,
    auth_overlay_enabled: true,
    carousel_slides: DEFAULT_CAROUSEL_SLIDES.map((slide) => ({ ...slide }))
};

const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
    }
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    return fallback;
};

const buildClientSafeEnv = () => ({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    docuSealTemplateId: process.env.VITE_DOCUSEAL_TEMPLATE_ID || process.env.DOCUSEAL_TEMPLATE_ID || '',
    docuSealEnabled: normalizeBoolean(process.env.VITE_DOCUSEAL_ENABLED, false)
});

app.get('/api/public-config', (req, res) => {
    try {
        const clientConfig = buildClientSafeEnv();

        if (!clientConfig.supabaseUrl || !clientConfig.supabaseAnonKey) {
            return res.status(500).json({
                error: 'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
            });
        }

        res.set('Cache-Control', 'no-store, max-age=0');
        return res.json(clientConfig);
    } catch (error) {
        console.error('Public config request failed:', error.message || error);
        return res.status(500).json({ error: 'Unable to load client configuration' });
    }
});

const normalizeHexColor = (value, fallback) => {
    if (!value) return fallback;
    let hex = `${value}`.trim().replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map((char) => char + char).join('');
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return fallback;
    }
    return `#${hex.toUpperCase()}`;
};

const sanitizeSlide = (slide = {}, fallback = {}) => {
    const safeTitle = typeof slide.title === 'string' ? slide.title.trim() : '';
    const safeText = typeof slide.text === 'string' ? slide.text.trim() : '';
    return {
        title: safeTitle || fallback.title,
        text: safeText || fallback.text
    };
};

const normalizeCarouselSlides = (slides) => {
    const incoming = Array.isArray(slides) ? slides : [];
    return DEFAULT_CAROUSEL_SLIDES.map((fallback, index) => sanitizeSlide(incoming[index] || {}, fallback));
};

const hydrateSystemSettings = (settings = {}) => ({
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
    auth_background_flip: normalizeBoolean(settings?.auth_background_flip, DEFAULT_SYSTEM_SETTINGS.auth_background_flip),
    auth_overlay_color: normalizeHexColor(settings?.auth_overlay_color, DEFAULT_SYSTEM_SETTINGS.auth_overlay_color),
    auth_overlay_enabled: normalizeBoolean(settings?.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled),
    carousel_slides: normalizeCarouselSlides(settings.carousel_slides)
});

const THEME_CACHE_TTL_MS = 60 * 1000;
let cachedSystemSettings = {
    data: hydrateSystemSettings(),
    timestamp: 0
};

async function loadSystemSettings(forceRefresh = false) {
    const now = Date.now();
    const isCacheFresh = now - cachedSystemSettings.timestamp < THEME_CACHE_TTL_MS;
    if (!forceRefresh && isCacheFresh) {
        return cachedSystemSettings.data;
    }

    try {
        const { data, error } = await supabaseService
            .from('system_settings')
            .select('*')
            .eq('id', 'global')
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const theme = hydrateSystemSettings(data);
        cachedSystemSettings = { data: theme, timestamp: now };
        return theme;
    } catch (error) {
        console.error('System settings fetch failed:', error.message || error);
        return cachedSystemSettings.data;
    }
}

async function docuSealRequest(method, endpoint, data) {
    if (!isDocuSealReady()) {
        throw new Error('DocuSeal configuration missing');
    }

    return axios({
        method,
        url: `${DOCUSEAL_API_URL}${endpoint}`,
        headers: docuSealHeaders,
        data
    });
}

function buildDocuSealSubmission(applicationData = {}, profileData = {}) {
    return {
        template_id: parseInt(DOCUSEAL_TEMPLATE_ID, 10),
        send_email: true,
        submitters: [
            {
                role: 'Borrower',
                email: profileData.email,
                name: profileData.full_name,
                values: {
                    borrower_name: profileData.full_name,
                    borrower_email: profileData.email,
                    borrower_phone: profileData.contact_number || '',
                    borrower_id: profileData.id,
                    loan_amount: applicationData.requested_amount?.toString() || '0',
                    interest_rate: applicationData.interest_rate?.toString() || '20',
                    loan_term: applicationData.term_months?.toString() || '1',
                    monthly_payment: applicationData.monthly_payment?.toString() || '0',
                    total_repayment: applicationData.total_repayment?.toString() || '0',
                    application_id: applicationData.id,
                    application_date: applicationData.created_at
                        ? new Date(applicationData.created_at).toLocaleDateString('en-ZA')
                        : '',
                    contract_date: new Date().toLocaleDateString('en-ZA'),
                    first_payment_date: applicationData.start_date
                        ? new Date(applicationData.start_date).toLocaleDateString('en-ZA')
                        : ''
                },
                metadata: {
                    application_id: applicationData.id,
                    user_id: profileData.id,
                    loan_amount: applicationData.requested_amount
                }
            }
        ],
        metadata: {
            application_id: applicationData.id,
            user_id: profileData.id,
            loan_amount: applicationData.requested_amount,
            status: 'sent'
        }
    };
}

function handleDocuSealError(error, res) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'DocuSeal request failed';

    console.error('DocuSeal API error:', message, error.response?.data || '');
    return res.status(status).json({ error: message, details: error.response?.data });
}

app.use('/api/tillslip', tillSlipRoute);
app.use('/api/bankstatement', bankStatementRoute);
app.use('/api/idcard', idcardRoute);

app.get('/api/system-settings', async (req, res) => {
    try {
        const forceRefresh = ['true', '1'].includes((req.query.refresh || '').toString());
        const theme = await loadSystemSettings(forceRefresh);
        return res.json({
            data: theme,
            updated_at: cachedSystemSettings.timestamp,
            cache_ttl_ms: THEME_CACHE_TTL_MS
        });
    } catch (error) {
        console.error('System settings API error:', error);
        return res.status(200).json({
            data: cachedSystemSettings.data,
            fallback: true
        });
    }
});

// KYC API routes
app.post('/api/kyc/create-session', async (req, res) => {
    try {
        const result = await kyc.createSession(req.body);
        return res.json(result);
    } catch (error) {
        console.error('KYC session error:', error);
        return res.status(500).json({ error: error.message || 'Unable to create KYC session' });
    }
});

app.post('/api/kyc/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-signature'];
        const payload = req.body;

        if (!signature || !kyc.verifyWebhookSignature(payload, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        kyc.updateSessionFromWebhook(payload);
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('KYC webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
});

app.get('/api/kyc/session/:sessionId', async (req, res) => {
    try {
        const result = await kyc.getSessionStatus(req.params.sessionId);
        return res.json(result);
    } catch (error) {
        console.error('KYC session lookup error:', error);
        return res.status(404).json({ error: 'Session not found' });
    }
});

app.get('/api/kyc/user/:userId/status', async (req, res) => {
    try {
        const result = await kyc.getUserKycStatus(req.params.userId);
        return res.json(result);
    } catch (error) {
        console.error('KYC status error:', error);
        return res.status(500).json({ error: 'Unable to fetch KYC status' });
    }
});

// Credit Check API endpoint
app.post('/api/credit-check', async (req, res) => {
    try {
        const { applicationId, userData } = req.body;

        if (!applicationId || !userData) {
            return res.status(400).json({ error: 'applicationId and userData are required' });
        }

        const authHeader = req.headers.authorization || '';
        const authToken = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : null;

        const result = await creditCheckService.performCreditCheck(
            userData,
            applicationId,
            authToken
        );

        return res.json(result);
    } catch (error) {
        console.error('Credit check error:', error);
        return res.status(500).json({ error: error.message || 'Credit check failed' });
    }
});

// Notification testing endpoints (development only)
const notificationScheduler = require('./services/notificationScheduler');

app.post('/api/notifications/check-payments', async (req, res) => {
    try {
        await notificationScheduler.checkPaymentDueNotifications();
        return res.json({ success: true, message: 'Payment due notifications checked' });
    } catch (error) {
        console.error('Error checking payment notifications:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/check-edit-window', async (req, res) => {
    try {
        await notificationScheduler.checkEditWindowNotifications();
        return res.json({ success: true, message: 'Edit window notifications checked' });
    } catch (error) {
        console.error('Error checking edit window notifications:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Loan affordability calculation endpoint
app.post('/api/calculate-affordability', (req, res) => {
    try {
        const {
            monthly_income,
            affordability_percent = 20, // Default 20%
            annual_interest_rate = 20, // Default 20% APR
            loan_term_months = 1 // Default 1 month
        } = req.body;

        if (!monthly_income || monthly_income <= 0) {
            return res.status(400).json({ error: 'Valid monthly_income is required' });
        }

        // 1. Maximum monthly repayment (13% of income)
        const max_monthly_payment = monthly_income * (affordability_percent / 100);

        // 2. Monthly interest rate (APR / 12)
        const monthly_rate = (annual_interest_rate / 100) / 12;

        // 3. Amortized loan amount formula
        // Formula: P = M * [(1 - (1 + r)^-n) / r]
        // Where: P = Principal (loan amount), M = Monthly payment, r = monthly rate, n = number of months
        const loan_amount = monthly_rate > 0
            ? max_monthly_payment * (1 - Math.pow(1 + monthly_rate, -loan_term_months)) / monthly_rate
            : max_monthly_payment * loan_term_months; // If rate is 0, simple calculation

        return res.json({
            max_monthly_payment: Number(max_monthly_payment.toFixed(2)),
            affordability_threshold: Number(max_monthly_payment.toFixed(2)),
            max_loan_amount: Number(loan_amount.toFixed(2)),
            monthly_rate: Number((monthly_rate * 100).toFixed(4)),
            annual_interest_rate,
            loan_term_months,
            affordability_percent
        });
    } catch (error) {
        console.error('Affordability calculation error:', error);
        return res.status(500).json({ error: error.message || 'Calculation failed' });
    }
});

// DocuSeal proxy endpoints
app.get('/api/docuseal/config', (req, res) => {
    return res.json({
        configured: isDocuSealReady(),
        templateId: isDocuSealReady() ? DOCUSEAL_TEMPLATE_ID : null
    });
});

app.post('/api/docuseal/send-contract', async (req, res) => {
    if (!isDocuSealReady()) {
        return res.status(503).json({ error: 'DocuSeal integration is not configured' });
    }

    const { applicationData, profileData } = req.body || {};
    if (!applicationData || !profileData) {
        return res.status(400).json({ error: 'applicationData and profileData are required' });
    }

    try {
        const payload = buildDocuSealSubmission(applicationData, profileData);
        const response = await docuSealRequest('post', '/submissions', payload);
        return res.json(response.data);
    } catch (error) {
        return handleDocuSealError(error, res);
    }
});

app.get('/api/docuseal/submissions/:submissionId', async (req, res) => {
    if (!isDocuSealReady()) {
        return res.status(503).json({ error: 'DocuSeal integration is not configured' });
    }

    try {
        const response = await docuSealRequest('get', `/submissions/${req.params.submissionId}`);
        return res.json(response.data);
    } catch (error) {
        return handleDocuSealError(error, res);
    }
});

app.get('/api/docuseal/submitters/:submitterId', async (req, res) => {
    if (!isDocuSealReady()) {
        return res.status(503).json({ error: 'DocuSeal integration is not configured' });
    }

    try {
        const response = await docuSealRequest('get', `/submitters/${req.params.submitterId}`);
        return res.json(response.data);
    } catch (error) {
        return handleDocuSealError(error, res);
    }
});

app.put('/api/docuseal/submitters/:submitterId', async (req, res) => {
    if (!isDocuSealReady()) {
        return res.status(503).json({ error: 'DocuSeal integration is not configured' });
    }

    try {
        const payload = { send_email: true, ...(req.body || {}) };
        const response = await docuSealRequest('put', `/submitters/${req.params.submitterId}`, payload);
        return res.json(response.data);
    } catch (error) {
        return handleDocuSealError(error, res);
    }
});

app.delete('/api/docuseal/submissions/:submissionId', async (req, res) => {
    if (!isDocuSealReady()) {
        return res.status(503).json({ error: 'DocuSeal integration is not configured' });
    }

    try {
        const response = await docuSealRequest('delete', `/submissions/${req.params.submissionId}`);
        return res.json(response.data);
    } catch (error) {
        return handleDocuSealError(error, res);
    }
});

// DocuSeal Webhook Receiver – updates docuseal_submissions when DocuSeal sends events
app.post('/api/docuseal/webhook', async (req, res) => {
    try {
        // Verify webhook signature if secret is configured
        const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
        if (secret) {
            const sigHeader = (req.headers['x-docuseal-signature'] || req.headers['x-signature'] || req.headers['x-hub-signature'] || '').toString();
            if (!sigHeader) {
                // Allow a simple test header fallback (not secure) during debugging if configured
                const testHeaderName = process.env.DOCUSEAL_TEST_HEADER_NAME || '';
                const testHeaderValue = process.env.DOCUSEAL_TEST_HEADER_VALUE || '';
                if (testHeaderName && testHeaderValue) {
                    const incoming = req.headers[testHeaderName.toLowerCase()];
                    if (incoming && incoming === testHeaderValue) {
                        console.log('Accepted DocuSeal webhook via custom test header', testHeaderName);
                        // treat as valid and skip HMAC validation
                    } else {
                        console.warn('Missing DocuSeal signature header and test header did not match', {
                            expectedTestHeader: testHeaderName,
                            headers: req.headers,
                            rawBodyLength: req.rawBody ? req.rawBody.length : 0,
                            bodySample: (() => {
                                try { return JSON.stringify(req.body).slice(0, 1000); } catch (e) { return '<non-serializable body>'; }
                            })()
                        });
                        return res.status(401).json({ error: 'Missing signature header' });
                    }
                } else {
                    // Log full headers + small body sample to help debug what DocuSeal is sending
                    console.warn('Missing DocuSeal signature header', {
                        headers: req.headers,
                        rawBodyLength: req.rawBody ? req.rawBody.length : 0,
                        bodySample: (() => {
                            try { return JSON.stringify(req.body).slice(0, 1000); } catch (e) { return '<non-serializable body>'; }
                        })()
                    });
                    return res.status(401).json({ error: 'Missing signature header' });
                }
            }

            // Strip common prefix (e.g. 'sha256=') if present
            let received = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader;

            // Compute expected digests
            const computedHex = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.from('')).digest('hex');
            const computedBase64 = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.from('')).digest('base64');

            let valid = false;
            try {
                // Try hex comparison (timing-safe)
                const rec = Buffer.from(received, 'hex');
                const comp = Buffer.from(computedHex, 'hex');
                if (rec.length === comp.length && crypto.timingSafeEqual(rec, comp)) valid = true;
            } catch (e) {}
            try {
                // Try base64 comparison (timing-safe)
                const recB = Buffer.from(received, 'base64');
                const compB = Buffer.from(computedBase64, 'base64');
                if (recB.length === compB.length && crypto.timingSafeEqual(recB, compB)) valid = true;
            } catch (e) {}
            // Fallback string compare for plain header formats
            if (received === computedHex || received === computedBase64) valid = true;

            if (!valid) {
                console.warn('Invalid DocuSeal webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const payload = req.body || {};
        const eventType = payload.event_type || payload.type || '';
        const data = payload.data || payload;

        console.log('DocuSeal webhook received:', eventType, data?.id || data?.submission_id || 'no-id');

        const now = new Date().toISOString();

        const updateBySubmitter = async (fields) => {
            if (!data?.id) return;
            await supabase
                .from('docuseal_submissions')
                .update({ ...fields, updated_at: now })
                .eq('submitter_id', data.id);
        };

        const updateBySubmission = async (fields) => {
            const submissionId = data?.id || data?.submission_id;
            if (!submissionId) return;
            await supabase
                .from('docuseal_submissions')
                .update({ ...fields, updated_at: now })
                .eq('submission_id', submissionId);
        };

        switch (eventType) {
            case 'form.viewed':
                await updateBySubmitter({ status: 'opened', opened_at: data.opened_at || now });
                break;
            case 'form.started':
                await updateBySubmitter({ status: 'started' });
                break;
            case 'form.completed':
                await updateBySubmitter({ status: 'completed', completed_at: data.completed_at || now, metadata: data.values || data.metadata || {} });
                // After a submitter completes the form, mark the related application as Contract Signed (step 5)
                try {
                    const applicationId = data?.metadata?.application_id || data?.application_id || data?.submission?.metadata?.application_id || data?.submission?.application_id || null;
                    if (applicationId) {
                        await supabase
                            .from('loan_applications')
                            .update({ status: 'OFFER_ACCEPTED', contract_signed_at: now })
                            .eq('id', applicationId);
                        console.log('DocuSeal: set application', applicationId, 'to OFFER_ACCEPTED');
                    }
                } catch (err) {
                    console.error('Error updating application status after DocuSeal completed:', err);
                }
                break;
            case 'form.declined':
                try {
                    // Mark the submitter row as declined (use submitter id present in data.id)
                    await updateBySubmitter({ status: 'declined', declined_at: data.declined_at || now, metadata: data.values || data.metadata || {} });

                    // Also update any submission-level rows by submission.id if available
                    const submissionId = data.submission?.id || data.submission_id;
                    if (submissionId) {
                        await supabase
                            .from('docuseal_submissions')
                            .update({ status: 'declined', declined_at: data.declined_at || now, updated_at: now })
                            .eq('submission_id', submissionId);
                    }
                } catch (error) {
                    console.error('DocuSeal form.declined handling error:', error);
                }
                break;
            case 'submission.archived':
                await updateBySubmission({ status: 'archived', archived_at: data.archived_at || now });
                break;
            case 'submission.created':
                try {
                    const submitters = data.submitters || [];
                    for (const submitter of submitters) {
                        await supabase
                            .from('docuseal_submissions')
                            .upsert({
                                application_id: data.metadata?.application_id || data.application_id || null,
                                submission_id: data.id || data.submission_id || null,
                                submitter_id: submitter.id,
                                slug: submitter.slug || null,
                                status: submitter.status || 'pending',
                                email: submitter.email || null,
                                name: submitter.name || null,
                                role: submitter.role || null,
                                embed_src: submitter.embed_src || null,
                                sent_at: submitter.sent_at || now,
                                metadata: submitter.metadata || {},
                                created_at: submitter.created_at || data.created_at || now,
                                updated_at: now
                            }, { onConflict: 'submitter_id' });
                    }
                } catch (error) {
                    console.error('DocuSeal webhook upsert error:', error);
                }
                break;
            // Handle updates where submitter status changes (e.g. declined) or submission metadata updates
            case 'submitter.updated':
            case 'submitter.status_changed':
            case 'submission.updated':
            case 'submission.declined':
            case 'submitter.declined':
            case 'form.declined':
                try {
                    // If submitters array provided, upsert each submitter (status may have changed)
                    const submitters = data.submitters || [];
                    if (submitters.length > 0) {
                        for (const submitter of submitters) {
                            await supabase
                                .from('docuseal_submissions')
                                .upsert({
                                    application_id: data.metadata?.application_id || data.application_id || null,
                                    submission_id: data.id || data.submission_id || null,
                                    submitter_id: submitter.id,
                                    slug: submitter.slug || null,
                                    status: submitter.status || 'pending',
                                    email: submitter.email || null,
                                    name: submitter.name || null,
                                    role: submitter.role || null,
                                    embed_src: submitter.embed_src || null,
                                    sent_at: submitter.sent_at || now,
                                    metadata: submitter.metadata || {},
                                    created_at: submitter.created_at || data.created_at || now,
                                    updated_at: now
                                }, { onConflict: 'submitter_id' });
                        }
                    }

                    // If submission-level status provided, update rows by submission_id
                    const submissionId = data.id || data.submission_id;
                    if (submissionId && data.status) {
                        await supabase
                            .from('docuseal_submissions')
                            .update({ status: data.status, updated_at: now })
                            .eq('submission_id', submissionId);
                    }
                } catch (error) {
                    console.error('DocuSeal webhook update error:', error);
                }
                break;
            default:
                console.log('Unhandled DocuSeal webhook event:', eventType);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('DocuSeal webhook processing error:', error);
        return res.status(500).json({ error: error.message || 'DocuSeal webhook failed' });
    }
});


// =================================================================
// --- 5. ADMIN & PUBLIC STATIC FILE SERVING (THE FIX) ---
// =================================================================

// 5a. Define the path to your *BUILT* admin app's 'dist' folderr
const adminDistPath = path.join(__dirname, 'public', 'admin', 'dist');
const adminAssetsPath = path.join(adminDistPath, 'assets');

// ★★★ THIS IS THE FIX YOU NEEDED ★★★
// This captures requests to /assets/... and points them to public/admin/dist/assets
app.use('/assets', express.static(adminAssetsPath));

// Fallback for cached asset names (serves latest hash when old file requested)
app.get('/assets/:assetName', (req, res, next) => {
    const requestedFile = path.join(adminAssetsPath, req.params.assetName);
    if (fs.existsSync(requestedFile)) {
        return res.sendFile(requestedFile);
    }

    const dotIndex = req.params.assetName.lastIndexOf('.');
    const dashIndex = req.params.assetName.indexOf('-');
    if (dotIndex === -1 || dashIndex === -1) {
        return next();
    }

    const baseName = req.params.assetName.slice(0, dashIndex);
    const extension = req.params.assetName.slice(dotIndex);

    try {
        const files = fs.readdirSync(adminAssetsPath);
        const match = files.find(file => file.startsWith(`${baseName}-`) && file.endsWith(extension));
        if (match) {
            return res.sendFile(path.join(adminAssetsPath, match));
        }
    } catch (err) {
        console.error('Asset fallback error:', err);
    }

    return next();
});

// 5b. Serve all static assets (CSS, JS) from the 'dist' folder
// This uses the '/admin' prefix
app.use('/admin', express.static(adminDistPath));

// 5c. Serve the REST of the 'public' folder (for login.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));


// --- 6. Root Redirect & Auth Helpers ---
app.get('/', (req, res) => {
    res.redirect('/auth/login.html');
});

// Helper routes to catch bad redirects
app.get('/login.html', (req, res) => {
    res.redirect('/auth/login.html');
});
app.get('/auth.html', (req, res) => {
    res.redirect('/auth/login.html');
});


// --- 7. Admin Page Routes (FOR MPA) ---

app.get('/admin', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
});

app.get('/admin/index.html', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
});

app.get('/admin/auth.html', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'auth.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'dashboard.html'));
});


app.get('/admin/analytics', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'analytics.html'));
});

app.get('/admin/applications', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'applications.html'));
});

app.get('/admin/application-detail', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'application-detail.html'));
});

app.get('/admin/create-application-step1', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'create-application-step1.html'));
});

app.get('/admin/incoming-payments', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'incoming-payments.html'));
});

app.get('/admin/outgoing-payments', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'outgoing-payments.html'));
});

app.get('/admin/users', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'users.html'));
});

app.get('/admin/settings', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'settings.html'));
});


// --- 8. Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Zwane Finance server running on http://localhost:${PORT}`);
    console.log(`📁 Serving admin files from: ${adminDistPath}`);
    console.log(`📁 Serving public files from: ${path.join(__dirname, 'public')}`);
    
    // Start notification scheduler
    startNotificationScheduler();
});
