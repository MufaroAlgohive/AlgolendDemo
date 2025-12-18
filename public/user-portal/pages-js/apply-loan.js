import '/user-portal/Services/sessionGuard.js'; // Production auth guard

window.consentGiven = false;

const REQUIRED_DOCUMENTS = ['tillslip', 'bankstatement'];
const documentState = {
  tillslip: 'pending',
  bankstatement: 'pending',
  kyc: 'pending'
};

const documentButtonRefs = {
  tillslip: { button: null, chip: null },
  bankstatement: { button: null, chip: null }
};

let moduleStatusRef = null;
let nextBtnRef = null;
let loginRequired = false;
let activeUserId = null;
let refreshDocumentsHandler = null;
let documentServices = null;
let supabaseClientInstance = null;
let kycButtonRef = null;
let kycStatusRef = null;
let isKycLaunching = false;
let kycStatusInterval = null;

const APPLY_LOAN_PAGE = 'apply-loan';

async function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }
  const { supabase } = await import('/Services/supabaseClient.js');
  supabaseClientInstance = supabase;
  return supabaseClientInstance;
}

function resetDocumentStateFlags() {
  Object.keys(documentState).forEach(key => {
    documentState[key] = 'pending';
  });
}

function resetDocumentReferences() {
  moduleStatusRef = null;
  nextBtnRef = null;
  Object.keys(documentButtonRefs).forEach(key => {
    documentButtonRefs[key].button = null;
    documentButtonRefs[key].chip = null;
  });
}

function detachDocumentUploadedListener() {
  if (refreshDocumentsHandler) {
    window.removeEventListener('document:uploaded', refreshDocumentsHandler);
    refreshDocumentsHandler = null;
  }
}

function cacheKycReferences() {
  kycButtonRef = document.getElementById('kycBtn');
  kycStatusRef = document.getElementById('kycBtnStatus');
}

function setKycStatus(variant, label) {
  if (!kycStatusRef) {
    return;
  }
  kycStatusRef.className = 'document-status';
  if (variant) {
    kycStatusRef.classList.add(variant);
  }
  kycStatusRef.textContent = label || '';
}

function formatKycStatusLabel(status) {
  if (!status) {
    return '';
  }
  return status
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function refreshKycStatus() {
  cacheKycReferences();
  if (!kycButtonRef || !kycStatusRef) {
    return;
  }

  try {
    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      setKycStatus('partial', 'Log in to start');
      kycButtonRef.disabled = true;
      return;
    }

    kycButtonRef.disabled = false;

    const response = await fetch(`/api/kyc/user/${session.user.id}/status`);
    if (!response.ok) {
      throw new Error('Unable to check status');
    }

    const data = await response.json();
    console.log('📋 KYC status response:', data);
    
    // Check for approved status
    if (data.verified) {
      setKycStatus('ready', 'Approved');
      kycButtonRef.disabled = true;
      kycButtonRef.classList.add('completed');
      kycButtonRef.setAttribute('aria-disabled', 'true');
      documentState.kyc = 'complete';
      
      // Stop polling once approved
      if (kycStatusInterval) {
        clearInterval(kycStatusInterval);
        kycStatusInterval = null;
      }
      
      // Update next button state
      updateNextButtonState();
      renderModuleStatus();
      return;
    }
    
    // Show intermediate statuses (Started, In Progress, etc.)
    if (data.normalizedStatus) {
      const statusMap = {
        'started': 'Verification Started',
        'in progress': 'Verification In Progress',
        'in_progress': 'Verification In Progress',
        'pending': 'Pending Review',
        'rejected': 'Verification Failed',
        'expired': 'Session Expired'
      };
      
      const displayStatus = statusMap[data.normalizedStatus] || data.status || 'Pending';
      
      if (data.normalizedStatus === 'rejected' || data.normalizedStatus === 'expired') {
        setKycStatus('partial', displayStatus);
        documentState.kyc = 'pending';
      } else if (data.normalizedStatus === 'started' || data.normalizedStatus.includes('progress')) {
        setKycStatus('partial', displayStatus);
        documentState.kyc = 'partial';
      }
      
      updateNextButtonState();
      renderModuleStatus();
    }
    
    // Not verified, so KYC is not complete
    documentState.kyc = 'pending';

    const statusLabel = formatKycStatusLabel(data.status);
    if (statusLabel) {
      setKycStatus('partial', statusLabel);
    } else {
      setKycStatus(null, 'Start');
    }
  } catch (err) {
    console.error('Failed to refresh KYC status:', err);
    setKycStatus('partial', 'Status unavailable');
  }
}

