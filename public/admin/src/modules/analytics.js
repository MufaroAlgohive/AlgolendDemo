import { initLayout } from '../shared/layout.js';
import { formatCurrency } from '../shared/utils.js';
import { fetchAnalyticsData } from '../services/dataService.js';

// --- STATE MANAGEMENT ---
let appState = {
    rawData: [],
    processedData: [],
    filterArrears: false,
    sortMode: 'month_desc',
    hiddenRows: new Set(),
    flaggedRows: new Set()
};

// --- HELPER FUNCTIONS ---
const getRowId = (row) => `${row.loan_id}-${row.month}`;

// --- HTML TEMPLATE ---
const pageTemplate = `
    <div class="flex flex-col space-y-6">
        <div class="flex justify-between items-end">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
                <p class="text-sm text-gray-500 mt-1">Monthly Balance Sheet & Amortisation Report</p>
            </div>
            <div class="flex gap-3">
                <button onclick="window.print()" class="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    <i class="fa-solid fa-download mr-2"></i> Export Report
                </button>
            </div>
        </div>

        <div class="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div class="relative w-full md:w-96">
                <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="searchInput" placeholder="Search by name or Loan ID..." class="w-full pl-10 pr-4 py-2 text-sm border-none bg-gray-50 rounded-lg focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all placeholder-gray-400">
            </div>
            
            <div class="flex items-center gap-2">
                <button id="filterBtn" class="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap transition-colors">
                    <i class="fa-solid fa-filter mr-2"></i> <span>Filter: All</span>
                </button>
                <button id="sortBtn" class="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap transition-colors">
                    <i class="fa-solid fa-sort mr-2"></i> <span>Sort: Date (Newest)</span>
                </button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            <div class="overflow-x-auto max-h-[75vh]">
                <table class="w-full text-sm text-left relative border-collapse">
                    <thead class="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200 uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th class="pl-6 py-4 font-medium bg-gray-50">Loan ID</th>
                            <th class="px-4 py-4 font-medium bg-gray-50">Customer</th>
                            <th class="px-4 py-4 font-medium bg-gray-50">Month</th>
                            <th class="px-4 py-4 font-medium text-right bg-gray-50">Principal Out.</th>
                            <th class="px-4 py-4 font-medium text-right bg-gray-50">Int. Receivable</th>
                            <th class="px-4 py-4 font-medium text-right bg-gray-50">Fee Receivable</th>
                            <th class="px-4 py-4 font-medium text-right bg-gray-50">Arrears</th>
                            <th class="px-4 py-4 font-medium text-center bg-gray-50">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="analytics-table-body" class="divide-y divide-gray-100 bg-white">
                        <tr>
                            <td colspan="8" class="text-center py-12 text-gray-400">
                                <div class="flex flex-col items-center">
                                    <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-3 text-brand-accent"></i>
                                    <span>Loading Financial Data...</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;

function processData(searchTerm = '') {
    let data = [...appState.rawData];

    // 1. Search Filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        data = data.filter(row => 
            (row.customer && String(row.customer).toLowerCase().includes(term)) || 
            (row.loan_id && String(row.loan_id).toLowerCase().includes(term))
        );
    }

    // 2. Arrears Filter
    if (appState.filterArrears) {
        data = data.filter(row => parseFloat(row.arrears_amount) > 0);
    }

    // 3. Sorting
    data.sort((a, b) => {
        switch (appState.sortMode) {
            case 'month_desc': return b.month.localeCompare(a.month);
            case 'month_asc':  return a.month.localeCompare(b.month);
            case 'amount_desc': return parseFloat(b.principal_outstanding) - parseFloat(a.principal_outstanding);
            case 'amount_asc':  return parseFloat(a.principal_outstanding) - parseFloat(b.principal_outstanding);
            default: return 0;
        }
    });

    appState.processedData = data;
    renderTable();
}

function renderTable() {
    const tableBody = document.getElementById('analytics-table-body');
    const data = appState.processedData;

    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-400">No records found matching your filters.</td></tr>`;
        return;
    }

    // Calculate Totals
    const totals = data.reduce((acc, row) => {
        // NOTE: We do NOT skip hidden rows in totals calculation
        acc.principal += parseFloat(row.principal_outstanding || 0);
        acc.interest += parseFloat(row.interest_receivable || 0);
        acc.fees += parseFloat(row.fee_receivable || 0);
        acc.arrears += parseFloat(row.arrears_amount || 0);
        return acc;
    }, { principal: 0, interest: 0, fees: 0, arrears: 0, count: data.length });

    const totalsHTML = renderTotalsRow(totals);
    const rowsHTML = data.map(row => renderRow(row)).join('');
    
    tableBody.innerHTML = totalsHTML + rowsHTML;
    attachRowListeners();
}

