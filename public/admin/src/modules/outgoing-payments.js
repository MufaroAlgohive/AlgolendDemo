import { initLayout, getRole } from '../shared/layout.js';
import { formatCurrency, formatDate } from '../shared/utils.js';
import { 
  fetchPayouts,
  fetchPayoutStats,
  fetchPayoutsOverTime,
  fetchPayoutDetail,
  approvePayout, 
  updateApplicationStatus,
  fetchProfile,
  fetchApplicationDetail
} from '../services/dataService.js';

// --- State ---
let allPayouts = [];
let selectedPayoutIds = new Set();
let activeTab = 'pending';

const TAB_BASE_CLASS = 'tab-toggle flex-1 py-3 text-sm font-bold transition-colors';

// --- Main Page Rendering ---

function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div id="payout-stats-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      ${renderStatCardLoading('Total Disbursed')}
      ${renderStatCardLoading('Pending Queue')}
      ${renderStatCardLoading('Pending Value')}
    </div>
  
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-270px)]">
        
        <div class="md:col-span-1 lg:col-span-1 border-r border-gray-200 flex flex-col">
          
           <div class="flex border-b border-gray-200 bg-white">
             <button id="tab-pending" class="${TAB_BASE_CLASS} active">
                Pending Queue
             </button>
             <button id="tab-history" class="${TAB_BASE_CLASS}">
                History
             </button>
          </div>

          <div id="bulk-actions-toolbar" class="p-4 border-b border-gray-200 bg-gray-50 transition-all duration-300 overflow-hidden" style="max-height: 200px;">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Bulk Actions</h3>
                <span id="selection-count" class="selection-count-badge text-xs font-bold px-2 py-1 rounded-full hidden">0 Selected</span>
            </div>
            
            <div class="flex gap-2 mb-3">
                 <button id="btn-bulk-disburse" class="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm" disabled>
                    <i class="fa-solid fa-file-csv mr-1"></i> Disburse & CSV
                </button>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="select-all-checkbox" class="rounded border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer">
                <label for="select-all-checkbox" class="text-xs font-bold text-gray-600 cursor-pointer select-none">Select All Pending</label>
            </div>
          </div>

          <div class="p-3 border-b border-gray-200 bg-white">
             <input type="search" id="payout-search-input" placeholder="Search name..." class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-accent text-sm">
          </div>

          <div id="payout-list-container" class="flex-1 overflow-y-auto relative bg-white">
            <div class="p-10 text-center text-gray-500">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
            </div>
          </div>
        </div>
        
        <div id="payout-detail-panel" class="md:col-span-2 lg:col-span-3 overflow-y-auto p-6 bg-gray-50">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <i class="fa-solid fa-hand-holding-dollar text-4xl mb-3"></i>
            <p class="text-lg font-medium">Select a payout to view details</p>
          </div>
        </div>
        
      </div>
    </div>
  `;

  attachEventListeners();
}

/**
 * Renders the list of payout "cards"
 */
function renderPayoutList(payouts) {
  const listContainer = document.getElementById('payout-list-container');
  const selectAll = document.getElementById('select-all-checkbox');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  
  if (payouts.length === 0) {
    const msg = activeTab === 'pending' ? 'Queue is empty.' : 'No history found.';
    listContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-40 text-gray-400"><i class="fa-regular fa-folder-open text-2xl mb-2"></i><p class="text-sm">${msg}</p></div>`;
    if(selectAll) selectAll.disabled = true;
    return;
  }

  if(selectAll) selectAll.disabled = false;

  payouts.forEach(payout => {
    const isSelected = selectedPayoutIds.has(payout.id);
    const isPending = payout.status === 'pending_disbursement';
    
    const card = document.createElement('div');
    card.className = `payout-card-row flex items-center p-3 border-b border-gray-100 ${isSelected ? 'selected' : ''}`;
    
    const checkboxHtml = activeTab === 'pending' 
        ? `<div class="mr-3"><input type="checkbox" class="payout-checkbox rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer" data-id="${payout.id}" ${isSelected ? 'checked' : ''}></div>` 
        : `<div class="mr-3 w-4"></div>`;

    const badgeHtml = isPending 
        ? `<span class="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase font-bold">Ready</span>`
        : `<span class="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 uppercase font-bold">Disbursed</span>`;

    card.innerHTML = `
      ${checkboxHtml}
      <div class="flex-1 cursor-pointer card-clickable" data-id="${payout.id}">
        <div class="flex justify-between items-start">
            <p class="text-sm font-bold text-gray-900 truncate w-32">${payout.profile?.full_name || 'Unknown'}</p>
            <p class="text-sm font-bold text-gray-900">${formatCurrency(payout.amount)}</p>
        </div>
        <div class="flex justify-between items-center mt-1">
             ${badgeHtml}
             <span class="text-xs text-gray-400 font-mono">#${payout.application_id}</span>
        </div>
      </div>
    `;
    
    const checkbox = card.querySelector('.payout-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleSelection(payout.id, e.target.checked);
        });
    }

    const clickArea = card.querySelector('.card-clickable');
    clickArea.addEventListener('click', () => handlePayoutClick(payout.id));

    listContainer.appendChild(card);
  });
}

