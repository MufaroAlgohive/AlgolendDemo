// src/modules/applications.js
import { initLayout, getRole } from '../shared/layout.js';
import { supabase } from '../services/supabaseClient.js';
import { 
  fetchLoanApplications, 
  syncAllOfferedApplications, 
  createWalkInClient 
} from '../services/dataService.js';
import { formatCurrency, formatDate } from '../shared/utils.js';

// --- CONFIGURATION ---
const USER_PORTAL_URL = 'https://zw-express-6ulf9yybu-mps-projects-81dea2b0.vercel.app';

const ALL_STATUSES = [
  'STARTED', 
  'BUREAU_CHECKING', 
  'BUREAU_OK', 
  'BUREAU_REFER', 
  'BUREAU_DECLINE',
  'BANK_LINKING', 
  'AFFORD_OK', 
  'AFFORD_REFER', 
  'AFFORD_FAIL', 
  'OFFERED',
  'OFFER_ACCEPTED', 
  'CONTRACT_SIGN', 
  'DEBICHECK_AUTH', 
  'READY_TO_DISBURSE',
  'DISBURSED', 
  'DECLINED', 
  'ERROR'
];

// --- State ---
let allApplications = []; 
let userRole = 'borrower';

let inBranchState = {
  active: false,
  step: 1,
  targetUser: null,
  loanHistoryCount: 0,
  loanConfig: {
    amount: 1000,
    period: 1,
    startDate: null,
    reason: 'Personal Loan',
    maxAllowedPeriod: 1,
    interestRate: 0.20
  },
  documents: {
    idcard: 'pending',
    tillslip: 'pending',
    bankstatement: 'pending'
  },
  creditCheck: {
      applicationId: null,
      status: 'pending',
      score: null
  }
};

// --- Credit Check Globals ---
const CREDIT_MODAL_ID = 'admin-credit-check-modal';
let creditModalInitialized = false;
let latestCreditZipData = null;

// --- Toast Notification Helper ---
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    // Colors based on type
    let colors = 'bg-gray-900 text-white'; // Default
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    
    if (type === 'error') {
        colors = 'bg-red-600 text-white';
        icon = '<i class="fa-solid fa-circle-xmark"></i>';
    } else if (type === 'warning') {
        colors = 'bg-orange-500 text-white';
        icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    }

    toast.className = `${colors} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-x-full pointer-events-auto`;
    toast.innerHTML = `${icon}<span class="text-sm font-medium">${message}</span>`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
    
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Status Colors ---
const getBadgeColor = (status) => {
  switch (status) {
    case 'DISBURSED': 
    case 'READY_TO_DISBURSE': 
    case 'AFFORD_OK': 
    case 'BUREAU_OK': 
        return 'bg-green-100 text-green-800';
    case 'DECLINED': 
    case 'AFFORD_FAIL': 
    case 'BUREAU_DECLINE': 
    case 'ERROR': 
        return 'bg-red-100 text-red-800';
    case 'STARTED': 
    case 'BUREAU_CHECKING': 
    case 'BANK_LINKING': 
    case 'OFFER_ACCEPTED': 
    case 'CONTRACT_SIGN': 
    case 'DEBICHECK_AUTH': 
        return 'bg-blue-100 text-blue-800';
    case 'OFFERED': 
    case 'BUREAU_REFER': 
    case 'AFFORD_REFER': 
        return 'bg-yellow-100 text-yellow-800';
    default: 
        return 'bg-gray-100 text-gray-800';
  }
};

// ==========================================
//   CREDIT CHECK MODAL LOGIC (ADMIN)
// ==========================================

