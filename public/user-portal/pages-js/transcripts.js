// Transcripts page JS
import '/user-portal/Services/sessionGuard.js'; // Production auth guard

let supabaseClient = null;
let activeUserId = null;
let isTranscriptsLoading = false;

const METRICS_CONFIG = [
	{ key: 'total_accounts', label: 'Total Accounts' },
	{ key: 'open_accounts', label: 'Open Accounts' },
	{ key: 'closed_accounts', label: 'Closed Accounts' },
	{ key: 'accounts_with_arrears', label: 'Accounts In Arrears' },
	{ key: 'total_balance', label: 'Total Balance', formatter: formatCurrency },
	{ key: 'total_monthly_payment', label: 'Monthly Instalments', formatter: formatCurrency },
	{ key: 'total_arrears_amount', label: 'Total Arrears', formatter: formatCurrency },
	{ key: 'total_enquiries', label: 'Enquiries (All Time)' },
	{ key: 'total_judgments', label: 'Judgements' },
	{ key: 'total_judgment_amount', label: 'Judgement Value', formatter: formatCurrency }
];

const DOCUMENT_CONFIG = [
	{ key: 'till_slip', label: 'Payslip', description: 'Latest till slip on record.' },
	{ key: 'bank_statement', label: 'Bank Statement', description: 'Latest bank statement submitted.' }
];

async function initTranscriptsPage(isManualRefresh = false) {
	if (isTranscriptsLoading) {
		return;
	}

	isTranscriptsLoading = true;
	toggleRefreshButton(true);
	setTranscriptsAlert('info', isManualRefresh ? 'Refreshing credit data...' : 'Loading your credit data...');

	try {
		if (!supabaseClient) {
			({ supabase: supabaseClient } = await import('/Services/supabaseClient.js'));
		}

		const { data: { session }, error } = await supabaseClient.auth.getSession();
		if (error) {
			throw error;
		}

		activeUserId = session?.user?.id || null;
		if (!activeUserId) {
			setTranscriptsAlert('error', 'Please sign in to view your credit transcripts.');
			return;
		}

		const creditRows = await fetchCreditChecks();
		renderCreditSummary(creditRows);
		renderCreditHistory(creditRows);
		await loadDocumentDownloads();

		setTranscriptsAlert('success', isManualRefresh ? 'Credit data refreshed just now.' : 'Credit data loaded.');
	} catch (err) {
		console.error('Failed to load transcripts:', err);
		setTranscriptsAlert('error', err.message || 'Unable to load transcripts.');
	} finally {
		isTranscriptsLoading = false;
		toggleRefreshButton(false);
	}
}

function toggleRefreshButton(isDisabled) {
	const btn = document.getElementById('refreshTranscriptsBtn');
	if (btn) {
		btn.disabled = isDisabled;
	}
}

function setTranscriptsAlert(type, message) {
	const alertEl = document.getElementById('transcriptsAlert');
	if (!alertEl) {
		return;
	}
	alertEl.className = `transcripts-alert ${type}`;
	alertEl.innerHTML = `<i class="fa-solid ${getAlertIcon(type)}"></i>${message}`;
}

function getAlertIcon(type) {
	if (type === 'success') return 'fa-circle-check';
	if (type === 'error') return 'fa-triangle-exclamation';
	return 'fa-circle-info';
}

async function fetchCreditChecks() {
	const { data, error } = await supabaseClient
		.from('credit_checks')
		.select('*')
		.eq('user_id', activeUserId)
		.order('checked_at', { ascending: false });

	if (error) {
		throw error;
	}

	return data || [];
}

function renderCreditSummary(rows) {
	const latest = rows?.[0] || null;
	setTextContent('creditScoreValue', latest?.credit_score ?? '—');
	setTextContent('creditRiskValue', latest?.risk_category || latest?.score_band || '—');
	setTextContent('creditRecommendationValue', formatRecommendation(latest?.recommendation));
	setTextContent('creditRecommendationReason', latest?.recommendation_reason || 'Upload a credit report to see insights.');
	setTextContent('creditCheckedAt', latest?.checked_at ? `Last checked ${formatDate(latest.checked_at)}` : 'No credit check on record');

	renderMetricsGrid(latest);
}

function renderMetricsGrid(latest) {
	const grid = document.getElementById('creditMetricsGrid');
	if (!grid) {
		return;
	}

	if (!latest) {
		grid.innerHTML = '<p class="empty-state">No credit metrics available yet.</p>';
		return;
	}

	grid.innerHTML = METRICS_CONFIG.map(({ key, label, formatter }) => {
		const rawValue = latest[key];
		const value = rawValue == null ? '—' : formatter ? formatter(rawValue) : formatNumber(rawValue);
		return `
			<div class="metric-tile">
				<h4>${label}</h4>
				<p>${value}</p>
			</div>
		`;
	}).join('');
}

function renderCreditHistory(rows) {
	const holder = document.getElementById('creditHistoryList');
	if (!holder) {
		return;
	}

	if (!rows?.length) {
		holder.innerHTML = '<p class="empty-state">No previous bureau checks have been recorded.</p>';
		return;
	}

	holder.innerHTML = rows.slice(0, 5).map((row) => `
		<div class="history-row">
			<div>
				<span>${formatDate(row.checked_at)}</span>
				<small>Checked</small>
			</div>
			<div>
				<span>${row.credit_score ?? '—'}</span>
				<small>Credit Score</small>
			</div>
			<div>
				<span>${formatRecommendation(row.recommendation)}</span>
				<small>Decision</small>
			</div>
			<div>
				<span>${row.bureau_name || 'Experian'}</span>
				<small>Bureau</small>
			</div>
		</div>
	`).join('');
}

