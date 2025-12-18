// Dashboard page JS
import '/user-portal/Services/sessionGuard.js'; // Production auth guard

// ==========================================
// DATA FETCHING - Currently using sample data
// ==========================================
// This data will be fetched dynamically from Supabase in production
// All sections (metrics, loans, transactions, applications, charts) 
// will pull real-time data from the database
// 
// To integrate Supabase:
// 1. Uncomment the loadDashboardData() function at the bottom
// 2. Set up the appropriate database queries
// 3. Replace dashboardData object with API responses
// ==========================================

// Sample data - COMMENTED OUT - Will be replaced with Supabase data
const dashboardData = {
    currentBalance: 0, // Will be fetched from Supabase
    nextPayment: {
        amount: 0,
        date: null
    },
    creditScore: 0,
    totalBorrowed: 0,
    totalRepaid: 0,
    loans: [
        // Active loans will be fetched from Supabase
        // Example structure:
        // {
        //     id: 'LOAN-001',
        //     amount: 'R 25,000',
        //     outstanding: 'R 12,500',
        //     totalAmount: 25000,
        //     nextPayment: 'R 1,250',
        //     dueDate: 'Nov 20, 2025',
        //     interestRate: '2.5%',
        //     status: 'Active'
        // }
    ],
    transactions: [
        // Transactions will be fetched from Supabase
        // Example structure:
        // { type: 'inbound', description: 'Loan Disbursement', amount: 'R 10,000', date: 'Oct 15, 2025' }
    ],
    applications: [
        // Applications will be fetched from Supabase
        // Example structure:
        // { id: 'APP-001', type: 'Personal Loan', amount: 'R 10,000', date: 'Oct 10, 2025', status: 'Approved' }
    ]
};

const CREDIT_SCORE_MAX = 999;
const SCORE_RISK_COLORS = {
    'very low risk': {
        gradient: 'linear-gradient(90deg, #10b981, #22d3ee)',
        accent: '#10b981'
    },
    'low risk': {
        gradient: 'linear-gradient(90deg, #22c55e, #a3e635)',
        accent: '#22c55e'
    },
    'medium risk': {
        gradient: 'linear-gradient(90deg, var(--color-secondary), var(--color-tertiary))',
        accent: 'var(--color-secondary)'
    },
    'high risk': {
        gradient: 'linear-gradient(90deg, var(--color-secondary), #ef4444)',
        accent: '#ef4444'
    },
    'very high risk': {
        gradient: 'linear-gradient(90deg, #dc2626, #7f1d1d)',
        accent: '#dc2626'
    }
};

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const getThemePalette = () => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name).trim() || fallback);
    const primaryRgb = read('--color-primary-rgb', '231 118 46');
    return {
        primary: read('--color-primary', '#E7762E'),
        primarySoft: read('--color-primary-soft', '#ff9f5a'),
        secondarySoft: read('--color-secondary-soft', '#ffb26b'),
        surfaceCard: read('--color-surface-card', '#ffffff'),
        text: read('--color-text', '#0f172a'),
        textMuted: read('--color-text-muted', '#475569'),
        primaryAlpha: (alpha) => `rgb(${primaryRgb} / ${alpha})`
    };
};

function formatCurrency(value = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 'R 0.00';
    }
    return `R ${currencyFormatter.format(numeric)}`;
}

function formatDueDate(date) {
    if (!date) {
        return null;
    }
    const dateObj = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
        return null;
    }
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateMonthlyPayment(principal = 0, annualRate = 0, termMonths = 0) {
    const amount = Number(principal);
    const months = Number(termMonths);
    if (!amount || !months || months <= 0) {
        return 0;
    }

    const monthlyRate = Number(annualRate) / 12;
    if (!monthlyRate) {
        return amount / months;
    }

    const factor = Math.pow(1 + monthlyRate, months);
    return (amount * monthlyRate * factor) / (factor - 1);
}

function updateNextPaymentDisplay(amount, dueDate) {
    const amountEl = document.getElementById('nextPaymentAmount');
    const dateEl = document.getElementById('nextPaymentDate');
    if (!amountEl || !dateEl) {
        return;
    }

    if (!amount || amount <= 0) {
        amountEl.textContent = 'R 0.00';
        dateEl.textContent = 'No upcoming payment';
        return;
    }

    amountEl.textContent = formatCurrency(amount);
    const formattedDate = formatDueDate(dueDate);
    dateEl.textContent = formattedDate ? `Due ${formattedDate}` : 'Next payment date pending';
}