function setupCreditCheckModal() {
    if (creditModalInitialized) return;
    
    const modalHtml = `
        <div id="${CREDIT_MODAL_ID}" class="hidden fixed inset-0 bg-black/70 z-[1000] items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 class="text-xl font-semibold text-gray-900">Run Credit Check</h2>
                        <p class="text-sm text-gray-500">Powered by Experian SOAP Integration</p>
                    </div>
                    <button id="credit-check-close" class="text-3xl leading-none text-gray-400 hover:text-gray-700">&times;</button>
                </div>
                <div class="px-6 py-4 space-y-4">
                    <div id="credit-form-content" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Personal Information</h3>
                                <label class="block text-sm font-medium text-gray-700 mb-1">ID Number <span class="text-red-500">*</span></label>
                                <input type="text" id="identity_number" maxlength="13" class="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-brand-accent">
                                
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Surname <span class="text-red-500">*</span></label>
                                        <input type="text" id="surname" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">First Name <span class="text-red-500">*</span></label>
                                        <input type="text" id="forename" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Gender <span class="text-red-500">*</span></label>
                                        <select id="gender" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                            <option value="">Select</option>
                                            <option value="M">Male</option>
                                            <option value="F">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span class="text-red-500">*</span></label>
                                        <input type="date" id="date_of_birth" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Address Information</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Street Address <span class="text-red-500">*</span></label>
                                        <input type="text" id="address1" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code <span class="text-red-500">*</span></label>
                                        <input type="text" id="postal_code" maxlength="4" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Suburb / Area</label>
                                        <input type="text" id="address2" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Cell Number</label>
                                        <input type="tel" id="cell_tel_no" maxlength="10" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                    </div>
                                </div>
                                <div class="flex items-start gap-3 mt-4 p-3 rounded-md bg-orange-50 border border-orange-100">
                                    <input type="checkbox" id="credit_consent" class="mt-1 h-4 w-4 text-brand-accent focus:ring-brand-accent">
                                    <label for="credit_consent" class="text-sm text-gray-700">I confirm the client consented to this bureau enquiry.</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="credit-loading" class="hidden text-center py-8">
                        <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i>
                        <p class="mt-3 text-sm text-gray-600">Contacting Experian...</p>
                    </div>
                    
                    <div id="credit-result" class="hidden text-center py-8">
                        <i class="fa-solid fa-circle-check text-4xl text-green-500 mb-3"></i>
                        <h3 class="text-lg font-semibold text-gray-900">Credit Check Complete</h3>
                        <p class="text-sm text-gray-500">Score and risk band:</p>
                        <div id="credit-score-value" class="text-3xl font-bold text-gray-900 mt-2"></div>
                    </div>
                </div>
                
                <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
                    <span class="text-xs text-gray-500"><i class="fa-solid fa-shield-halved"></i> Data encrypted via Supabase Edge</span>
                    <div class="flex items-center gap-2">
                        <button id="credit-check-download" class="hidden px-4 py-2 border border-gray-300 rounded-md text-sm">Download Report</button>
                        <button id="credit-check-complete" class="hidden px-4 py-2 bg-green-600 text-white rounded-md text-sm">Done</button>
                        <button id="credit-check-cancel" class="px-4 py-2 border border-gray-300 rounded-md text-sm">Cancel</button>
                        <button id="credit-check-submit" class="px-4 py-2 bg-brand-accent text-white rounded-md text-sm">Run Credit Check</button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('credit-check-close').addEventListener('click', closeCreditCheckModal);
    document.getElementById('credit-check-cancel').addEventListener('click', closeCreditCheckModal);
    document.getElementById('credit-check-submit').addEventListener('click', handleCreditCheckSubmit);
    
    document.getElementById('credit-check-complete').addEventListener('click', () => {
        closeCreditCheckModal();
        const wizardContent = document.getElementById('wizard-content');
        if (wizardContent && inBranchState.step === 2) {
            renderCreditCheck(wizardContent);
        }
    });

    document.getElementById('credit-check-download').addEventListener('click', () => {
        if (latestCreditZipData && inBranchState.creditCheck.applicationId) {
            downloadCreditZip(latestCreditZipData, inBranchState.creditCheck.applicationId);
        }
    });
    
    creditModalInitialized = true;
}

window.openCreditCheckModal = function() {
    if (!inBranchState.targetUser) return;
    setupCreditCheckModal();
    resetCreditCheckFormState();
    prefillCreditFormFields();
    const modal = document.getElementById(CREDIT_MODAL_ID);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

function closeCreditCheckModal() {
    const modal = document.getElementById(CREDIT_MODAL_ID);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    resetCreditCheckFormState();
}

function resetCreditCheckFormState() {
    document.getElementById('credit-form-content').classList.remove('hidden');
    document.getElementById('credit-loading').classList.add('hidden');
    document.getElementById('credit-result').classList.add('hidden');
    
    const submitBtn = document.getElementById('credit-check-submit');
    submitBtn.disabled = false; 
    submitBtn.innerHTML = 'Run Credit Check'; 
    submitBtn.classList.remove('hidden');
    
    document.getElementById('credit-check-cancel').classList.remove('hidden');
    document.getElementById('credit-check-complete').classList.add('hidden');
    document.getElementById('credit-check-download').classList.add('hidden');
    
    latestCreditZipData = null;
}

function prefillCreditFormFields() {
    const user = inBranchState.targetUser || {};
    const { firstName, lastName } = splitName(user.full_name);
    
    if (!document.getElementById('identity_number')) return;

    document.getElementById('identity_number').value = user.identity_number || user.id_number || '';
    document.getElementById('surname').value = user.last_name || lastName || '';
    document.getElementById('forename').value = user.first_name || firstName || '';
    document.getElementById('cell_tel_no').value = user.phone_number || user.contact_number || '';
    
    // Attempt to prefill extra fields
    const gender = (user.gender || '').toUpperCase();
    document.getElementById('gender').value = gender.startsWith('F') ? 'F' : (gender.startsWith('M') ? 'M' : '');
    document.getElementById('date_of_birth').value = formatDateForInput(user.date_of_birth);
    document.getElementById('address1').value = user.address_line1 || user.address || '';
    document.getElementById('postal_code').value = user.postal_code || user.zip_code || '';

    document.getElementById('credit_consent').checked = true;
}

async function handleCreditCheckSubmit() {
    const submitBtn = document.getElementById('credit-check-submit');
    const identity_number = document.getElementById('identity_number').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const forename = document.getElementById('forename').value.trim();
    const gender = document.getElementById('gender').value;
    const date_of_birth = document.getElementById('date_of_birth').value;
    const address1 = document.getElementById('address1').value.trim();
    const address2 = document.getElementById('address2').value.trim();
    const postal_code = document.getElementById('postal_code').value.trim();
    const cell_tel_no = document.getElementById('cell_tel_no').value.trim();
    const consent = document.getElementById('credit_consent').checked;

    if (!identity_number || !surname || !forename || !gender || !date_of_birth || !address1 || !postal_code) { 
        showToast('Please fill in all required fields.', 'warning'); 
        return; 
    }
    if (!consent) { 
        showToast('Client consent is required.', 'warning'); 
        return; 
    }

    submitBtn.disabled = true; 
    submitBtn.innerHTML = 'Processing...';
    document.getElementById('credit-form-content').classList.add('hidden');
    document.getElementById('credit-loading').classList.remove('hidden');

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let applicationId = inBranchState.creditCheck?.applicationId;
        
        // 1. Ensure an application ID exists to attach the check to
        if (!applicationId) {
            const { data: newApp, error: newAppError } = await supabase.from('loan_applications').insert([{ 
                user_id: inBranchState.targetUser.id, 
                status: 'BUREAU_CHECKING', 
                amount: 0, 
                term_months: 0, 
                purpose: 'In-branch', 
                source: 'IN_BRANCH', 
                created_by_admin: session.user?.id
            }]).select().single();
            
            if (newAppError) throw newAppError;
            applicationId = newApp.id;
            inBranchState.creditCheck.applicationId = applicationId;
        }

        const userData = { 
            user_id: inBranchState.targetUser.id, 
            identity_number, surname, forename, 
            gender, date_of_birth: date_of_birth.replace(/-/g, ''),
            address1, address2, postal_code, cell_tel_no 
        };
        
        // 2. Perform the API call
        const result = await performAdminCreditCheck(applicationId, userData, session.access_token);

        const score = result.creditScore?.score || 0;
        
        // 3. Update DB
        await supabase
            .from('loan_applications')
            .update({ bureau_score_band: score, status: 'BUREAU_OK' })
            .eq('id', applicationId);
        
        inBranchState.creditCheck = { applicationId, status: 'completed', score };
        latestCreditZipData = result.zipData || null;

        // 4. Show Result
        document.getElementById('credit-loading').classList.add('hidden');
        document.getElementById('credit-result').classList.remove('hidden');
        document.getElementById('credit-score-value').textContent = `Score: ${score}`;
        document.getElementById('credit-check-complete').classList.remove('hidden');
        
        if (latestCreditZipData) {
            document.getElementById('credit-check-download').classList.remove('hidden');
        }
        
        submitBtn.classList.add('hidden');

    } catch (error) {
        console.error(error);
        showToast(error.message, 'error');
        resetCreditCheckFormState();
    }
}

async function performAdminCreditCheck(applicationId, userData, authToken) {
    const response = await fetch('/api/credit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ applicationId, userData })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
        // Mark as declined if API fails logically
        await supabase.from('loan_applications').update({ status: 'BUREAU_DECLINE' }).eq('id', applicationId);
        throw new Error(result.error || 'Credit check failed');
    }
    return result;
}

function downloadCreditZip(base64Data, applicationId) {
    try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { 
            byteNumbers[i] = byteCharacters.charCodeAt(i); 
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credit-report-${applicationId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        showToast('Unable to download the credit report.', 'error');
    }
}

// --- Utils ---
function splitName(fullName = '') {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    const lastName = parts.pop();
    return { firstName: parts.join(' '), lastName };
}

function formatDateForInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

// ==========================================
//   MAIN PAGE RENDERING
// ==========================================

function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div id="applications-list-view" class="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      <div class="p-4 sm:p-6 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Loan Applications</h2>
            <p class="text-sm text-gray-500 mt-1">Manage reviews and create in-branch applications.</p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button id="sync-offered-btn" class="w-full sm:w-auto border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 whitespace-nowrap shadow-sm">
                <i class="fa-solid fa-arrows-rotate text-sm"></i> Sync Offered
            </button>
            <button id="create-app-btn" class="w-full sm:w-auto bg-brand-accent text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-accent-hover transition flex items-center justify-center gap-2 whitespace-nowrap shadow-sm">
                <i class="fa-solid fa-desktop text-sm"></i> In-Branch Application
            </button>
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-2 mt-4">
          <div class="relative w-full sm:w-80">
            <input type="search" id="search-input" placeholder="Search..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-accent">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <div id="search-suggestions" class="absolute z-20 w-full bg-white border border-gray-300 rounded-lg mt-1 hidden max-h-72 overflow-y-auto shadow-lg"></div>
          </div>
          <select id="status-filter" class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">All Statuses</option>
            ${ALL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div class="overflow-x-auto flex-1">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0 z-10">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody id="applications-table-body" class="bg-white divide-y divide-gray-200">
                <tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">Loading...</td></tr>
            </tbody>
        </table>
      </div>
    </div>

    <div id="in-branch-view" class="hidden bg-white rounded-lg shadow-lg h-full flex flex-col">
       <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center gap-3">
                <button id="back-to-list-btn" class="flex items-center gap-2 text-gray-600 hover:text-brand-accent">
                    <i class="fa-solid fa-arrow-left"></i> Cancel
                </button>
                <span class="h-6 w-px bg-gray-300"></span>
                <span class="text-sm font-bold text-gray-800">In-Branch Application Mode</span>
            </div>
            <div class="text-xs text-brand-accent font-medium flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                <i class="fa-solid fa-store"></i> Branch Terminal
            </div>
        </div>
        
        <div class="px-6 pt-6 pb-2">
            <div class="flex items-center justify-center w-full max-w-6xl mx-auto mb-8 overflow-x-auto pb-2">
                <div id="wizard-stepper-container" class="flex items-center min-w-max"></div>
            </div>
        </div>
        
        <div id="wizard-content" class="flex-1 overflow-y-auto px-6 pb-6 bg-gray-50"></div>
        
        <div class="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
            <button id="wizard-prev-btn" class="hidden px-4 py-2 border border-gray-300 rounded-md">Back</button>
            <button id="wizard-next-btn" class="px-6 py-2 bg-brand-accent text-white rounded-md">Next Step</button>
        </div>
    </div>
  `;
  
  attachEventListeners();
  setupCreditCheckModal();
}