// FIX: top-[52px] ensures it sits UNDER the table header
const renderTotalsRow = (totals) => `
    <tr class="bg-gray-50 border-b-2 border-gray-200 sticky top-[52px] z-10 shadow-sm font-bold">
        <td class="pl-6 py-4 font-extrabold text-gray-900 text-xs uppercase tracking-wider">TOTALS</td>
        <td class="px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">${totals.count} Records</td>
        <td class="px-4 py-4"></td>
        <td class="px-4 py-4 text-right font-extrabold text-gray-900 text-base border-l border-gray-200">${formatCurrency(totals.principal)}</td>
        <td class="px-4 py-4 text-right font-extrabold text-gray-900 text-base border-l border-gray-200">${formatCurrency(totals.interest)}</td>
        <td class="px-4 py-4 text-right font-extrabold text-blue-700 text-base border-l border-gray-200">${formatCurrency(totals.fees)}</td>
        <td class="px-4 py-4 text-right font-extrabold text-red-600 text-base border-l border-gray-200">${formatCurrency(totals.arrears)}</td>
        <td class="px-4 py-4"></td>
    </tr>
`;

const renderRow = (row) => {
    const rowId = getRowId(row);
    const isHidden = appState.hiddenRows.has(rowId);
    const isFlagged = appState.flaggedRows.has(rowId);
    
    // Safety check for Name
    const customerName = row.customer || 'N/A';
    const initial = String(customerName).charAt(0).toUpperCase();
    const arrearsClass = parseFloat(row.arrears_amount) > 0 ? 'text-red-600 font-bold' : 'text-gray-400';
    const safeLoanId = String(row.loan_id || '').replace('Loan #', '#');

    // === STYLE LOGIC ===
    let rowClasses = 'transition-colors group border-b border-gray-50';
    
    if (isHidden) {
        // Disabled Look: Faded, Grayscale
        rowClasses += ' bg-gray-50 opacity-40 grayscale';
    } else if (isFlagged) {
        // Highlight Look: Yellow Background, Orange Border
        rowClasses += ' bg-yellow-50 border-l-4 border-l-orange-400';
    } else {
        // Normal Look
        rowClasses += ' hover:bg-gray-50';
    }

    const eyeIcon = isHidden ? 'fa-solid fa-eye text-gray-600' : 'fa-regular fa-eye-slash text-gray-400';
    const flagIcon = isFlagged ? 'fa-solid fa-flag text-orange-600' : 'fa-regular fa-flag text-gray-400 hover:text-orange-500';

    return `
        <tr class="${rowClasses}">
            <td class="pl-6 py-4 font-medium text-gray-900">${safeLoanId}</td>
            <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                        ${initial}
                    </div>
                    <span class="font-medium text-gray-700">${customerName}</span>
                </div>
            </td>
            <td class="px-4 py-4 text-gray-500 font-mono text-xs">${row.month}</td>
            <td class="px-4 py-4 text-right font-medium text-gray-700">${formatCurrency(row.principal_outstanding)}</td>
            <td class="px-4 py-4 text-right text-gray-600">${formatCurrency(row.interest_receivable)}</td>
            <td class="px-4 py-4 text-right text-blue-600 font-medium">${formatCurrency(row.fee_receivable)}</td>
            <td class="px-4 py-4 text-right ${arrearsClass}">${parseFloat(row.arrears_amount) > 0 ? formatCurrency(row.arrears_amount) : '-'}</td>
            <td class="px-4 py-4 text-center">
                <div class="flex items-center justify-center gap-3">
                    <button class="hide-btn p-1.5 hover:bg-gray-200 rounded-md transition-colors" data-id="${rowId}" title="${isHidden ? 'Show' : 'Hide'}">
                        <i class="${eyeIcon}"></i>
                    </button>
                    <button class="flag-btn p-1.5 hover:bg-yellow-100 rounded-md transition-colors" data-id="${rowId}" title="Flag">
                        <i class="${flagIcon}"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
};

function attachGlobalListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterBtn = document.getElementById('filterBtn');
    const sortBtn = document.getElementById('sortBtn');

    let searchTimeout = null;
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                processData(e.target.value);
            }, 300);
        });
    }
    
    if(filterBtn) filterBtn.addEventListener('click', () => {
        appState.filterArrears = !appState.filterArrears;
        const btn = document.getElementById('filterBtn');
        if(appState.filterArrears) {
            btn.innerHTML = `<i class="fa-solid fa-filter mr-2"></i> <span>Filter: Arrears Only</span>`;
            btn.className = "flex items-center px-3 py-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg whitespace-nowrap transition-colors";
        } else {
            btn.innerHTML = `<i class="fa-solid fa-filter mr-2"></i> <span>Filter: All</span>`;
            btn.className = "flex items-center px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap transition-colors";
        }
        processData(document.getElementById('searchInput').value);
    });

    if(sortBtn) sortBtn.addEventListener('click', () => {
        const modes = ['month_desc', 'month_asc', 'amount_desc', 'amount_asc'];
        const labels = ['Date (Newest)', 'Date (Oldest)', 'Principal (High)', 'Principal (Low)'];
        const nextIndex = (modes.indexOf(appState.sortMode) + 1) % modes.length;
        appState.sortMode = modes[nextIndex];
        const btn = document.getElementById('sortBtn');
        btn.innerHTML = `<i class="fa-solid fa-sort mr-2"></i> <span>Sort: ${labels[nextIndex]}</span>`;
        processData(document.getElementById('searchInput').value);
    });
}

function attachRowListeners() {
    document.querySelectorAll('.hide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if(id) {
                if (appState.hiddenRows.has(id)) {
                    appState.hiddenRows.delete(id);
                } else {
                    appState.hiddenRows.add(id);
                }
                processData(document.getElementById('searchInput').value);
            }
        });
    });
    
    document.querySelectorAll('.flag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if(id) {
                if (appState.flaggedRows.has(id)) {
                    appState.flaggedRows.delete(id);
                } else {
                    appState.flaggedRows.add(id);
                }
                processData(document.getElementById('searchInput').value);
            }
        });
    });
}

async function init() {
    console.log("Analytics Page Initializing...");
    
    const safetyTimer = setTimeout(() => {
        const main = document.getElementById('main-content');
        if (main && main.innerHTML.includes('Loading')) {
            main.innerHTML = `
                <div class="flex flex-col items-center justify-center h-96 text-red-500">
                    <i class="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
                    <p class="font-bold">System Timeout</p>
                    <p class="text-sm text-gray-500 mt-2">Data fetch took too long. Please refresh.</p>
                </div>`;
        }
    }, 8000);

    try {
        await initLayout();
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = pageTemplate;
        
        attachGlobalListeners();

        const tableBody = document.getElementById('analytics-table-body');
        
        console.log("Fetching Data...");
        const { data, error } = await fetchAnalyticsData();
        clearTimeout(safetyTimer); 

        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.warn("No Data returned");
            if(tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-400">No financial records found.</td></tr>`;
            return;
        }

        console.log(`Loaded ${data.length} rows.`);
        appState.rawData = data;
        processData();

    } catch (e) {
        clearTimeout(safetyTimer);
        console.error("Init Error:", e);
        const main = document.getElementById('main-content');
        if (main) {
             main.innerHTML = `
                <div class="flex flex-col items-center justify-center h-96 text-red-500">
                    <i class="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
                    <p class="font-bold">Error loading analytics</p>
                    <p class="text-sm text-red-400 mt-2">${e.message || e}</p>
                </div>`;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

