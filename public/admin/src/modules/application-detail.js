import { initLayout } from '../shared/layout.js';
import { formatCurrency, formatDate } from '../shared/utils.js';
import { 
  fetchApplicationDetail, 
  updateApplicationStatus, 
  createPayout, 
  deletePayout, 
  updateApplicationNotes 
} from '../services/dataService.js';
import { supabase } from '../services/supabaseClient.js'; 
import { 
  sendContract, 
  getSubmissionStatus, 
  getApplicationSubmissions, 
  getEmbedUrl, 
  resendContract, 
  voidSubmission, 
  isDocuSealConfigured,
  getSubmitterIdFromSubmission
} from '../services/docusealService.js';

let currentApplication = null;
let actionToConfirm = null;
let isContractDeclinedUI = false;
let originalStatusBeforeDecline = null;
let contractStatusPoller = null;
let hasAutoAdvancedToSigned = false;
let isHandlingContractCompletion = false;
const CONTRACT_POLL_INTERVAL = 5000;

// --- 1. Status Options (RESTRICTED) ---
const ALL_STATUS_OPTIONS = [
    { value: 'STARTED', label: 'Step 1: New Application' },
    { value: 'BANK_LINKING', label: 'Bank Analysis' },
    { value: 'AFFORD_OK', label: 'Step 3: Affordability OK' },
    { value: 'AFFORD_REFER', label: 'Affordability Refer' },
    { value: 'OFFERED', label: 'Step 4: Contract Sent' },
    { value: 'OFFER_ACCEPTED', label: 'Contract Signed' },
    { value: 'READY_TO_DISBURSE', label: 'Step 6: Queue Disburse' },
    { value: 'DECLINED', label: 'Declined' }
];

