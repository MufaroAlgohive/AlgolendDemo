import { DEFAULT_SYSTEM_SETTINGS } from '../../../shared/theme-runtime.js';
import { supabase } from './supabaseClient.js';

export { DEFAULT_SYSTEM_SETTINGS };

// =================================================================
// == HELPER UTILS (SYSTEM SETTINGS)
// =================================================================
const DEFAULT_CAROUSEL_SLIDES = DEFAULT_SYSTEM_SETTINGS.carousel_slides || [];

const normalizeCarouselSlides = (slides = []) => {
  const incoming = Array.isArray(slides) ? slides : [];
  return DEFAULT_CAROUSEL_SLIDES.map((fallback, index) => {
    const candidate = incoming[index] || {};
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
    return {
      title: title || fallback.title,
      text: text || fallback.text
    };
  });
};

const normalizeHexColor = (value, fallback) => {
  if (!value) return fallback;
  let hex = `${value}`.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return fallback;
  }
  return `#${hex.toUpperCase()}`;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

const hydrateSystemSettings = (settings = {}) => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...settings,
  auth_overlay_color: normalizeHexColor(settings?.auth_overlay_color, DEFAULT_SYSTEM_SETTINGS.auth_overlay_color),
  auth_overlay_enabled: normalizeBoolean(settings?.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled),
  auth_background_flip: normalizeBoolean(settings?.auth_background_flip, DEFAULT_SYSTEM_SETTINGS.auth_background_flip),
  carousel_slides: normalizeCarouselSlides(settings.carousel_slides)
});

// =================================================================
// == NEW: WALK-IN CLIENT CREATION
// =================================================================
export async function createWalkInClient(clientData) {
  // 1. Generate a random UUID for the profile (since they don't have an auth.users ID)
  const newId = crypto.randomUUID();

  // 2. Create the Profile directly
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: newId,
        full_name: clientData.fullName,
        identity_number: clientData.idNumber,
        contact_number: clientData.phone,
        email: clientData.email || null, // Optional for walk-ins
        role: 'borrower'
      }
    ])
    .select()
    .single();

  return { data, error };
}

// =================================================================
// == DASHBOARD INTELLIGENCE
// =================================================================
export async function fetchDashboardData() {
  try {
    const { data: stats } = await supabase.rpc('get_dashboard_stats').single();
    const { data: payments } = await supabase.from('payments').select('amount');
    const { data: loans } = await supabase.from('loans').select('principal_amount, status');
    
    const totalCollected = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const totalDisbursed = loans?.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0) || 0;
    
    let activeCount = 0, defaultCount = 0, repaidCount = 0;
    loans?.forEach(l => {
      const s = (l.status || '').toLowerCase();
      if (s === 'active') activeCount++;
      else if (s === 'default' || s === 'arrears') defaultCount++;
      else if (s === 'repaid' || s === 'settled') repaidCount++;
    });

    return {
      financials: {
        total_disbursed: totalDisbursed,
        total_collected: totalCollected,
        realized_cash_flow: totalCollected,
        profit_margin: totalDisbursed > 0 ? (((totalCollected - totalDisbursed) / totalDisbursed) * 100).toFixed(1) : 0,
        net_profit_amount: totalCollected - totalDisbursed,
        active_loans_count: activeCount,
        pending_apps: stats?.pending_applications || 0
      },
      portfolioStatus: [
        { name: 'Active', value: activeCount },
        { name: 'Default', value: defaultCount },
        { name: 'Repaid', value: repaidCount }
      ],
      error: null
    };
  } catch (error) {
    return { financials: null, portfolioStatus: null, error: error.message };
  }
}

// =================================================================
// == PIPELINE & APPLICATIONS
// =================================================================
export async function fetchPipelineApplications() {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('id, amount, status, created_at, profiles:user_id(full_name)')
    .not('status', 'in', '(DISBURSED,DECLINED)')
    .order('created_at', { ascending: false });
  return { data, error: error ? error.message : null };
}