// --- Tab Logic ---
function switchTab(tabName) {
    activeTab = tabName;
    selectedPayoutIds.clear(); 
    
    const tabPending = document.getElementById('tab-pending');
    const tabHistory = document.getElementById('tab-history');
    const toolbar = document.getElementById('bulk-actions-toolbar');

    if (tabPending) {
      tabPending.className = `${TAB_BASE_CLASS} ${tabName === 'pending' ? 'active' : ''}`;
    }

    if (tabHistory) {
      tabHistory.className = `${TAB_BASE_CLASS} ${tabName === 'history' ? 'active' : ''}`;
    }

    if (tabName === 'pending') {
      toolbar.style.maxHeight = '200px';
      toolbar.style.padding = '1rem'; 
      toolbar.style.opacity = '1';
      toolbar.classList.remove('border-b-0');
    } else {
      toolbar.style.maxHeight = '0px';
      toolbar.style.padding = '0px';
      toolbar.style.opacity = '0';
      toolbar.classList.add('border-b-0');
    }

    updateBulkUI();
    filterAndRender();
}

// --- Selection Logic ---
function toggleSelection(id, isChecked) {
    if (isChecked) selectedPayoutIds.add(id);
    else selectedPayoutIds.delete(id);
    updateBulkUI();
}

function toggleSelectAll(isChecked) {
    const checkboxes = document.querySelectorAll('.payout-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const id = parseInt(cb.getAttribute('data-id'));
        if (isChecked) selectedPayoutIds.add(id);
        else selectedPayoutIds.delete(id);
    });
    updateBulkUI();
}

function updateBulkUI() {
    const countSpan = document.getElementById('selection-count');
    const btn = document.getElementById('btn-bulk-disburse');
    const count = selectedPayoutIds.size;

    if (count > 0) {
        countSpan.textContent = `${count} Selected`;
        countSpan.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-file-csv mr-1"></i> Disburse ${count} items`;
    } else {
        countSpan.classList.add('hidden');
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-file-csv mr-1"></i> Disburse & CSV`;
    }
}

// --- Bulk Disbursement Logic ---
async function handleBulkDisburse() {
    if (selectedPayoutIds.size === 0) return;

    const confirm = window.confirm(`Are you sure you want to mark ${selectedPayoutIds.size} items as DISBURSED and download the CSV?`);
    if (!confirm) return;

    const selectedItems = allPayouts.filter(p => selectedPayoutIds.has(p.id));
    
    downloadCSV(selectedItems);

    const btn = document.getElementById('btn-bulk-disburse');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
    btn.disabled = true;

    try {
        for (const payout of selectedItems) {
            await approvePayout(payout.id); 
            await updateApplicationStatus(payout.application_id, 'DISBURSED');
        }
        
        alert("Disbursement processed successfully!");
        selectedPayoutIds.clear();
        await loadData(); 
        document.getElementById('payout-detail-panel').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fa-solid fa-check-circle text-4xl mb-3 text-green-500"></i><p class="text-lg font-medium">Batch Complete</p></div>`;

    } catch (error) {
        console.error(error);
        alert("Some updates failed. Please refresh and check.");
        await loadData();
    } finally {
        btn.innerHTML = originalText;
    }
}