// --- 2. Page Template ---
const pageTemplate = `
<div id="application-detail-content" class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div id="loading-state" class="text-center p-20">
    <i class="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600"></i>
    <p class="mt-4 text-gray-600 font-medium animate-pulse">Loading Complete Application Data...</p>
  </div>

  <div id="page-header" class="mb-8 hidden animate-fade-in">
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
       <a href="/admin/applications" class="hover:text-orange-600 transition-colors">Applications</a>
       <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
       <span id="breadcrumb-name" class="font-medium text-gray-900">Applicant</span>
    </nav>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
       <div>
         <h1 id="applicant-name-header" class="text-3xl font-extrabold text-gray-900 tracking-tight">Loading...</h1>
         <div class="flex items-center gap-3 mt-2">
            <p class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-mono">ID: <span id="header-id-val">...</span></p>
            <span id="header-date" class="text-sm text-gray-500"></span>
         </div>
       </div>
       <span id="header-status-badge" class="px-5 py-2 text-sm font-bold rounded-full bg-gray-200 text-gray-700 shadow-sm uppercase tracking-wide">Status</span>
    </div>
  </div>

  <div id="content-grid" class="grid grid-cols-1 lg:grid-cols-12 gap-8 hidden animate-slide-up">
    
    <div class="lg:col-span-8 flex flex-col gap-6">
      
       <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div class="flex overflow-x-auto scrollbar-hide border-b border-gray-100">
            <button class="tab-btn active flex-1 py-4 px-4 text-sm font-bold text-center border-b-2 border-orange-600 text-orange-600 bg-orange-50/50 transition-all whitespace-nowrap" data-tab="personal">Personal</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="financial">Financial & Credit</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="documents">Documents</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="loan">Loan & History</button>
         </div>
       </div>

       <div id="tab-contents" class="relative min-h-[400px]">
       
          <div id="personal-tab" class="tab-pane bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-gray-400"></i> Personal Information
             </h3>
             
             <div class="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-100">
                <div class="shrink-0 mx-auto md:mx-0">
                   <div class="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                      <img id="profile-image" src="" alt="Profile" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'">
                   </div>
                </div>
                <div class="flex-grow grid grid-cols-1 gap-y-5">
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Full Name</span>
                      <div class="sm:col-span-2">
                         <div id="detail-fullname" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-semibold"></div>
                      </div>
                   </div>
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Email Address</span>
                      <div class="sm:col-span-2">
                         <div id="detail-email" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"></div>
                      </div>
                   </div>
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Mobile Number</span>
                      <div class="sm:col-span-2">
                         <div id="detail-mobile" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"></div>
                      </div>
                   </div>
                </div>
             </div>
             <h4 class="text-md font-bold text-gray-900 mb-4">Linked Bank Accounts</h4>
             <div id="bank-accounts-container" class="space-y-3">
                </div>
          </div>

          <div id="financial-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6">Financial Snapshot</h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="p-5 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 shadow-sm">
                   <div class="flex items-center gap-3 mb-2">
                      <div class="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-up"></i></div>
                      <span class="text-xs font-bold text-green-700 uppercase tracking-wider">Monthly Income</span>
                   </div>
                   <div id="fin-income" class="text-2xl font-bold text-gray-900">R 0.00</div>
                </div>
                <div class="p-5 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100 shadow-sm">
                   <div class="flex items-center gap-3 mb-2">
                      <div class="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-down"></i></div>
                      <span class="text-xs font-bold text-red-700 uppercase tracking-wider">Monthly Expenses</span>
                   </div>
                   <div id="fin-expenses" class="text-2xl font-bold text-gray-900">R 0.00</div>
                </div>
             </div>
             <div class="pt-8 border-t border-gray-100">
                <div class="flex justify-between items-center mb-6">
                   <h4 class="text-lg font-bold text-gray-900">Credit Bureau Report</h4>
                   <div class="flex items-center gap-3">
                      <span id="credit-date" class="text-sm text-gray-500 font-medium"></span>
                      <button id="btn-download-xml" class="hidden text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-2">
                         <i class="fa-solid fa-file-code"></i> Download XML
                      </button>
                   </div>
                </div>
                <div id="credit-check-content" class="bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
                   </div>
             </div>
          </div>

          <div id="documents-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-gray-900">All User Documents</h3>
                <span id="doc-count" class="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">0</span>
             </div>
             <div id="documents-list" class="grid grid-cols-1 gap-4">
                </div>
          </div>

          <div id="loan-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6">Current Application Data</h3>
             <div class="space-y-6 mb-10">
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Application ID</span>
                   <div class="sm:col-span-2 font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded-md inline-block border border-gray-200" id="detail-app-id"></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Submitted Date</span>
                   <div class="sm:col-span-2 text-sm text-gray-900" id="detail-date"></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Loan Purpose</span>
                   <div class="sm:col-span-2 text-sm text-gray-900 font-medium" id="detail-purpose"></div>
                </div>
                <div class="pt-2">
                   <label class="text-sm font-medium text-gray-700 block mb-2">Admin Notes</label>
                   
                   <textarea id="detail-notes" class="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700 h-32 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none" placeholder="Add internal notes here..."></textarea>
                   <div class="mt-2 text-right">
                       <button id="btn-save-notes" class="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-all shadow-sm">
                           <i class="fa-solid fa-floppy-disk mr-1"></i> Save Notes
                       </button>
                   </div>

                </div>
             </div>
             
             <h3 class="text-lg font-bold text-gray-900 mb-4 border-t border-gray-100 pt-8">Client History</h3>
             <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Previous Loans</h4>
                <div id="loan-history-list" class="space-y-2">
                   <p class="text-sm text-gray-400 italic">No previous loan history found.</p>
                </div>
             </div>
             <div>
                <h4 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Other Applications</h4>
                <div id="app-history-list" class="space-y-2">
                   <p class="text-sm text-gray-400 italic">No other applications on record.</p>
                </div>
             </div>
          </div>
       </div>

           <div id="contract-status-card" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
              <i class="fa-solid fa-file-signature text-orange-600"></i> Contract Status
            </h3>
            <div id="contract-status-empty" class="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center">
              No contracts sent yet.
            </div>
            <div id="contract-status-section" class="hidden mt-4 border-t border-gray-100 pt-4">
              <h4 class="text-xs font-bold text-gray-400 uppercase mb-3">History</h4>
              <div id="contract-status-content" class="space-y-2">
                </div>
            </div>
           </div>
    </div>

    <div class="lg:col-span-4">
       <div class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 sticky top-28 overflow-hidden">
          <div class="p-6 border-b border-gray-100 bg-gray-50/50">
             <h3 class="font-bold text-gray-900">Loan Status</h3>
             <div id="status-alert" class="mt-3 p-3 rounded-lg text-xs font-medium leading-relaxed hidden animate-pulse">
                </div>
          </div>

          <div class="p-6 space-y-6">
             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Requested Amount</label>
                <div id="sidebar-amount" class="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">R 0.00</div>
             </div>
             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Term Length</label>
                <div class="mt-2 flex items-center gap-2">
                   <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center"><i class="fa-regular fa-calendar"></i></div>
                   <div id="sidebar-term" class="text-lg font-semibold text-gray-800">0 Months</div>
                </div>
             </div>

             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Est. Monthly Payment</label>
                <div class="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                   <div id="sidebar-payment" class="text-xl font-bold text-gray-800">R 0.00</div>
                   <div class="text-xs text-gray-400 mt-1">(Principal Only)</div>
                </div>
             </div>

             <div id="financial-breakdown" class="pt-4 border-t border-gray-100 space-y-4">
                </div>

             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Status</label>
                <div id="sidebar-status" class="mt-2 text-lg font-bold text-orange-600">Pending</div>
             </div>
          </div>
          
          <div class="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3" id="action-buttons-container">
              </div>

          <div class="p-6 bg-white border-t border-gray-200">
              <label class="text-xs font-bold text-gray-400 uppercase mb-2 block">Manual Override (Restricted)</label>
              <div class="flex gap-2">
                  <select id="status-override-select" class="flex-1 text-xs border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                      ${ALL_STATUS_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                  </select>
                  <button id="manual-update-btn" onclick="manualStatusChange()" class="px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition">
                      Update
                  </button>
              </div>
              <p id="override-hint" class="text-[10px] text-gray-400 mt-1 italic">Use only for corrections. Bureau statuses locked.</p>
          </div>

       </div>
    </div>
  </div>

  <div id="feedback-container" class="fixed bottom-6 right-6 z-50 hidden"></div>
</div>
`;

// --- 2. Utilities & Helpers ---

const getBadgeColor = (status) => {
  if (!status) return 'bg-gray-100 text-gray-800 border border-gray-200';
  switch (status) {
    case 'READY_TO_DISBURSE': 
    case 'approved': 
    case 'DISBURSED':
    case 'AFFORD_OK':
    case 'BUREAU_OK':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'declined':
    case 'DECLINED':
    case 'AFFORD_FAIL':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'OFFERED':
    case 'OFFER_ACCEPTED':
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  }
};

const updateHeaderStatusBadge = (status) => {
  const badge = document.getElementById('header-status-badge');
  if (!badge || !status) return;
  badge.textContent = status;
  badge.className = `px-4 py-1.5 text-sm font-bold rounded-full shadow-sm ${getBadgeColor(status)}`;
};