export async function fetchMonthlyLoanPerformance() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const { data, error } = await supabase.rpc('get_monthly_loan_performance', {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0]
  });
  return { data, error: error ? error.message : null };
}

export async function fetchLoanApplications() {
  return supabase
    .from('loan_applications')
    .select('*, profiles:user_id(full_name)')
    .order('created_at', { ascending: false });
}

// =================================================================
// == APPLICATION DETAIL
// =================================================================
export async function fetchApplicationDetail(applicationId) {
  console.log(`   🔍    Fetching Detail for App ID: ${applicationId}`);
  
  const { data: appData, error: appError } = await supabase
    .from('loan_applications')
    .select(`
        *,
        profiles:user_id(*),
        creator:created_by_admin(full_name, email),
        reviewer:reviewed_by_admin(full_name, email)
    `)
    .eq('id', applicationId)
    .single();
  if (appError) throw appError;
  
  const userId = appData.user_id;
  
  const [
    financialRes,
    docsRes,
    payoutRes,
    bankRes,
    creditRes,
    loansRes,
    appHistoryRes
  ] = await Promise.all([
    supabase.from('financial_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('document_uploads')
      .select('id, file_name, file_type, file_path, uploaded_at, status')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false }),
    supabase.from('payouts')
      .select('status')
      .eq('application_id', applicationId)
      .maybeSingle(),
    supabase.from('bank_accounts')
      .select('*')
      .eq('user_id', userId),
    supabase.from('credit_checks')
      .select('*')
      .eq('user_id', userId)
      .order('checked_at', { ascending: false }),
    supabase.from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('loan_applications')
      .select('id, status, amount, created_at, purpose')
      .eq('user_id', userId)
      .neq('id', applicationId)
      .order('created_at', { ascending: false })
  ]);

  return {
    ...appData,
    financial_profiles: financialRes.data ? [financialRes.data] : [],
    documents: docsRes.data || [],
    payout: payoutRes.data || null,
    bank_accounts: bankRes.data || [],
    credit_checks: creditRes.data || [],
    loan_history: loansRes.data || [],
    application_history: appHistoryRes.data || []
  };
}

export async function updateApplicationStatus(applicationId, newStatus) {
  return supabase.from('loan_applications').update({ status: newStatus }).eq('id', applicationId).select();
}

export async function updateApplicationNotes(applicationId, notes) {
  const { data, error } = await supabase
    .from('loan_applications')
    .update({ notes: notes })
    .eq('id', applicationId)
    .select();
  return { data, error };
}

export async function createApplicationAsAdmin(appData) {
  const { data, error } = await supabase.rpc('create_application_as_admin', appData);
  return { data, error };
}

export async function upsertFinancialProfile(financialData) {
  return supabase.from('financial_profiles').upsert(financialData, { onConflict: 'user_id' }).select();
}