// --- CSV Export ---
function downloadCSV(items) {
  const headers = ["Payout ID", "Recipient Name", "Account Number", "Bank", "Amount", "Reference"];
  const rows = items.map(p => [
    p.id,
    `"${p.profile?.full_name || 'Unknown'}"`,
    `"${p.bank_account?.account_number || 'N/A'}"`, 
    `"${p.bank_account?.bank_name || 'N/A'}"`,
    p.amount,
    `LOAN-${p.application_id}`
  ]);

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `disbursement_batch_${new Date().toISOString().slice(0,19)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Handles clicking a payout row to see details
 */
async function handlePayoutClick(payoutId) {
  const detailPanel = document.getElementById('payout-detail-panel');
  if (!detailPanel) return;

  detailPanel.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i>
    </div>
  `;

  const { data, error } = await fetchPayoutDetail(payoutId);
  if (error) {
    detailPanel.innerHTML = `<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: ${error.message}</div>`;
    return;
  }
  
  const { payout, profile, application } = data;
  const isPending = payout.status === 'pending_disbursement';

  // Admin Name/Email Fetch Logic
  let adminDisplay = 'System / Unknown';
  try {
      const { data: fullApp } = await fetchApplicationDetail(payout.application_id);
      if (fullApp && fullApp.reviewed_by_admin) {
          const { data: adminProfile } = await fetchProfile(fullApp.reviewed_by_admin);
          if (adminProfile) {
              adminDisplay = adminProfile.email || adminProfile.full_name || 'Unknown Admin';
          }
      }
  } catch (e) {
      console.warn("Could not fetch admin details", e);
  }
  
  const statusBadge = isPending 
    ? `<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase rounded-full border border-yellow-200">Pending</span>`
    : `<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-full border border-green-200">Disbursed</span>`;

  detailPanel.innerHTML = `
    <div class="pb-4 border-b border-gray-200 bg-white p-6 rounded-xl shadow-sm">
      <div class="flex justify-between items-start">
        <div>
            <p class="text-sm text-gray-500 uppercase tracking-wide font-bold">Review Disbursement</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">${profile?.full_name || 'N/A'}</p>
        </div>
        ${statusBadge}
      </div>
      <div class="mt-6">
        <p class="text-4xl font-mono font-bold text-gray-900">${formatCurrency(payout.amount)}</p>
        <p class="text-sm text-gray-500 mt-1">Created: ${formatDate(payout.created_at)}</p>
      </div>
      
      <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
         <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs"><i class="fa-solid fa-user-shield"></i></div>
         <div>
            <p class="text-[10px] text-gray-400 uppercase font-bold">Approved By</p>
            <p class="text-sm font-bold text-gray-800">${adminDisplay}</p>
         </div>
      </div>
    </div>
    
    <div class="p-6 space-y-4">
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Recipient ID</span>
            <span class="font-mono text-xs text-gray-700">${payout.user_id}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Payout ID</span>
            <span class="font-mono text-xs text-gray-700">${payout.id}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Loan Purpose</span>
            <span class="text-sm text-gray-700 text-right">${application?.purpose || 'N/A'}</span>
        </div>
        ${!isPending ? `
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Disbursed Date</span>
            <span class="text-sm font-bold text-green-600">${formatDate(payout.disbursed_at || payout.updated_at)}</span>
        </div>` : ''}
    </div>

    <div class="p-6 pt-0">
        <a href="/admin/application-detail?id=${payout.application_id}" class="flex items-center justify-center w-full py-3 bg-white border-2 border-brand-accent text-brand-accent font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all shadow-sm group">
            View Full Application 
            <i class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
        </a>
    </div>
  `;
}

// --- Search & Filter Logic ---
const filterAndRender = () => {
  const searchInput = document.getElementById('payout-search-input');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();
  
  let filtered = allPayouts.filter(p => {
      if (activeTab === 'pending') return p.status === 'pending_disbursement';
      if (activeTab === 'history') return p.status === 'disbursed';
      return false;
  });

  if (searchTerm) {
    filtered = filtered.filter(payout =>
        (payout.profile?.full_name && payout.profile.full_name.toLowerCase().includes(searchTerm))
    );
  }
  
  renderPayoutList(filtered);
};

// --- Event Listeners ---
function attachEventListeners() {
  document.getElementById('payout-search-input')?.addEventListener('input', filterAndRender);
  document.getElementById('select-all-checkbox')?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
  document.getElementById('btn-bulk-disburse')?.addEventListener('click', handleBulkDisburse);
  
  document.getElementById('tab-pending')?.addEventListener('click', () => switchTab('pending'));
  document.getElementById('tab-history')?.addEventListener('click', () => switchTab('history'));
}

// --- Main Initialization ---
async function loadData() {
  selectedPayoutIds.clear();
  updateBulkUI();
  
  try {
    const { data, error } = await fetchPayouts();
    if (error) throw error;
    
    allPayouts = data;
    filterAndRender(); 
    
    const pendingItems = data.filter(p => p.status === 'pending_disbursement');
    calculateLocalStats(pendingItems);

  } catch (error) {
    document.getElementById('payout-list-container').innerHTML = `<p class="p-6 text-center text-red-600 text-sm">Error: ${error.message}</p>`;
  }
}

function calculateLocalStats(pendingItems) {
    const statsContainer = document.getElementById('payout-stats-cards');
    if (!statsContainer) return;

    const pendingCount = pendingItems.length;
    const pendingValue = pendingItems.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    fetchPayoutStats().then(({ data }) => {
        const totalDisbursed = data?.total_disbursed || 0;
        
        statsContainer.innerHTML = `
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                     <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Disbursed</p>
                     <p class="mt-1 text-2xl font-bold text-gray-900">${formatCurrency(totalDisbursed)}</p>
                </div>
                <div class="p-2 bg-green-50 text-green-600 rounded-lg"><i class="fa-solid fa-money-bill-wave"></i></div>
              </div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Value</p>
                    <p class="mt-1 text-2xl font-bold text-yellow-600">${formatCurrency(pendingValue)}</p>
                </div>
                <div class="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><i class="fa-solid fa-clock"></i></div>
              </div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Queue</p>
                    <p class="mt-1 text-2xl font-bold text-gray-900">${pendingCount}</p>
                </div>
                <div class="p-2 bg-gray-50 text-gray-600 rounded-lg"><i class="fa-solid fa-list-check"></i></div>
              </div>
            </div>
        `;
    });
}

function renderStatCardLoading(title) {
  return `
    <div class="bg-white p-5 rounded-lg shadow-sm">
      <p class="text-sm font-medium text-gray-500">${title}</p>
      <div class="mt-2 h-8 w-3/4 bg-gray-200 rounded animate-pulse"></div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await initLayout();
  if (!authInfo) return;
  
  renderPageContent();
  await loadData();
});