// Set current date
const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

// Populate metrics - Will show 0 until Supabase data is loaded
document.getElementById('currentBalance').textContent = formatCurrency(dashboardData.currentBalance);
updateNextPaymentDisplay(dashboardData.nextPayment.amount, dashboardData.nextPayment.date);
document.getElementById('creditScore').textContent = dashboardData.creditScore || '---';
initializeCreditScoreCard();
document.getElementById('totalBorrowed').textContent = formatCurrency(dashboardData.totalBorrowed);
document.getElementById('totalRepaid').textContent = formatCurrency(dashboardData.totalRepaid);

// Populate active loans
function populateActiveLoans() {
    const loansGrid = document.getElementById('activeLoansGrid');
    if (!loansGrid) return;

    // Show loans with 'Active' or 'Offered' status in which we will probably add more later
    const activeLoans = dashboardData.loans.filter(loan => 
        loan.status === 'Active' || loan.status === 'Offered'
    ).slice(0, 3);
    
    if (activeLoans.length === 0) {
        loansGrid.innerHTML = '<p style="color: #666; text-align: center; padding: 20px; grid-column: 1/-1;">No active loans</p>';
        return;
    }

    loansGrid.innerHTML = activeLoans.map(loan => {
        // Calculate progress (0% for Offered loans, actual % for Active loans)
        const remainingAmount = loan.remaining ? parseFloat(loan.remaining.replace(/[R,\s]/g, '')) : 0;
        const totalAmount = loan.totalAmount || parseFloat(loan.amount.replace(/[R,\s]/g, ''));
        const progress = loan.status === 'Offered' ? 0 : ((totalAmount - remainingAmount) / totalAmount * 100).toFixed(0);
        
        return `
            <div class="loan-card">
                <div class="loan-header">
                    <span class="loan-id">${loan.id}</span>
                    <span class="loan-status">${loan.status}</span>
                </div>
                <div class="loan-amount">${loan.amount}</div>
                <div class="loan-details-grid">
                    <div class="loan-detail">
                        <div class="loan-detail-label">Remaining</div>
                        <div class="loan-detail-value">${loan.remaining || loan.amount}</div>
                    </div>
                    <div class="loan-detail">
                        <div class="loan-detail-label">Next Payment</div>
                        <div class="loan-detail-value">${loan.nextPayment || 'TBD'}</div>
                    </div>
                    <div class="loan-detail">
                        <div class="loan-detail-label">Due Date</div>
                        <div class="loan-detail-value">${loan.dueDate || 'TBD'}</div>
                    </div>
                    <div class="loan-detail">
                        <div class="loan-detail-label">Interest Rate</div>
                        <div class="loan-detail-value">${loan.interestRate || 'TBD'}</div>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Repayment Progress</span>
                        <span class="progress-percentage">${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Populate recent transactions
function populateTransactions() {
    const transactionList = document.getElementById('transactionList');
    if (!transactionList) return;

    const recentTransactions = dashboardData.transactions.slice(0, 5);

    if (recentTransactions.length === 0) {
        transactionList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No transactions yet</p>';
        return;
    }

    transactionList.innerHTML = recentTransactions.map(tx => `
        <div class="transaction-item">
            <div class="transaction-icon ${tx.type}">
                <i class="fas fa-${tx.type === 'inbound' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="item-details">
                <div class="item-title">${tx.description}</div>
                <div class="item-date">${tx.date}</div>
            </div>
            <div class="item-amount ${tx.type}">${tx.amount}</div>
        </div>
    `).join('');
}

// Populate recent applications
function populateApplications() {
    const applicationList = document.getElementById('applicationList');
    if (!applicationList) return;

    const recentApplications = dashboardData.applications.slice(0, 5);

    if (recentApplications.length === 0) {
        applicationList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No applications yet</p>';
        return;
    }

    applicationList.innerHTML = recentApplications.map(app => {
        const now = new Date();
        const createdAt = new Date(app.createdAt);
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        const withinTimeWindow = hoursSinceCreation < 2;
        
        // Lock edit if status is AFFORD_OK, READY_TO_DISBURSE, or time window expired
        const canEdit = withinTimeWindow && app.status !== 'AFFORD_OK' && app.status !== 'READY_TO_DISBURSE';
        
        // Lock delete if time window expired OR status is READY_TO_DISBURSE
        const canDelete = withinTimeWindow && app.status !== 'READY_TO_DISBURSE';
        
        const editLockReason = app.status === 'AFFORD_OK' 
            ? 'Edit locked - affordability check completed' 
            : app.status === 'READY_TO_DISBURSE'
            ? 'Edit locked - ready to disburse'
            : 'Edit locked after 2 hours';
        
        const deleteLockReason = app.status === 'READY_TO_DISBURSE'
            ? 'Delete locked - ready to disburse'
            : 'Delete locked after 2 hours';
        
        return `
        <div class="application-item">
            <div class="application-icon ${app.status.toLowerCase()}">
                <i class="fas fa-${app.status === 'Approved' ? 'check' : app.status === 'Pending' ? 'clock' : 'times'}"></i>
            </div>
            <div class="item-details">
                <div class="item-title">${app.type}</div>
                <div class="item-date">${app.date}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-badge ${app.status.toLowerCase()}">${app.status}</span>
                <button 
                    class="app-action-btn ${!canEdit ? 'locked' : ''}" 
                    onclick="editApplication('${app.rawId}')" 
                    ${!canEdit ? 'disabled' : ''}
                    title="${!canEdit ? editLockReason : 'Edit application'}">
                    <i class="fas fa-${!canEdit ? 'lock' : 'edit'}"></i>
                </button>
                <button 
                    class="app-action-btn delete ${!canDelete ? 'locked' : ''}" 
                    onclick="deleteApplication('${app.rawId}')" 
                    ${!canDelete ? 'disabled' : ''}
                    title="${!canDelete ? deleteLockReason : 'Delete application'}">
                    <i class="fas fa-${!canDelete ? 'lock' : 'trash'}"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function initializeCreditScoreCard() {
    applyCreditScoreToDashboard(null);
}

function applyCreditScoreToDashboard(creditData) {
    const scoreElement = document.getElementById('creditScore');
    const subtitleElement = document.querySelector('.credit-score-card .card-subtitle');
    const scoreFill = document.querySelector('.credit-score-card .score-fill');

    if (!scoreElement || !subtitleElement || !scoreFill) {
        return;
    }

    if (!creditData) {
        scoreElement.textContent = '---';
        subtitleElement.textContent = 'Run a credit check to sync Experian data';
        scoreFill.style.width = '0%';
        scoreFill.style.background = 'linear-gradient(90deg, #4b5563, #9ca3af)';
        scoreFill.style.boxShadow = 'none';
        return;
    }

    const rawScore = Number(creditData.credit_score ?? creditData.score ?? 0);
    const clampedScore = Math.max(0, Math.min(rawScore, CREDIT_SCORE_MAX));
    const percentage = Math.round((clampedScore / CREDIT_SCORE_MAX) * 100);
    const riskLabel = (creditData.score_band || creditData.risk_category || 'Risk level unavailable').toString();
    const checkedAt = creditData.checked_at ? new Date(creditData.checked_at) : null;
    const checkedAtCopy = checkedAt
        ? ` • Checked ${checkedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : '';

    scoreElement.textContent = clampedScore.toString();
    subtitleElement.textContent = `${riskLabel}${checkedAtCopy}`;

    const colorMeta = getScoreRiskColor(riskLabel);
    scoreFill.style.width = `${percentage}%`;
    scoreFill.style.background = colorMeta.gradient;
    scoreFill.style.boxShadow = `0 0 12px ${colorMeta.accent}66`;

    dashboardData.creditScore = clampedScore;
}

function getScoreRiskColor(riskLabel = '') {
    const lookupKey = riskLabel.trim().toLowerCase();
    return SCORE_RISK_COLORS[lookupKey] || {
        gradient: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary-soft))',
        accent: 'var(--color-primary)'
    };
}

async function hydrateCreditScore(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('credit_checks')
            .select('id, credit_score, score_band, risk_category, checked_at')
            .eq('user_id', userId)
            .order('checked_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching Experian score:', error);
            applyCreditScoreToDashboard(null);
            return;
        }

        if (!data) {
            applyCreditScoreToDashboard(null);
            return;
        }

        applyCreditScoreToDashboard(data);
    } catch (err) {
        console.error('Failed to hydrate credit score card:', err);
        applyCreditScoreToDashboard(null);
    }
}

// Initialize on load
populateActiveLoans();
populateTransactions();
populateApplications();

// Load real data from Supabase
loadDashboardData();

// Initialize charts
let repaymentChart, loanBreakdownChart;

function initializeCharts() {
    const palette = getThemePalette();
    // Repayment Trends Chart
    const repaymentCtx = document.getElementById('repaymentChart');
    if (repaymentCtx) {
        const lineCtx = repaymentCtx.getContext('2d');
        const lineGradient = lineCtx.createLinearGradient(0, 0, 0, repaymentCtx.height);
        lineGradient.addColorStop(0, palette.primaryAlpha(0.35));
        lineGradient.addColorStop(1, palette.primaryAlpha(0.05));

        repaymentChart = new Chart(repaymentCtx, {
            type: 'line',
            data: {
                labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
                datasets: [{
                    label: 'Payments Made',
                    data: [0, 0, 0, 0, 0, 0], // Will be populated from Supabase
                    borderColor: palette.primarySoft,
                    backgroundColor: lineGradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.45,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: palette.surfaceCard,
                    pointBorderColor: palette.secondarySoft,
                    pointBorderWidth: 3,
                    pointHoverBorderWidth: 3,
                    segment: {
                        borderColor: ctx => ctx.p0.skip || ctx.p1.skip ? 'rgba(255,255,255,0.15)' : palette.primarySoft
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#fff',
                        bodyColor: '#ffead6',
                        borderColor: '#2a2a2a',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return 'R ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#8c8c8c',
                            font: {
                                size: 10
                            },
                            callback: function(value) {
                                return 'R' + (value/1000) + 'k';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.02)'
                        },
                        ticks: {
                            color: '#9a9a9a',
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    // Loan Breakdown Chart (Doughnut)
    const breakdownCtx = document.getElementById('loanBreakdownChart');
    if (breakdownCtx) {
        const donutCtx = breakdownCtx.getContext('2d');
        const brightOrange = donutCtx.createLinearGradient(0, 0, breakdownCtx.width, breakdownCtx.height);
        brightOrange.addColorStop(0, palette.primaryAlpha(0.95));
        brightOrange.addColorStop(1, palette.primaryAlpha(0.9));
        const mutedOrange = palette.primaryAlpha(0.15);

        loanBreakdownChart = new Chart(breakdownCtx, {
            type: 'doughnut',
            data: {
                labels: ['Repaid', 'Outstanding'],
                datasets: [{
                    data: [0, 0], // Will be populated from Supabase (dashboardData.totalRepaid, dashboardData.currentBalance)
                    backgroundColor: [brightOrange, mutedOrange],
                    borderColor: ['#fff5eb', '#2f2f2f'],
                    hoverBorderColor: ['#ffffff', '#3a3a3a'],
                    borderWidth: 3,
                    hoverOffset: 8,
                    offset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e2e8f0',
                            padding: 15,
                            font: {
                                size: 11
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#fff',
                        bodyColor: '#e2e8f0',
                        borderColor: '#2a2a2a',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return context.label + ': R ' + value.toLocaleString() + ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '68%',
                rotation: -90
            }
        });
    }
}

// Update chart period
window.updateChartPeriod = function(period) {
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update chart data based on period
    // This will use real data from Supabase when integrated
    let labels, data;
    if (period === '6m') {
        labels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
        data = [0, 0, 0, 0, 0, 0]; // Will be calculated from transaction history
    } else if (period === '1y') {
        labels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
        data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Will be calculated from transaction history
    } else {
        labels = ['Aug', 'Sep', 'Oct', 'Nov'];
        data = [0, 0, 0, 0]; // Will be calculated from transaction history
    }
    
    if (repaymentChart) {
        repaymentChart.data.labels = labels;
        repaymentChart.data.datasets[0].data = data;
        repaymentChart.update();
    }
};

// Initialize charts when page loads
if (typeof Chart !== 'undefined') {
    initializeCharts();
} else {
    // Wait for Chart.js to load
    window.addEventListener('load', initializeCharts);
}

// ==========================================
// SUPABASE INTEGRATION - NOW ACTIVE
// ==========================================
async function loadDashboardData() {
    try {
        const { supabase } = await import('/Services/supabaseClient.js');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log('No session found');
            return;
        }
        
        console.log('📊 Loading dashboard data for user:', session.user.id);

        await hydrateCreditScore(supabase, session.user.id);
        
        // Fetch active loans from loans table
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (loansError) {
            console.error('Error fetching loans:', loansError);
        } else if (loans && loans.length > 0) {
            console.log('✅ Found loans:', loans);
            
            // Calculate total borrowed (sum of all principal amounts)
            const totalBorrowed = loans.reduce((sum, loan) => sum + (Number(loan.principal_amount) || 0), 0);
            dashboardData.totalBorrowed = totalBorrowed;
            
            // Update the total borrowed display
            document.getElementById('totalBorrowed').textContent = formatCurrency(totalBorrowed);

            const enrichedLoans = loans.map((loan) => {
                const principal = Number(loan.principal_amount) || 0;
                const termMonths = Number(loan.term_months) || 0;
                const rawRate = Number(loan.interest_rate) || 0;
                const normalizedRate = rawRate > 1 ? rawRate / 100 : rawRate; // handle stored percentages
                const monthlyPayment = calculateMonthlyPayment(principal, normalizedRate, termMonths);
                const dueDateObj = loan.next_payment_date ? new Date(loan.next_payment_date) : null;
                const outstandingBalance = Number(loan.outstanding_balance) || principal;
                return {
                    ...loan,
                    principal,
                    termMonths,
                    normalizedRate,
                    monthlyPayment,
                    dueDateObj,
                    outstandingBalance
                };
            });

            const upcomingPayment = enrichedLoans.reduce((best, loan) => {
                if (!loan.monthlyPayment) {
                    return best;
                }
                if (!loan.dueDateObj && !best) {
                    return loan;
                }
                if (loan.dueDateObj && (!best || !best.dueDateObj || loan.dueDateObj < best.dueDateObj)) {
                    return loan;
                }
                return best;
            }, null);

            if (upcomingPayment) {
                dashboardData.nextPayment = {
                    amount: upcomingPayment.monthlyPayment,
                    date: upcomingPayment.dueDateObj ? upcomingPayment.dueDateObj.toISOString() : null
                };
                updateNextPaymentDisplay(upcomingPayment.monthlyPayment, upcomingPayment.dueDateObj);
            } else {
                dashboardData.nextPayment = { amount: 0, date: null };
                updateNextPaymentDisplay(0, null);
            }

            // Transform loans to dashboard format (show top 3)
            dashboardData.loans = enrichedLoans.slice(0, 3).map(loan => {
                const readableStatus = loan.status
                    ? `${loan.status.charAt(0).toUpperCase()}${loan.status.slice(1).toLowerCase()}`
                    : 'Active';
                return {
                id: `LOAN-${loan.id}`,
                amount: formatCurrency(loan.principal),
                remaining: formatCurrency(loan.outstandingBalance),
                nextPayment: formatCurrency(loan.monthlyPayment),
                dueDate: loan.dueDateObj 
                    ? loan.dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'TBD',
                interestRate: `${(loan.normalizedRate * 100).toFixed(2)}%`,
                status: readableStatus
            };
            });
            
            // Update the active loans section
            populateActiveLoans();
        } else {
            console.log('No active loans found');
            dashboardData.totalBorrowed = 0;
            document.getElementById('totalBorrowed').textContent = formatCurrency(0);
            updateNextPaymentDisplay(0, null);
        }
        
        // Fetch recent applications (exclude OFFERED and DISBURSED since they're now in loans table)
        const { data: applications, error: appsError } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('user_id', session.user.id)
            .neq('status', 'OFFERED') // Exclude OFFERED applications
            .neq('status', 'DISBURSED') // Exclude DISBURSED applications
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (appsError) {
            console.error('Error fetching applications:', appsError);
        } else if (applications && applications.length > 0) {
            console.log('✅ Found applications:', applications);
            
            // Transform applications to match dashboard format
            dashboardData.applications = applications.map(app => ({
                id: `APP-${app.id}`,
                rawId: app.id,
                type: app.purpose || 'Personal Loan',
                amount: `R ${parseFloat(app.amount).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`,
                date: new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                createdAt: app.created_at,
                status: app.status
            }));
            
            // Update the applications section
            populateApplications();
        } else {
            console.log('No applications found');
        }
        
        // TODO: Fetch payments to calculate total repaid
        // const { data: payments, error: paymentsError } = await supabase
        //     .from('payments')
        //     .select('amount')
        //     .eq('user_id', session.user.id);
        // if (!paymentsError && payments) {
        //     const totalRepaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        //     dashboardData.totalRepaid = totalRepaid;
        //     document.getElementById('totalRepaid').textContent = 'R ' + totalRepaid.toLocaleString('en-US', {minimumFractionDigits: 2});
        // }
        
        // TODO: Fetch transactions (from transactions/payments table when available)
        // const { data: transactions, error: txError } = await supabase
        //     .from('transactions')
        //     .select('*')
        //     .eq('user_id', session.user.id)
        //     .order('created_at', { ascending: false })
        //     .limit(5);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Module functions - Will open as popups later
window.openLoansModule = function() {
    alert('Active Loans Module - Coming Soon!\nThis will show your loan portfolio in a popup.');
};

window.openChartsModule = function() {
    alert('Analytics Module - Coming Soon!\nThis will show repayment trends and insights in a popup.');
};

window.openApplicationsModule = function() {
    alert('Application History Module - Coming Soon!\nThis will show all past applications in a popup.');
};

window.openTransactionsModule = function() {
    alert('Transactions Module - Coming Soon!\nThis will show your payment history in a popup.');
};

// Action functions
window.createNewApplication = function() {
    if (typeof loadPage === 'function') {
        loadPage('apply-loan');
    } else {
        window.location.href = '/user-portal/pages/apply-loan.html';
    }
};

window.makePayment = function() {
    alert('Payment functionality - Connect to payment gateway');
};

// Edit application function
window.editApplication = async function(applicationId) {
    try {
        const { supabase } = await import('/Services/supabaseClient.js');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            alert('Please sign in to edit applications');
            return;
        }
        
        // Fetch application data with 2-hour window check
        const { data: app, error: fetchError } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('id', applicationId)
            .eq('user_id', session.user.id)
            .single();
            
        if (fetchError || !app) {
            alert('Application not found');
            return;
        }
        
        // Check if application status is AFFORD_OK or READY_TO_DISBURSE
        if (app.status === 'AFFORD_OK') {
            alert('This application cannot be edited. Affordability check has been completed.');
            return;
        }
        
        if (app.status === 'READY_TO_DISBURSE') {
            alert('This application cannot be edited. Application is ready to disburse.');
            return;
        }
        
        const now = new Date();
        const createdAt = new Date(app.created_at);
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        
        if (hoursSinceCreation >= 2) {
            alert('This application can no longer be edited. Edit window expired after 2 hours.');
            return;
        }
        
        // Load edit module
        loadEditModule(app);
    } catch (error) {
        console.error('Error editing application:', error);
        alert('Failed to edit application');
    }
};

// Load edit modal
async function loadEditModule(application) {
    const moduleContainer = document.getElementById('edit-module-container');
    const moduleContent = document.getElementById('edit-module-content');
    
    try {
        const response = await fetch('/user-portal/modules/edit-application.html');
        const html = await response.text();
        moduleContent.innerHTML = html;
        moduleContainer.classList.remove('hidden');
        
        // Store current application ID globally
        window.currentEditApplicationId = application.id;
        
        // Populate form with existing data
        setTimeout(() => {
            document.getElementById('editAmount').value = application.amount || '';
            document.getElementById('editPurpose').value = application.purpose || '';
            document.getElementById('editPeriod').value = application.term_months || '';
            document.getElementById('editNotes').value = application.notes || '';
        }, 100);
    } catch (error) {
        console.error('Error loading edit module:', error);
        alert('Failed to load edit form');
    }
}

// Close edit modal
window.closeEditModal = function() {
    const moduleContainer = document.getElementById('edit-module-container');
    moduleContainer.classList.add('hidden');
    window.currentEditApplicationId = null;
};

// Save application edits
window.saveApplicationEdit = async function() {
    const saveBtn = document.getElementById('saveEditBtn');
    const statusMsg = document.getElementById('editStatusMessage');
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const amount = parseFloat(document.getElementById('editAmount').value);
        const purpose = document.getElementById('editPurpose').value;
        const period = parseInt(document.getElementById('editPeriod').value);
        const notes = document.getElementById('editNotes').value;
        
        // Validation
        if (!amount || amount < 100 || amount > 10000) {
            throw new Error('Please enter a valid amount between R100 and R10,000');
        }
        
        if (!purpose) {
            throw new Error('Please select a loan purpose');
        }
        
        if (!period || period < 1 || period > 24) {
            throw new Error('Please enter a valid period between 1 and 24 months');
        }
        
        const { supabase } = await import('/Services/supabaseClient.js');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            throw new Error('Session expired. Please sign in again');
        }
        
        // Update the application
        const { error: updateError } = await supabase
            .from('loan_applications')
            .update({
                amount: amount,
                purpose: purpose,
                term_months: period,
                notes: notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', window.currentEditApplicationId)
            .eq('user_id', session.user.id);
        
        if (updateError) {
            throw updateError;
        }
        
        // Show success message
        statusMsg.textContent = 'Application updated successfully!';
        statusMsg.className = 'status-message success show';
        
        // Close modal after delay and reload data
        setTimeout(() => {
            closeEditModal();
            loadDashboardData();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving application:', error);
        statusMsg.textContent = error.message || 'Failed to update application';
        statusMsg.className = 'status-message error show';
        
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
};

// Delete application function
window.deleteApplication = async function(applicationId) {
    try {
        const { supabase } = await import('/Services/supabaseClient.js');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            alert('Please sign in to delete applications');
            return;
        }
        
        // Verify 2-hour window
        const { data: app, error: fetchError } = await supabase
            .from('loan_applications')
            .select('created_at, status')
            .eq('id', applicationId)
            .eq('user_id', session.user.id)
            .single();
            
        if (fetchError || !app) {
            alert('Application not found');
            return;
        }
        
        // Check if application status is READY_TO_DISBURSE
        if (app.status === 'READY_TO_DISBURSE') {
            alert('This application cannot be deleted. Application is ready to disburse.');
            return;
        }
        
        const now = new Date();
        const createdAt = new Date(app.created_at);
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        
        if (hoursSinceCreation >= 2) {
            alert('This application can no longer be deleted. Delete window expired after 2 hours.');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete application #${applicationId}? This action cannot be undone.`)) {
            return;
        }
        
        // Delete the application
        const { error: deleteError } = await supabase
            .from('loan_applications')
            .delete()
            .eq('id', applicationId)
            .eq('user_id', session.user.id);
            
        if (deleteError) {
            console.error('Error deleting application:', deleteError);
            alert('Failed to delete application');
            return;
        }
        
        alert('Application deleted successfully');
        // Reload dashboard data
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Failed to delete application');
    }
};

// TODO: Replace with Supabase data...later thou 
// Uncomment and implement when ready
/*
async function loadDashboardData() {
    const { supabase } = await import('/Services/supabaseClient.js');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Fetch user's loan summary
    const { data: loanSummary, error } = await supabase
        .rpc('get_user_loan_summary', { user_id: session.user.id });
    
    if (error) {
        console.error('Error loading dashboard data:', error);
        return;
    }
    
    // Update UI with real data
    document.getElementById('currentBalance').textContent = 'R ' + loanSummary.outstanding_balance.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('totalBorrowed').textContent = 'R ' + loanSummary.total_borrowed.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('totalRepaid').textContent = 'R ' + loanSummary.total_repaid.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('creditScore').textContent = loanSummary.credit_score;
}

// Call on page load
loadDashboardData();

// Also reload when navigating back to dashboard
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.pageName === 'dashboard') {
        console.log('📊 Dashboard reloaded - fetching fresh data');
        loadDashboardData();
    }
});
*/