// ==========================================
//   WIZARD LOGIC (CONTROLLER)
// ==========================================

const WIZARD_STEPS = [
    { id: 1, title: 'Client', icon: 'fa-user' },
    { id: 2, title: 'Bureau', icon: 'fa-search-dollar' },
    { id: 3, title: 'Financials', icon: 'fa-chart-pie' },
    { id: 4, title: 'Declarations', icon: 'fa-file-contract' },
    { id: 5, title: 'Loan', icon: 'fa-sliders' },
    { id: 6, title: 'Docs', icon: 'fa-file-invoice' },
    { id: 7, title: 'Confirm', icon: 'fa-check-circle' }
];

async function startInBranchFlow() {
    inBranchState.active = true; 
    inBranchState.step = 1; 
    inBranchState.targetUser = null; 
    inBranchState.loanHistoryCount = 0;
    inBranchState.creditCheck = { applicationId: null, status: 'pending', score: null };
    
    const defaultDate = new Date(); 
    defaultDate.setDate(defaultDate.getDate() + 7);
    
    inBranchState.loanConfig = { 
        amount: 1000, 
        period: 1, 
        startDate: defaultDate, 
        reason: 'Personal Loan', 
        maxAllowedPeriod: 1, 
        interestRate: 0.20 
    };
    
    document.getElementById('applications-list-view').classList.add('hidden');
    document.getElementById('in-branch-view').classList.remove('hidden');
    renderWizard();
}

function renderWizard() { 
    renderStepper(); 
    renderStepContent(); 
    updateWizardButtons(); 
}

function renderStepper() {
    const container = document.getElementById('wizard-stepper-container'); 
    if(!container) return;
    
    container.innerHTML = WIZARD_STEPS.map((step, index) => {
        const isActive = step.id === inBranchState.step; 
        const isCompleted = step.id < inBranchState.step; 
        const isLast = index === WIZARD_STEPS.length - 1;
        
        let circleClass = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ";
        if (isActive) circleClass += "border-brand-accent bg-brand-accent text-white shadow-md";
        else if (isCompleted) circleClass += "border-green-500 bg-green-500 text-white";
        else circleClass += "border-gray-300 bg-white text-gray-400";
        
        return `
            <div class="flex flex-col items-center px-2">
                <div class="${circleClass}">
                    ${isCompleted ? '<i class="fa-solid fa-check"></i>' : `<i class="fa-solid ${step.icon}"></i>`}
                </div>
                <span class="text-xs font-semibold whitespace-nowrap mt-1 ${isActive ? 'text-brand-accent' : 'text-gray-400'}">
                    ${step.title}
                </span>
            </div>
            ${!isLast ? `<div class="w-8 h-1 mx-1 rounded bg-gray-200"></div>` : ''}
        `;
    }).join('');
}

async function renderStepContent() {
    const content = document.getElementById('wizard-content');
    content.innerHTML = '<div class="flex justify-center p-10"><i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i></div>';
    
    switch(inBranchState.step) {
        case 1: await renderUserSelection(content); break;
        case 2: await renderCreditCheck(content); break;
        case 3: await renderFinancialsForm(content); break;    
        case 4: await renderDeclarationsForm(content); break;  
        case 5: await renderLoanConfiguration(content); break;
        case 6: await renderDocumentCheck(content); break;
        case 7: await renderConfirmation(content); break;
    }
}

function updateWizardButtons() {
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    
    if(inBranchState.step === 1) { 
        prevBtn.classList.add('hidden'); 
        nextBtn.disabled = !inBranchState.targetUser; 
    } else { 
        prevBtn.classList.remove('hidden'); 
        nextBtn.disabled = false; 
    }
    
    // Hide Next button on form steps where internal submit handles progress
    if(inBranchState.step === 3 || inBranchState.step === 4) { 
        nextBtn.classList.add('hidden'); 
    } else { 
        nextBtn.classList.remove('hidden'); 
    }

    if(inBranchState.step === 7) { 
        nextBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Submit Application'; 
        nextBtn.onclick = handleFinalSubmit; 
    } else { 
        nextBtn.innerHTML = 'Next Step <i class="fa-solid fa-arrow-right ml-2"></i>'; 
        nextBtn.onclick = handleNextStep; 
    }
}

// ==========================================
//   STEP 1: USER SELECTION
// ==========================================