async function loadDocumentDownloads() {
	const docTypes = ['till_slip', 'bank_statement'];
	const { data, error } = await supabaseClient
		.from('document_uploads')
		.select('id, file_name, file_type, file_path, uploaded_at')
		.eq('user_id', activeUserId)
		.in('file_type', docTypes)
		.order('uploaded_at', { ascending: false });

	if (error) {
		console.error('Failed to load documents:', error);
		renderDocumentActions({}, null);
		setTranscriptsAlert('error', 'Unable to retrieve document download links.');
		return;
	}

	const docMap = {};
	(data || []).forEach((doc) => {
		if (!docMap[doc.file_type]) {
			docMap[doc.file_type] = doc;
		}
	});

	// Fetch KYC ID images from kyc_sessions
	const { data: kycData, error: kycError } = await supabaseClient
		.from('kyc_sessions')
		.select('id_front_image_url, id_back_image_url, selfie_image_url, last_updated, status')
		.eq('user_id', activeUserId)
		.or('status.eq.approved,status.eq.Approved')
		.order('last_updated', { ascending: false, nullsFirst: false })
		.limit(1)
		.maybeSingle();

	if (kycError) {
		console.error('Failed to load KYC images:', kycError);
	}

	console.log('📸 KYC Data fetched:', kycData);

	renderDocumentActions(docMap, kycData);
}

function renderDocumentActions(docMap, kycData) {
	const container = document.getElementById('documentActions');
	if (!container) {
		return;
	}

	container.innerHTML = '';

	DOCUMENT_CONFIG.forEach((config) => {
		const doc = docMap[config.key];
		container.appendChild(createDocumentRow(config.label, config.description, doc));
	});

	// Create ID document row using KYC data
	const idFront = kycData?.id_front_image_url ? {
		file_path: kycData.id_front_image_url,
		file_name: 'ID Front (KYC Verified)',
		uploaded_at: kycData.last_updated
	} : null;

	const idBack = kycData?.id_back_image_url ? {
		file_path: kycData.id_back_image_url,
		file_name: 'ID Back (KYC Verified)',
		uploaded_at: kycData.last_updated
	} : null;

	const idRow = document.createElement('div');
	idRow.className = 'doc-row';
	idRow.innerHTML = `
		<div class="doc-info">
			<h4>ID Document</h4>
			<p>Front and back of your identity document (KYC verified).</p>
			<span class="doc-sublabel">Front: ${formatDocStatus(idFront)} · Back: ${formatDocStatus(idBack)}</span>
		</div>
	`;

	const split = document.createElement('div');
	split.className = 'doc-split';
	split.appendChild(createDocButton('Front', idFront));
	split.appendChild(createDocButton('Back', idBack));

	idRow.appendChild(split);
	container.appendChild(idRow);
}

function createDocumentRow(label, description, doc) {
	const row = document.createElement('div');
	row.className = 'doc-row';
	row.innerHTML = `
		<div class="doc-info">
			<h4>${label}</h4>
			<p>${description}</p>
			<span class="doc-sublabel">${formatDocStatus(doc)}</span>
		</div>
	`;

	const button = document.createElement('button');
	button.className = 'doc-action';
	button.textContent = 'Download';
	button.type = 'button';
	button.disabled = !doc?.file_path;
	if (doc?.file_path) {
		button.addEventListener('click', () => handleDocumentDownload(doc));
	}

	row.appendChild(button);
	return row;
}

function createDocButton(label, doc) {
	const btn = document.createElement('button');
	btn.className = 'doc-action';
	btn.textContent = label;
	btn.type = 'button';
	btn.disabled = !doc?.file_path;
	if (doc?.file_path) {
		btn.addEventListener('click', () => handleDocumentDownload(doc));
	}
	return btn;
}

function handleDocumentDownload(doc) {
	if (!doc?.file_path) {
		setTranscriptsAlert('error', 'Document is no longer available.');
		return;
	}
	window.open(doc.file_path, '_blank', 'noopener');
}

function formatDocStatus(doc) {
	if (!doc) {
		return 'Not uploaded';
	}
	return `${doc.file_name} · ${formatDate(doc.uploaded_at)}`;
}

function formatRecommendation(value) {
	if (!value) {
		return '—';
	}
	const normalised = value.toString().toLowerCase();
	if (normalised === 'approve') return 'Approve';
	if (normalised === 'decline') return 'Decline';
	if (normalised === 'review') return 'Review';
	return value;
}

function formatCurrency(value) {
	if (typeof value !== 'number') {
		return '—';
	}
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value) {
	if (value == null) {
		return '—';
	}
	return new Intl.NumberFormat('en-ZA').format(value);
}

function formatDate(value) {
	if (!value) {
		return '—';
	}
	return new Intl.DateTimeFormat('en-ZA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(new Date(value));
}

function setTextContent(elementId, value) {
	const el = document.getElementById(elementId);
	if (el) {
		el.textContent = value;
	}
}

function bootTranscriptsPage() {
	const refreshBtn = document.getElementById('refreshTranscriptsBtn');
	if (refreshBtn) {
		refreshBtn.addEventListener('click', () => initTranscriptsPage(true));
	}
	initTranscriptsPage();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootTranscriptsPage, { once: true });
} else {
	bootTranscriptsPage();
}