async function handleKycButtonClick() {
  if (isKycLaunching) {
    return;
  }

  cacheKycReferences();
  if (!kycButtonRef || !kycStatusRef) {
    return;
  }

  try {
    isKycLaunching = true;
    kycButtonRef.disabled = true;
    setKycStatus('partial', 'Launching verification...');

    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setKycStatus('partial', 'Log in to start');
      return;
    }

    const payload = {
      userId: session.user.id,
      email: session.user.email,
      metadata: {
        full_name: session.user.user_metadata?.full_name
      }
    };

    const phone = session.user.phone || session.user.user_metadata?.phone || session.user.user_metadata?.phone_number;
    if (phone) {
      payload.phone = phone;
    }

    const response = await fetch('/api/kyc/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.verification_url) {
      throw new Error(data.error || 'Unable to start verification');
    }

    window.open(data.verification_url, '_blank', 'width=900,height=700');
    setKycStatus('partial', 'Verification started');

    // Start polling for status updates every 5 seconds
    if (kycStatusInterval) {
      clearInterval(kycStatusInterval);
    }
    kycStatusInterval = setInterval(async () => {
      await refreshKycStatus();
    }, 5000);
  } catch (err) {
    console.error('Failed to start KYC verification:', err);
    setKycStatus('partial', err.message || 'Unable to start verification');
  } finally {
    isKycLaunching = false;
    if (kycButtonRef && !kycStatusRef?.classList.contains('ready')) {
      kycButtonRef.disabled = false;
    }
  }
}

async function initKycButton() {
  cacheKycReferences();
  if (!kycButtonRef || !kycStatusRef) {
    return;
  }

  if (!kycButtonRef.dataset.bound) {
    kycButtonRef.addEventListener('click', handleKycButtonClick);
    kycButtonRef.dataset.bound = 'true';
  }

  await refreshKycStatus();
}

window.toggleConsent = function () {
  window.consentGiven = !window.consentGiven;
  const btn = document.getElementById('consentBtn');
  const icon = btn?.querySelector('i');
  const documentList = document.getElementById('documentList');

  if (!btn || !icon || !documentList) {
    return;
  }

  if (window.consentGiven) {
    btn.classList.add('active');
    icon.classList.remove('fa-square');
    icon.classList.add('fa-check-square');
    documentList.classList.remove('hidden-consent');
  } else {
    btn.classList.remove('active');
    icon.classList.remove('fa-check-square');
    icon.classList.add('fa-square');
    documentList.classList.add('hidden-consent');
  }

  updateNextButtonState();
}

window.showApplyLoan2 = function() {
  // Use goToStep for validation instead of direct navigation
  window.goToStep(2);
}