const downloadBlob = (content, filename, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const showFeedback = (message, type = 'success') => {
  const feedbackContainer = document.getElementById('feedback-container');
  if (!feedbackContainer) return;

  const isSuccess = type === 'success';
  feedbackContainer.innerHTML = `
    <div class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${isSuccess ? 'bg-white border-green-100' : 'bg-white border-red-100'} transform transition-all duration-300">
        <div class="w-8 h-8 rounded-full ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center">
            <i class="fa-solid ${isSuccess ? 'fa-check' : 'fa-exclamation'}"></i>
        </div>
        <div>
            <p class="text-sm font-bold text-gray-900">${isSuccess ? 'Success' : 'Error'}</p>
            <p class="text-xs text-gray-500">${message}</p>
        </div>
    </div>
  `;
  feedbackContainer.classList.remove('hidden');
  setTimeout(() => { feedbackContainer.classList.add('hidden'); }, 5000);
};

// --- 3. Logic Implementation ---
// ===== DocuSeal Functions =====
const initDocuSealCard = async () => {
  const emptyState = document.getElementById('contract-status-empty');
  const statusSection = document.getElementById('contract-status-section');

  // Check if DocuSeal is configured
  if (!isDocuSealConfigured()) {
    stopContractStatusPolling();
    if (statusSection) statusSection.classList.add('hidden');
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
          <div class="flex items-start gap-3">
            <i class="fa-solid fa-triangle-exclamation text-yellow-600 text-xl mt-0.5"></i>
            <div>
              <h4 class="font-semibold text-yellow-900 mb-1">DocuSeal Not Configured</h4>
              <p class="text-sm text-yellow-700">
                E-signature features are currently disabled. Please configure DocuSeal API credentials to enable contract tracking.
              </p>
            </div>
          </div>
        </div>
      `;
    }
    return;
  }

  if (emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = 'No contracts sent yet.';
  }

  await loadContractStatus();
};

const handleSendContract = async (triggerButton = null) => {
  if (!currentApplication || !currentApplication.profiles) {
    alert('Error: Application data not loaded');
    return;
  }
  const btn = triggerButton || document.getElementById('btn-send-contract');
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  }
  try {
    const submission = await sendContract(currentApplication, currentApplication.profiles);
    // Show success message
    alert(`✅ Contract sent successfully to ${currentApplication.profiles.email}`);
    await updateApplicationStatus(currentApplication.id, 'OFFERED');
    // Reload contract status
    await loadContractStatus();
    await loadApplicationData();
  } catch (error) {
    console.error('Send contract error:', error);
    alert(`❌ Failed to send contract: ${error.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }
};

const handlePreviewContract = () => {
  // Open DocuSeal template in new tab
  const templateUrl = `https://docuseal.co/templates/${import.meta.env.VITE_DOCUSEAL_TEMPLATE_ID || 'your_template_id'}`;
  window.open(templateUrl, '_blank');
};

const shouldPollContractStatus = () => {
  if (!currentApplication) return false;
  const status = currentApplication.status || '';
  return ['OFFERED'].includes(status);
};

const startContractStatusPolling = () => {
  if (contractStatusPoller || !shouldPollContractStatus()) return;
  contractStatusPoller = setInterval(() => {
    loadContractStatus(true);
  }, CONTRACT_POLL_INTERVAL);
};

const stopContractStatusPolling = () => {
  if (contractStatusPoller) {
    clearInterval(contractStatusPoller);
    contractStatusPoller = null;
  }
};

const handleContractCompleted = async () => {
  if (isHandlingContractCompletion || hasAutoAdvancedToSigned || !currentApplication) return;
  isHandlingContractCompletion = true;
  hasAutoAdvancedToSigned = true;
  stopContractStatusPolling();
  try {
    if (currentApplication.status !== 'OFFER_ACCEPTED') {
      const { error } = await updateApplicationStatus(currentApplication.id, 'OFFER_ACCEPTED');
      if (error) {
        console.error('Auto advance to Contract Signed failed:', error);
        hasAutoAdvancedToSigned = false;
        return;
      }
      currentApplication.status = 'OFFER_ACCEPTED';
      currentApplication.contract_signed_at = new Date().toISOString();
    }
    renderSidePanel(currentApplication);
    updateHeaderStatusBadge('OFFER_ACCEPTED');
    showFeedback('Contract signed! Advanced to approval phase.', 'success');
    await loadApplicationData();
  } catch (error) {
    console.error('handleContractCompleted error:', error);
    hasAutoAdvancedToSigned = false;
  } finally {
    isHandlingContractCompletion = false;
  }
};

const loadContractStatus = async (isPoll = false) => {
  if (!currentApplication?.id) return;
  try {
    const submissions = await getApplicationSubmissions(currentApplication.id);
    const statusSection = document.getElementById('contract-status-section');
    const emptyState = document.getElementById('contract-status-empty');
    if (submissions.length === 0) {
      if (statusSection) statusSection.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.textContent = 'No contracts sent yet.';
      }
      stopContractStatusPolling();
      markContractDeclinedState(false);
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (statusSection) statusSection.classList.remove('hidden');
    // Render submissions
    renderContractSubmissions(submissions);
    const latestStatus = submissions[0]?.status?.toLowerCase?.() || '';
    markContractDeclinedState(latestStatus === 'declined');
    if (latestStatus === 'completed' && !hasAutoAdvancedToSigned) {
      await handleContractCompleted();
    } else if (latestStatus !== 'completed' && !isPoll) {
      startContractStatusPolling();
    }
  } catch (error) {
    console.error('Load contract status error:', error);
  }
};

const renderContractSubmissions = (submissions) => {
  const container = document.getElementById('contract-status-content');
  if (!container) return;
  container.innerHTML = submissions.map(sub => {
    const statusColor = getSubmissionStatusColor(sub.status);
    const statusIcon = getSubmissionStatusIcon(sub.status);
    return `
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg ${statusColor.bg} ${statusColor.text} flex items-center justify-center">
              <i class="${statusIcon}"></i>
            </div>
            <div>
              <div class="font-semibold text-gray-900 text-sm">Contract #${sub.submission_id.slice(-8)}</div>
              <div class="text-xs text-gray-500">Sent ${formatDate(sub.created_at)}</div>
            </div>
          </div>
          <span class="px-3 py-1 text-xs font-bold rounded-full ${statusColor.badge}">${sub.status}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="window.viewSubmission('${sub.slug}')" class="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold">
            <i class="fa-solid fa-eye mr-1"></i> View
          </button>
          ${sub.status === 'pending' ? `
            <button onclick="window.resendSubmission('${sub.submitter_id}', '${sub.submission_id}')" class="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-semibold">
              <i class="fa-solid fa-paper-plane mr-1"></i> Resend
            </button>
          ` : ''}
          ${sub.status !== 'completed' && sub.status !== 'voided' ? `
            <button onclick="window.voidSubmission('${sub.submission_id}')" class="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-xs font-semibold">
              <i class="fa-solid fa-ban mr-1"></i> Void
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
};

const markContractDeclinedState = (isDeclined) => {
  if (typeof isDeclined !== 'boolean' || !currentApplication) return;

  if (isDeclined === isContractDeclinedUI) return;
  isContractDeclinedUI = isDeclined;

  const bannerId = 'contract-declined-banner';
  const existingBanner = document.getElementById(bannerId);
  const contractCard = document.getElementById('contract-status-card');

  if (isDeclined) {
    if (!originalStatusBeforeDecline && currentApplication.status !== 'DECLINED') {
      originalStatusBeforeDecline = currentApplication.status;
    }
    currentApplication.status = 'DECLINED';
    updateHeaderStatusBadge('DECLINED');
    renderSidePanel(currentApplication);

    if (!existingBanner && contractCard) {
      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.className = 'mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2';
      banner.innerHTML = `
        <i class="fa-solid fa-circle-xmark text-red-500"></i>
        <span>Contract was declined by the applicant.</span>
      `;
      const heading = contractCard.querySelector('h3');
      if (heading && heading.parentNode) {
        heading.parentNode.insertBefore(banner, heading.nextSibling);
      } else {
        contractCard.prepend(banner);
      }
    }
  } else {
    if (existingBanner) existingBanner.remove();
    if (originalStatusBeforeDecline) {
      currentApplication.status = originalStatusBeforeDecline;
    }
    originalStatusBeforeDecline = null;
    renderSidePanel(currentApplication);
    updateHeaderStatusBadge(currentApplication.status);
  }
};

const getSubmissionStatusColor = (status) => {
  const normalized = (status || '').toLowerCase();
  const colors = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' },
    expired: { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
    voided: { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' },
    declined: { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' }
  };
  return colors[normalized] || colors.pending;
};

const getSubmissionStatusIcon = (status) => {
  const normalized = (status || '').toLowerCase();
  const icons = {
    pending: 'fa-solid fa-clock',
    completed: 'fa-solid fa-check-circle',
    expired: 'fa-solid fa-exclamation-circle',
    voided: 'fa-solid fa-ban',
    declined: 'fa-solid fa-circle-xmark'
  };
  return icons[normalized] || icons.pending;
};

// Global functions for button onclick handlers
window.viewSubmission = (slug) => {
  window.open(getEmbedUrl(slug), '_blank');
};
window.resendSubmission = async (submitterId, submissionId = null) => {
  if (!confirm('Resend contract email to the applicant?')) return;
  try {
    let targetSubmitterId = submitterId;
    if (!targetSubmitterId) {
      if (!submissionId) {
        throw new Error('Unable to determine DocuSeal submitter');
      }
      targetSubmitterId = await getSubmitterIdFromSubmission(submissionId);
    }

    await resendContract(targetSubmitterId);
    alert('✅ Contract email resent successfully');
    await loadContractStatus();
  } catch (error) {
    alert(`❌ Failed to resend: ${error.message}`);
  }
};
window.voidSubmission = async (submissionId) => {
  if (!confirm('Void this contract submission? This cannot be undone.')) return;
  try {
    await voidSubmission(submissionId);
    alert('✅ Submission voided successfully');
    await loadContractStatus();
  } catch (error) {
    alert(`❌ Failed to void: ${error.message}`);
  }
};

const initTabs = () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
     btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
           b.classList.remove('active', 'text-orange-600', 'border-orange-600', 'bg-orange-50/50');
           b.classList.add('text-gray-500', 'border-transparent');
        });
        btn.classList.remove('text-gray-500', 'border-transparent');
        btn.classList.add('active', 'text-orange-600', 'border-orange-600', 'bg-orange-50/50');
        tabPanes.forEach(pane => pane.classList.add('hidden'));
        const targetId = btn.getAttribute('data-tab') + '-tab';
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.remove('hidden');
     });
  });
};

