// src/modules/incoming-payments.js
import { initLayout } from '../shared/layout.js';
import { formatCurrency, formatDate } from '../shared/utils.js';
import { 
  fetchPayments, 
  fetchPaymentsOverTime, 
  fetchPaymentDetail 
} from '../services/dataService.js';

// --- State ---
let allPayments = [];

// --- Main Page Rendering ---

/**
 * **NEW UI**
 * Renders the "master-detail" layout inspired by your screenshots.
 */
function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <!-- Master-Detail Container -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- 
        NEW: Set a fixed height for the master-detail view to allow internal scrolling.
        h-[calc(100vh-150px)] is a good height (viewport - header - padding)
      -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-150px)]">
        
        <!-- Master List (Left Column) -->
        <div class="md:col-span-1 lg:col-span-1 border-r border-gray-200 flex flex-col">
          
          <!-- Chart Area -->
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Payments Over Time</h2>
            <div id="payments-chart-container" class="w-full h-[200px] mt-2">
              <div class="text-center p-8"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i></div>
            </div>
          </div>

          <!-- Transaction List Header -->
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-md font-semibold text-gray-900">All Incoming Payments</h3>
            <input type="search" id="payment-search-input" placeholder="Search by name or ID..." class="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:ring-brand-accent focus:border-brand-accent text-sm">
          </div>

          <!-- Transaction List -->
          <div id="payment-list-container" class="flex-1 overflow-y-auto">
            <div class="p-10 text-center text-gray-500">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
            </div>
          </div>
        </div>
        
        <!-- Detail Panel (Right Column) -->
        <div id="payment-detail-panel" class="md:col-span-2 lg:col-span-3 overflow-y-auto p-6 bg-gray-50">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <i class="fa-solid fa-hand-pointer text-4xl mb-3"></i>
            <p class="text-lg font-medium">Select a payment to view details</p>
          </div>
        </div>
        
      </div>
    </div>
  `;

  attachEventListeners();
}

/**
 * **NEW UI**
 * Renders the list of payment "cards" on the left panel.
 */
function renderPaymentList(payments) {
  const listContainer = document.getElementById('payment-list-container');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  if (payments.length === 0) {
    listContainer.innerHTML = `<p class="p-6 text-center text-gray-500">No payments match your criteria.</p>`;
    return;
  }

  payments.forEach(payment => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'payment-card w-full text-left flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150';
    card.dataset.paymentId = payment.id;
    
    card.innerHTML = `
      <div class="flex-1 overflow-hidden">
        <p class="text-sm font-semibold text-gray-900 truncate">${payment.profile?.full_name || 'N/A'}</p>
        <p class="text-xs text-gray-500 truncate">Loan ID: ${payment.loan_id} | ${formatDate(payment.payment_date)}</p>
      </div>
      <div class="ml-4">
        <p class="text-sm font-bold text-green-600">+ ${formatCurrency(payment.amount)}</p>
      </div>
    `;
    
    card.addEventListener('click', () => handlePaymentClick(payment.id, card));
    listContainer.appendChild(card);
  });
}

/**
 * **NEW**: Handles clicking a payment card.
 */
async function handlePaymentClick(paymentId, cardElement) {
  const detailPanel = document.getElementById('payment-detail-panel');
  if (!detailPanel) return;

  // 1. Update selected state in the list
  document.querySelectorAll('.payment-card').forEach(card => card.classList.remove('selected'));
  cardElement.classList.add('selected');

  // 2. Show loading spinner in detail panel
  detailPanel.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i>
      <p class="mt-3">Loading payment details...</p>
    </div>
  `;

  // 3. Fetch and render the full details
  const { data, error } = await fetchPaymentDetail(paymentId);
  if (error) {
    detailPanel.innerHTML = `<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: ${error.message}</div>`;
    return;
  }
  
  renderPaymentDetail(data);
}