// =================================================================
// == USER & PROFILE FUNCTIONS
// =================================================================
export async function fetchUsers() {
  return supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function fetchUserStats() {
  try {
    const { data, error } = await supabase.rpc('get_user_stats').single();
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function fetchUserDetail(userId) {
  try {
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profError) throw profError;
    
    const [finRes, appRes] = await Promise.all([
      supabase.from('financial_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('loan_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ]);
    return {
      data: {
        profile: profile,
        financials: finRes.data || null,
        applications: appRes.data || []
      },
      error: null
    };
  } catch (error) {
    console.error("Fetch User Detail Error:", error);
    return { data: null, error: error.message };
  }
}

// =================================================================
// == PAYMENTS & PAYOUTS
// =================================================================
export async function fetchPayments() {
  return supabase
    .from('payments')
    .select('*, profile:user_id(full_name)')
    .order('payment_date', { ascending: false });
}

export async function fetchPaymentsOverTime() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const p_start_date = startDate.toISOString().split('T')[0];
    const p_end_date = endDate.toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('get_payments_over_time', {
      start_date: p_start_date,
      end_date: p_end_date
    });
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function fetchPaymentDetail(paymentId) {
  try {
    const { data, error } = await supabase.rpc('get_payment_detail', {
      p_payment_id: paymentId
    }).single();
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function fetchPayouts() {
  return supabase
    .from('payouts')
    .select('*, profile:user_id(full_name, email), bank_account:user_id(*)')
    .order('created_at', { ascending: false });
}

export async function fetchPayoutStats() {
  try {
    const { data, error } = await supabase.rpc('get_payout_stats').single();
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function fetchPayoutsOverTime() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const p_start_date = startDate.toISOString().split('T')[0];
    const p_end_date = endDate.toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('get_payouts_over_time', {
      start_date: p_start_date,
      end_date: p_end_date
    });
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function fetchPayoutDetail(payoutId) {
  try {
    const { data, error } = await supabase.rpc('get_payout_detail', {
      p_payout_id: payoutId
    }).single();
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function approvePayout(payoutId) {
  const { data, error } = await supabase
    .from('payouts')
    .update({
      status: 'disbursed',
      disbursed_at: new Date().toISOString()
    })
    .eq('id', payoutId)
    .select();
  return { data, error };
}

export async function createPayout(payoutData) {
  return supabase.from('payouts').insert([payoutData]);
}

export async function deletePayout(applicationId) {
  return supabase.from('payouts').delete().eq('application_id', applicationId);
}

// =================================================================
// == SETTINGS & ADMIN
// =================================================================
export async function updateMyProfile(profileData) {
  try {
    const { error } = await supabase.rpc('update_my_profile', {
      p_full_name: profileData.full_name,
      p_contact_number: profileData.contact_number
    });
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function updateUserRole(userId, newRole) {
  try {
    const { error } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getPaymentMethods() {
  try {
    const { data, error } = await supabase.rpc('get_payment_methods');
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function addPaymentMethod(cardData) {
  try {
    const { data, error } = await supabase.rpc('add_payment_method', cardData);
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateMyAvatar(avatarUrl) {
  try {
    const { error } = await supabase.rpc('update_my_avatar', {
      p_avatar_url: avatarUrl
    });
    return { error: error ? error.message : null };
  } catch (error) {
    return { error: error.message };
  }
}

// =================================================================
// == SYSTEM SETTINGS / THEME
// =================================================================
export async function fetchSystemSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      data: hydrateSystemSettings(data),
      error: null
    };
  } catch (error) {
    return {
      data: hydrateSystemSettings(),
      error: error.message
    };
  }
}

export async function updateSystemSettings(settings) {
  try {
    const { data: userResult } = await supabase.auth.getUser();
    const carouselSlides = normalizeCarouselSlides(settings.carousel_slides);
    const payload = {
      id: 'global',
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      tertiary_color: settings.tertiary_color,
      theme_mode: settings.theme_mode,
      company_logo_url: settings.company_logo_url || null,
      auth_background_url: settings.auth_background_url || null,
      auth_background_flip: normalizeBoolean(settings.auth_background_flip, false),
      auth_overlay_color: normalizeHexColor(settings.auth_overlay_color, DEFAULT_SYSTEM_SETTINGS.auth_overlay_color),
      auth_overlay_enabled: normalizeBoolean(settings.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled),
      carousel_slides: carouselSlides,
      updated_by: userResult?.user?.id || null
    };

    const { data, error } = await supabase
      .from('system_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    return {
      data: hydrateSystemSettings(data),
      error: error ? error.message : null
    };
  } catch (error) {
    return {
      data: null,
      error: error.message
    };
  }
}

// =================================================================
// == LOAN SYNCING
// =================================================================
export async function syncApplicationToLoans(applicationId) {
  try {
    const { data: app, error: appError } = await supabase
      .from('loan_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    if (appError) throw appError;

    if (app.status !== 'OFFERED' && app.status !== 'DISBURSED' && app.status !== 'READY_TO_DISBURSE') {
        // Just log or ignore
    }

    const { data: existingLoan } = await supabase
      .from('loans')
      .select('id')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (existingLoan) {
      return { error: 'Loan already exists' };
    }

    const offerDetails = app.offer_details || {};
    const annualRate = offerDetails.interest_rate ? parseFloat(offerDetails.interest_rate) : 0.20;
    const monthlyRate = annualRate / 12;
    const principal = parseFloat(app.amount);
    const termMonths = parseInt(app.term_months);
    const monthlyServiceFee = 60.00;

    const monthlyInterest = principal * monthlyRate;
    const principalPart = principal / termMonths;
    const monthlyPayment = principalPart + monthlyInterest + monthlyServiceFee;
    const nextPaymentDate = offerDetails.first_payment_date
      ? new Date(offerDetails.first_payment_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const loanData = {
      application_id: applicationId,
      user_id: app.user_id,
      principal_amount: principal,
      interest_rate: annualRate,
      term_months: termMonths,
      monthly_payment: monthlyPayment.toFixed(2),
      status: 'active',
      start_date: new Date().toISOString(),
      next_payment_date: nextPaymentDate.toISOString()
    };

    const { data: newLoan, error: loanError } = await supabase
      .from('loans')
      .insert([loanData])
      .select()
      .single();
    if (loanError) throw loanError;

    if (app.status !== 'DISBURSED') {
      await supabase.from('loan_applications').update({ status: 'DISBURSED' }).eq('id', applicationId);
    }
    return { data: newLoan, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function syncAllOfferedApplications() {
  try {
    const { data: offeredApps, error } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('status', 'OFFERED');
    if (error) throw error;
    const applications = offeredApps || [];
    const summary = {
      total: applications.length,
      success: 0,
      failures: []
    };
    for (const app of applications) {
      const { data, error: syncError } = await syncApplicationToLoans(app.id);
      if (syncError || !data) {
        summary.failures.push({ id: app.id, error: syncError || 'Unknown error' });
      } else {
        summary.success += 1;
      }
    }
    return { data: summary, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// =================================================================
// == ANALYTICS & BALANCE SHEET ENGINE (ROBUST & CORRECTED)
// =================================================================
export async function fetchAnalyticsData() {
  try {
    // 1. Fetch Loans
    const { data: loans, error: loanError } = await supabase
      .from('loans')
      .select('id, principal_amount, interest_rate, start_date, status, user_id, term_months')
      .not('start_date', 'is', null)
      .order('start_date', { ascending: true });
    if (loanError) throw loanError;

    // 2. Fetch Payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('loan_id, amount, payment_date')
      .order('payment_date', { ascending: true });
    if (payError) throw payError;

    // 3. Fetch Profiles
    const userIds = [...new Set(loans.map(l => l.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const nameMap = {};
    profiles?.forEach(p => { nameMap[p.id] = p.full_name });

    const paymentsMap = {};
    payments.forEach(p => {
        if (!paymentsMap[p.loan_id]) paymentsMap[p.loan_id] = [];
        paymentsMap[p.loan_id].push(p);
    });

    const balanceSheet = [];
    const today = new Date();
    const currentMonthStr = today.toISOString().slice(0, 7);
    
    // 4. Process Each Loan
    loans.forEach(loan => {
      const loanPayments = paymentsMap[loan.id] || [];
      const monthlyServiceFee = 60;
      
      // -- SAFETY CHECK: INTEREST RATE FORMAT --
      let rawRate = Number(loan.interest_rate) || 0;
      if (rawRate > 1) rawRate = rawRate / 100; 
      const monthlyRate = rawRate / 12; 
      
      let principalOutstanding = Number(loan.principal_amount);
      let interestReceivable = 0;
      let feeReceivable = 0;
      let arrearsAmount = 0;

      const startDate = new Date(loan.start_date);
      let currentDate = new Date(startDate);
      currentDate.setDate(1); 
      
      let loopCount = 0;
      while (currentDate <= today || currentDate.toISOString().slice(0,7) === currentMonthStr) {
        if (loopCount++ > 120) break;

        const monthStr = currentDate.toISOString().slice(0, 7);
        
        // A. ACCRUALS
        let interestAccrued = 0;
        let feesAccrued = 0;

        if(principalOutstanding > 0.01) {
            interestAccrued = principalOutstanding * monthlyRate;
            feesAccrued = monthlyServiceFee;
        }

        // B. Update Balances
        interestReceivable += interestAccrued;
        feeReceivable += feesAccrued;
        
        const principalInstallment = (Number(loan.principal_amount) / loan.term_months);
        const installmentDue = interestAccrued + feesAccrued + principalInstallment;
        
        // C. PAYMENTS
        const monthsPayments = loanPayments.filter(p => p.payment_date.startsWith(monthStr));
        const totalPaidThisMonth = monthsPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        let remainingPayment = totalPaidThisMonth;
        
        // Waterfall Allocation
        const feesCollected = Math.min(remainingPayment, feeReceivable);
        feeReceivable -= feesCollected;
        remainingPayment -= feesCollected;
        
        const interestCollected = Math.min(remainingPayment, interestReceivable);
        interestReceivable -= interestCollected;
        remainingPayment -= interestCollected;
        
        const principalPaid = remainingPayment;
        principalOutstanding -= principalPaid;
        
        if (principalOutstanding < 1) principalOutstanding = 0;
        
        // D. ARREARS CALCULATION
        if (currentDate >= startDate && principalOutstanding > 0) {
          const monthlyArrears = installmentDue - totalPaidThisMonth;
          if (monthlyArrears > 5) {
             arrearsAmount += monthlyArrears;
          } else if (monthlyArrears < 0) {
             arrearsAmount = Math.max(0, arrearsAmount + monthlyArrears);
          }
        } else if (principalOutstanding === 0) {
            arrearsAmount = 0;
        }
        
        // E. STORE DATA POINT
        balanceSheet.push({
          month: monthStr,
          loan_id: loan.id,
          customer: nameMap[loan.user_id] || 'Unidentified', 
          status: loan.status,
          
          // Values
          principal_outstanding: principalOutstanding,
          interest_receivable: interestReceivable,
          fee_receivable: feeReceivable,
          arrears_amount: arrearsAmount,
          
          // Earnings for this specific month
          interest_earned_month: interestAccrued,
          fees_earned_month: feesAccrued,
          
          payment_received: totalPaidThisMonth
        });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        if (monthStr === currentMonthStr) break; 
      }
    });

    return { data: balanceSheet, error: null };
  } catch (error) {
    console.error("Analytics Error:", error);
    return { data: [], error: error.message };
  }
}

// =================================================================
// == FINANCIALS REPORT (WITH ANNUALIZATION)
// =================================================================
export async function fetchFinancialsData(timeRange = 'YTD') {
  try {
    const { data: rawData, error } = await fetchAnalyticsData();
    if (error) throw new Error(error);

    const now = new Date();
    let startDate = new Date();
    let annualizationFactor = 1;

    // 1. Configure Time Window & Annualization
    switch (timeRange) {
        case '1M':
            startDate.setMonth(now.getMonth() - 1);
            annualizationFactor = 12;
            break;
        case '3M':
            startDate.setMonth(now.getMonth() - 3);
            annualizationFactor = 4;
            break;
        case '6M':
            startDate.setMonth(now.getMonth() - 6);
            annualizationFactor = 2;
            break;
        case '1Y':
            startDate.setFullYear(now.getFullYear() - 1);
            annualizationFactor = 1;
            break;
        case 'YTD':
            startDate = new Date(now.getFullYear(), 0, 1);
            const monthsPassed = now.getMonth() + 1;
            annualizationFactor = 12 / monthsPassed;
            break;
        default:
            startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const startStr = startDate.toISOString().slice(0, 7);

    // 2. Filter Rows for Income Statement (Flows)
    const relevantRows = rawData.filter(row => row.month >= startStr);
    
    // 3. Get Snapshots for Balance Sheet (Stocks)
    // We group by loan_id and take the VERY LAST row to see "Current Status"
    const latestLoanStatus = {};
    rawData.forEach(row => {
        latestLoanStatus[row.loan_id] = row;
    });
    const snapshotRows = Object.values(latestLoanStatus);

    // 4. Calculate Totals
    const interestIncome = relevantRows.reduce((sum, row) => sum + (row.interest_earned_month || 0), 0);
    const feeIncome = relevantRows.reduce((sum, row) => sum + (row.fees_earned_month || 0), 0);
    const totalRevenue = interestIncome + feeIncome;

    const totalLoanBookValue = snapshotRows.reduce((sum, row) => sum + (row.principal_outstanding || 0), 0);
    
    // 5. Corrected Ratio Calculations
    // Yield = (Revenue / Book) * AnnualizationFactor
    let annualizedYield = 0;
    if (totalLoanBookValue > 0) {
        const rawYield = (totalRevenue / totalLoanBookValue);
        annualizedYield = rawYield * annualizationFactor * 100;
    }
    
    const clientsInArrearsCount = snapshotRows.filter(row => (row.arrears_amount || 0) > 10).length;
    const totalActiveClients = snapshotRows.filter(r => r.principal_outstanding > 0).length || 1;
    const arrearsPercentage = (clientsInArrearsCount / totalActiveClients) * 100;

    // Simulated CLR (Credit Loss Ratio) - typically annualized write-offs / book
    // For now, we assume arrears > 90 days (approx 3 missed payments worth) is "at risk"
    const atRiskValue = snapshotRows
        .filter(r => r.arrears_amount > (r.principal_outstanding * 0.15)) // Crude proxy for deep arrears
        .reduce((sum, r) => sum + r.principal_outstanding, 0);
    
    const clr = totalLoanBookValue > 0 ? (atRiskValue / totalLoanBookValue) * 100 : 0;

    return {
        data: {
            period: timeRange,
            incomeStatement: {
                interestIncome,
                nii: interestIncome,
                feeIncome,
                commissionIncome: 0,
                penaltyIncome: 0,
                nir: feeIncome,
                totalRevenue
            },
            ratios: {
                clr: clr.toFixed(2) + "%",
                niiToRevenue: totalRevenue > 0 ? (interestIncome / totalRevenue) * 100 : 0,
                nirToRevenue: totalRevenue > 0 ? (feeIncome / totalRevenue) * 100 : 0
            },
            balanceSheet: {
                totalLoanBook: totalLoanBookValue,
                activeClients: totalActiveClients,
                avgLoanPerClient: totalActiveClients > 0 ? totalLoanBookValue / totalActiveClients : 0,
                avgInterestRate: annualizedYield, // Now correctly annualized
                arrearsPercentage: arrearsPercentage
            }
        },
        error: null
    };

  } catch (error) {
    console.error("Financials Error:", error);
    return { data: null, error: error.message };
  }
}

export async function fetchPortfolioAnalytics() {
  const { data, error } = await supabase.rpc('get_portfolio_analytics');
  
  if (error) {
    console.error('Error fetching analytics:', error);
    // Return empty structure so the dashboard doesn't crash
    return { data: { vintage: [], risk_matrix: [], funnel: {} } }; 
  }
  
  return { data };
}

export async function fetchFinancialTrends() {
    try {
        const { data, error } = await supabase.rpc('get_financial_trends');
        if (error) throw error;
        return { data: data || [] };
    } catch (err) {
        console.error('Error fetching trends:', err);
        return { data: [] }; // Return empty array to prevent crash
    }
}