// --- Status Update Logic ---
window.updateStatus = async (newStatus) => {
    const { error } = await updateApplicationStatus(currentApplication.id, newStatus);
    if (error) {
        showFeedback(error.message, 'error');
    } else {
        showFeedback(`Status updated to ${newStatus}`, 'success');
        loadApplicationData();
    }
    closeModal();
};

// --- Save Notes Logic (NEW) ---
window.saveNotes = async () => {
    const noteText = document.getElementById('detail-notes').value;
    const btn = document.getElementById('btn-save-notes');
    
    if(!noteText.trim()) return; // Don't save empty

    // UX State
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...`;

    try {
        const { error } = await updateApplicationNotes(currentApplication.id, noteText);
        if (error) throw error;
        
        showFeedback('Notes saved successfully', 'success');
        
        // Optional: Blink success
        btn.innerHTML = `<i class="fa-solid fa-check mr-1"></i> Saved!`;
        btn.classList.remove('bg-gray-800');
        btn.classList.add('bg-green-600');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.classList.remove('bg-green-600');
            btn.classList.add('bg-gray-800');
        }, 2000);

    } catch (err) {
        showFeedback(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// --- Manual Override Logic ---
window.manualStatusChange = async () => {
    if (currentApplication.status === 'DISBURSED') {
        alert("⛔ ACTION BLOCKED\n\nThis application has already been disbursed. To maintain financial integrity, you cannot change the status of an active loan.");
        return;
    }

    const select = document.getElementById('status-override-select');
    const newStatus = select.value;
    
    if(newStatus === currentApplication.status) return;

    if(newStatus.includes('BUREAU')) {
        alert("Cannot manually override Bureau statuses. These are automated.");
        return;
    }

    if(confirm(`Are you sure you want to manually force status to "${newStatus}"?`)) {
        const { error } = await updateApplicationStatus(currentApplication.id, newStatus);
        if(error) showFeedback(error.message, 'error');
        else {
            showFeedback('Status manually updated.', 'success');
            loadApplicationData();
        }
    }
};

const modal = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

const openModal = (title, body, confirmAction) => {
  if(modalTitle) modalTitle.textContent = title;
  if(modalBody) modalBody.textContent = body;
  actionToConfirm = confirmAction;
  if(modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
  } else {
      if(confirm(body)) confirmAction();
  }
};

const closeModal = () => {
  if(modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
  }
  actionToConfirm = null;
};

// Final Approval
const approveApplication = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  const payoutData = {
    application_id: currentApplication.id,
    user_id: currentApplication.user_id,
    amount: currentApplication.amount,
    status: 'pending_disbursement'
  };

  const { error: payoutError } = await createPayout(payoutData);
  if (payoutError) {
    showFeedback(payoutError.message, 'error');
    closeModal();
    return;
  }
  
  const { error } = await supabase
    .from('loan_applications')
    .update({ status: 'READY_TO_DISBURSE', reviewed_by_admin: user?.id })
    .eq('id', currentApplication.id);
  
  if (error) {
    await deletePayout(currentApplication.id);
    showFeedback(error.message, 'error');
  } else {
    showFeedback('Application approved. Sent to disbursement queue.', 'success');
    loadApplicationData();
  }
  closeModal();
};

const declineApplication = async () => {
  const { error } = await updateApplicationStatus(currentApplication.id, 'DECLINED');
  if (error) {
    showFeedback(error.message, 'error');
  } else {
    showFeedback('Application declined.', 'success');
    loadApplicationData();
  }
  closeModal();
};

// --- 4. Render Functions ---

const renderPersonalDetails = (profile, bankAccounts) => {
  const name = profile?.full_name || 'Unknown User';
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`;
  document.getElementById('profile-image').src = avatarUrl;
  document.getElementById('detail-fullname').textContent = name;
  document.getElementById('detail-email').textContent = profile?.email || 'N/A';
  document.getElementById('detail-mobile').textContent = profile?.contact_number || 'N/A';
  
  const bankContainer = document.getElementById('bank-accounts-container');
  if (!bankContainer) return;
  bankContainer.innerHTML = '';

  if (bankAccounts && bankAccounts.length > 0) {
    bankAccounts.forEach(acc => {
      const div = document.createElement('div');
      div.className = 'p-4 border border-gray-200 rounded-xl bg-white flex justify-between items-center hover:border-orange-300 hover:shadow-sm transition-all';
      div.innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <i class="fa-solid fa-building-columns"></i>
            </div>
            <div>
                <p class="text-sm font-bold text-gray-900">${acc.bank_name || 'Unknown Bank'}</p>
                <p class="text-xs text-gray-500 font-mono">${acc.account_number || '----'} • ${acc.account_type || 'Savings'}</p>
            </div>
        </div>
        ${acc.is_primary ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold border border-green-200">Primary</span>' : ''}
      `;
      bankContainer.appendChild(div);
    });
  } else {
    bankContainer.innerHTML = '<div class="text-sm text-gray-500 italic p-4 border border-dashed border-gray-300 rounded-xl text-center">No bank accounts linked to this profile.</div>';
  }
};

const renderFinancials = (financials, creditChecks) => {
  const fin = (financials && financials[0]) ? financials[0] : {};
  document.getElementById('fin-income').textContent = formatCurrency(fin.monthly_income || 0);
  document.getElementById('fin-expenses').textContent = formatCurrency(fin.monthly_expenses || 0);
  
  const creditContainer = document.getElementById('credit-check-content');
  const creditDate = document.getElementById('credit-date');
  const xmlBtn = document.getElementById('btn-download-xml');
  if (!creditContainer) return;
  
  const latest = (creditChecks && creditChecks.length > 0) ? creditChecks[0] : null;
  if (latest) {
      const score = latest.credit_score || 0;
      const scoreColor = score > 600 ? 'text-green-600' : (score > 500 ? 'text-yellow-600' : 'text-red-600');
      if(creditDate) creditDate.textContent = `Checked on ${formatDate(latest.checked_at || latest.created_at || new Date())}`;

      if (xmlBtn) {
        if (latest.raw_xml_data) {
            xmlBtn.classList.remove('hidden');
            xmlBtn.onclick = () => downloadBlob(latest.raw_xml_data, `credit_report_${latest.id}.xml`, 'text/xml');
        } else {
            xmlBtn.classList.add('hidden');
        }
      }

      creditContainer.innerHTML = `
        <div class="p-6 border-b border-gray-200 text-center bg-white">
            <div class="text-6xl font-extrabold ${scoreColor} mb-2 tracking-tighter">${score}</div>
            <p class="font-bold text-gray-700 uppercase tracking-wide text-xs">Credit Score</p>
            <span class="inline-block mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200">${latest.score_band || 'Unknown Band'}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-gray-50">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-gray-800">${latest.total_accounts || 0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Total Acc</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-red-600">${latest.accounts_with_arrears || 0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Arrears</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-orange-600">${latest.total_enquiries || 0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Enquiries</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-gray-800">${latest.total_judgments || 0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Judgments</span>
            </div>
        </div>
        <div class="p-6 bg-white border-t border-gray-200 space-y-4">
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-sm text-gray-500">Total Balance</span>
                <span class="font-bold text-gray-900">${formatCurrency(latest.total_balance || 0)}</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-sm text-gray-500">Monthly Instalments</span>
                <span class="font-bold text-gray-900">${formatCurrency(latest.total_monthly_payment || 0)}</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-sm text-gray-500">Total Arrears</span>
                <span class="font-bold text-red-600">${formatCurrency(latest.total_arrears_amount || 0)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Judgment Value</span>
                <span class="font-bold text-red-600">${formatCurrency(latest.total_judgment_amount || 0)}</span>
            </div>
        </div>
        ${latest.risk_category ? `<div class="p-4 bg-red-50 text-red-700 text-xs font-medium text-center border-t border-red-100">Risk Category: ${latest.risk_category}</div>` : ''}
      `;
  } else {
      if(creditDate) creditDate.textContent = '';
      if(xmlBtn) xmlBtn.classList.add('hidden');
      creditContainer.innerHTML = `<div class="py-12 text-center text-gray-400"><p>No credit check data.</p></div>`;
  }
};

const renderDocuments = (docs) => {
  const docList = document.getElementById('documents-list');
  const docCount = document.getElementById('doc-count');
  if (!docList || !docCount) return;

  let safeDocs = Array.isArray(docs) ? [...docs] : [];
  
  // Add Contract Signature if available
  if (currentApplication?.offer_details?.signature_data) {
      safeDocs.push({
        file_name: 'Contract Signature.png',
        file_type: 'digital_signature',
        virtual_src: currentApplication.offer_details.signature_data,
        uploaded_at: currentApplication.contract_signed_at || currentApplication.updated_at
      });
  }
  
  docCount.textContent = safeDocs.length;
  docList.innerHTML = '';

  if (safeDocs.length === 0) {
      docList.innerHTML = `<div class="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500">No documents found.</div>`;
      return;
  }

  const typePriority = { 'digital_signature': 0, 'id_card_front': 1, 'id_card_back': 2, 'id_document': 3, 'bank_statement': 4, 'payslip': 5 };
  safeDocs.sort((a, b) => (typePriority[a.file_type] || 99) - (typePriority[b.file_type] || 99));

  safeDocs.forEach(doc => {
      const name = doc.file_name || doc.name || 'Document';
      const dateStr = doc.uploaded_at || new Date().toISOString();
      const rawType = doc.file_type || 'document';
      const prettyType = rawType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const iconClass = rawType === 'digital_signature' ? 'fa-signature' : 'fa-file-pdf';
      
      // Determine if this is a virtual file (signature) or a storage file
      const isVirtual = !!doc.virtual_src;
      const storagePath = doc.file_path || doc.storage_path;

      const div = document.createElement('div');
      div.className = 'flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-orange-300 transition-all group';
      
      let actionButton = '';
      
      if (isVirtual) {
          // Direct download for base64 signatures
          actionButton = `<a href="${doc.virtual_src}" download="${name}" class="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-600 transition-all"><i class="fa-solid fa-download"></i></a>`;
      } else if (storagePath) {
          // SMART DOWNLOAD BUTTON for Storage Files
          actionButton = `<button onclick="handleSmartDownload('${storagePath}')" class="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-600 transition-all cursor-pointer"><i class="fa-solid fa-download"></i></button>`;
      } else {
          actionButton = '<span class="text-xs text-red-400 font-bold">Missing File</span>';
      }

      div.innerHTML = `
        <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 mr-4"><i class="fa-solid ${iconClass} text-xl"></i></div>
        <div class="flex-grow min-w-0">
            <p class="text-sm font-bold text-gray-900 truncate">${name}</p>
            <div class="flex items-center gap-2 mt-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider border border-gray-200">${prettyType}</span>
                <span class="text-xs text-gray-300">|</span>
                <p class="text-xs text-gray-500">${formatDate(dateStr)}</p>
            </div>
        </div>
        ${actionButton}
      `;
      docList.appendChild(div);
  });
};

window.handleSmartDownload = async (path) => {
    try {
        // 1. Try 'client_docs' bucket first (In-Branch)
        let { data, error } = await supabase.storage
            .from('client_docs')
            .createSignedUrl(path, 60);

        // 2. If not found, try 'documents' bucket (Online Apps)
        if (error) {
             ({ data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(path, 60));
        }

        if (error) throw error;
        
        // Open the valid link
        window.open(data.signedUrl, '_blank');

    } catch (err) {
        console.error("Smart Download Error:", err);
        alert("Unable to download file. It may have been deleted or moved.");
    }
};

const renderLoanHistory = (loans, appHistory, currentApp) => {
  const loanList = document.getElementById('loan-history-list');
  const appList = document.getElementById('app-history-list');
  
  if (loanList) {
      loanList.innerHTML = '';
      if (loans && loans.length > 0) {
        loans.forEach(loan => {
            const div = document.createElement('div');
            div.className = 'p-3 border-b border-gray-100 last:border-0';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <span class="block font-bold text-gray-800 text-sm">Loan #${loan.id}</span>
                        <span class="text-xs text-gray-500">${formatDate(loan.start_date || loan.created_at)}</span>
                    </div>
                    <div class="text-right">
                        <span class="block font-bold text-gray-900 text-sm">${formatCurrency(loan.principal_amount || 0)}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold uppercase">${loan.status || 'Active'}</span>
                    </div>
                </div>
            `;
            loanList.appendChild(div);
        });
      } else {
        loanList.innerHTML = `<p class="text-sm text-gray-400 italic p-2">No previous loan history found.</p>`;
      }
  }

  if (appList) {
      appList.innerHTML = '';
      if (appHistory && appHistory.length > 0) {
        appHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-3 border-b border-gray-100 last:border-0';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold block text-gray-800 text-sm">App #${item.id}</span>
                        <span class="text-xs text-gray-500">${formatDate(item.created_at)}</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-gray-600 font-medium text-sm">${formatCurrency(item.amount || 0)}</span>
                        <span class="text-[10px] uppercase font-bold text-orange-500">${item.status}</span>
                    </div>
                </div>
            `;
            appList.appendChild(div);
        });
      } else {
        appList.innerHTML = `<p class="text-sm text-gray-400 italic p-2">No other applications on record.</p>`;
      }
  }

  // Render Admin Metadata (Created By / Reviewed By)
  const adminSection = document.getElementById('admin-metadata-container');
  if (!adminSection && currentApp) {
      const container = document.getElementById('loan-tab');
      const metaDiv = document.createElement('div');
      metaDiv.id = 'admin-metadata-container';
      metaDiv.className = 'mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4';
      
      const creatorName = currentApp.creator?.full_name || 'System / User';
      const reviewerName = currentApp.reviewer?.full_name || 'Pending Review';

      metaDiv.innerHTML = `
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">Created By</p>
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600"><i class="fa-solid fa-user"></i></div>
                <span class="text-sm font-semibold text-gray-700">${creatorName}</span>
            </div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">Reviewed By</p>
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600"><i class="fa-solid fa-user-check"></i></div>
                <span class="text-sm font-semibold text-gray-700">${reviewerName}</span>
            </div>
        </div>
      `;
      container.appendChild(metaDiv);
  }
};

const renderSidePanel = (app) => {
  if (!app) return;
  const status = app.status || 'pending';
  const statusEl = document.getElementById('sidebar-status');
  const alertEl = document.getElementById('status-alert');
  const actionsContainer = document.getElementById('action-buttons-container');

  // --- FINANCIAL CALCULATIONS (Live) ---
  const principal = parseFloat(app.amount || 0);
  const term = parseInt(app.term_months || 1);
  const offer = app.offer_details || {};
  const annualRate = offer.interest_rate ? parseFloat(offer.interest_rate) : 0.20;
  const monthlyRate = annualRate / 12;
  const monthlyInterest = principal * monthlyRate;
  const monthlyFee = 60.00;
  const totalMonthlyPayment = (principal/term) + monthlyInterest + monthlyFee;
  const totalInterest = monthlyInterest * term;
  const totalRepayment = totalMonthlyPayment * term;

  document.getElementById('sidebar-amount').textContent = formatCurrency(principal);
  document.getElementById('sidebar-term').textContent = `${term} Months`;
  document.getElementById('sidebar-payment').textContent = formatCurrency(totalMonthlyPayment);

  // Inject Financial Breakdown
  const breakdown = document.getElementById('financial-breakdown');
  if(!breakdown) {
      // Create it if missing (inserted dynamically after sidebar-payment block)
      const paymentBlock = document.getElementById('sidebar-payment').parentElement.parentElement;
      const div = document.createElement('div');
      div.id = 'financial-breakdown';
      div.className = "pt-4 border-t border-gray-100 space-y-4";
      paymentBlock.after(div);
  }
  document.getElementById('financial-breakdown').innerHTML = `
    <div><label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Interest Rate</label><div class="font-bold text-gray-900">${(annualRate * 100).toFixed(0)}%</div></div>
    <div><label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Interest</label><div class="font-bold text-orange-600">${formatCurrency(totalInterest)}</div></div>
    <div><label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Repayment</label><div class="font-bold text-gray-900">${formatCurrency(totalRepayment)}</div></div>
  `;

  if (statusEl) {
      statusEl.textContent = status.replace('_', ' ');
      statusEl.className = `mt-2 text-lg font-bold uppercase tracking-wide ${getBadgeColor(status).split(' ')[0].replace('bg-', 'text-').replace('-100', '-600')}`;
  }

  // Update status dropdown
  const statusSelect = document.getElementById('status-override-select');
  if(statusSelect) statusSelect.value = status;

  // --- VISUAL LOCKING LOGIC ---
  const manualSelect = document.getElementById('status-override-select');
  const manualBtn = document.getElementById('manual-update-btn');
  const hint = document.getElementById('override-hint');
  
  if (status === 'DISBURSED') {
      if(manualSelect) manualSelect.disabled = true;
      if(manualBtn) {
          manualBtn.disabled = true;
          manualBtn.classList.add('opacity-50', 'cursor-not-allowed');
          manualBtn.innerText = "Locked";
      }
      if(hint) hint.textContent = "🔒 Application is active. Modifications disabled.";
  } else {
      if(manualSelect) { manualSelect.disabled = false; manualSelect.value = status; }
      if(manualBtn) { manualBtn.disabled = false; manualBtn.innerText = "Update"; }
  }

  if (alertEl) {
      alertEl.className = 'mt-3 p-3 rounded-lg text-xs font-medium leading-relaxed hidden';
      if (status === 'OFFERED') {
          alertEl.textContent = "Contract Sent. Waiting for user to sign.";
          alertEl.classList.add('bg-purple-50', 'text-purple-700', 'block');
      } else if (status === 'READY_TO_DISBURSE') {
          alertEl.textContent = "Application is queued for disbursement.";
          alertEl.classList.add('bg-green-50', 'text-green-700', 'block');
      } else if (status.includes('BUREAU')) {
          alertEl.textContent = "System is performing automated checks.";
          alertEl.classList.add('bg-blue-50', 'text-blue-700', 'block');
      }
  }

  // --- DYNAMIC ACTION BUTTONS ---
  if (actionsContainer) {
      actionsContainer.innerHTML = '';

      // 1. ASSESSMENT PHASE
      if (['BUREAU_OK', 'BANK_LINKING', 'STARTED', 'AFFORD_REFER', 'BUREAU_REFER'].includes(status)) {
          
          const referMessage = (status === 'AFFORD_REFER' || status === 'BUREAU_REFER') 
            ? `<div class="p-3 bg-orange-50 border border-orange-100 rounded-lg mb-3 text-xs text-orange-700 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i> Currently Under Manual Review</div>` 
            : '';

          actionsContainer.innerHTML = `
            ${referMessage}
            <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Assessment</h4>
            <button onclick="updateStatus('AFFORD_OK')" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl mb-2 shadow-lg"><i class="fa-solid fa-check-circle mr-2"></i> Confirm Affordability</button>
            
            ${!status.includes('REFER') ? 
            `<button onclick="updateStatus('AFFORD_REFER')" class="w-full py-3 bg-white border border-orange-200 text-orange-600 text-sm font-bold rounded-xl mb-2"><i class="fa-solid fa-magnifying-glass mr-2"></i> Refer</button>` 
            : ''}
            
            <button onclick="updateStatus('DECLINED')" class="w-full py-3 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl"><i class="fa-solid fa-xmark mr-2"></i> Decline</button>
          `;
      } 
      // 2. CONTRACT PHASE
      else if (status === 'AFFORD_OK') {
          actionsContainer.innerHTML = `
            <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3 text-xs text-blue-700">Client passed assessment. Ready for Contract.</div>
            <button id="action-send-contract" class="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><i class="fa-solid fa-paper-plane"></i> Send Contract</button>
            <button id="action-preview-contract" class="w-full py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2"><i class="fa-solid fa-eye"></i> Preview Template</button>
          `;
          document.getElementById('action-send-contract')?.addEventListener('click', (event) => handleSendContract(event.currentTarget));
          document.getElementById('action-preview-contract')?.addEventListener('click', handlePreviewContract);
      }
      // 3. LOCKED PHASE (Waiting for User)
      else if (status === 'OFFERED') {
          actionsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mb-2">
                    <i class="fa-solid fa-clock"></i>
                </div>
                <p class="text-sm font-bold text-gray-800">Waiting for Client</p>
                <p class="text-xs text-gray-500 mt-1">Contract sent. Actions locked until client signs.</p>
            </div>
          `;
      }
      // 4. APPROVAL PHASE (Client Signed)
      else if (status === 'OFFER_ACCEPTED') {
          actionsContainer.innerHTML = `
             <div class="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-3 text-xs text-purple-700"><i class="fa-solid fa-signature mr-1"></i> Client Signed.</div>
             <button id="btn-approve-contract" class="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg"><i class="fa-solid fa-file-signature mr-2"></i> Approve & Queue Payout</button>
          `;
          document.getElementById('btn-approve-contract').onclick = () => openModal('Approve', 'Mark contract as valid and ready for payout?', approveApplication);
      }
      // 5. DISBURSEMENT PHASE
      else if (status === 'READY_TO_DISBURSE') {
          actionsContainer.innerHTML = `<div class="p-4 bg-green-50 border border-green-100 rounded-xl text-center"><p class="text-sm font-bold text-green-800">Queued for Payout</p></div>`;
      }
      // 6. RE-OFFER PHASE (Client Declined)
      else if (status === 'DECLINED') {
          actionsContainer.innerHTML = `
            <div class="p-3 bg-red-50 border border-red-100 rounded-lg mb-3 text-xs text-red-700"><i class="fa-solid fa-circle-xmark mr-1"></i> Application Declined</div>
            <button onclick="updateStatus('AFFORD_OK')" class="w-full py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl shadow-sm"><i class="fa-solid fa-rotate-right mr-2"></i> Draft New Offer</button>
          `;
      }
      // 7. AUTOMATED PHASE (Bureau)
      else if (status.includes('BUREAU')) {
          actionsContainer.innerHTML = `<div class="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center"><p class="text-sm font-bold text-blue-800"><i class="fa-solid fa-robot mr-2"></i> System Processing</p></div>`;
      }
      // 8. DISBURSED
      else if (status === 'DISBURSED') {
          actionsContainer.innerHTML = `<div class="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center"><p class="text-sm font-bold text-gray-600">Loan Active / Completed</p></div>`;
      }
  }
};

const renderHeader = (app) => {
  if (!app) return;
  document.getElementById('applicant-name-header').textContent = app.profiles?.full_name || 'Unknown';
  document.getElementById('header-id-val').textContent = app.id;
  document.getElementById('header-date').textContent = formatDate(app.created_at);
  
  // Populate detail tab fields
  document.getElementById('detail-app-id').textContent = `#${app.id}`;
  document.getElementById('detail-date').textContent = formatDate(app.created_at);
  document.getElementById('detail-purpose').textContent = app.purpose || 'Personal Loan';
  document.getElementById('detail-notes').value = app.notes || '';

  const badge = document.getElementById('header-status-badge');
  if (badge) {
      badge.textContent = app.status;
      badge.className = `px-4 py-1.5 text-sm font-bold rounded-full shadow-sm ${getBadgeColor(app.status)}`;
  }
};

const loadApplicationData = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const appId = urlParams.get('id');
  if (!appId) return;

  try {
      const data = await fetchApplicationDetail(appId);
      currentApplication = data;
      originalStatusBeforeDecline = null;
      isContractDeclinedUI = false;
      stopContractStatusPolling();
      hasAutoAdvancedToSigned = ['OFFER_ACCEPTED', 'READY_TO_DISBURSE', 'DISBURSED'].includes(data.status);
      document.getElementById('contract-declined-banner')?.remove();
      renderHeader(data);
      renderPersonalDetails(data.profiles || {}, data.bank_accounts);
      renderFinancials(data.financial_profiles, data.credit_checks);
      renderDocuments(data.documents);
      renderLoanHistory(data.loan_history, data.application_history, data);
      renderSidePanel(data);
      // Initialize DocuSeal card
      await initDocuSealCard();
      document.getElementById('loading-state')?.classList.add('hidden');
      document.getElementById('content-grid')?.classList.remove('hidden');
      document.getElementById('page-header')?.classList.remove('hidden');
  } catch (error) {
      console.error(error);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await initLayout();
  let mainContent = document.getElementById('main-content');
  if (!mainContent) {
      mainContent = document.createElement('main');
      mainContent.id = 'main-content';
      mainContent.className = 'flex-1 p-6 pt-24';
      document.getElementById('app-shell').appendChild(mainContent);
  }
  mainContent.innerHTML = pageTemplate;
  initTabs();
  await loadApplicationData();

  // Event Listeners
  document.getElementById('btn-save-notes')?.addEventListener('click', saveNotes);
  const btnConfirm = document.getElementById('modal-confirm-btn');
  const btnCancel = document.getElementById('modal-cancel-btn');
  if (btnConfirm) btnConfirm.addEventListener('click', () => { if (typeof actionToConfirm === 'function') actionToConfirm(); });
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
});