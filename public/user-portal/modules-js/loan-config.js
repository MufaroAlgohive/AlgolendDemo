// Module loading functions
window.loadLoanModule = function() {
  const moduleContainer = document.getElementById('module-container');
  const moduleContent = document.getElementById('module-content');
  
  fetch('modules/loan-config.html')
    .then(response => response.text())
    .then(html => {
      moduleContent.innerHTML = html;
      moduleContainer.classList.remove('hidden');
      
      // Initialize after loading
      setTimeout(async () => {
        await checkLoanHistory();
        await fetchAffordabilityRatio();
        initializeLoanSlider();
        initializePeriodSlider();
        initializeDatePicker();
        initializeSignatureCanvas();
        calculateAndUpdateSummary();
      }, 100);
    })
    .catch(error => console.error('Error loading module:', error));
};

window.closeModule = function() {
  const moduleContainer = document.getElementById('module-container');
  moduleContainer.classList.add('hidden');
};

// Loan Configuration
let loanConfig = {
  amount: 5000,
  period: 1,
  startDate: null,
  interestRate: 0.20, // 20% annual simple interest
  signature: null,
  maxAllowedPeriod: 1, // Will be updated based on loan history
  completedOneMonthLoans: 0,
  maxLoanAmount: 10000, // Will be calculated dynamically based on affordability
  affordabilityRatio: null // Max monthly payment from financial profile
};

function parseDateInputValue(value) {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const working = new Date(date);
  working.setUTCHours(0, 0, 0, 0);
  return working.toISOString().split('T')[0];
}

function toIsoDateMidnight(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function getConfiguredStartDate() {
  const value = loanConfig.startDate;
  if (!value) return null;
  if (value instanceof Date) {
    return value;
  }
  return parseDateInputValue(value);
}

// Check user's loan history to determine max allowed period
async function checkLoanHistory() {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    // Count completed 1-month loans with 'active' status
    const { data, error } = await supabase
      .from('loans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('term_months', 1)
      .eq('status', 'active');

    if (error) {
      console.error('Error checking loan history:', error);
      return;
    }

    const count = data?.length || 0;
    loanConfig.completedOneMonthLoans = count;

    // Set interest rate: 20% for first loan, 18% for subsequent loans
    if (count === 0) {
      loanConfig.interestRate = 0.20; // 20% annual for first loan
    } else {
      loanConfig.interestRate = 0.18; // 18% annual for all loans after first
    }

    // If user has 3 or more 1-month loans, unlock all periods
    if (count >= 3) {
      loanConfig.maxAllowedPeriod = 24;
    } else {
      loanConfig.maxAllowedPeriod = 1;
    }

    // Update slider max
    const slider = document.getElementById('periodSlider');
    if (slider) {
      slider.max = loanConfig.maxAllowedPeriod;
      // Reset to 1 if current value exceeds allowed
      if (loanConfig.period > loanConfig.maxAllowedPeriod) {
        loanConfig.period = 1;
        slider.value = 1;
        document.getElementById('periodAmount').textContent = '1';
        const periodPlural = document.getElementById('periodPlural');
        if (periodPlural) periodPlural.textContent = '';
      }
    }

    console.log(` User has ${count} completed loans. Interest rate: ${(loanConfig.interestRate * 100).toFixed(0)}%. Max period: ${loanConfig.maxAllowedPeriod} months`);
  } catch (error) {
    console.error('Error checking loan history:', error);
  }
}

// Fetch user's financial profile to get affordability ratio
async function fetchAffordabilityRatio() {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    // Get financial profile
    const { data: profile, error } = await supabase
      .from('financial_profiles')
      .select('affordability_ratio, monthly_income')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching affordability ratio:', error);
      return;
    }

    if (profile && profile.affordability_ratio) {
      loanConfig.affordabilityRatio = parseFloat(profile.affordability_ratio);
      console.log(`💰 Max monthly payment from profile: R${loanConfig.affordabilityRatio}`);
      console.log(`💰 Raw affordability_ratio value: ${profile.affordability_ratio}`);
      console.log(`💰 Monthly income from profile: R${profile.monthly_income || 'N/A'}`);
      
      // Calculate initial max loan amount for current period
      calculateMaxLoanAmount();
    }
  } catch (error) {
    console.error('Error fetching affordability:', error);
  }
}

