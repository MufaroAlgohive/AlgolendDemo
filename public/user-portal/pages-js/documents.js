// Payments Dashboard JavaScript
import '/user-portal/Services/sessionGuard.js'; // Production auth guard

let activeLoans = [];
let bankAccounts = [];
let paymentHistory = [];
let selectedLoan = null;

// Initialize dashboard
async function initPaymentsDashboard() {
  try {
    console.log('🚀 Initializing payments dashboard...');
    
    // Check if required elements exist
    const requiredElements = [
      'totalOutstanding', 'nextPaymentAmount', 'nextPaymentDate',
      'paidThisMonth', 'totalPaid', 'activeLoansContainer',
      'bankAccountsContainer', 'paymentHistoryBody'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
      console.error('❌ Missing required elements:', missingElements);
      console.log('⚠️ Waiting for DOM to be ready...');
      setTimeout(initPaymentsDashboard, 200);
      return;
    }
    
    console.log('✅ All required elements found');
    
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('⛔ No session found');
      window.location.href = '/auth/login.html';
      return;
    }
    
    console.log('✅ Session found, user:', session.user.id);

    await Promise.all([
      loadActiveLoans(supabase, session.user.id),
      loadBankAccounts(supabase, session.user.id),
      loadPaymentHistory(supabase, session.user.id)
    ]);

    calculateMetrics();
    renderAll();
    bindEventListeners();

  } catch (error) {
    console.error('Error initializing payments dashboard:', error);
  }
}

// Load active loans from database
async function loadActiveLoans(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    activeLoans = (data || []).map(loan => ({
      id: loan.id,
      applicationId: loan.application_id,
      principal: parseFloat(loan.principal_amount),
      outstanding: parseFloat(loan.outstanding_balance || loan.principal_amount),
      monthlyPayment: parseFloat(loan.monthly_payment || 0),
      nextPaymentDate: loan.next_payment_date,
      interestRate: parseFloat(loan.interest_rate),
      termMonths: loan.term_months,
      status: loan.status,
      startDate: loan.start_date
    }));

    console.log('✅ Loaded active loans:', activeLoans);
  } catch (error) {
    console.error('Error loading active loans:', error);
    activeLoans = [];
  }
}

// Load bank accounts from database
async function loadBankAccounts(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    bankAccounts = (data || []).map(account => ({
      id: account.id,
      bankName: account.bank_name,
      accountHolder: account.account_holder,
      accountNumber: account.account_number,
      branchCode: account.branch_code,
      accountType: account.account_type,
      isPrimary: account.is_primary,
      isVerified: account.is_verified,
      lastUsed: account.last_used_at
    }));

    console.log('✅ Loaded bank accounts:', bankAccounts);
  } catch (error) {
    console.error('Error loading bank accounts:', error);
    bankAccounts = [];
  }
}