/**
 * **NEW**: Renders the full payment details in the right-hand "detail" panel.
 * This is inspired by the "C-Pay" screenshot.
 */
function renderPaymentDetail(data) {
  const detailPanel = document.getElementById('payment-detail-panel');
  if (!detailPanel || !data.payment) {
    detailPanel.innerHTML = `<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: Payment data is incomplete.</div>`;
    return;
  }

  const { payment, profile, loan } = data;
  
  detailPanel.innerHTML = `
    <!-- Header -->
    <div class="pb-4 border-b border-gray-200">
      <p class="text-sm text-gray-500">Payment from</p>
      <p class="text-xl font-semibold text-gray-900">${profile?.full_name || 'N/A'}</p>
      <div class="mt-4">
        <p class="text-4xl font-bold text-green-600">+ ${formatCurrency(payment.amount)}</p>
        <p class="text-sm font-medium text-gray-500">Completed on ${formatDate(payment.payment_date)}</p>
      </div>
    </div>
    
    <!-- Details List -->
    <div class="mt-6">
      <dl class="divide-y divide-gray-200">
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Transaction ID</dt>
          <dd class="col-span-2 text-sm text-gray-900 font-mono">${payment.id}</dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Payer Email</dt>
          <dd class="col-span-2 text-sm text-gray-900">${profile?.email || 'N/A'}</dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Loan ID</dt>
          <dd class="col-span-2 text-sm text-brand-accent font-semibold hover:underline">
            <a href="/admin/application-detail?id=${loan?.application_id || ''}">
              ${payment.loan_id}
            </a>
          </dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Loan Amount</dt>
          <dd class="col-span-2 text-sm text-gray-900">${formatCurrency(loan?.principal_amount)}</dd>
        </div>
      </dl>
    </div>
  `;
}

/**
 * **NEW**: Renders the line chart
 */
async function renderPaymentsChart() {
  const container = document.getElementById('payments-chart-container');
  if (!container) return;
  
  const { data, error } = await fetchPaymentsOverTime();

  if (error || !data || data.length === 0) {
    container.innerHTML = `<p class="text-center text-sm text-gray-500 pt-16">No payment data for chart.</p>`;
    return;
  }

  container.innerHTML = `<canvas id="paymentsChart"></canvas>`;
  const ctx = document.getElementById('paymentsChart').getContext('2d');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.month_year),
      datasets: [
        {
          label: 'Repaid',
          data: data.map(d => d.total_repaid),
          borderColor: 'rgb(16, 185, 129)', // green-500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.2,
          pointBackgroundColor: 'rgb(16, 185, 129)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
          }
        }
      }
    }
  });
}


// --- Search & Filter Logic ---
const filterAndRender = () => {
  const searchInput = document.getElementById('payment-search-input');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();
  
  let filtered = allPayments;

  if (searchTerm) {
    filtered = filtered.filter(payment =>
        (payment.profile?.full_name && payment.profile.full_name.toLowerCase().includes(searchTerm)) ||
        (String(payment.id).includes(searchTerm)) ||
        (String(payment.loan_id).includes(searchTerm))
    );
  }
  
  renderPaymentList(filtered);
};

// --- Event Listeners ---
function attachEventListeners() {
  document.getElementById('payment-search-input')?.addEventListener('input', filterAndRender);
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Wait for layout (and auth)
  const authInfo = await initLayout();
  if (!authInfo) return; // Stop if auth fails

  // 2. Set page title
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = 'Incoming Payments';

  // 3. Render the dynamic content for this page
  renderPageContent();

  // 4. Load the data
  renderPaymentsChart();
  
  // Load main payments list
  try {
    const { data, error } = await fetchPayments();
    if (error) throw error;
    allPayments = data;
    filterAndRender(); // Initial render
  } catch (error) {
    document.getElementById('payment-list-container').innerHTML = `<p class="p-6 text-center text-red-600">Error: ${error.message}</p>`;
  }
});