// Calculate maximum loan amount based on affordability and selected period
function calculateMaxLoanAmount() {
  if (!loanConfig.affordabilityRatio) {
    // Fallback to R10,000 if no affordability data
    loanConfig.maxLoanAmount = 10000;
    return;
  }

  const maxMonthlyPayment = loanConfig.affordabilityRatio; // Max they can afford per month
  const annualRate = loanConfig.interestRate; // 20% or 18%
  const monthlyRate = annualRate / 12; // Convert to monthly
  const n = loanConfig.period; // Number of months

  // Amortized loan formula: L = P × [(1 - (1 + r)^-n) / r]
  let maxLoan;
  if (monthlyRate > 0) {
    maxLoan = maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate);
  } else {
    maxLoan = maxMonthlyPayment * n; // If rate is 0
  }

  loanConfig.maxLoanAmount = Number(maxLoan.toFixed(2)); // Round to 2 decimals (matches backend)
  
  console.log(`📊 Max loan for ${n} month(s) @ ${(annualRate * 100).toFixed(0)}% APR: R${loanConfig.maxLoanAmount.toLocaleString()}`);
  console.log(`   Formula: R${maxMonthlyPayment} × [(1 - (1 + ${monthlyRate.toFixed(6)})^-${n}) / ${monthlyRate.toFixed(6)}]`);
  
  // Update max loan display in UI
  const maxLoanDisplay = document.getElementById('maxLoanDisplay');
  if (maxLoanDisplay) {
    maxLoanDisplay.textContent = `Max: R${loanConfig.maxLoanAmount.toLocaleString()}`;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkLoanHistory().then(() => {
    initializeLoanSlider();
    initializePeriodSlider();
    initializeDatePicker();
    initializeSignatureCanvas();
    calculateAndUpdateSummary();
  });
});

// Loan Amount Input with validation
function initializeLoanSlider() {
  const input = document.getElementById('loanAmountInput');
  const errorDiv = document.getElementById('amountError');
  const errorText = document.getElementById('amountErrorText');

  if (!input) return;

  function validateAmount(amount) {
    errorDiv.classList.remove('show');
    
    if (amount < 100) {
      errorText.textContent = 'Amount must be at least R100';
      errorDiv.classList.add('show');
      return false;
    }
    if (amount > loanConfig.maxLoanAmount) {
      errorText.textContent = `Amount cannot exceed R${loanConfig.maxLoanAmount.toLocaleString()} (based on your affordability for ${loanConfig.period} month${loanConfig.period > 1 ? 's' : ''})`;
      errorDiv.classList.add('show');
      return false;
    }
    return true;
  }

  input.addEventListener('input', (e) => {
    let amount = parseInt(e.target.value) || 0;
    validateAmount(amount);
    
    // Update config regardless (allow invalid for display purposes)
    loanConfig.amount = amount;
    calculateAndUpdateSummary();
  });

  input.addEventListener('blur', (e) => {
    let amount = parseInt(e.target.value) || 100;
    
    // Show validation message
    if (!validateAmount(amount)) {
      // Auto-correct to nearest valid value after 2 seconds
      setTimeout(() => {
        if (amount < 100) {
          amount = 100;
        } else if (amount > loanConfig.maxLoanAmount) {
          amount = loanConfig.maxLoanAmount;
        }
        e.target.value = amount;
        loanConfig.amount = amount;
        errorDiv.classList.remove('show');
        calculateAndUpdateSummary();
      }, 2000);
    } else {
      loanConfig.amount = amount;
      calculateAndUpdateSummary();
    }
  });
}

// Period Slider with lock logic
function initializePeriodSlider() {
  const slider = document.getElementById('periodSlider');
  const periodDisplay = document.getElementById('periodAmount');
  const periodPlural = document.getElementById('periodPlural');
  const lockMessage = document.getElementById('periodLockMessage');

  if (!slider || !periodDisplay) return;

  // Show lock message if period is restricted
  if (loanConfig.maxAllowedPeriod < 24 && lockMessage) {
    lockMessage.style.display = 'block';
  }

  slider.addEventListener('input', (e) => {
    let months = parseInt(e.target.value);
    
    // Enforce max allowed period based on loan history
    if (months > loanConfig.maxAllowedPeriod) {
      months = loanConfig.maxAllowedPeriod;
      slider.value = months;
      if (lockMessage) lockMessage.style.display = 'block';
    } else {
      if (lockMessage && loanConfig.maxAllowedPeriod >= 24) {
        lockMessage.style.display = 'none';
      }
    }
    
    loanConfig.period = months;
    periodDisplay.textContent = months;
    if (periodPlural) {
      periodPlural.textContent = months > 1 ? 's' : '';
    }
    
    // Recalculate max loan amount based on new period
    calculateMaxLoanAmount();
    
    // Validate current amount against new max
    const currentAmount = loanConfig.amount;
    if (currentAmount > loanConfig.maxLoanAmount) {
      // Auto-adjust to max if current exceeds new limit
      loanConfig.amount = loanConfig.maxLoanAmount;
      const amountInput = document.getElementById('loanAmount');
      if (amountInput) {
        amountInput.value = loanConfig.maxLoanAmount;
      }
    }
    
    calculateAndUpdateSummary();
  });

  // Set initial max attribute
  slider.max = loanConfig.maxAllowedPeriod;
}