async function renderUserSelection(container) {
    const allowedRoles = ['admin', 'super_admin', 'base_admin'];
    const canCreateWalkIn = allowedRoles.includes(userRole);
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg border border-gray-200 shadow-sm mt-4">
            <div class="flex border-b border-gray-200 mb-6">
                <button id="tab-search" class="flex-1 py-2 text-sm font-medium text-orange-600 border-b-2 border-orange-600"><i class="fa-solid fa-magnifying-glass mr-2"></i>Search Existing</button>
                ${canCreateWalkIn ? `<button id="tab-create" class="flex-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"><i class="fa-solid fa-user-plus mr-2"></i>New Walk-in Client</button>` : ''}
            </div>
            
            <div id="view-search">
                <h3 class="text-xl font-bold text-gray-800 mb-2">Find Client</h3>
                <p class="text-sm text-gray-500 mb-6">Search database by name, email, or ID number.</p>
                <div class="relative mb-6">
                    <input type="text" id="user-search" class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm" placeholder="Start typing name or ID...">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <div id="search-spinner" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-orange-500"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                </div>
                <div id="user-results" class="hidden absolute z-10 w-full max-w-[36rem] bg-white border border-gray-200 rounded-lg shadow-xl mt-[-20px] max-h-60 overflow-y-auto"></div>
            </div>
            
            ${canCreateWalkIn ? `
            <div id="view-create" class="hidden animate-fade-in">
                <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6"><div class="flex"><div class="flex-shrink-0"><i class="fa-solid fa-store text-orange-600"></i></div><div class="ml-3"><p class="text-sm text-orange-700">You are registering a <strong>Walk-in Client</strong>. No email/password required.</p></div></div></div>
                <div class="space-y-5">
                    <div><label class="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name <span class="text-red-500">*</span></label><input type="text" id="new-fullname" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="e.g. John Doe"></div>
                    <div><label class="block text-xs font-bold text-gray-700 uppercase mb-1">ID Number <span class="text-red-500">*</span></label><input type="text" id="new-idnumber" maxlength="13" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="13-digit SA ID"></div>
                    <div class="grid grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-gray-700 uppercase mb-1">Phone</label><input type="tel" id="new-phone" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="082..."></div><div><label class="block text-xs font-bold text-gray-700 uppercase mb-1">Email (Optional)</label><input type="email" id="new-email" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Leave empty if none"></div></div>
                    <button id="btn-create-client" class="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all shadow-md mt-2 flex justify-center items-center gap-2"><i class="fa-solid fa-user-plus"></i> Create & Select Client</button>
                </div>
            </div>` : ''}
            
            <div id="selected-user-card" class="${inBranchState.targetUser ? '' : 'hidden'} mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xl shadow-sm">${inBranchState.targetUser?.full_name?.charAt(0) || 'U'}</div>
                    <div><h4 class="font-bold text-gray-900">${inBranchState.targetUser?.full_name || ''}</h4><p class="text-xs text-gray-600 font-mono">ID: ${inBranchState.targetUser?.identity_number || 'N/A'}</p></div>
                </div>
                <button id="clear-user-btn" class="text-gray-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-times text-xl"></i></button>
            </div>
        </div>
    `;
    
    const tabSearch = document.getElementById('tab-search'); const tabCreate = document.getElementById('tab-create');
    const viewSearch = document.getElementById('view-search'); const viewCreate = document.getElementById('view-create');
    const input = document.getElementById('user-search'); const results = document.getElementById('user-results');
    
    if (canCreateWalkIn && tabCreate) {
        tabSearch.addEventListener('click', () => { viewSearch.classList.remove('hidden'); viewCreate.classList.add('hidden'); tabSearch.classList.add('text-orange-600', 'border-b-2', 'border-orange-600'); tabSearch.classList.remove('text-gray-500'); tabCreate.classList.remove('text-orange-600', 'border-b-2', 'border-orange-600'); tabCreate.classList.add('text-gray-500'); });
        tabCreate.addEventListener('click', () => { viewSearch.classList.add('hidden'); viewCreate.classList.remove('hidden'); tabCreate.classList.add('text-orange-600', 'border-b-2', 'border-orange-600'); tabCreate.classList.remove('text-gray-500'); tabSearch.classList.remove('text-orange-600', 'border-b-2', 'border-orange-600'); tabSearch.classList.add('text-gray-500'); });
        
        document.getElementById('btn-create-client')?.addEventListener('click', async () => {
            const fullName = document.getElementById('new-fullname').value.trim(); const idNumber = document.getElementById('new-idnumber').value.trim();
            const phone = document.getElementById('new-phone').value.trim(); const email = document.getElementById('new-email').value.trim();
            if(!fullName || !idNumber) { showToast("Full Name and ID Number required.", 'warning'); return; }
            
            const { createWalkInClient } = await import('../services/dataService.js');
            const { data, error } = await createWalkInClient({ fullName, idNumber, phone, email: email || null });
            
            if(error) showToast(error.message, 'error');
            else { 
                inBranchState.targetUser = data; 
                renderUserSelection(container); 
                updateWizardButtons(); 
            }
        });
    }
    
    if(input) {
        input.addEventListener('input', (e) => {
            const val = e.target.value.trim(); if(val.length < 2) { results.classList.add('hidden'); return; }
            setTimeout(async () => {
                const { data: matches } = await supabase.from('profiles').select('*').or(`full_name.ilike.%${val}%,email.ilike.%${val}%,identity_number.ilike.%${val}%`).limit(5);
                if(matches && matches.length > 0) {
                    results.innerHTML = matches.map(u => `<div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 user-option" data-id="${u.id}"><div class="font-bold text-gray-800">${u.full_name}</div><div class="text-xs text-gray-500 font-mono">ID: ${u.identity_number || 'N/A'}</div></div>`).join('');
                    results.classList.remove('hidden');
                    document.querySelectorAll('.user-option').forEach(el => el.addEventListener('click', () => { inBranchState.targetUser = matches.find(u => u.id === el.dataset.id); renderUserSelection(container); updateWizardButtons(); }));
                } else { 
                    results.innerHTML = `<div class="p-4 text-sm text-gray-500">No clients found.</div>`; 
                    results.classList.remove('hidden'); 
                }
            }, 400);
        });
    }
    document.getElementById('clear-user-btn')?.addEventListener('click', () => { inBranchState.targetUser = null; renderUserSelection(container); updateWizardButtons(); });
}

// ==========================================
//   STEP 2: CREDIT CHECK
// ==========================================