// Load payment history from database
async function loadPaymentHistory(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        loans:loan_id (
          id,
          application_id
        )
      `)
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    paymentHistory = (data || []).map(payment => ({
      id: payment.id,
      loanId: payment.loan_id,
      applicationId: payment.loans?.application_id,
      amount: parseFloat(payment.amount),
      date: payment.payment_date,
      status: 'completed', // Default to completed for now
      method: 'Card' // Will be updated when payment methods are added
    }));

    console.log('✅ Loaded payment history:', paymentHistory);
  } catch (error) {
    console.error('Error loading payment history:', error);
    paymentHistory = [];
  }
}

// Calculate metrics
function calculateMetrics() {
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  
  // Find the loan with the earliest payment date (next upcoming payment)
  const upcomingLoan = activeLoans.reduce((earliest, loan) => {
    if (!loan.monthlyPayment || loan.monthlyPayment <= 0) {
      return earliest;
    }
    if (!loan.nextPaymentDate && !earliest) {
      return loan;
    }
    const loanDate = new Date(loan.nextPaymentDate);
    if (!earliest || !earliest.nextPaymentDate) {
      return loan;
    }
    const earliestDate = new Date(earliest.nextPaymentDate);
    return loanDate < earliestDate ? loan : earliest;
  }, null);
  
  const nextPayment = upcomingLoan ? upcomingLoan.monthlyPayment : 0;
  const nextDate = upcomingLoan ? upcomingLoan.nextPaymentDate : null;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = paymentHistory
    .filter(p => new Date(p.date) >= firstOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  // Update UI
  document.getElementById('totalOutstanding').textContent = formatCurrency(totalOutstanding);
  document.getElementById('nextPaymentAmount').textContent = formatCurrency(nextPayment);
  document.getElementById('nextPaymentDate').textContent = formatNextPaymentDate(nextDate);
  document.getElementById('paidThisMonth').textContent = formatCurrency(paidThisMonth);
  document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
}

// Render all sections
function renderAll() {
  renderActiveLoans();
  renderBankAccounts();
  renderPaymentHistory();
}

// Render active loans
function renderActiveLoans() {
  const container = document.getElementById('activeLoansContainer');
  const countBadge = document.getElementById('activeLoansCount');
  
  countBadge.textContent = activeLoans.length;

  if (activeLoans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No active loans</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeLoans.map(loan => {
    const isOverdue = new Date(loan.nextPaymentDate) < new Date();
    const statusClass = isOverdue ? 'overdue' : 'active';
    const statusText = isOverdue ? 'Overdue' : 'Active';

    return `
      <div class="loan-item" data-loan-id="${loan.id}">
        <div class="loan-item-header">
          <span class="loan-reference">Loan #${loan.applicationId || loan.id}</span>
          <span class="loan-status ${statusClass}">${statusText}</span>
        </div>
        <div class="loan-details">
          <div class="loan-detail-item">
            <span class="loan-detail-label">Principal:</span>
            <span class="loan-detail-value">${formatCurrency(loan.principal)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Outstanding:</span>
            <span class="loan-detail-value">${formatCurrency(loan.outstanding)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Monthly:</span>
            <span class="loan-detail-value">${formatCurrency(loan.monthlyPayment)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Next Due:</span>
            <span class="loan-detail-value">${formatDate(loan.nextPaymentDate)}</span>
          </div>
        </div>
        <div class="loan-item-actions">
          <button class="btn-primary btn-sm" onclick="openPaymentModal(${loan.id})">
            <i class="fas fa-credit-card"></i>
            Pay Now
          </button>
          <button class="btn-secondary btn-sm btn-icon" onclick="viewLoanDetails(${loan.id})">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render bank accounts
function renderBankAccounts() {
  const container = document.getElementById('bankAccountsContainer');

  if (bankAccounts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-building-columns"></i>
        <p>No saved bank accounts</p>
      </div>
    `;
    return;
  }

  container.innerHTML = bankAccounts.map(account => {
    const masked = maskAccountNumber(account.accountNumber);
    return `
      <div class="bank-account-item ${account.isPrimary ? 'primary' : ''}" data-account-id="${account.id}">
        <div class="account-header">
          <span class="bank-name">
            <i class="fas fa-university"></i>
            ${account.bankName}
            ${account.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
          </span>
        </div>
        <div class="account-details">
          <div><strong>${account.accountHolder}</strong></div>
          <div class="account-number">${masked}</div>
          <div>${account.accountType}</div>
        </div>
        <div class="account-actions">
          ${!account.isPrimary ? `<button class="btn-secondary btn-sm" onclick="setPrimaryAccount(${account.id})">Set as Primary</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Render payment history
function renderPaymentHistory() {
  const tbody = document.getElementById('paymentHistoryBody');

  if (paymentHistory.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <p>No payment history yet</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = paymentHistory.map(payment => `
    <tr>
      <td>${formatDate(payment.date)}</td>
      <td>Loan #${payment.applicationId || payment.loanId}</td>
      <td><strong>${formatCurrency(payment.amount)}</strong></td>
      <td><span class="payment-status-badge ${payment.status}">${capitalizeFirst(payment.status)}</span></td>
      <td>${payment.method}</td>
      <td>
        <button class="btn-secondary btn-sm btn-icon" onclick="viewPaymentReceipt(${payment.id})">
          <i class="fas fa-receipt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Bind event listeners
function bindEventListeners() {
  // Make payment button
  document.getElementById('makePaymentBtn')?.addEventListener('click', () => openPaymentModal());
  
  // Close modal buttons
  document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModal);
  document.getElementById('cancelPaymentBtn')?.addEventListener('click', closePaymentModal);

  // Add bank account button
  document.getElementById('addBankAccountBtn')?.addEventListener('click', addBankAccount);

  // Payment form
  document.getElementById('paymentForm')?.addEventListener('submit', handlePaymentSubmit);

  // Loan selection change
  document.getElementById('paymentLoanSelect')?.addEventListener('change', handleLoanSelection);

  // Amount suggestion buttons
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      if (selectedLoan) {
        const amount = type === 'minimum' ? selectedLoan.monthlyPayment : selectedLoan.outstanding;
        document.getElementById('paymentAmount').value = amount.toFixed(2);
      }
    });
  });

  // Download statement
  document.getElementById('downloadStatementBtn')?.addEventListener('click', downloadStatement);
}

// Open payment modal
window.openPaymentModal = function(loanId = null) {
  const modal = document.getElementById('paymentModal');
  const select = document.getElementById('paymentLoanSelect');
  
  // Populate loan dropdown
  select.innerHTML = '<option value="">-- Select a loan --</option>' + 
    activeLoans.map(loan => 
      `<option value="${loan.id}">Loan #${loan.applicationId || loan.id} - ${formatCurrency(loan.outstanding)} outstanding</option>`
    ).join('');

  if (loanId) {
    select.value = loanId;
    handleLoanSelection({ target: select });
  }

  modal.classList.remove('hidden');
};

// Close payment modal
function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
  document.getElementById('paymentForm').reset();
  document.getElementById('selectedLoanDetails').classList.add('hidden');
  selectedLoan = null;
}

// Handle loan selection in payment form
function handleLoanSelection(event) {
  const loanId = parseInt(event.target.value);
  const detailsCard = document.getElementById('selectedLoanDetails');

  if (!loanId) {
    detailsCard.classList.add('hidden');
    selectedLoan = null;
    return;
  }

  selectedLoan = activeLoans.find(l => l.id === loanId);
  if (!selectedLoan) return;

  detailsCard.innerHTML = `
    <h4>Loan Details</h4>
    <div class="loan-details">
      <div class="loan-detail-item">
        <span class="loan-detail-label">Outstanding Balance:</span>
        <span class="loan-detail-value">${formatCurrency(selectedLoan.outstanding)}</span>
      </div>
      <div class="loan-detail-item">
        <span class="loan-detail-label">Monthly Payment:</span>
        <span class="loan-detail-value">${formatCurrency(selectedLoan.monthlyPayment)}</span>
      </div>
      <div class="loan-detail-item">
        <span class="loan-detail-label">Next Due Date:</span>
        <span class="loan-detail-value">${formatDate(selectedLoan.nextPaymentDate)}</span>
      </div>
    </div>
  `;
  detailsCard.classList.remove('hidden');

  // Set default amount to monthly payment
  document.getElementById('paymentAmount').value = selectedLoan.monthlyPayment.toFixed(2);
}

// Handle payment form submission
async function handlePaymentSubmit(event) {
  event.preventDefault();

  if (!selectedLoan) {
    showPaymentStatus('Please select a loan', 'error');
    return;
  }

  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const method = document.querySelector('input[name="paymentMethod"]:checked').value;

  if (amount <= 0) {
    showPaymentStatus('Please enter a valid amount', 'error');
    return;
  }

  if (amount > selectedLoan.outstanding) {
    showPaymentStatus('Payment amount cannot exceed outstanding balance', 'error');
    return;
  }

  // Show loading state
  const submitBtn = document.getElementById('submitPaymentBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

  try {
    if (method === 'card') {
      // TODO: Integrate with Paystack
      showPaymentStatus('Paystack integration coming soon!', 'error');
      console.log('Payment details:', { loanId: selectedLoan.id, amount, method });
    } else {
      // Manual transfer instructions
      showPaymentStatus('Manual transfer instructions will be displayed here', 'error');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showPaymentStatus('Payment failed. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Continue to Payment</span><i class="fas fa-arrow-right"></i>';
  }
}

// Show payment status message
function showPaymentStatus(message, type) {
  const statusEl = document.getElementById('paymentStatus');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 5000);
}

// Set primary bank account
window.setPrimaryAccount = async function(accountId) {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    // Remove primary from all accounts
    await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('user_id', session.user.id);

    // Set new primary
    await supabase
      .from('bank_accounts')
      .update({ is_primary: true })
      .eq('id', accountId);

    // Reload and re-render
    await loadBankAccounts(supabase, session.user.id);
    renderBankAccounts();

  } catch (error) {
    console.error('Error setting primary account:', error);
    alert('Failed to update primary account');
  }
};

// Add bank account
function addBankAccount() {
  // Navigate to the banking form page
  window.location.href = '/user-portal/?page=apply-loan-2';
}

// View loan details
window.viewLoanDetails = async function(loanId) {
  try {
    const loan = activeLoans.find(l => l.id === loanId);
    if (!loan) {
      alert('Loan not found');
      return;
    }

    window.currentLoanId = loanId;

    // Load loan details modal
    const moduleContainer = document.getElementById('module-container');
    const moduleContent = document.getElementById('module-content');

    if (!moduleContainer || !moduleContent) {
      console.error('Module container not found');
      return;
    }

    const response = await fetch('/user-portal/modules/loan-details.html');
    const html = await response.text();
    moduleContent.innerHTML = html;
    moduleContainer.classList.remove('hidden');

    // Load CSS if not already loaded
    if (!document.getElementById('loan-details-css')) {
      const link = document.createElement('link');
      link.id = 'loan-details-css';
      link.rel = 'stylesheet';
      link.href = '/user-portal/modules-css/loan-details.css';
      document.head.appendChild(link);
    }

    // Populate loan details
    setTimeout(() => populateLoanDetails(loan), 100);

  } catch (error) {
    console.error('Error loading loan details:', error);
    alert('Failed to load loan details');
  }
};

// Close loan details modal
window.closeLoanDetailsModal = function() {
  const moduleContainer = document.getElementById('module-container');
  if (moduleContainer) {
    moduleContainer.classList.add('hidden');
  }
  window.currentLoanId = null;
};

// Populate loan details in modal
async function populateLoanDetails(loan) {
  try {
    // Calculate derived values
    const totalRepayment = loan.principal + (loan.principal * loan.interestRate * (loan.termMonths / 12));
    const totalInterest = totalRepayment - loan.principal;
    const totalPaid = loan.principal - loan.outstanding;
    const progressPercentage = ((totalPaid / totalRepayment) * 100).toFixed(1);
    
    // Estimate payments made (simplified calculation)
    const paymentsMade = Math.floor((totalPaid / loan.monthlyPayment) || 0);
    const paymentsRemaining = loan.termMonths - paymentsMade;

    // Calculate maturity date
    const startDate = new Date(loan.startDate);
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + loan.termMonths);

    // Determine status
    const isOverdue = new Date(loan.nextPaymentDate) < new Date();
    const statusText = isOverdue ? 'overdue' : loan.status;

    // Update header
    document.getElementById('loanDetailsTitle').textContent = `Loan #${loan.applicationId || loan.id}`;
    document.getElementById('loanDetailsSubtitle').textContent = `Disbursed on ${formatDate(loan.startDate)}`;
    document.getElementById('loanDetailStatus').textContent = statusText.charAt(0).toUpperCase() + statusText.slice(1);
    document.getElementById('loanDetailStatus').className = `loan-status-badge ${statusText}`;

    // Update summary cards
    document.getElementById('loanPrincipal').textContent = formatCurrency(loan.principal);
    document.getElementById('loanOutstanding').textContent = formatCurrency(loan.outstanding);
    document.getElementById('loanMonthly').textContent = formatCurrency(loan.monthlyPayment);
    document.getElementById('loanTotalPaid').textContent = formatCurrency(totalPaid);

    // Update loan information
    document.getElementById('loanReference').textContent = `LOAN-${loan.id}`;
    document.getElementById('applicationReference').textContent = `APP-${loan.applicationId || loan.id}`;
    document.getElementById('loanStartDate').textContent = formatDate(loan.startDate);
    document.getElementById('loanMaturityDate').textContent = formatDate(maturityDate);
    document.getElementById('loanTerm').textContent = `${loan.termMonths} months`;
    document.getElementById('loanInterestRate').textContent = `${(loan.interestRate * 100).toFixed(2)}% p.a.`;
    document.getElementById('loanTotalInterest').textContent = formatCurrency(totalInterest);
    document.getElementById('loanTotalRepayment').textContent = formatCurrency(totalRepayment);

    // Update progress
    document.getElementById('progressPercentage').textContent = `${progressPercentage}%`;
    document.getElementById('paymentsCount').textContent = `${paymentsMade}/${loan.termMonths}`;
    document.getElementById('remainingPayments').textContent = paymentsRemaining;
    document.getElementById('repaymentProgress').style.width = `${progressPercentage}%`;

    // Update next payment
    document.getElementById('nextPaymentDueDate').textContent = formatDate(loan.nextPaymentDate);
    document.getElementById('nextPaymentDueAmount').textContent = formatCurrency(loan.monthlyPayment);

    // Generate payment schedule
    generatePaymentSchedule(loan, startDate, totalInterest);

  } catch (error) {
    console.error('Error populating loan details:', error);
  }
}

// Generate payment schedule
function generatePaymentSchedule(loan, startDate, totalInterest) {
  const tbody = document.getElementById('paymentScheduleBody');
  if (!tbody) return;

  const monthlyInterest = totalInterest / loan.termMonths;
  const monthlyPrincipal = loan.principal / loan.termMonths;
  let remainingBalance = loan.principal;
  const schedule = [];

  for (let i = 0; i < loan.termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    const principal = i === loan.termMonths - 1 ? remainingBalance : monthlyPrincipal;
    remainingBalance -= principal;

    // Determine status
    let status = 'pending';
    const isPaid = remainingBalance < loan.outstanding - (monthlyPrincipal * 0.5);
    const isPast = dueDate < new Date();
    
    if (isPaid) {
      status = 'paid';
    } else if (isPast) {
      status = 'overdue';
    }

    schedule.push({
      number: i + 1,
      dueDate,
      payment: loan.monthlyPayment,
      principal,
      interest: monthlyInterest,
      balance: Math.max(0, remainingBalance),
      status
    });
  }

  tbody.innerHTML = schedule.map(item => `
    <tr>
      <td>${item.number}</td>
      <td>${formatDate(item.dueDate)}</td>
      <td><strong>${formatCurrency(item.payment)}</strong></td>
      <td>${formatCurrency(item.principal)}</td>
      <td>${formatCurrency(item.interest)}</td>
      <td>${formatCurrency(item.balance)}</td>
      <td><span class="schedule-status ${item.status}">${item.status}</span></td>
    </tr>
  `).join('');
}

// Download schedule
window.downloadSchedule = function() {
  alert('Download schedule feature coming soon');
  // TODO: Generate CSV or PDF of payment schedule
};

// Download loan statement
window.downloadLoanStatement = function() {
  alert('Download loan statement feature coming soon');
  // TODO: Generate PDF statement
};

// View payment receipt
window.viewPaymentReceipt = function(paymentId) {
  alert(`View receipt for payment ${paymentId}`);
  // TODO: Implement receipt modal or download
};

// Download statement
function downloadStatement() {
  alert('Download statement feature coming soon');
  // TODO: Implement statement generation and download
}

// Utility functions
function formatCurrency(value) {
  const number = Number(value) || 0;
  return `R ${number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(dateValue) {
  if (!dateValue) return '--';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNextPaymentDate(dateValue) {
  if (!dateValue) {
    return 'Next payment date pending';
  }
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return 'Next payment date pending';
  }
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Due ${formatted}`;
}

function maskAccountNumber(accountNumber = '') {
  if (!accountNumber) return '';
  const visible = accountNumber.slice(-4);
  return `•••• ${visible}`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize on page load
console.log('📄 Payments dashboard script loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - initializing payments dashboard');
    initPaymentsDashboard();
  });
} else {
  console.log('📄 DOM already loaded - initializing payments dashboard');
  initPaymentsDashboard();
}

// Re-initialize on page loaded event (for SPA navigation)
window.addEventListener('pageLoaded', (event) => {
  console.log('📄 pageLoaded event received:', event.detail);
  if (event?.detail?.pageName === 'documents') {
    console.log('📄 Documents page loaded - initializing payments dashboard');
    initPaymentsDashboard();
  }
});

document.addEventListener('pageLoaded', (event) => {
  console.log('📄 pageLoaded event (document) received:', event.detail);
  if (event?.detail?.pageName === 'documents') {
    console.log('📄 Documents page loaded - initializing payments dashboard');
    initPaymentsDashboard();
  }
});