// Date Picker Initialization
function initializeDatePicker() {
  const dateInput = document.getElementById('startDate');
  if (!dateInput) return;
  const icon = document.querySelector('.date-input-icon');

  // Set minimum date to today
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  dateInput.min = formatDateForInput(today);

  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  lastDayOfMonth.setHours(12, 0, 0, 0);
  dateInput.max = formatDateForInput(lastDayOfMonth);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultValue = tomorrow.getMonth() !== today.getMonth()
    ? formatDateForInput(lastDayOfMonth)
    : formatDateForInput(tomorrow);

  dateInput.value = defaultValue;
  loanConfig.startDate = parseDateInputValue(defaultValue);

  dateInput.addEventListener('change', (e) => {
    loanConfig.startDate = parseDateInputValue(e.target.value);
  });

  if (icon && !icon.dataset.pickerBound) {
    icon.addEventListener('click', () => {
      if (dateInput.showPicker) {
        dateInput.showPicker();
      } else {
        dateInput.focus();
        // Fallback: trigger click to open native picker on some browsers
        dateInput.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
    });
    icon.dataset.pickerBound = 'true';
  }
}

function getLoanSummary() {
  // Normalize core inputs to avoid zero/NaN edge cases before math
  const amount = Math.max(0, Number(loanConfig.amount) || 0);
  const period = Math.max(1, Number(loanConfig.period) || 1);
  const interestRate = Number(loanConfig.interestRate) || 0;
  const MONTHLY_FEE = 60; // R60 admin fee per 30-day period
  const INITIATION_FEE_RATE = 0.15; // 15% of loan amount per month
  const CREDIT_LIFE_RATE = 0.0045; // 0.45% of initial loan amount
  const DAYS_PER_MONTH = 30; // Standard 30-day month for calculations
  
  // Calculate prorated admin fee based on repayment schedule
  let totalMonthlyFees = 0;
  
  const configuredStartDate = getConfiguredStartDate();
  if (configuredStartDate) {
    // Calculate days from loan start to first payment date
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const paymentDate = new Date(configuredStartDate);
    paymentDate.setHours(12, 0, 0, 0);
    
    // Calculate actual days between today and payment date
    const daysUntilPayment = Math.max(1, Math.ceil((paymentDate - start) / (1000 * 60 * 60 * 24)));
    
    // Prorate the first month's admin fee: (days used / 30 days) * R60
    const proratedDays = Math.min(daysUntilPayment, DAYS_PER_MONTH);
    const firstMonthFee = (MONTHLY_FEE / DAYS_PER_MONTH) * proratedDays;
    
    // For multi-month loans, add full fees for remaining months
    const remainingMonthsFees = period > 1 ? MONTHLY_FEE * (period - 1) : 0;
    totalMonthlyFees = firstMonthFee + remainingMonthsFees;
    
    console.log(`📊 Admin fee prorated: First month ${proratedDays} days @ R${(MONTHLY_FEE / DAYS_PER_MONTH).toFixed(2)}/day = R${firstMonthFee.toFixed(2)}${period > 1 ? ` + ${period - 1} months @ R60 = R${totalMonthlyFees.toFixed(2)}` : ''}`);
  } else {
    // If no start date, charge full monthly fee per month
    totalMonthlyFees = MONTHLY_FEE * period;
  }
  
  // NOTE: Admin fee charging logic:
  // - First payment period: Fee is prorated based on days from loan disbursement to payment date
  // - Example: 15 days until first payment = (15/30) × R60 = R30
  // - Subsequent months: Full R60 fee charged per month
  // - Early repayment will trigger recalculation and refund of unused fees
  
  // Simple interest calculation: I = P × R × T
  // Total interest = principal × annual rate × (months / 12)
  const totalInterest = amount * interestRate * (period / 12);
  
  // Calculate initiation fee: 15% of loan amount per month (no cap)
  const initiationFeePerMonth = amount * INITIATION_FEE_RATE;
  
  // Total initiation fees (charged every month)
  const totalInitiationFees = initiationFeePerMonth * period;
  
  // Combined total fees
  const totalFees = totalMonthlyFees + totalInitiationFees;
  // Credit life is 0.45% of principal, spread evenly across the term
  const totalCreditLife = Number((amount * CREDIT_LIFE_RATE).toFixed(2));
  const creditLifeMonthly = Number((totalCreditLife / period).toFixed(2));
  const combinedFees = totalFees + totalCreditLife;
  
  // Total repayment = principal + total interest + all fees (incl. credit life)
  const totalRepayment = amount + totalInterest + combinedFees;
  
  // Monthly payment = (principal + total interest + total fees) / number of months
  const monthlyPayment = totalRepayment / period;
  
  // Monthly interest portion (for display purposes)
  const monthlyInterest = totalInterest / period;

  return {
    totalInterest,
    totalRepayment,
    monthlyPayment,
    totalFees,
    monthlyFee: MONTHLY_FEE,
    initiationFee: initiationFeePerMonth,
    totalMonthlyFees,
    totalInitiationFees,
    monthlyInterest,
    creditLifeMonthly,
    totalCreditLife
  };
}

// Calculate Interest and Update Summary
function calculateAndUpdateSummary() {
  const configuredStartDate = getConfiguredStartDate();
  const summary = getLoanSummary();

  document.getElementById('summaryAmount').textContent = `R ${formatCurrency(loanConfig.amount)}`;
  document.getElementById('summaryRate').textContent = `${(loanConfig.interestRate * 100).toFixed(1)}%`;
  document.getElementById('summaryPeriod').textContent = `${loanConfig.period} Month${loanConfig.period > 1 ? 's' : ''}`;
  document.getElementById('summaryInterest').textContent = `R ${formatCurrency(summary.totalInterest)}`;
  
  // Update admin fee display with proration notice
  const summaryFeeElement = document.getElementById('summaryFee');
  if (summaryFeeElement) {
    summaryFeeElement.textContent = `R ${formatCurrency(summary.totalMonthlyFees)}`;
    
    // Add proration notice for all loans with start date
    if (configuredStartDate) {
      const start = new Date();
      start.setHours(12, 0, 0, 0);
      const paymentDate = new Date(configuredStartDate);
      paymentDate.setHours(12, 0, 0, 0);
      const daysUntilPayment = Math.max(1, Math.ceil((paymentDate - start) / (1000 * 60 * 60 * 24)));
      const proratedDays = Math.min(daysUntilPayment, 30);
      
      // Update the label to show prorated calculation
      const labelElement = summaryFeeElement.previousElementSibling;
      if (labelElement && labelElement.classList.contains('summary-label')) {
        if (loanConfig.period === 1) {
          labelElement.innerHTML = `
            Total Admin Fees (${proratedDays} days @ R2/day)
            <i class="fas fa-info-circle" style="color: var(--color-primary); font-size: 0.8rem; margin-left: 4px;" title="Prorated based on ${proratedDays} days until first payment"></i>
          `;
        } else {
          labelElement.innerHTML = `
            Total Admin Fees (1st: ${proratedDays} days, then R60/month)
            <i class="fas fa-info-circle" style="color: var(--color-primary); font-size: 0.8rem; margin-left: 4px;" title="First payment prorated for ${proratedDays} days, then R60 per month"></i>
          `;
        }
      }
    } else {
      // Reset to standard label when no start date
      const labelElement = summaryFeeElement.previousElementSibling;
      if (labelElement && labelElement.classList.contains('summary-label')) {
        labelElement.innerHTML = `
          Total Admin Fees (R60/month)
          <i class="fas fa-info-circle" style="color: var(--color-primary); font-size: 0.8rem; margin-left: 4px;" title="R60 per month"></i>
        `;
      }
    }
  }
  
  // Update initiation fee display
  const initiationFeeElement = document.getElementById('summaryInitiationFee');
  if (initiationFeeElement) {
    initiationFeeElement.textContent = `R ${formatCurrency(summary.totalInitiationFees)}`;
  }

  // Update credit life premium display
  const creditLifeElement = document.getElementById('summaryCreditLife');
  if (creditLifeElement) {
    creditLifeElement.textContent = `R ${formatCurrency(summary.totalCreditLife)}`;
    const creditLifeLabel = creditLifeElement.previousElementSibling;
    if (creditLifeLabel && creditLifeLabel.classList.contains('summary-label')) {
      creditLifeLabel.innerHTML = `
        Credit Life Premium (0.45% of principal)
        <i class="fas fa-info-circle" style="color: var(--color-primary); font-size: 0.8rem; margin-left: 4px;" title="Calculated at 0.45% of the approved loan amount and spread across ${loanConfig.period} month${loanConfig.period > 1 ? 's' : ''}."></i>
      `;
    }
  }
  
  document.getElementById('summaryMonthly').textContent = `R ${formatCurrency(summary.monthlyPayment)}`;
  document.getElementById('summaryTotal').textContent = `R ${formatCurrency(summary.totalRepayment)}`;

  return summary;
}

// Signature Canvas
let canvas, ctx, isDrawing = false;

function initializeSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  
  // Set canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Drawing settings: dark ink so it is visible on white canvas
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Mouse events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch events for mobile
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  // Redraw if there's existing signature data
  if (loanConfig.signature) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = loanConfig.signature;
  }
}