async function renderCreditCheck(container) {
    if(!inBranchState.targetUser) return;
    
    const { data: checks } = await supabase
        .from('credit_checks')
        .select('*')
        .eq('user_id', inBranchState.targetUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

    const latestCheck = checks && checks.length > 0 ? checks[0] : null;
    let statusHtml = '';
    let canProceed = false;

    if (latestCheck && latestCheck.status === 'completed') {
        inBranchState.creditScore = latestCheck.credit_score;
        inBranchState.creditCheck = { applicationId: latestCheck.application_id, status: 'completed', score: latestCheck.credit_score };
        canProceed = true;
        statusHtml = `
            <div class="text-center">
                <div class="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-4"><i class="fa-solid fa-shield-check"></i></div>
                <h3 class="text-xl font-bold text-gray-900">Credit Check Passed</h3>
                <p class="text-gray-600 mt-2">Score: <strong>${latestCheck.credit_score}</strong></p>
                <p class="text-xs text-gray-400 mt-1">Date: ${formatDate(latestCheck.checked_at)}</p>
            </div>`;
    } else {
        inBranchState.creditCheck = { applicationId: latestCheck?.application_id || null, status: 'pending', score: null };
        statusHtml = `
            <div class="text-center">
                <div class="w-20 h-20 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-4xl mx-auto mb-4"><i class="fa-solid fa-user-clock"></i></div>
                <h3 class="text-xl font-bold text-gray-900">Credit Check Required</h3>
                <p class="text-gray-600 mt-2">Launch the Experian capture form to run a live bureau report.</p>
                <button id="run-check-btn" class="mt-6 bg-brand-accent text-white px-6 py-2 rounded-md hover:bg-brand-accent-hover transition">Launch Credit Check Module</button>
            </div>`;
    }
    container.innerHTML = `<div class="max-w-xl mx-auto bg-white p-8 rounded-lg border border-gray-200 shadow-sm mt-4">${statusHtml}</div>`;
    
    const btn = document.getElementById('run-check-btn');
    if (btn) btn.addEventListener('click', () => { window.openCreditCheckModal(); });
    
    document.getElementById('wizard-next-btn').disabled = !canProceed;
}

// ==========================================
//   STEP 3: FINANCIALS
// ==========================================

async function renderFinancialsForm(container) {
    const { data: profile } = await supabase.from('financial_profiles').select('*').eq('user_id', inBranchState.targetUser.id).maybeSingle();
    const parsed = profile?.parsed_data || { income: {}, expenses: {} };
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Financial Assessment</h3>
            <form id="financials-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Salary</label><input type="number" id="fin_salary" value="${parsed.income.salary || ''}" class="w-full border-gray-300 rounded-md"></div>
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Other Income</label><input type="number" id="fin_other" value="${parsed.income.other_monthly_earnings || ''}" class="w-full border-gray-300 rounded-md"></div>
                </div>
                <hr>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Housing/Rent</label><input type="number" id="exp_housing" value="${parsed.expenses.housing_rent || ''}" class="w-full border-gray-300 rounded-md"></div>
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Transport</label><input type="number" id="exp_transport" value="${parsed.expenses.petrol || ''}" class="w-full border-gray-300 rounded-md"></div>
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Food</label><input type="number" id="exp_food" value="${parsed.expenses.groceries || ''}" class="w-full border-gray-300 rounded-md"></div>
                    <div><label class="text-xs font-bold text-gray-500 uppercase">Other</label><input type="number" id="exp_other" value="${parsed.expenses.other || ''}" class="w-full border-gray-300 rounded-md"></div>
                </div>
                <button type="submit" class="w-full bg-gray-900 text-white py-2 rounded-md font-bold mt-4">Save Financials & Continue</button>
            </form>
        </div>`;
        
    document.getElementById('financials-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const income = (parseFloat(document.getElementById('fin_salary').value)||0) + (parseFloat(document.getElementById('fin_other').value)||0);
        const expenses = (parseFloat(document.getElementById('exp_housing').value)||0) + (parseFloat(document.getElementById('exp_transport').value)||0) + (parseFloat(document.getElementById('exp_food').value)||0) + (parseFloat(document.getElementById('exp_other').value)||0);
        
        if(income <= 0) { showToast("Please enter valid income.", 'warning'); return; }
        
        const payload = { 
            user_id: inBranchState.targetUser.id, 
            monthly_income: income, 
            monthly_expenses: expenses, 
            parsed_data: { 
                income: { salary: document.getElementById('fin_salary').value, other_monthly_earnings: document.getElementById('fin_other').value }, 
                expenses: { housing_rent: document.getElementById('exp_housing').value, petrol: document.getElementById('exp_transport').value, groceries: document.getElementById('exp_food').value, other: document.getElementById('exp_other').value } 
            } 
        };
        
        const { error } = await supabase.from('financial_profiles').upsert(payload, { onConflict: 'user_id' });
        
        if(error) showToast(error.message, 'error'); 
        else { 
            showToast('Financials Saved', 'success'); 
            handleNextStep(); 
        }
    });
}

// ==========================================
//   STEP 4: DECLARATIONS (UPDATED FOR ALL COLUMNS)
// ==========================================

async function renderDeclarationsForm(container) {
    if(!inBranchState.targetUser) return;
    
    // Fetch existing declaration data
    const { data: existing } = await supabase.from('declarations').select('*').eq('user_id', inBranchState.targetUser.id).maybeSingle();
    const meta = existing?.metadata || {};
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Declarations & Demographics</h3>
            <div class="space-y-4">
                
                <div class="grid grid-cols-2 gap-4">
                   <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Marital Status</label>
                      <select id="decl_marital" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                         <option value="single">Single</option>
                         <option value="married">Married</option>
                         <option value="divorced">Divorced</option>
                         <option value="widowed">Widowed</option>
                      </select>
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Home Ownership</label>
                      <select id="decl_home" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                         <option value="rent">Rent</option>
                         <option value="own">Own</option>
                         <option value="family">Family</option>
                      </select>
                   </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                   <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Highest Qualification</label>
                      <select id="decl_qual" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                         <option value="none">None / Primary School</option>
                         <option value="matric">Matric / Grade 12</option>
                         <option value="diploma">Diploma</option>
                         <option value="degree">Bachelor's Degree</option>
                         <option value="postgrad">Postgraduate</option>
                      </select>
                   </div>
                   <div class="flex items-center mt-6">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="decl_disadvantaged" class="w-5 h-5 text-brand-accent border-gray-300 rounded">
                            <span class="text-sm text-gray-700">Historically Disadvantaged?</span>
                        </label>
                   </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <label class="flex items-center gap-2 cursor-pointer mb-3">
                        <input type="checkbox" id="decl_referral_provided" class="w-5 h-5 text-brand-accent border-gray-300 rounded">
                        <span class="text-sm font-bold text-gray-700">Was a referral provided?</span>
                    </label>
                    <div id="referral-fields" class="grid grid-cols-2 gap-4 hidden">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Referral Name</label>
                            <input type="text" id="decl_ref_name" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Referral Phone</label>
                            <input type="tel" id="decl_ref_phone" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                        </div>
                    </div>
                </div>

                <hr class="border-gray-100">

                <label class="flex items-center gap-3 p-3 border rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                   <input type="checkbox" id="decl_terms" class="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-brand-accent">
                   <span class="text-sm text-gray-700">Client accepts Standard Terms & Conditions</span>
                </label>
                <label class="flex items-center gap-3 p-3 border rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                   <input type="checkbox" id="decl_truth" class="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-brand-accent">
                   <span class="text-sm text-gray-700">Client declares all information is true and correct</span>
                </label>
                
                <button id="save-declarations" class="w-full bg-gray-900 text-white py-2 rounded-md font-bold mt-4 hover:bg-black transition">Confirm Declarations</button>
            </div>
        </div>
    `;

    // --- LOGIC: Toggle Referral Fields ---
    const toggleReferral = () => {
        const checked = document.getElementById('decl_referral_provided').checked;
        const fields = document.getElementById('referral-fields');
        if (checked) fields.classList.remove('hidden'); else fields.classList.add('hidden');
    };
    document.getElementById('decl_referral_provided').addEventListener('change', toggleReferral);

    // --- LOGIC: Prefill Existing Data ---
    if (existing) {
        if(existing.marital_status) document.getElementById('decl_marital').value = existing.marital_status;
        if(existing.home_ownership) document.getElementById('decl_home').value = existing.home_ownership;
        if(existing.highest_qualification) document.getElementById('decl_qual').value = existing.highest_qualification;
        if(existing.historically_disadvantaged) document.getElementById('decl_disadvantaged').checked = true;
        
        if(existing.referral_provided) {
            document.getElementById('decl_referral_provided').checked = true;
            toggleReferral();
            if(existing.referral_name) document.getElementById('decl_ref_name').value = existing.referral_name;
            if(existing.referral_phone) document.getElementById('decl_ref_phone').value = existing.referral_phone;
        }
    }

    // --- LOGIC: Save ---
    document.getElementById('save-declarations').addEventListener('click', async () => {
        if(!document.getElementById('decl_terms').checked || !document.getElementById('decl_truth').checked) { 
            showToast("All declarations must be accepted.", 'warning'); 
            return; 
        }

        const referralProvided = document.getElementById('decl_referral_provided').checked;

        const payload = {
            user_id: inBranchState.targetUser.id,
            marital_status: document.getElementById('decl_marital').value,
            home_ownership: document.getElementById('decl_home').value,
            highest_qualification: document.getElementById('decl_qual').value,
            historically_disadvantaged: document.getElementById('decl_disadvantaged').checked,
            referral_provided: referralProvided,
            referral_name: referralProvided ? document.getElementById('decl_ref_name').value : null,
            referral_phone: referralProvided ? document.getElementById('decl_ref_phone').value : null,
            accepted_std_conditions: true,
            metadata: {
               marital_status: document.getElementById('decl_marital').value,
               home_ownership: document.getElementById('decl_home').value
            }
        };

        // Upsert to DB
        const { error } = await supabase.from('declarations').upsert(payload, { onConflict: 'user_id' });
        
        if(error) {
            console.error(error);
            showToast('Error saving declarations: ' + error.message, 'error');
        } else {
            showToast('Declarations Saved!', 'success');
            handleNextStep();
        }
    });
}

// ==========================================
//   STEP 5: LOAN CONFIG
// ==========================================

async function renderLoanConfiguration(container) {
    if(inBranchState.targetUser && inBranchState.loanHistoryCount === 0) {
         const { data, error } = await supabase.from('loans').select('id').eq('user_id', inBranchState.targetUser.id).eq('status', 'repaid');
         if(!error) inBranchState.loanHistoryCount = data?.length || 0;
    }
    
    // Loan Cap Logic
    if (inBranchState.loanHistoryCount < 3) { 
        inBranchState.loanConfig.maxAllowedPeriod = 1; 
        inBranchState.loanConfig.interestRate = 0.20; 
    } else { 
        inBranchState.loanConfig.maxAllowedPeriod = 12; 
        inBranchState.loanConfig.interestRate = 0.18; 
    }
    
    if (inBranchState.loanConfig.period > inBranchState.loanConfig.maxAllowedPeriod) {
        inBranchState.loanConfig.period = 1;
    }

    const { amount, period, reason, startDate } = inBranchState.loanConfig;
    const calc = calculateLoanDetails(amount, period, startDate, inBranchState.loanHistoryCount);
    
    container.innerHTML = `
        <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Configure Loan</h3>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR)</label>
                    <input type="number" id="loan-amount" value="${amount}" min="100" max="10000" step="100" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Period (Months)</label>
                    <select id="loan-period" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                        <option value="1" ${period == 1 ? 'selected' : ''}>1 Month</option>
                        ${inBranchState.loanConfig.maxAllowedPeriod > 1 ? `<option value="2" ${period == 2 ? 'selected' : ''}>2 Months</option><option value="3" ${period == 3 ? 'selected' : ''}>3 Months</option><option value="6" ${period == 6 ? 'selected' : ''}>6 Months</option>` : ''}
                    </select>
                    ${inBranchState.loanConfig.maxAllowedPeriod === 1 ? '<p class="text-xs text-orange-600 mt-1"><i class="fa-solid fa-lock"></i> Limited to 1 month (New Client)</p>' : ''}
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">First Repayment Date</label>
                    <input type="date" id="loan-start-date" class="w-full border-gray-300 rounded-md focus:ring-brand-accent" value="${startDate ? startDate.toISOString().split('T')[0] : ''}">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                    <input type="text" id="loan-reason" value="${reason}" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                </div>
            </div>
            
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-md flex flex-col justify-between">
                <div>
                    <h4 class="text-gray-400 text-sm uppercase tracking-wider mb-2">Quote Summary</h4>
                    <div class="flex justify-between items-end border-b border-gray-700 pb-4 mb-4">
                        <span class="text-3xl font-bold text-white">${formatCurrency(amount)}</span>
                        <span class="text-gray-400 mb-1">Principal</span>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-gray-400">Interest Rate</span> <span>${(calc.interestRate * 100).toFixed(0)}%</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Duration</span> <span>${period} Month${period > 1 ? 's' : ''}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Initiation Fee</span> <span>${formatCurrency(calc.totalInitiationFees)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Admin Fees</span> <span>${formatCurrency(calc.totalMonthlyFees)}</span></div>
                        <div class="flex justify-between border-t border-gray-600 pt-2"><span class="text-gray-300">Total Interest</span> <span>${formatCurrency(calc.totalInterest)}</span></div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t border-gray-700">
                    <div class="flex justify-between items-center"><span class="text-gray-400">Total Repayment</span><span class="text-xl font-bold text-green-400">${formatCurrency(calc.totalRepayment)}</span></div>
                    <div class="flex justify-between items-center mt-1"><span class="text-xs text-gray-500">Monthly Payment</span><span class="text-sm text-gray-300">${formatCurrency(calc.monthlyPayment)}</span></div>
                </div>
            </div>
        </div>`;
        
    const updateState = () => { 
        inBranchState.loanConfig.amount = Number(document.getElementById('loan-amount').value); 
        inBranchState.loanConfig.period = Number(document.getElementById('loan-period').value); 
        const dateValue = document.getElementById('loan-start-date').value; 
        inBranchState.loanConfig.startDate = dateValue ? new Date(dateValue) : null; 
        inBranchState.loanConfig.reason = document.getElementById('loan-reason').value; 
        renderLoanConfiguration(container); 
    };
    
    document.getElementById('loan-amount').addEventListener('change', updateState); 
    document.getElementById('loan-period').addEventListener('change', updateState); 
    document.getElementById('loan-start-date').addEventListener('change', updateState); 
    document.getElementById('loan-reason').addEventListener('change', updateState);
}

function calculateLoanDetails(amount, period, startDate, historyCount) {
    const MONTHLY_FEE = 60; 
    const INITIATION_FEE = 165; 
    const DAYS_PER_MONTH = 30;
    
    let interestRate = historyCount < 3 ? 0.20 : 0.18;
    let totalMonthlyFees = 0;
    
    if (startDate && period === 1) {
        const start = new Date(); 
        const paymentDate = new Date(startDate);
        const days = Math.max(1, Math.ceil((paymentDate - start) / (1000 * 60 * 60 * 24)));
        totalMonthlyFees = (MONTHLY_FEE / DAYS_PER_MONTH) * Math.min(days, DAYS_PER_MONTH);
    } else { 
        totalMonthlyFees = MONTHLY_FEE * period; 
    }
    
    const totalInterest = amount * interestRate * (period / 12);
    const totalInitiationFees = INITIATION_FEE * period;
    const totalFees = totalMonthlyFees + totalInitiationFees;
    const totalRepayment = amount + totalInterest + totalFees;
    const monthlyPayment = totalRepayment / period;
    
    return { totalInterest, totalRepayment, monthlyPayment, totalMonthlyFees, totalInitiationFees, interestRate };
}

// ==========================================
//   STEP 6: DOCUMENTS (ADMIN FOLDER STRATEGY)
// ==========================================

async function renderDocumentCheck(container) {
    if(!inBranchState.targetUser) return;
    
    // 1. Get Current Admin ID (You)
    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id;
    
    if (!adminId) {
        showToast("Error: Could not identify Admin user", "error");
        return;
    }

    // 2. Ensure Application ID Exists
    let applicationId = inBranchState.creditCheck?.applicationId;
    if (!applicationId) {
        // ... (Keep your existing auto-create logic here) ...
        try {
            const { data: newApp, error } = await supabase.from('loan_applications').insert([{ 
                user_id: inBranchState.targetUser.id, 
                status: 'STARTED', 
                amount: inBranchState.loanConfig.amount || 0, 
                term_months: inBranchState.loanConfig.period || 1, 
                purpose: 'In-branch', 
                source: 'IN_BRANCH', 
                created_by_admin: adminId
            }]).select().single();
            if (error) throw error;
            applicationId = newApp.id;
            inBranchState.creditCheck.applicationId = applicationId;
        } catch (err) { console.error(err); }
    }

    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 mt-4">
            <h3 class="text-lg font-bold text-gray-800 mb-6">Required Documents</h3>
            <div class="space-y-4" id="docs-list"><div class="p-4 text-center"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div></div>
        </div>`;
        
    const docTypes = [{ key: 'idcard', label: 'ID Document' }, { key: 'payslip', label: 'Latest Payslip' }, { key: 'bankstatement', label: 'Bank Statement' }];
    
    const listHtml = await Promise.all(docTypes.map(async (doc) => {
        // Fetch from DB
        const { data: dbRecords } = await supabase.from('document_uploads')
            .select('*').eq('user_id', inBranchState.targetUser.id).eq('file_type', doc.key)
            .order('created_at', { ascending: false }).limit(1);

        const record = dbRecords?.[0];
        const exists = !!record;
        const statusColor = exists ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-200';
        const icon = exists ? 'fa-check-circle' : 'fa-upload';
        
        let viewButton = '';
        if (record?.file_path) {
            viewButton = `<button class="text-xs text-blue-600 underline self-center mr-2 view-doc-btn" data-path="${record.file_path}">View</button>`;
        }

        return `
            <div class="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${statusColor}"><i class="fa-solid ${icon}"></i></div>
                    <div><p class="font-medium text-gray-900">${doc.label}</p><p class="text-xs text-gray-500">${exists ? 'Uploaded' : 'Missing'}</p></div>
                </div>
                <div class="flex gap-2">${viewButton}
                    <label class="cursor-pointer bg-white border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-50">
                        ${exists ? 'Replace' : 'Upload'}
                        <input type="file" class="hidden doc-upload" data-type="${doc.key}" accept=".pdf,.jpg,.png,.jpeg">
                    </label>
                </div>
            </div>`;
    }));
    
    document.getElementById('docs-list').innerHTML = listHtml.join('');
    
    // VIEW HANDLER
    document.querySelectorAll('.view-doc-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const { data, error } = await supabase.storage.from('client_docs').createSignedUrl(e.target.dataset.path, 60);
                if (error) throw error;
                window.open(data.signedUrl, '_blank');
            } catch (err) { showToast(err.message, 'error'); }
        });
    });
    
    // UPLOAD HANDLER
    document.querySelectorAll('.doc-upload').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0]; 
            if(!file) return;
            const type = e.target.dataset.type;
            
            // UI Update
            const label = e.target.parentElement; 
            label.childNodes[0].textContent = 'Uploading...';
            
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${type}_${Date.now()}.${fileExt}`;
                
                // --- THE KEY CHANGE IS HERE ---
                // Upload to ADMIN folder (You), but name it with CLIENT ID
                const filePath = `${adminId}/${inBranchState.targetUser.id}_${fileName}`;
                
                // 1. Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from('client_docs')
                    .upload(filePath, file); // No more RLS error, because it's YOUR folder!
                
                if (uploadError) throw new Error("Storage: " + uploadError.message);

                // 2. Register in Database (Using the System Function)
                const { error: dbError } = await supabase.rpc('register_admin_upload', {
                    p_user_id: inBranchState.targetUser.id,
                    p_app_id: applicationId,
                    p_file_name: fileName,
                    p_original_name: file.name,
                    p_file_path: filePath, // Saving the Admin path so we can find it later
                    p_file_type: type,
                    p_mime_type: file.type,
                    p_file_size: file.size
                });

                if (dbError) throw new Error("Database: " + dbError.message);
                
                showToast('Uploaded!', 'success');
                await renderDocumentCheck(container); 
                
            } catch (err) { 
                console.error(err);
                showToast(err.message, 'error'); 
            } finally {
                label.childNodes[0].textContent = 'Upload';
            }
        });
    });
}