async function loadModule(name) {
  const overlay = document.getElementById("module-container");
  const moduleContent = document.getElementById("module-content");
  const cssHref = `/user-portal/modules-css/${name}.css`;

  overlay.classList.remove("hidden");
  moduleContent.innerHTML = "<p>Loading...</p>";

  if (!document.querySelector(`link[data-module-css="${name}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${cssHref}?t=${Date.now()}`;
    link.dataset.moduleCss = name;
    document.head.appendChild(link);
  }

  try {
    const res = await fetch(`/user-portal/modules/${name}.html?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Module ${name} not found`);
    const html = await res.text();
    moduleContent.innerHTML = html;

    await import(`/user-portal/modules-js/${name}.js?t=${Date.now()}`);
  } catch (err) {
    console.error(`❌ Failed to load ${name} module:`, err);
    moduleContent.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

function closeModule() {
  const overlay = document.getElementById("module-container");
  overlay.classList.add("hidden");
}

// Navigation function for step buttons
window.goToStep = function(step) {
  // Guard: Cannot proceed to step 2+ without consent and all documents
  if (step >= 2) {
    if (!window.consentGiven) {
      if (typeof window.showToast === 'function') {
        window.showToast('Consent Required', 'Please consent to the Privacy Policy first', 'warning');
      } else {
        alert('Please consent to the Privacy Policy first');
      }
      return;
    }
    
    const docsComplete = REQUIRED_DOCUMENTS.every(doc => documentState[doc] === 'complete');
    const kycComplete = documentState.kyc === 'complete';
    
    if (!docsComplete || !kycComplete) {
      const pending = [];
      if (!kycComplete) pending.push('KYC Verification');
      REQUIRED_DOCUMENTS.forEach(doc => {
        if (documentState[doc] !== 'complete') {
          if (doc === 'tillslip') pending.push('Payslip');
          if (doc === 'bankstatement') pending.push('Bank Statement');
        }
      });
      
      const pendingNames = pending.join(', ');
      
      if (typeof window.showToast === 'function') {
        window.showToast('Documents Required', `Please complete: ${pendingNames}`, 'warning');
      } else {
        alert(`Please complete all required items first: ${pendingNames}`);
      }
      return;
    }
  }
  
  const pages = {
    1: 'apply-loan.html',
    2: 'apply-loan-2.html',
    3: 'apply-loan-3.html',
    4: 'confirmation.html'
  };
  
  if (typeof loadPage === 'function') {
    const pageNames = {
      1: 'apply-loan',
      2: 'apply-loan-2',
      3: 'apply-loan-3',
      4: 'confirmation'
    };
    loadPage(pageNames[step]);
  } else {
    window.location.href = pages[step];
  }
}

// Make functions globally accessible
window.loadModule = loadModule;
window.closeModule = closeModule;

function cacheElementReferences() {
  moduleStatusRef = moduleStatusRef || document.getElementById('module-status');
  nextBtnRef = nextBtnRef || document.getElementById('nextBtn');

  documentButtonRefs.tillslip.button = document.getElementById('tillslipBtn');
  documentButtonRefs.tillslip.chip = document.getElementById('tillslipBtnStatus');
  documentButtonRefs.bankstatement.button = document.getElementById('bankstatementBtn');
  documentButtonRefs.bankstatement.chip = document.getElementById('bankstatementBtnStatus');

  if (nextBtnRef) {
    nextBtnRef.disabled = true;
  }
}

function setModuleStatusLoading() {
  if (moduleStatusRef) {
    moduleStatusRef.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Checking your documents...';
  }
}

function showModuleStatusError(message) {
  if (moduleStatusRef) {
    moduleStatusRef.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#d14343;"></i> ${message}`;
  }
}

function renderModuleStatus() {
  if (!moduleStatusRef) {
    return;
  }

  if (loginRequired) {
    moduleStatusRef.innerHTML = '<i class="fas fa-lock" style="color:#555;"></i> Log in to upload your documents.';
    return;
  }

  const completed = REQUIRED_DOCUMENTS.filter(doc => documentState[doc] === 'complete').length;
  if (completed === REQUIRED_DOCUMENTS.length) {
    moduleStatusRef.innerHTML = '<i class="fas fa-check-circle" style="color:#0f9158;"></i> All required documents are uploaded.';
  } else {
    moduleStatusRef.innerHTML = `<i class="fas fa-info-circle" style="color:#7a7a7a;"></i> ${completed}/${REQUIRED_DOCUMENTS.length} documents ready.`;
  }
}

function updateNextButtonState() {
  nextBtnRef = nextBtnRef || document.getElementById('nextBtn');
  if (!nextBtnRef) {
    return;
  }

  const docsComplete = REQUIRED_DOCUMENTS.every(doc => documentState[doc] === 'complete');
  const kycComplete = documentState.kyc === 'complete';
  const allComplete = docsComplete && kycComplete;
  
  nextBtnRef.disabled = !(window.consentGiven && allComplete);
  
  // Mark step 1 as completed when all documents are ready
  const step1 = document.querySelector('.step.active');
  if (step1 && allComplete && window.consentGiven) {
    step1.classList.add('completed');
  } else if (step1) {
    step1.classList.remove('completed');
  }
}

function updateDocumentButtonState(key, state) {
  const refs = documentButtonRefs[key];
  if (!refs) {
    return;
  }

  const { button, chip } = refs;
  if (!chip) {
    return;
  }

  documentState[key] = state;

  chip.className = 'document-status';
  if (button) {
    button.disabled = false;
    button.classList.remove('completed');
    button.removeAttribute('aria-disabled');
  }

  switch (state) {
    case 'complete':
      chip.textContent = 'Uploaded';
      chip.classList.add('ready');
      if (button) {
        button.disabled = true;
        button.classList.add('completed');
        button.setAttribute('aria-disabled', 'true');
      }
      break;
    case 'partial':
      chip.textContent = 'Partial';
      chip.classList.add('partial');
      break;
    case 'login':
      chip.textContent = 'Log in first';
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      break;
    default:
      chip.textContent = 'Pending';
  }
}

function setLoginRequiredState() {
  loginRequired = true;
  Object.keys(documentButtonRefs).forEach(key => updateDocumentButtonState(key, 'login'));
  renderModuleStatus();
  updateNextButtonState();
}

async function refreshDocumentStatuses(showSpinner = false) {
  if (!documentServices || !activeUserId) {
    return;
  }

  if (showSpinner) {
    setModuleStatusLoading();
  }

  const [tillSlipExists, bankStatementExists] = await Promise.all([
    documentServices.checkDocumentExistsByUser(activeUserId, 'till_slip'),
    documentServices.checkDocumentExistsByUser(activeUserId, 'bank_statement')
  ]);

  updateDocumentButtonState('tillslip', tillSlipExists ? 'complete' : 'pending');
  updateDocumentButtonState('bankstatement', bankStatementExists ? 'complete' : 'pending');

  renderModuleStatus();
  updateNextButtonState();
}

async function initDocumentChecklist() {
  resetDocumentReferences();
  cacheElementReferences();

  if (!moduleStatusRef) {
    return;
  }

  setModuleStatusLoading();

  try {
    detachDocumentUploadedListener();
    const [supabase, docServiceModule] = await Promise.all([
      getSupabaseClient(),
      import('/user-portal/Services/documentService.js')
    ]);

    documentServices = {
      checkDocumentExistsByUser: docServiceModule.checkDocumentExistsByUser,
      checkIdCardExistsByUser: docServiceModule.checkIdCardExistsByUser
    };

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    activeUserId = session?.user?.id || null;

    if (!activeUserId) {
      setLoginRequiredState();
      return;
    }

    await refreshDocumentStatuses(true);

    refreshDocumentsHandler = () => {
      refreshDocumentStatuses(false).catch(err => {
        console.error('Failed to refresh document statuses:', err);
      });
    };

    window.addEventListener('document:uploaded', refreshDocumentsHandler);
  } catch (err) {
    console.error('Failed to initialize document checklist:', err);
    showModuleStatusError('Unable to retrieve document status.');
  }
}

function bootApplyLoanPage() {
  initDocumentChecklist();
  initKycButton().catch(err => {
    console.error('Failed to initialize KYC button:', err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApplyLoanPage, { once: true });
} else {
  bootApplyLoanPage();
}

window.addEventListener('pageLoaded', (event) => {
  const pageName = event?.detail?.pageName;
  if (pageName === APPLY_LOAN_PAGE) {
    resetDocumentStateFlags();
    initDocumentChecklist();
    initKycButton().catch(err => {
      console.error('Failed to initialize KYC button after SPA navigation:', err);
    });
  } else {
    detachDocumentUploadedListener();
    // Clean up KYC polling when leaving the page
    if (kycStatusInterval) {
      clearInterval(kycStatusInterval);
      kycStatusInterval = null;
    }
  }
});
