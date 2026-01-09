import '../shared/sessionGuard.js';
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

// ---------- Helpers ----------
const loadApexCharts = () =>
  new Promise((resolve, reject) => {
    if (window.ApexCharts) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

const STYLE_ID = 'admin-dashboard-analytics-style';
const getThemeColors = () => {
  const root = getComputedStyle(document.documentElement);
  const primary = (root.getPropertyValue('--color-primary') || '#0ea5e9').trim() || '#0ea5e9';
  const secondary = (root.getPropertyValue('--color-secondary') || '#f97316').trim() || '#f97316';
  return { primary, secondary };
};

// ---------- Bootstrap ----------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadApexCharts();
  } catch (err) {
    console.error('ApexCharts failed to load:', err);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML =
        '<div class="p-8 text-center text-red-600 font-semibold">Charts failed to load. Check your connection and refresh.</div>';
    }
    return;
  }

  const authInfo = await initLayout();
  if (!authInfo) return;

  const profile = getProfile();
  const mainContent = document.getElementById('main-content');

  // Inject styles once
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = `
      @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
      @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
      .analytics-card { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.25s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; }
      .analytics-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--color-primary); transform: translateY(-2px); }
      .analytics-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--color-primary, #0ea5e9), var(--color-secondary, #f97316)); opacity: 0; transition: opacity 0.25s; }
      .analytics-card:hover::before { opacity: 1; }
      .kpi-card { background: linear-gradient(135deg, var(--color-primary, #0ea5e9) 0%, var(--color-secondary, #f97316) 100%); border-radius: 12px; padding: 1.5rem; color: #fff; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.12); transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
      .kpi-card::after { content: ''; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%); animation: shimmer 3s infinite; }
      .kpi-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 1rem; }
      .kpi-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1; margin-bottom: 0.5rem; }
      .kpi-label { font-size: 0.875rem; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; }
      .kpi-trend { position: absolute; top: 1.5rem; right: 1.5rem; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.2); border-radius: 20px; backdrop-filter: blur(8px); }
      .section-header { border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.5rem; }
      .section-title { font-size: 1.125rem; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
      .section-subtitle { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
      .tab-group { display: inline-flex; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2px; gap: 2px; }
      .tab-button { padding: 0.5rem 1rem; font-size: 0.8125rem; font-weight: 600; color: #64748b; border-radius: 6px; transition: all 0.2s; cursor: pointer; border: none; background: transparent; }
      .tab-button:hover { color: var(--color-primary, #0ea5e9); background: #ffffff; }
      .tab-button.active { background: #ffffff; color: var(--color-primary, #0ea5e9); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      .chart-wrapper { min-height: 350px; width: 100%; position: relative; }
      .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse-dot 2s ease-in-out infinite; }
      .fade-in { animation: slideInUp 0.5s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
      .delay-100 { animation-delay: 0.1s; } .delay-200 { animation-delay: 0.2s; } .delay-300 { animation-delay: 0.3s; } .delay-400 { animation-delay: 0.4s; }
    `;
    document.head.appendChild(style);
  }

  // Fetch data
  let systemStatus = { text: 'Operational', color: '#10b981', dot: 'bg-emerald-500' };
  let dashData, pipelineData, perfData, finData, advancedStats, trendsData;
  try {
    [dashData, pipelineData, perfData, finData, advancedStats, trendsData] = await Promise.all([
      fetchDashboardData().catch(() => ({ financials: {}, portfolioStatus: [] })),
      fetchPipelineApplications().catch(() => ({ data: [] })),
      fetchMonthlyLoanPerformance().catch(() => ({ data: [] })),
      fetchFinancialsData().catch(() => ({ data: {} })),
      fetchPortfolioAnalytics().catch(() => ({ data: null })),
      fetchFinancialTrends().catch(() => ({ data: [] }))
    ]);
  } catch (error) {
    console.error('System Fetch Error:', error);
    systemStatus = { text: 'System Error', color: '#ef4444', dot: 'bg-red-500' };
  }

  const financials = dashData?.financials || {};
  const pipeline = pipelineData?.data || [];
  const perf = perfData?.data || [];
  const trends = trendsData?.data || [];
  const detailedFin = finData?.data || {};
  const analytics = advancedStats?.data || calculateFallbackStats(pipeline, perf);
  const { primary: primaryColor, secondary: secondaryColor } = getThemeColors();

  // Render layout (same structure as your draft but with theme colors)
  mainContent.innerHTML = `
    <div class="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      <div class="analytics-card p-8 fade-in" style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Welcome back, ${profile?.full_name?.split(' ')[0] || 'User'}</h1>
            <p class="text-slate-600 text-base">
              Your portfolio overview for <span class="font-semibold" style="color:${primaryColor};">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </p>
            ${dashData.financials?.pending_apps ? `
              <div class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                <i class="fa-solid fa-clock" style="color:${secondaryColor};"></i>
                <span class="text-sm font-semibold text-slate-700">${dashData.financials.pending_apps} applications pending review</span>
              </div>
            ` : ''}
          </div>
          <div class="status-badge">
            <span class="status-dot ${systemStatus.dot}" style="background-color:${systemStatus.color};"></span>
            <span style="color:${systemStatus.color};">${systemStatus.text}</span>
          </div>
        </div>
      </div>

      <div id="cards-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 fade-in delay-100"></div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in delay-200">
        <div class="lg:col-span-2 analytics-card p-6">
          <div class="section-header">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="section-title">Cash Flow Velocity</h3>
                <p class="section-subtitle">Disbursed vs. Collected</p>
              </div>
              <div id="tabs-velocity" class="tab-group"></div>
            </div>
          </div>
          <div id="velocityChart" class="chart-wrapper"></div>
        </div>

        <div class="analytics-card p-6">
          <div class="section-header">
            <h3 class="section-title">Portfolio Composition</h3>
            <p class="section-subtitle">Loan Status Distribution</p>
          </div>
          <div id="donutChart" class="chart-wrapper" style="min-height: 320px;"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in delay-300">
        <div class="analytics-card p-6">
          <div class="section-header">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="section-title">Vintage Analysis</h3>
                <p class="section-subtitle">Recovery Rate by Cohort</p>
              </div>
              <div id="tabs-vintage" class="tab-group"></div>
            </div>
          </div>
          <div id="vintageChart" class="chart-wrapper"></div>
        </div>

        <div class="analytics-card p-6">
          <div class="section-header">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="section-title">Risk vs. Affordability</h3>
                <p class="section-subtitle">Credit Score vs. DTI Ratio</p>
              </div>
              <div class="legend-group">
                <div class="legend-item"><span class="legend-dot bg-emerald-500"></span>Paid</div>
                <div class="legend-item"><span class="legend-dot" style="background-color:${primaryColor};"></span>Active</div>
                <div class="legend-item"><span class="legend-dot bg-red-500"></span>Default</div>
              </div>
            </div>
          </div>
          <div id="riskChart" class="chart-wrapper"></div>
        </div>
      </div>

      <div class="analytics-card p-6 fade-in delay-400">
        <div class="section-header">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="section-title">Conversion Funnel</h3>
              <p class="section-subtitle">Application Pipeline (4 Stages)</p>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-slate-900">${analytics.funnel?.STARTED || 0}</div>
              <div class="section-subtitle">Total Starts</div>
            </div>
          </div>
        </div>
        <div id="funnelChart" class="chart-wrapper" style="min-height: 300px;"></div>
      </div>

      <div class="fade-in delay-400 pt-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Historical Trends</h2>
            <p class="section-subtitle mt-1">Long-term Performance Metrics</p>
          </div>
          <div id="tabs-trends" class="tab-group"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="lg:col-span-2 analytics-card p-6">
            <div class="section-header">
              <h3 class="section-title">Portfolio Growth</h3>
              <p class="section-subtitle">Principal vs Interest Over Time</p>
            </div>
            <div id="comboChart" class="chart-wrapper"></div>
          </div>

          <div class="analytics-card p-6">
            <div class="section-header">
              <h3 class="section-title">Performance Targets</h3>
              <p class="section-subtitle">Key Health Indicators</p>
            </div>
            <div id="radialChart" class="chart-wrapper" style="min-height: 320px;"></div>
          </div>

          <div class="analytics-card p-6">
            <div class="section-header">
              <h3 class="section-title">Revenue Trajectory</h3>
              <p class="section-subtitle">Total Exposure Growth</p>
            </div>
            <div id="growthChart" class="chart-wrapper" style="min-height: 320px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render components
  renderKpiCards(financials);
  initStatusDonut(dashData?.portfolioStatus);

  const riskData = analytics.risk_matrix?.length ? analytics.risk_matrix : [];
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
});

// ---------- Helpers ----------
function filterDataByDate(data, dateKey, range) {
  if (!data || range === 'ALL') return data;
  const now = new Date();
  let startDate = new Date();
  if (range === '1M') startDate.setMonth(now.getMonth() - 1);
  if (range === '3M') startDate.setMonth(now.getMonth() - 3);
  if (range === '6M') startDate.setMonth(now.getMonth() - 6);
  if (range === '1Y') startDate.setFullYear(now.getFullYear() - 1);
  if (range === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);
  return data.filter((item) => new Date(item[dateKey]) >= startDate);
}

function setupDynamicChart(containerId, options, defaultOption, onRender) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = options
    .map((opt) => `<button class="tab-button ${opt === defaultOption ? 'active' : ''}" data-range="${opt}">${opt}</button>`)
    .join('');
  container.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      onRender(e.target.dataset.range);
    });
  });
  onRender(defaultOption);
}

// ---------- Charts ----------
function initFunnelChart(apps) {
  const { primary: primaryColor } = getThemeColors();
  const data = apps || [];
  const bucket1 = ['STARTED'];
  const bucket2 = ['BUREAU_CHECKING', 'BUREAU_OK', 'BUREAU_REFER', 'BANK_LINKING', 'AFFORD_OK', 'AFFORD_REFER'];
  const bucket3 = ['OFFERED', 'OFFER_ACCEPTED', 'CONTRACT_SIGN', 'DEBICHECK_AUTH'];
  const bucket4 = ['READY_TO_DISBURSE'];

  const counts = [
    data.filter((a) => bucket1.includes(a.status)).length,
    data.filter((a) => bucket2.includes(a.status)).length,
    data.filter((a) => bucket3.includes(a.status)).length,
    data.filter((a) => bucket4.includes(a.status)).length
  ];

  const options = {
    series: [{ name: 'Applications', data: counts }],
    chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'Inter' },
    plotOptions: { bar: { borderRadius: 8, horizontal: true, barHeight: '60%' } },
    colors: [primaryColor],
    dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: '700', colors: ['#fff'] } },
    xaxis: { categories: ['Started', 'Processing', 'Finalizing', 'Ready'], labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: '600' } } },
    yaxis: { labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: '600' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { show: false }
  };
  new ApexCharts(document.querySelector('#funnelChart'), options).render();
}

function initPerformanceRadial(fin, vintage) {
  const { primary: primaryColor, secondary: secondaryColor } = getThemeColors();
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
        hollow: { size: '45%', background: 'transparent' },
        track: { margin: 10, background: '#f1f5f9' },
        dataLabels: {
          name: { fontSize: '14px', fontWeight: '700', color: '#64748b' },
          value: { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
          total: { show: true, label: 'Avg Health', fontSize: '13px', fontWeight: '700', color: '#64748b', formatter: () => Math.round(health) + '%' }
        }
      }
    },
    stroke: { lineCap: 'round' },
    labels: ['Profit Margin', 'Portfolio Health', 'Recovery Rate'],
    colors: [primaryColor, '#10b981', secondaryColor]
  };
  new ApexCharts(document.querySelector('#radialChart'), options).render();
}

let velocityChartInstance = null;
function renderVelocityChart(perf) {
  const { primary: primaryColor, secondary: secondaryColor } = getThemeColors();
  const data = perf || [];
  const options = {
    series: [
      { name: 'Disbursed', type: 'area', data: data.map((p) => p.disbursed_amount) },
      { name: 'Collected', type: 'area', data: data.map((p) => p.repaid_amount) }
    ],
    chart: { type: 'line', height: 350, fontFamily: 'Inter', zoom: { enabled: false }, toolbar: { show: false } },
    stroke: { width: 3, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    colors: [primaryColor, secondaryColor],
    dataLabels: { enabled: false },
    labels: data.map((p) => p.month_year),
    xaxis: { labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    yaxis: { labels: { formatter: (val) => formatCompactNumber(val), style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontWeight: '600' }
  };
  if (velocityChartInstance) velocityChartInstance.destroy();
  velocityChartInstance = new ApexCharts(document.querySelector('#velocityChart'), options);
  velocityChartInstance.render();
}

function initRiskScatter(data) {
  const { primary: primaryColor } = getThemeColors();
  const points = data?.length
    ? data.map((p) => ({
        x: p.credit_score || 0,
        y: p.dti_ratio,
        z: p.principal_amount / 100,
        fillColor: p.status === 'defaulted' ? '#ef4444' : primaryColor
      }))
    : [];
  const options = {
    series: [{ name: 'Loans', data: points }],
    chart: { type: 'bubble', height: 350, fontFamily: 'Inter', zoom: { enabled: false }, toolbar: { show: false } },
    dataLabels: { enabled: false },
    fill: { opacity: 0.7 },
    xaxis: { title: { text: 'Credit Score', style: { fontSize: '12px', fontWeight: '700', color: '#64748b' } }, min: 0, max: 850, labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    yaxis: { title: { text: 'DTI Ratio (%)', style: { fontSize: '12px', fontWeight: '700', color: '#64748b' } }, max: 100, labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
  };
  new ApexCharts(document.querySelector('#riskChart'), options).render();
}

let vintageChartInstance = null;
function renderVintageChart(data) {
  const { primary: primaryColor } = getThemeColors();
  if (!data || data.length === 0) {
    document.querySelector('#vintageChart').innerHTML =
      '<div class="h-full flex items-center justify-center text-slate-400 font-medium text-sm">No vintage data available</div>';
    return;
  }
  const options = {
    series: [{ name: 'Recovery Rate', data: data.map((d) => ({ x: d.cohort, y: d.recovery_rate })) }],
    chart: { type: 'bar', height: 350, fontFamily: 'Inter', toolbar: { show: false } },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '55%',
        colors: {
          ranges: [
            { from: 0, to: 60, color: '#ef4444' },
            { from: 61, to: 90, color: '#f59e0b' },
            { from: 91, to: 150, color: '#10b981' }
          ]
        }
      }
    },
    dataLabels: { enabled: true, formatter: (val) => val + '%', style: { fontSize: '11px', fontWeight: '700', colors: ['#fff'] } },
    yaxis: { max: 120, labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    xaxis: { labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    colors: [primaryColor],
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 }
  };
  if (vintageChartInstance) vintageChartInstance.destroy();
  vintageChartInstance = new ApexCharts(document.querySelector('#vintageChart'), options);
  vintageChartInstance.render();
}

let trendChart1 = null,
  trendChart3 = null;
function renderTrendCharts(data) {
  const { primary: primaryColor, secondary: secondaryColor } = getThemeColors();
  const sorted = [...(data || [])].reverse();
  if (sorted.length === 1) {
    const currentMonth = new Date(sorted[0].month);
    const prevMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() - 1));
    const prevLabel = prevMonth.toISOString().slice(0, 7);
    sorted.unshift({ month: prevLabel, total_principal: 0, projected_interest: 0, active_loans: 0 });
  }

  const months = sorted.map((d) => d.month);

  if (trendChart1) trendChart1.destroy();
  trendChart1 = new ApexCharts(document.querySelector('#comboChart'), {
    series: [
      { name: 'Principal', data: sorted.map((d) => d.total_principal || 0) },
      { name: 'Projected Interest', data: sorted.map((d) => d.projected_interest || 0) }
    ],
    chart: { height: 350, type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'Inter' },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    colors: [primaryColor, secondaryColor],
    labels: months,
    xaxis: { labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    yaxis: { labels: { formatter: (val) => formatCurrency(val), style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontWeight: '600' },
    dataLabels: { enabled: false }
  });
  trendChart1.render();

  if (trendChart3) trendChart3.destroy();
  trendChart3 = new ApexCharts(document.querySelector('#growthChart'), {
    series: [{ name: 'Total Exposure', data: sorted.map((d) => (d.total_principal || 0) + (d.projected_interest || 0)) }],
    chart: {
      height: 300,
      type: 'area',
      toolbar: { show: false },
      fontFamily: 'Inter',
      dropShadow: { enabled: true, color: primaryColor, top: 8, blur: 10, opacity: 0.2 }
    },
    colors: [primaryColor],
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] }
    },
    xaxis: { categories: months, labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    yaxis: { labels: { formatter: (val) => formatCompactNumber(val), style: { colors: '#64748b', fontSize: '11px', fontWeight: '600' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val) => formatCurrency(val) } }
  });
  trendChart3.render();
}

// ---------- Cards ----------
function renderKpiCards(fin) {
  const container = document.getElementById('cards-container');
  const { primary, secondary } = getThemeColors();
  const cards = [
    { title: 'Total Revenue', amount: fin.total_collected, sub: 'Lifetime Collections', icon: 'fa-coins', gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` },
    { title: 'Total Disbursed', amount: fin.total_disbursed, sub: 'Principal Lent', icon: 'fa-arrow-trend-up', gradient: `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)` },
    { title: 'Cash Flow', amount: fin.realized_cash_flow, sub: 'Net Collections', icon: 'fa-chart-line', gradient: `linear-gradient(135deg, ${primary} 0%, #10b981 100%)` },
    { title: 'Active Loans', amount: fin.active_loans_count, sub: 'Current Portfolio', icon: 'fa-file-contract', gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`, isCount: true }
  ];

  container.innerHTML = cards
    .map(
      (c) => `
      <div class="kpi-card" style="background:${c.gradient};">
        <div style="position: relative; z-index: 10;">
          <div class="kpi-icon"><i class="fa-solid ${c.icon}"></i></div>
          <div class="kpi-label">${c.title}</div>
          <div class="kpi-value">${c.isCount ? c.amount : formatCompactNumber(c.amount)}</div>
          <div style="font-size: 0.75rem; opacity: 0.85; font-weight: 600;">${c.sub}</div>
        </div>
      </div>`
    )
    .join('');
}

function initStatusDonut(statusData) {
  const safeData = statusData && statusData.length ? statusData : [{ name: 'No Data', value: 1 }];
  const { primary: primaryColor, secondary: secondaryColor } = getThemeColors();
  const options = {
    series: safeData.map((s) => s.value),
    labels: safeData.map((s) => s.name),
    chart: { type: 'donut', height: 320, fontFamily: 'Inter' },
    colors: [primaryColor, secondaryColor, '#10b981', '#f59e0b'],
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Loans',
              fontSize: '14px',
              fontWeight: '700',
              color: '#64748b',
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            },
            value: { fontSize: '28px', fontWeight: '800', color: '#0f172a' }
          }
        }
      }
    },
    legend: { position: 'bottom', fontSize: '12px', fontWeight: '600', labels: { colors: '#64748b' } },
    dataLabels: { enabled: false },
    stroke: { show: false }
  };
  new ApexCharts(document.querySelector('#donutChart'), options).render();
}

// ---------- Fallback stats ----------
function calculateFallbackStats(pipeline, perf) {
  const funnel = {
    STARTED: pipeline.filter((a) => a.status === 'STARTED').length,
    BANK_LINKING: pipeline.filter((a) => ['BANK_LINKING', 'AFFORD_OK'].includes(a.status)).length,
    OFFERED: pipeline.filter((a) => a.status === 'OFFERED').length,
    CONTRACT_SIGN: pipeline.filter((a) => ['CONTRACT_SIGN', 'OFFER_ACCEPTED'].includes(a.status)).length,
    READY_TO_DISBURSE: pipeline.filter((a) => a.status === 'READY_TO_DISBURSE').length
  };
  const vintage = (perf || [])
    .map((p) => ({ cohort: p.month_year, recovery_rate: p.disbursed_amount > 0 ? Math.round((p.repaid_amount / p.disbursed_amount) * 100) : 0 }))
    .filter((v) => v.cohort >= '2024-01');
  return { funnel, vintage, risk_matrix: [] };
}