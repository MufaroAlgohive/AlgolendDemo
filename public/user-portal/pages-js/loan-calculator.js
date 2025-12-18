// Loan Calculator JavaScript

// Initialize calculator on page load
function initCalculator() {
  // Sync sliders with inputs
  const loanAmountInput = document.getElementById('loanAmount');
  const loanAmountSlider = document.getElementById('loanAmountSlider');
  const loanTermInput = document.getElementById('loanTerm');
  const loanTermSlider = document.getElementById('loanTermSlider');
  const interestRateInput = document.getElementById('interestRate');
  const interestRateSlider = document.getElementById('interestRateSlider');

  if (loanAmountInput && loanAmountSlider) {
    loanAmountSlider.addEventListener('input', (e) => {
      loanAmountInput.value = e.target.value;
      calculateLoan();
    });

    loanAmountInput.addEventListener('input', (e) => {
      loanAmountSlider.value = e.target.value;
      calculateLoan();
    });
  }

  if (loanTermInput && loanTermSlider) {
    loanTermSlider.addEventListener('input', (e) => {
      loanTermInput.value = e.target.value;
      calculateLoan();
    });

    loanTermInput.addEventListener('input', (e) => {
      loanTermSlider.value = e.target.value;
      calculateLoan();
    });
  }

  if (interestRateInput && interestRateSlider) {
    interestRateSlider.addEventListener('input', (e) => {
      interestRateInput.value = e.target.value;
      calculateLoan();
    });

    interestRateInput.addEventListener('input', (e) => {
      interestRateSlider.value = e.target.value;
      calculateLoan();
    });
  }

  // Add listener for interest rate select
  const interestRateSelect = document.getElementById('interestRateSelect');
  if (interestRateSelect) {
    interestRateSelect.addEventListener('change', calculateLoan);
  }

  // Calculate on initial load
  calculateLoan();
}

// Calculate loan
window.calculateLoan = function() {
  const principal = parseFloat(document.getElementById('loanAmount').value) || 0;
  const termMonths = parseInt(document.getElementById('loanTerm').value) || 0;
  const interestRateSelect = document.getElementById('interestRateSelect');
  const annualRate = interestRateSelect ? parseFloat(interestRateSelect.value) : 0.20;

  if (principal <= 0 || termMonths <= 0) {
    return;
  }

  // Fee structure matching actual loan config
  const MONTHLY_FEE = 60; // R60 admin fee per month
  const INITIATION_FEE_RATE = 0.15; // 15% of loan amount per month
  
  // Calculate simple interest: I = P × R × T
  const totalInterest = principal * annualRate * (termMonths / 12);
  
  // Calculate initiation fees (15% of loan amount per month)
  const initiationFeePerMonth = principal * INITIATION_FEE_RATE;
  const totalInitiationFees = initiationFeePerMonth * termMonths;
  
  // Total admin fees (R60 per month)
  const totalAdminFees = MONTHLY_FEE * termMonths;
  
  // Combined total fees
  const totalFees = totalAdminFees + totalInitiationFees;
  
  // Total repayment = principal + total interest + total fees
  const totalRepayment = principal + totalInterest + totalFees;
  
  // Monthly payment = total repayment / number of months
  const monthlyPayment = totalRepayment / termMonths;

  // Update display
  document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
  document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);
  document.getElementById('totalRepayment').textContent = formatCurrency(totalRepayment);
  document.getElementById('principalAmount').textContent = formatCurrency(principal);
  document.getElementById('interestAmount').textContent = formatCurrency(totalInterest + totalFees);
  
  // Update breakdown info text with selected rate
  const breakdownInfo = document.getElementById('breakdownInfo');
  if (breakdownInfo) {
    const ratePercent = (annualRate * 100).toFixed(0);
    breakdownInfo.innerHTML = `<i class="fas fa-info-circle"></i> Includes: Interest (${ratePercent}% annual) + Admin fees (R60/month) + Initiation fees (15%/month)`;
  }

  // Store calculation for apply button
  window.loanCalculation = {
    principal,
    termMonths,
    annualRate: annualRate * 100,
    monthlyPayment,
    totalRepayment,
    totalInterest,
    totalFees,
    totalAdminFees,
    totalInitiationFees
  };
};

// Apply for loan
window.applyForLoan = function() {
  if (!window.loanCalculation) {
    if (typeof showToast === 'function') {
      showToast('Calculate First', 'Please calculate a loan first', 'warning', 3000);
    } else {
      alert('Please calculate a loan first');
    }
    return;
  }

  // Navigate to loan application
  if (typeof loadPage === 'function') {
    loadPage('apply-loan');
  } else {
    window.location.href = '/user-portal/?page=apply-loan';
  }
};

// Format currency
function formatCurrency(value) {
  const number = Number(value) || 0;
  return `R ${number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}

// Re-initialize on SPA page load
window.addEventListener('pageLoaded', (event) => {
  if (event?.detail?.pageName === 'loan-calculator') {
    setTimeout(initCalculator, 100);
  }
});

document.addEventListener('pageLoaded', (event) => {
  if (event?.detail?.pageName === 'loan-calculator') {
    setTimeout(initCalculator, 100);
  }
});