// ==========================================
//   STEP 7: CONFIRMATION
// ==========================================

async function renderConfirmation(container) {
    if(!inBranchState.targetUser) return;
    
    const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('user_id', inBranchState.targetUser.id);
    const accountsHtml = accounts && accounts.length ? accounts.map(acc => `<option value="${acc.id}">${acc.bank_name} - ${acc.account_number}</option>`).join('') : '<option value="">No saved accounts</option>';
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg border border-gray-200 mt-4">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Disbursement Details</h3>
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
                <select id="bank-select" class="w-full border-gray-300 rounded-md focus:ring-brand-accent">
                    ${accountsHtml}
                    <option value="new">+ Add New Bank Account</option>
                </select>
            </div>
            <div class="border-t border-gray-200 pt-6">
                <h4 class="font-bold text-gray-900 mb-2">Application Summary</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                    <li><strong>Applicant:</strong> ${inBranchState.targetUser.full_name}</li>
                    <li><strong>Amount:</strong> ${formatCurrency(inBranchState.loanConfig.amount)}</li>
                    <li><strong>Term:</strong> ${inBranchState.loanConfig.period} Month(s)</li>
                </ul>
            </div>
            <div class="mt-6 flex items-start gap-3">
                <input type="checkbox" id="admin-consent" class="mt-1 rounded text-brand-accent focus:ring-brand-accent">
                <label for="admin-consent" class="text-sm text-gray-500">I confirm that I have verified the client's identity in-branch and they have consented to the terms and conditions.</label>
            </div>
        </div>`;
        
    const checkbox = document.getElementById('admin-consent'); 
    const submitBtn = document.getElementById('wizard-next-btn'); 
    submitBtn.disabled = true;
    
    checkbox.addEventListener('change', (e) => { 
        submitBtn.disabled = !e.target.checked; 
    });
}

async function handleFinalSubmit() {
    const btn = document.getElementById('wizard-next-btn'); 
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...'; 
    btn.disabled = true;
    
    try {
        const { amount, period, reason, startDate } = inBranchState.loanConfig;
        const calc = calculateLoanDetails(amount, period, startDate, inBranchState.loanHistoryCount);
        const existingApplicationId = inBranchState.creditCheck?.applicationId;
        const finalStatus = inBranchState.creditCheck?.status === 'completed' ? 'BUREAU_OK' : 'STARTED';
        const firstPaymentDate = startDate instanceof Date && !Number.isNaN(startDate?.getTime()) ? startDate.toISOString() : null;
        
        const payload = { 
            user_id: inBranchState.targetUser.id, 
            amount: amount, 
            term_months: period, 
            purpose: reason, 
            status: finalStatus, 
            offer_details: { 
                interest_rate: calc.interestRate, 
                total_repayment: calc.totalRepayment, 
                monthly_payment: calc.monthlyPayment, 
                first_payment_date: firstPaymentDate 
            } 
        };

        if (existingApplicationId) {
            const { error } = await supabase.from('loan_applications').update(payload).eq('id', existingApplicationId);
            if (error) throw error;
        } else {
            const { data: newApp, error } = await supabase.from('loan_applications').insert([payload]).select().single();
            if (error) throw error;
            inBranchState.creditCheck.applicationId = newApp.id;
        }
        
        showToast('Application Created Successfully!', 'success');
        document.getElementById('in-branch-view').classList.add('hidden'); 
        document.getElementById('applications-list-view').classList.remove('hidden');
        await loadApplications(); 
        
    } catch (err) { 
        showToast('Error: ' + err.message, 'error'); 
        btn.disabled = false; 
        btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Submit Application'; 
    }
}

// ==========================================
//   NAVIGATION & UTILS
// ==========================================

function handleNextStep() { 
    if(inBranchState.step < 7) { 
        inBranchState.step++; 
        renderWizard(); 
    } 
}

document.addEventListener('click', (e) => { 
    // Wizard Navigation
    if(e.target.id === 'wizard-prev-btn' && inBranchState.step > 1) { 
        inBranchState.step--; 
        renderWizard(); 
    } 
    if(e.target.id === 'back-to-list-btn' && confirm('Exit in-branch mode? Unsaved progress will be lost.')) { 
        document.getElementById('in-branch-view').classList.add('hidden'); 
        document.getElementById('applications-list-view').classList.remove('hidden'); 
    }

    // Localhost Logout Fix
    if(e.target.id === 'sign-out-btn' || e.target.closest('#sign-out-btn')) {
        e.preventDefault();
        supabase.auth.signOut().then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        });
    }
});

async function handleBulkSync() {
  const syncButton = document.getElementById('sync-offered-btn'); 
  if (!syncButton) return;
  
  if (!confirm('Sync all OFFERED applications?')) return;
  
  syncButton.disabled = true; 
  syncButton.innerHTML = 'Syncing...';
  
  try { 
      await syncAllOfferedApplications(); 
      showToast('Synced!', 'success'); 
      await loadApplications(); 
  } catch (e) { 
      showToast(e.message, 'error'); 
  } finally { 
      syncButton.disabled = false; 
      syncButton.innerHTML = 'Sync Offered'; 
  }
}

const renderApplications = (apps) => { 
    const tb = document.getElementById('applications-table-body'); 
    if(!tb) return; 
    
    if (apps.length === 0) {
        tb.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No applications match your criteria.</td></tr>`;
        return;
    }
    
    tb.innerHTML = apps.map(app => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div>${app.profiles?.full_name||'N/A'}</div>
                <div class="text-xs text-gray-500">${app.id}</div>
            </td>
            <td class="px-6 py-4">${formatCurrency(app.amount)}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-bold rounded ${getBadgeColor(app.status)}">${app.status}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">${formatDate(app.created_at)}</td>
            <td class="px-6 py-4 text-right">
                <a href="/admin/application-detail?id=${app.id}" class="text-orange-600 hover:underline">View</a>
            </td>
        </tr>
    `).join('');
};

const renderSearchSuggestions = (apps) => {
    const searchSuggestions = document.getElementById('search-suggestions'); 
    if (!searchSuggestions) return;
    
    if (apps.length === 0) { 
        searchSuggestions.innerHTML = ''; 
        searchSuggestions.classList.add('hidden'); 
        return; 
    }
    
    searchSuggestions.innerHTML = apps.map(app => `
        <a href="/admin/application-detail?id=${app.id}" class="block p-3 hover:bg-orange-50 cursor-pointer border-b border-gray-200 last:border-b-0">
            <p class="font-semibold text-gray-800">${app.profiles?.full_name || 'N/A'}</p>
            <p class="text-xs text-gray-500">ID: ${app.id} | Status: ${app.status}</p>
        </a>
    `).join('');
    
    searchSuggestions.classList.remove('hidden');
};

const filterAndSearch = () => { 
    const term = document.getElementById('search-input')?.value.toLowerCase().trim() || ''; 
    const status = document.getElementById('status-filter')?.value || 'all'; 
    
    let filtered = allApplications.filter(a => 
        (status === 'all' || a.status === status) && 
        (a.profiles?.full_name?.toLowerCase().includes(term) || String(a.id).includes(term))
    ); 
    
    renderApplications(filtered); 
    
    if (document.activeElement === document.getElementById('search-input') && term.length > 1) {
        renderSearchSuggestions(filtered.slice(0, 5));
    } else {
        document.getElementById('search-suggestions')?.classList.add('hidden');
    }
};

async function loadApplications() { 
    const { data, error } = await fetchLoanApplications(); 
    if(!error) { 
        allApplications = data; 
        filterAndSearch(); 
    } else { 
        console.error(error); 
    }
}

// --- Init ---
function attachEventListeners() {
    document.getElementById('search-input')?.addEventListener('input', filterAndSearch);
    document.getElementById('status-filter')?.addEventListener('change', filterAndSearch);
    document.getElementById('create-app-btn')?.addEventListener('click', startInBranchFlow);
    document.getElementById('sync-offered-btn')?.addEventListener('click', handleBulkSync);
    
    document.addEventListener('click', (e) => { 
        const sug = document.getElementById('search-suggestions'); 
        if (sug && !document.getElementById('search-input').contains(e.target) && !sug.contains(e.target)) {
            sug.classList.add('hidden'); 
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => { 
    const auth = await initLayout(); 
    if(auth) { 
        userRole = auth.role; 
        renderPageContent(); 
        await loadApplications(); 
    } 
});
