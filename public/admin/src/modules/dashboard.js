import '../shared/sessionGuard.js'; // Production auth guard
import { initLayout, getProfile } from '../shared/layout.js';
import { formatCompactNumber, formatCurrency } from '../shared/utils.js';
import { 
  fetchDashboardData, 
  fetchPipelineApplications, 
  fetchMonthlyLoanPerformance,
  fetchFinancialsData,
  fetchPortfolioAnalytics,
  fetchFinancialTrends 
} from '../services/dataService.js';

// ** 1. DYNAMICALLY LOAD APEXCHARTS **
const loadApexCharts = () => {
  return new Promise((resolve, reject) => {
    if (window.ApexCharts) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
 
document.addEventListener('DOMContentLoaded', async () => {
  await loadApexCharts();
  const authInfo = await initLayout(); 
  if (!authInfo) return;
  
  const profile = getProfile();
  const mainContent = document.getElementById('main-content');
  
  if (mainContent) {
    // ** 2. INJECT PRO STYLES **
    const style = document.createElement('style');
    style.innerHTML = `
      /* --- ANIMATIONS --- */
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
      
      /* --- REDUCED GLARE GLASSMORPHISM --- */
      .glass-panel { 
        background: rgba(255, 255, 255, 0.65); 
        backdrop-filter: blur(20px); 
        -webkit-backdrop-filter: blur(20px); 
        border: 1px solid rgba(255, 255, 255, 0.4); 
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05); 
        border-radius: 1.5rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .glass-panel:hover { transform: translateY(-4px); box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.1); border-color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.75); }

      /* --- TYPOGRAPHY & UTILS --- */
      .animate-entry { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .delay-1 { animation-delay: 0.1s; } .delay-2 { animation-delay: 0.2s; } .delay-3 { animation-delay: 0.3s; } .delay-4 { animation-delay: 0.4s; }
      
      .chart-container { min-height: 350px; width: 100%; position: relative; }
      .card-pattern { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); background-size: 10px 10px; }
      .status-dot { height: 8px; width: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
      
      /* --- TABS --- */
      .time-tabs { display: flex; background: rgba(255, 255, 255, 0.5); padding: 4px; border-radius: 12px; gap: 2px; border: 1px solid rgba(255,255,255,0.6); }
      .time-tab-btn { padding: 6px 12px; font-size: 11px; font-weight: 700; color: #64748b; border-radius: 8px; transition: all 0.2s; letter-spacing: 0.025em; }
      .time-tab-btn:hover { color: #1e293b; background: rgba(255,255,255,0.8); }
      .time-tab-btn.active { background: #ffffff; color: #2563eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transform: scale(1.02); }

      .kpi-card { overflow: hidden; position: relative; border: 0; }
      .kpi-shine { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%); transform: translateX(-100%); transition: transform 0.5s; }
      .kpi-card:hover .kpi-shine { transform: translateX(100%); transition: transform 0.8s; }
    `;
    document.head.appendChild(style);

    // ** 3. FETCH ALL REAL DATA **
    let systemStatus = { text: 'Operational', color: 'text-emerald-400', dot: 'bg-emerald-500' };
    let dashData, pipelineData, perfData, finData, advancedStats, trendsData;

    try {
        [dashData, pipelineData, perfData, finData, advancedStats, trendsData] = await Promise.all([
            fetchDashboardData().catch(e => ({ financials: {}, portfolioStatus: [] })), 
            fetchPipelineApplications().catch(e => ({ data: [] })),
            fetchMonthlyLoanPerformance().catch(e => ({ data: [] })), 
            fetchFinancialsData().catch(e => ({ data: {} })),
            fetchPortfolioAnalytics().catch(e => ({ data: null })),
            fetchFinancialTrends().catch(e => ({ data: [] }))
        ]);
    } catch (error) {
        console.error("System Fetch Error:", error);
        systemStatus = { text: 'System Error', color: 'text-red-400', dot: 'bg-red-500' };
    }

    const financials = dashData?.financials || {};
    const pipeline = pipelineData?.data || [];
    const perf = perfData?.data || [];
    const trends = trendsData?.data || [];
    const detailedFin = finData?.data || {};
    const analytics = advancedStats?.data || calculateFallbackStats(pipeline, perf);
    const pendingCount = pipeline.filter(a => ['STARTED', 'BANK_LINKING'].includes(a.status)).length;

    // ** 4. RENDER DASHBOARD LAYOUT **
    mainContent.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-8 pb-12 font-sans text-slate-800">
        
        <div class="relative bg-slate-900 rounded-3xl p-8 text-white shadow-2xl overflow-hidden animate-entry">
           <div class="absolute inset-0 opacity-20" style="background: radial-gradient(circle at 80% 20%, #4f46e5 0%, transparent 40%);"></div>
           <div class="absolute inset-0 card-pattern opacity-10"></div>
           
           <div class="relative z-10 flex flex-col md:flex-row justify-between items-end">
               <div class="relative bg-gray-900 rounded-3xl p-8 text-white shadow-2xl overflow-hidden animate-entry">
           <div class="relative z-10">
               <h2 class="text-3xl font-bold mb-2">Welcome back, ${profile?.full_name?.split(' ')[0] || 'User'}!</h2>
               <p class="text-gray-400 max-w-xl text-lg">
                 Here is your financial overview. You have 
                 <span class="bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-700 text-white font-bold">${dashData.financials?.pending_apps || 0}</span> 
                 applications waiting for review.
               </p>
           </div>
        </div>
               <div class="mt-4 md:mt-0 flex flex-col items-end">
                    <p class="text-[10px] text-slate-500 uppercase font-extrabold tracking-widest mb-2">System Pulse</p>
                    <div class="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                        <span class="w-2.5 h-2.5 rounded-full ${systemStatus.dot} animate-[pulse-glow_2s_infinite]"></span>
                        <span class="font-bold ${systemStatus.color} text-xs tracking-wide uppercase">${systemStatus.text}</span>
                    </div>
               </div>
           </div>
        </div>

        <div id="cards-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-entry delay-1"></div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-entry delay-2">
             <div class="lg:col-span-2 glass-panel p-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-emerald-400"></div>
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">Cash Flow Velocity</h3>
                        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Disbursed vs. Collected</p>
                    </div>
                    <div id="tabs-velocity" class="time-tabs"></div>
                </div>
                <div id="velocityChart" class="chart-container"></div>
             </div>
             
             <div class="glass-panel p-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <h3 class="font-bold text-slate-800 text-lg mb-6">Portfolio Composition</h3>
                <div id="donutChart" class="chart-container" style="min-height: 320px;"></div>
             </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-entry delay-3">
            <div class="glass-panel p-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">Vintage Analysis</h3>
                        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Repayment by Month</p>
                    </div>
                     <div id="tabs-vintage" class="time-tabs"></div>
                </div>
                <div id="vintageChart" class="chart-container"></div>
            </div>

            <div class="glass-panel p-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">Risk vs. Affordability</h3>
                        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Credit Score (X) vs. DTI (Y)</p>
                    </div>
                    <div class="flex gap-3 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                        <span class="flex items-center"><span class="status-dot bg-emerald-500"></span>Paid</span>
                        <span class="flex items-center"><span class="status-dot bg-blue-500"></span>Active</span>
                        <span class="flex items-center"><span class="status-dot bg-red-500"></span>Default</span>
                    </div>
                </div>
                <div id="riskChart" class="chart-container"></div>
            </div>
        </div>

        <div class="glass-panel p-6 animate-entry delay-4">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="font-bold text-slate-800 text-lg">Conversion Funnel</h3>
                    <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Pipeline Status (4 Steps)</p>
                </div>
                 <div class="text-right">
                    <h4 class="text-2xl font-extrabold text-slate-800">${analytics.funnel?.STARTED || 0}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Starts</p>
                </div>
            </div>
            <div id="funnelChart" class="chart-container" style="min-height: 300px;"></div>
        </div>

        <div class="animate-entry delay-4 pt-10">
             <div class="flex justify-between items-center mb-8 px-2">
                 <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Historical Trends</h2>
                 <div id="tabs-trends" class="time-tabs bg-white shadow-sm"></div>
             </div>
             
             <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="lg:col-span-2 glass-panel p-6">
                    <h3 class="font-bold text-slate-800 mb-6">Portfolio Growth (Principal vs Interest)</h3>
                    <div id="comboChart" class="chart-container"></div>
                </div>

                <div class="glass-panel p-6">
                    <h3 class="font-bold text-slate-800 mb-6">Performance Targets</h3>
                    <div id="radialChart" class="chart-container" style="min-height: 320px;"></div>
                </div>

                <div class="glass-panel p-6">
                    <h3 class="font-bold text-slate-800 mb-6">Revenue Trajectory</h3>
                    <div id="growthChart" class="chart-container" style="min-height: 320px;"></div>
                </div>
             </div>
        </div>

      </div>
    `;

    // ** 5. INITIALIZE **
    renderKpiCards(financials); // CLEAN CARDS
    initStatusDonut(dashData?.portfolioStatus);
    
    const riskData = (analytics.risk_matrix && analytics.risk_matrix.length > 0) ? analytics.risk_matrix : [];
    initRiskScatter(riskData);
    
    initFunnelChart(pipeline); 
    initPerformanceRadial(detailedFin, analytics.vintage); 
    
    setupDynamicChart('tabs-velocity', ['1M', '3M', '6M', '1Y', 'YTD'], '1Y', (range) => {
        const filtered = filterDataByDate(perf, 'month_year', range);
        renderVelocityChart(filtered);
    });

    setupDynamicChart('tabs-vintage', ['3M', '6M', '1Y', 'ALL'], 'ALL', (range) => {
        const filtered = filterDataByDate(analytics.vintage, 'cohort', range);
        renderVintageChart(filtered);
    });

    setupDynamicChart('tabs-trends', ['3M', '6M', '1Y', 'ALL'], '1Y', (range) => {
        const filtered = filterDataByDate(trends, 'month', range);
        renderTrendCharts(filtered);
    });
  }
});

// ==========================================
//      HELPERS
// ==========================================

function filterDataByDate(data, dateKey, range) {
    if (!data || range === 'ALL') return data;
    const now = new Date();
    let startDate = new Date();
    if (range === '1M') startDate.setMonth(now.getMonth() - 1);
    if (range === '3M') startDate.setMonth(now.getMonth() - 3);
    if (range === '6M') startDate.setMonth(now.getMonth() - 6);
    if (range === '1Y') startDate.setFullYear(now.getFullYear() - 1);
    if (range === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);
    return data.filter(item => { const d = new Date(item[dateKey]); return d >= startDate; });
}

function setupDynamicChart(containerId, options, defaultOption, onRender) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = options.map(opt => `<button class="time-tab-btn ${opt === defaultOption ? 'active' : ''}" data-range="${opt}">${opt}</button>`).join('');
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            onRender(e.target.dataset.range);
        });
    });
    onRender(defaultOption);
}

// ==========================================
//      RENDERERS
// ==========================================

// 1. FUNNEL
function initFunnelChart(apps) {
    if(!apps) apps = [];
    const bucket1 = ['STARTED']; 
    const bucket2 = ['BUREAU_CHECKING', 'BUREAU_OK', 'BUREAU_REFER', 'BANK_LINKING', 'AFFORD_OK', 'AFFORD_REFER'];
    const bucket3 = ['OFFERED', 'OFFER_ACCEPTED', 'CONTRACT_SIGN', 'DEBICHECK_AUTH'];
    const bucket4 = ['READY_TO_DISBURSE'];

    const counts = [
        apps.filter(a => bucket1.includes(a.status)).length,
        apps.filter(a => bucket2.includes(a.status)).length,
        apps.filter(a => bucket3.includes(a.status)).length,
        apps.filter(a => bucket4.includes(a.status)).length
    ];

    const options = {
        series: [{ name: 'Volume', data: counts }],
        chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'Inter' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '45%', distributed: true } },
        colors: ['#94a3b8', '#64748b', '#475569', '#2563eb'],
        dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 'bold' } },
        xaxis: { categories: ['1. Started', '2. Processing', '3. Finalizing', '4. Ready to Disburse'] },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };
    new ApexCharts(document.querySelector("#funnelChart"), options).render();
}

// 2. RADIAL TARGETS
function initPerformanceRadial(fin, vintage) {
    const nii = fin?.ratios?.niiToRevenue || 0;
    const arrears = fin?.balanceSheet?.arrearsPercentage || 0;
    const health = Math.max(0, 100 - arrears);
    let avgRecovery = 0;
    if (vintage && vintage.length > 0) {
        const recent = vintage.slice(0, 3);
        const sum = recent.reduce((acc, v) => acc + parseFloat(v.recovery_rate), 0);
        avgRecovery = sum / recent.length;
    }

    const options = {
        series: [Math.round(nii), Math.round(health), Math.round(avgRecovery)],
        chart: { type: 'radialBar', height: 350, fontFamily: 'Inter' },
        plotOptions: {
            radialBar: {
                hollow: { size: '35%', background: 'transparent' },
                track: { margin: 12, background: '#f1f5f9' },
                dataLabels: {
                    name: { fontSize: '22px', fontWeight: 'bold', color: '#1e293b' },
                    value: { fontSize: '16px', color: '#64748b' },
                    total: { show: true, label: 'Health Score', formatter: () => Math.round(health) + '%' }
                }
            }
        },
        stroke: { lineCap: 'round' },
        labels: ['Profit Margin', 'Portfolio Health', 'Recovery Rate'],
        colors: ['#10B981', '#3B82F6', '#F59E0B']
    };
    new ApexCharts(document.querySelector("#radialChart"), options).render();
}

// ... VELOCITY CHART ...
let velocityChartInstance = null;
function renderVelocityChart(perf) {
    if(!perf) perf = [];
    const options = {
        series: [
            { name: 'Disbursed', type: 'line', data: perf.map(p => p.disbursed_amount) }, 
            { name: 'Collected', type: 'line', data: perf.map(p => p.repaid_amount) }
        ],
        chart: { type: 'line', height: 350, fontFamily: 'Inter', zoom: { enabled: false }, toolbar: { show: false }, animations: { enabled: true } },
        stroke: { width: 3, curve: 'smooth' }, 
        colors: ['#F97316', '#10B981'], 
        dataLabels: { enabled: false }, 
        labels: perf.map(p => p.month_year),
        yaxis: [{ labels: { formatter: (val) => formatCompactNumber(val), style: { colors: '#94a3b8' } } }], 
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };
    if(velocityChartInstance) { velocityChartInstance.destroy(); }
    velocityChartInstance = new ApexCharts(document.querySelector("#velocityChart"), options);
    velocityChartInstance.render();
}

// ... RISK SCATTER ...
function initRiskScatter(data) {
    const points = (data && data.length > 0) ? data.map(p => ({ 
        x: p.credit_score || 0, y: p.dti_ratio, z: (p.principal_amount / 100), 
        fillColor: p.status === 'defaulted' ? '#EF4444' : '#3B82F6', name: p.credit_score ? `Score: ${p.credit_score}` : 'No Credit Score'
    })) : [];
    const options = {
        series: [{ name: 'Loans', data: points }],
        chart: { type: 'bubble', height: 350, fontFamily: 'Inter', zoom: { enabled: false }, toolbar: { show: false } },
        dataLabels: { enabled: false }, fill: { opacity: 0.8 },
        xaxis: { title: { text: 'Bureau Score' }, min: 0, max: 850 }, yaxis: { title: { text: 'DTI (%)' }, max: 100 },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };
    new ApexCharts(document.querySelector("#riskChart"), options).render();
}

// ... VINTAGE CHART ...
let vintageChartInstance = null;
function renderVintageChart(data) {
    if(!data || data.length === 0) { document.querySelector("#vintageChart").innerHTML = '<div class="h-full flex items-center justify-center text-gray-400 font-medium text-sm">No vintage data available</div>'; return; }
    const options = {
        series: [{ name: 'Recovery Rate', data: data.map(d => ({ x: d.cohort, y: d.recovery_rate })) }],
        chart: { type: 'bar', height: 350, fontFamily: 'Inter', zoom: { enabled: false }, toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', colors: { ranges: [{ from: 0, to: 60, color: '#EF4444' }, { from: 61, to: 90, color: '#F59E0B' }, { from: 91, to: 150, color: '#10B981' }] } } },
        dataLabels: { enabled: true, formatter: (val) => val + '%', style: { fontSize: '11px' } }, 
        yaxis: { max: 120, labels: { style: { colors: '#94a3b8' } } }, 
        colors: ['#3B82F6'],
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    };
    if(vintageChartInstance) { vintageChartInstance.destroy(); }
    vintageChartInstance = new ApexCharts(document.querySelector("#vintageChart"), options);
    vintageChartInstance.render();
}

// ... TREND CHARTS (FIXED: REVENUE TRAJECTORY IS NOW A SLEEK PATH) ...
let trendChart1 = null, trendChart3 = null;
function renderTrendCharts(data) {
    if (!data) data = [];
    const sorted = [...data].reverse();
    
    // FIX: Inject a "ghost" zero month if only 1 month exists, to draw a line
    if (sorted.length === 1) {
        const currentMonth = new Date(sorted[0].month);
        const prevMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() - 1));
        const prevLabel = prevMonth.toISOString().slice(0, 7); // YYYY-MM
        sorted.unshift({ month: prevLabel, total_principal: 0, projected_interest: 0, active_loans: 0 });
    }

    const months = sorted.map(d => d.month);

    // 1. Portfolio Growth (STACKED COLUMN)
    if(trendChart1) trendChart1.destroy();
    trendChart1 = new ApexCharts(document.querySelector("#comboChart"), {
        series: [
            { name: 'Principal', data: sorted.map(d => d.total_principal || 0) }, 
            { name: 'Projected Interest', data: sorted.map(d => d.projected_interest || 0) }
        ],
        chart: { height: 350, type: 'bar', stacked: true, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter' },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
        colors: ['#3b82f6', '#10b981'],
        labels: months, 
        yaxis: { labels: { formatter: (val) => formatCurrency(val), style: { colors: '#94a3b8' } } }, 
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        tooltip: { shared: true, intersect: false },
        legend: { position: 'top' }
    });
    trendChart1.render();

    // 3. Revenue Trajectory (NEW SLEEK GLOWING LINE)
    if(trendChart3) trendChart3.destroy();
    trendChart3 = new ApexCharts(document.querySelector("#growthChart"), {
        series: [{ name: 'Total Exposure', data: sorted.map(d => (d.total_principal || 0) + (d.projected_interest || 0)) }],
        chart: { 
            height: 300, type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter',
            dropShadow: { enabled: true, color: '#8b5cf6', top: 10, blur: 8, opacity: 0.4 } // GLOW EFFECT
        }, 
        colors: ['#8b5cf6'], // VIBRANT PURPLE
        stroke: { curve: 'smooth', width: 5 }, // THICKER LINE
        xaxis: { categories: months }, 
        yaxis: { labels: { formatter: (val) => formatCompactNumber(val), style: { colors: '#94a3b8' } } }, 
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
    });
    trendChart3.render();
}

// ==========================================
//      CARD RENDERER (CLEAN - NO INTEREST)
// ==========================================
function renderKpiCards(fin) {
    const container = document.getElementById('cards-container');
    const cards = [
        { title: 'Total Revenue', amount: fin.total_collected, sub: 'Lifetime Collected', bg: 'bg-slate-900', text: 'text-white' },
        { title: 'Total Disbursed', amount: fin.total_disbursed, sub: 'Principal Lent', bg: 'bg-gradient-to-br from-orange-500 to-red-500', text: 'text-white' },
        { title: 'Realized Cash Flow', amount: fin.realized_cash_flow, sub: 'Total Cash In', bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white' },
        { title: 'Active Loans', amount: fin.active_loans_count, sub: 'Current Contracts', bg: 'bg-gradient-to-br from-blue-600 to-indigo-600', text: 'text-white', isCount: true }
    ];
    
    container.innerHTML = cards.map(c => `
        <div class="kpi-card h-40 rounded-2xl ${c.bg} p-6 flex flex-col justify-between shadow-xl group hover:scale-[1.02] transition-transform duration-300">
            <div class="kpi-shine"></div>
            <div class="absolute inset-0 card-pattern opacity-20"></div>
            
            <div class="relative z-10 flex justify-between items-start">
                <div class="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <i class="fa-solid fa-chart-simple text-white text-sm"></i>
                </div>
            </div>
            
            <div class="relative z-10">
                <p class="text-[10px] font-bold uppercase tracking-widest ${c.text} opacity-70 mb-1">${c.title}</p>
                <h4 class="text-3xl font-mono font-bold ${c.text} tracking-tight">${c.isCount ? c.amount : formatCompactNumber(c.amount)}</h4>
                <p class="text-[10px] ${c.text} opacity-50 mt-1 uppercase font-bold tracking-wider">${c.sub}</p>
            </div>
        </div>
    `).join('');
}

function initStatusDonut(statusData) {
    const safeData = statusData && statusData.length ? statusData : [{name: 'Empty', value: 1}];
    const options = {
        series: safeData.map(s => s.value), labels: safeData.map(s => s.name),
        chart: { type: 'donut', height: 320, fontFamily: 'Inter' },
        colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'],
        plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Loans', fontSize: '14px', fontWeight: 'bold' } } } } },
        legend: { position: 'bottom', fontSize: '12px' }, dataLabels: { enabled: false },
        stroke: { show: false }
    };
    new ApexCharts(document.querySelector("#donutChart"), options).render();
}

function calculateFallbackStats(pipeline, perf) {
    const funnel = {
        'STARTED': pipeline.filter(a => a.status === 'STARTED').length,
        'BANK_LINKING': pipeline.filter(a => ['BANK_LINKING', 'AFFORD_OK'].includes(a.status)).length,
        'OFFERED': pipeline.filter(a => a.status === 'OFFERED').length,
        'CONTRACT_SIGN': pipeline.filter(a => ['CONTRACT_SIGN', 'OFFER_ACCEPTED'].includes(a.status)).length,
        'READY_TO_DISBURSE': pipeline.filter(a => a.status === 'READY_TO_DISBURSE').length
    };
    const vintage = perf.map(p => ({ cohort: p.month_year, recovery_rate: p.disbursed_amount > 0 ? Math.round((p.repaid_amount / p.disbursed_amount) * 100) : 0 })).filter(v => v.cohort >= '2024-01');
    return { funnel, vintage, risk_matrix: [] };
}
