import { initLayout } from '../shared/layout.js';
import { formatCurrency } from '../shared/utils.js';
import { fetchFinancialsData } from '../services/dataService.js';

let currentRange = 'YTD'; 

// HTML Templates
const pageTemplate = `
    <div class="flex flex-col space-y-8 max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-6 gap-4">
            <div>
                <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Financial Reports</h1>
                <p class="text-sm text-gray-500 mt-2">Income Statement, Ratios & Balance Sheet Snapshot</p>
            </div>
            
            <div class="flex items-center space-x-4">
                <div class="bg-gray-100 p-1 rounded-lg flex space-x-1">
                    <button onclick="window.switchTab('1M')" id="tab-1M" class="time-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-900">1M</button>
                    <button onclick="window.switchTab('3M')" id="tab-3M" class="time-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-900">3M</button>
                    <button onclick="window.switchTab('6M')" id="tab-6M" class="time-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-900">6M</button>
                    <button onclick="window.switchTab('1Y')" id="tab-1Y" class="time-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-900">1Y</button>
                    <button onclick="window.switchTab('YTD')" id="tab-YTD" class="time-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white text-blue-600 shadow-sm">YTD</button>
                </div>

                <button onclick="window.print()" class="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    <i class="fa-solid fa-print mr-2"></i> Print
                </button>
            </div>
        </div>

        <div id="loading-indicator" class="hidden py-12 flex justify-center">
            <i class="fa-solid fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
        </div>

        <div id="report-content" class="grid grid-cols-1 gap-8 transition-opacity duration-300">
            
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-gray-800">Income Statement</h3>
                    <span id="period-label" class="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">YTD Performance</span>
                </div>
                <div class="p-0">
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th class="px-8 py-3 font-medium">Financial Performance</th>
                                <th class="px-8 py-3 text-right font-medium">Amount (ZAR)</th>
                            </tr>
                        </thead>
                        <tbody id="income-table-body" class="divide-y divide-gray-100">
                            </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 class="font-bold text-lg text-gray-800">Key Ratios</h3>
                </div>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th class="px-8 py-3 font-medium">Ratio</th>
                            <th class="px-8 py-3 text-right font-medium">Value</th>
                        </tr>
                    </thead>
                    <tbody id="ratios-table-body" class="divide-y divide-gray-100">
                         </tbody>
                </table>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-gray-800">Balance Sheet Snapshot</h3>
                    <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Position</span>
                </div>
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th class="px-8 py-3 font-medium">Balance Sheet Item</th>
                            <th class="px-8 py-3 text-right font-medium">Value</th>
                        </tr>
                    </thead>
                    <tbody id="bs-table-body" class="divide-y divide-gray-100">
                         </tbody>
                </table>
            </div>

        </div>
    </div>
`;

// Helper to render a simple row
const renderRow = (label, value, isBold = false, isTotal = false, customColorClass = "") => {
    const baseClass = "px-8 py-4 text-gray-700";
    const valueClass = "px-8 py-4 text-right font-mono text-gray-800";
    
    let rowStyle = "hover:bg-gray-50 transition-colors";
    let labelStyle = baseClass;
    let valStyle = valueClass;

    if (isTotal) {
        rowStyle = "bg-gray-50 font-bold border-t-2 border-gray-100";
        labelStyle = "px-8 py-4 text-gray-900 font-extrabold uppercase text-xs tracking-wider";
        valStyle = "px-8 py-4 text-right font-bold text-gray-900 text-lg";
    } else if (isBold) {
        labelStyle = "px-8 py-4 font-bold text-gray-900";
        valStyle = "px-8 py-4 text-right font-bold text-gray-900";
    }

    if (customColorClass) {
        valStyle += ` ${customColorClass}`;
    }

    return `
        <tr class="${rowStyle}">
            <td class="${labelStyle}">${label}</td>
            <td class="${valStyle}">${value}</td>
        </tr>
    `;
};

// Main Data Loader
async function loadFinancials(range) {
    const loader = document.getElementById('loading-indicator');
    const content = document.getElementById('report-content');
    
    // UI Loading State
    if(loader) loader.classList.remove('hidden');
    if(content) content.classList.add('opacity-50');

    try {
        const { data, error } = await fetchFinancialsData(range);

        if (error) throw new Error(error);
        if (!data) throw new Error("No data returned");

        const { incomeStatement, ratios, balanceSheet } = data;

        // Update Label
        const label = document.getElementById('period-label');
        if(label) label.textContent = `${range} PERFORMANCE`;

        // 1. Render Income Statement
        const incomeHTML = [
            renderRow("Interest Income", formatCurrency(incomeStatement.interestIncome)),
            renderRow("Net Interest Income (NII)", formatCurrency(incomeStatement.nii), true),
            renderRow("Fee Income", formatCurrency(incomeStatement.feeIncome)),
            renderRow("Commission Income", formatCurrency(incomeStatement.commissionIncome)),
            renderRow("Penalty Income", formatCurrency(incomeStatement.penaltyIncome)),
            renderRow("Total Non-Interest Income (NIR)", formatCurrency(incomeStatement.nir), true),
            renderRow("Total Revenue", formatCurrency(incomeStatement.totalRevenue), false, true)
        ].join('');
        document.getElementById('income-table-body').innerHTML = incomeHTML;

        // 2. Render Ratios
        const ratiosHTML = [
            renderRow("Credit Loss Ratio (CLR)", ratios.clr, false, false, "text-red-600"),
            renderRow("NII as % of Total Revenue", ratios.niiToRevenue.toFixed(1) + "%"),
            renderRow("NIR as % of Total Revenue", ratios.nirToRevenue.toFixed(1) + "%"),
        ].join('');
        document.getElementById('ratios-table-body').innerHTML = ratiosHTML;

        // 3. Render Balance Sheet
        const bsHTML = [
            renderRow("Total Loan Book Value", formatCurrency(balanceSheet.totalLoanBook), true),
            renderRow("Total Number of Active Clients", balanceSheet.activeClients),
            renderRow("Average Loan per Client", formatCurrency(balanceSheet.avgLoanPerClient)),
            renderRow("Realized Yield (Annualized Estimate)", balanceSheet.avgInterestRate.toFixed(2) + "%"),
            renderRow("Percentage of Clients in Arrears", balanceSheet.arrearsPercentage.toFixed(1) + "%", false, false, "text-red-600")
        ].join('');
        document.getElementById('bs-table-body').innerHTML = bsHTML;

    } catch (e) {
        console.error("Render Error:", e);
    } finally {
        if(loader) loader.classList.add('hidden');
        if(content) content.classList.remove('opacity-50');
    }
}

// Window Function for Tab Switching
window.switchTab = async (range) => {
    currentRange = range;
    
    // Update Tab Styles
    document.querySelectorAll('.time-tab').forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        btn.classList.add('text-gray-500');
    });
    
    const activeBtn = document.getElementById(`tab-${range}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-gray-500');
        activeBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
    }

    await loadFinancials(range);
};

document.addEventListener('DOMContentLoaded', async () => {
    await initLayout();

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.innerHTML = pageTemplate;

    // Initial Load
    await loadFinancials('YTD');
});