function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    // Save signature data
    loanConfig.signature = canvas.toDataURL();
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  isDrawing = true;
  ctx.beginPath();
  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
  ctx.stroke();
}

window.clearSignature = function() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  loanConfig.signature = null;
}

// Stage loan application for confirmation step
window.prepareLoanApplication = function() {
  const submitBtn = document.getElementById('submitBtn');
  const termsCheckbox = document.getElementById('termsCheckbox');
  const configuredStartDate = getConfiguredStartDate();

  if (!loanConfig.signature) {
    if (typeof showToast === 'function') {
      showToast('Signature Required', 'Please provide your digital signature to continue.', 'warning', 3000);
    } else {
      alert('⚠️ Please provide your digital signature');
    }
    return;
  }

  if (!termsCheckbox?.checked) {
    if (typeof showToast === 'function') {
      showToast('Terms Required', 'Please agree to the Terms and Conditions to continue.', 'warning', 3000);
    } else {
      alert('⚠️ Please agree to the Terms and Conditions');
    }
    return;
  }

  if (!configuredStartDate) {
    if (typeof showToast === 'function') {
      showToast('Date Required', 'Please select a first repayment date to continue.', 'warning', 3000);
    } else {
      alert('⚠️ Please select a first repayment date');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  const summary = getLoanSummary();
  const firstPaymentDateIso = configuredStartDate ? toIsoDateMidnight(configuredStartDate) : null;
  const pendingLoanPayload = {
    amount: loanConfig.amount,
    period: loanConfig.period,
    startDate: firstPaymentDateIso,
    interestRate: loanConfig.interestRate,
    signature: loanConfig.signature,
    summary,
    offer_principal: Number(loanConfig.amount) || 0,
    offer_interest_rate: Number((loanConfig.interestRate || 0) * 100).toFixed(2),
    offer_total_interest: Number(summary.totalInterest) || 0,
    offer_total_admin_fees: Number(summary.totalMonthlyFees) || 0,
    offer_total_initiation_fees: Number(summary.totalInitiationFees) || 0,
    offer_monthly_repayment: Number(summary.monthlyPayment) || 0,
    offer_total_repayment: Number(summary.totalRepayment) || 0,
    offer_credit_life_monthly: Number(summary.creditLifeMonthly) || 0,
    stagedAt: new Date().toISOString()
  };

  try {
    sessionStorage.setItem('pendingLoanConfig', JSON.stringify(pendingLoanPayload));
    sessionStorage.removeItem('lastApplicationId');
  } catch (error) {
    console.error('❌ Unable to stage loan config for confirmation:', error);
    if (typeof showToast === 'function') {
      showToast('Storage Error', 'Unable to save your loan details. Please ensure your browser allows storage and try again.', 'error', 4000);
    } else {
      alert('Unable to save your loan details locally. Please ensure your browser allows storage and try again.');
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Continue to Confirmation <i class="fas fa-arrow-right"></i>';
    }
    return;
  }

  if (typeof showToast === 'function') {
    showToast('Loan Terms Saved', 'Add your banking details on the confirmation step to submit your application.', 'success', 4000);
  } else {
    alert('👍 Loan terms saved. Add your banking details on the confirmation step to submit.');
  }
  closeLoanModal();

  // Mark step 3 as completed
  const step3 = document.querySelector('.step.active');
  if (step3) {
    step3.classList.add('completed');
  }
  sessionStorage.setItem('loanConfigCompleted', 'true');

  if (typeof loadPage === 'function') {
    loadPage('confirmation');
  } else {
    goToStep(4);
  }
};

// Utility Functions
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCurrency(num) {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Make goToStep available globally
window.goToStep = function(step) {
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

// Modal functions
window.openLoanModal = function() {
  document.getElementById('module-container')?.classList.remove('hidden');
}

window.closeLoanModal = function() {
  document.getElementById('module-container')?.classList.add('hidden');
}
