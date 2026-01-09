import{s as S}from"./supabaseClient-CsC_yag8.js";import{i as $,g as O}from"./layout-DKFM-dk0.js";/* empty css               */import{f as E,a as I}from"./utils-D6Z1B7Jq.js";import{f as P,a as N,b as Y,c as B,d as j,e as H}from"./dataService-Bp3rTtkG.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";let k=!1;async function U(){if(!k){k=!0;try{const{data:{session:a},error:i}=await S.auth.getSession();if(i||!a){console.log("🔒 Admin session invalid - redirecting to login"),window.location.replace("/auth/login.html");return}const{data:r,error:o}=await S.rpc("is_role_or_higher",{p_min_role:"base_admin"});if(o||!r){console.log("🔒 Not an admin - access denied"),await S.auth.signOut(),window.location.replace("/auth/login.html");return}console.log("✅ Admin session validated")}catch(a){console.error("Admin session guard error:",a),window.location.replace("/auth/login.html")}finally{k=!1}}}U();const K=()=>new Promise((a,i)=>{if(window.ApexCharts)return a();const r=document.createElement("script");r.src="https://cdn.jsdelivr.net/npm/apexcharts",r.onload=a,r.onerror=i,document.head.appendChild(r)}),L="admin-dashboard-analytics-style",d=()=>{const a=getComputedStyle(document.documentElement),i=(a.getPropertyValue("--color-primary")||"#0ea5e9").trim()||"#0ea5e9",r=(a.getPropertyValue("--color-secondary")||"#f97316").trim()||"#f97316";return{primary:i,secondary:r}};document.addEventListener("DOMContentLoaded",async()=>{var z,D,R,F;try{await K()}catch(c){console.error("ApexCharts failed to load:",c);const f=document.getElementById("main-content");f&&(f.innerHTML='<div class="p-8 text-center text-red-600 font-semibold">Charts failed to load. Check your connection and refresh.</div>');return}if(!await $())return;const i=O(),r=document.getElementById("main-content");if(!document.getElementById(L)){const c=document.createElement("style");c.id=L,c.innerHTML=`
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
    `,document.head.appendChild(c)}let o={text:"Operational",color:"#10b981",dot:"bg-emerald-500"},t,e,s,l,p,n;try{[t,e,s,l,p,n]=await Promise.all([P().catch(()=>({financials:{},portfolioStatus:[]})),N().catch(()=>({data:[]})),Y().catch(()=>({data:[]})),B().catch(()=>({data:{}})),j().catch(()=>({data:null})),H().catch(()=>({data:[]}))])}catch(c){console.error("System Fetch Error:",c),o={text:"System Error",color:"#ef4444",dot:"bg-red-500"}}const u=(t==null?void 0:t.financials)||{},h=(e==null?void 0:e.data)||[],x=(s==null?void 0:s.data)||[],C=(n==null?void 0:n.data)||[],w=(l==null?void 0:l.data)||{},m=(p==null?void 0:p.data)||et(h,x),{primary:T,secondary:M}=d();r.innerHTML=`
    <div class="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      <div class="analytics-card p-8 fade-in" style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Welcome back, ${((z=i==null?void 0:i.full_name)==null?void 0:z.split(" ")[0])||"User"}</h1>
            <p class="text-slate-600 text-base">
              Your portfolio overview for <span class="font-semibold" style="color:${T};">${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span>
            </p>
            ${(D=t.financials)!=null&&D.pending_apps?`
              <div class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                <i class="fa-solid fa-clock" style="color:${M};"></i>
                <span class="text-sm font-semibold text-slate-700">${t.financials.pending_apps} applications pending review</span>
              </div>
            `:""}
          </div>
          <div class="status-badge">
            <span class="status-dot ${o.dot}" style="background-color:${o.color};"></span>
            <span style="color:${o.color};">${o.text}</span>
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
                <div class="legend-item"><span class="legend-dot" style="background-color:${T};"></span>Active</div>
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
              <div class="text-3xl font-bold text-slate-900">${((R=m.funnel)==null?void 0:R.STARTED)||0}</div>
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
  `,Z(u),tt(t==null?void 0:t.portfolioStatus);const W=(F=m.risk_matrix)!=null&&F.length?m.risk_matrix:[];J(W),q(h),G(w,m.vintage),_("tabs-velocity",["1M","3M","6M","1Y","YTD"],"1Y",c=>{const f=A(x,"month_year",c);V(f)}),_("tabs-vintage",["3M","6M","1Y","ALL"],"ALL",c=>{const f=A(m.vintage,"cohort",c);Q(f)}),_("tabs-trends",["3M","6M","1Y","ALL"],"1Y",c=>{const f=A(C,"month",c);X(f)})});function A(a,i,r){if(!a||r==="ALL")return a;const o=new Date;let t=new Date;return r==="1M"&&t.setMonth(o.getMonth()-1),r==="3M"&&t.setMonth(o.getMonth()-3),r==="6M"&&t.setMonth(o.getMonth()-6),r==="1Y"&&t.setFullYear(o.getFullYear()-1),r==="YTD"&&(t=new Date(o.getFullYear(),0,1)),a.filter(e=>new Date(e[i])>=t)}function _(a,i,r,o){const t=document.getElementById(a);t&&(t.innerHTML=i.map(e=>`<button class="tab-button ${e===r?"active":""}" data-range="${e}">${e}</button>`).join(""),t.querySelectorAll("button").forEach(e=>{e.addEventListener("click",s=>{t.querySelectorAll("button").forEach(l=>l.classList.remove("active")),s.target.classList.add("active"),o(s.target.dataset.range)})}),o(r))}function q(a){const{primary:i}=d(),r=a||[],o=["STARTED"],t=["BUREAU_CHECKING","BUREAU_OK","BUREAU_REFER","BANK_LINKING","AFFORD_OK","AFFORD_REFER"],e=["OFFERED","OFFER_ACCEPTED","CONTRACT_SIGN","DEBICHECK_AUTH"],s=["READY_TO_DISBURSE"],p={series:[{name:"Applications",data:[r.filter(n=>o.includes(n.status)).length,r.filter(n=>t.includes(n.status)).length,r.filter(n=>e.includes(n.status)).length,r.filter(n=>s.includes(n.status)).length]}],chart:{type:"bar",height:300,toolbar:{show:!1},fontFamily:"Inter"},plotOptions:{bar:{borderRadius:8,horizontal:!0,barHeight:"60%"}},colors:[i],dataLabels:{enabled:!0,style:{fontSize:"12px",fontWeight:"700",colors:["#fff"]}},xaxis:{categories:["Started","Processing","Finalizing","Ready"],labels:{style:{colors:"#64748b",fontSize:"12px",fontWeight:"600"}}},yaxis:{labels:{style:{colors:"#64748b",fontSize:"12px",fontWeight:"600"}}},grid:{borderColor:"#f1f5f9",strokeDashArray:4},legend:{show:!1}};new ApexCharts(document.querySelector("#funnelChart"),p).render()}function G(a,i){var n,u;const{primary:r,secondary:o}=d(),t=((n=a==null?void 0:a.ratios)==null?void 0:n.niiToRevenue)||0,e=((u=a==null?void 0:a.balanceSheet)==null?void 0:u.arrearsPercentage)||0,s=Math.max(0,100-e);let l=0;if(i&&i.length>0){const h=i.slice(0,3);l=h.reduce((C,w)=>C+parseFloat(w.recovery_rate),0)/h.length}const p={series:[Math.round(t),Math.round(s),Math.round(l)],chart:{type:"radialBar",height:350,fontFamily:"Inter"},plotOptions:{radialBar:{hollow:{size:"45%",background:"transparent"},track:{margin:10,background:"#f1f5f9"},dataLabels:{name:{fontSize:"14px",fontWeight:"700",color:"#64748b"},value:{fontSize:"24px",fontWeight:"800",color:"#0f172a"},total:{show:!0,label:"Avg Health",fontSize:"13px",fontWeight:"700",color:"#64748b",formatter:()=>Math.round(s)+"%"}}}},stroke:{lineCap:"round"},labels:["Profit Margin","Portfolio Health","Recovery Rate"],colors:[r,"#10b981",o]};new ApexCharts(document.querySelector("#radialChart"),p).render()}let g=null;function V(a){const{primary:i,secondary:r}=d(),o=a||[],t={series:[{name:"Disbursed",type:"area",data:o.map(e=>e.disbursed_amount)},{name:"Collected",type:"area",data:o.map(e=>e.repaid_amount)}],chart:{type:"line",height:350,fontFamily:"Inter",zoom:{enabled:!1},toolbar:{show:!1}},stroke:{width:3,curve:"smooth"},fill:{type:"gradient",gradient:{shadeIntensity:1,opacityFrom:.4,opacityTo:.1}},colors:[i,r],dataLabels:{enabled:!1},labels:o.map(e=>e.month_year),xaxis:{labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},yaxis:{labels:{formatter:e=>E(e),style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},grid:{borderColor:"#f1f5f9",strokeDashArray:4},legend:{position:"top",horizontalAlign:"right",fontSize:"12px",fontWeight:"600"}};g&&g.destroy(),g=new ApexCharts(document.querySelector("#velocityChart"),t),g.render()}function J(a){const{primary:i}=d(),o={series:[{name:"Loans",data:a!=null&&a.length?a.map(t=>({x:t.credit_score||0,y:t.dti_ratio,z:t.principal_amount/100,fillColor:t.status==="defaulted"?"#ef4444":i})):[]}],chart:{type:"bubble",height:350,fontFamily:"Inter",zoom:{enabled:!1},toolbar:{show:!1}},dataLabels:{enabled:!1},fill:{opacity:.7},xaxis:{title:{text:"Credit Score",style:{fontSize:"12px",fontWeight:"700",color:"#64748b"}},min:0,max:850,labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},yaxis:{title:{text:"DTI Ratio (%)",style:{fontSize:"12px",fontWeight:"700",color:"#64748b"}},max:100,labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},grid:{borderColor:"#f1f5f9",strokeDashArray:4}};new ApexCharts(document.querySelector("#riskChart"),o).render()}let b=null;function Q(a){const{primary:i}=d();if(!a||a.length===0){document.querySelector("#vintageChart").innerHTML='<div class="h-full flex items-center justify-center text-slate-400 font-medium text-sm">No vintage data available</div>';return}const r={series:[{name:"Recovery Rate",data:a.map(o=>({x:o.cohort,y:o.recovery_rate}))}],chart:{type:"bar",height:350,fontFamily:"Inter",toolbar:{show:!1}},plotOptions:{bar:{borderRadius:8,columnWidth:"55%",colors:{ranges:[{from:0,to:60,color:"#ef4444"},{from:61,to:90,color:"#f59e0b"},{from:91,to:150,color:"#10b981"}]}}},dataLabels:{enabled:!0,formatter:o=>o+"%",style:{fontSize:"11px",fontWeight:"700",colors:["#fff"]}},yaxis:{max:120,labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},xaxis:{labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},colors:[i],grid:{borderColor:"#f1f5f9",strokeDashArray:4}};b&&b.destroy(),b=new ApexCharts(document.querySelector("#vintageChart"),r),b.render()}let y=null,v=null;function X(a){const{primary:i,secondary:r}=d(),o=[...a||[]].reverse();if(o.length===1){const e=new Date(o[0].month),l=new Date(e.setMonth(e.getMonth()-1)).toISOString().slice(0,7);o.unshift({month:l,total_principal:0,projected_interest:0,active_loans:0})}const t=o.map(e=>e.month);y&&y.destroy(),y=new ApexCharts(document.querySelector("#comboChart"),{series:[{name:"Principal",data:o.map(e=>e.total_principal||0)},{name:"Projected Interest",data:o.map(e=>e.projected_interest||0)}],chart:{height:350,type:"bar",stacked:!0,toolbar:{show:!1},fontFamily:"Inter"},plotOptions:{bar:{borderRadius:6,columnWidth:"50%"}},colors:[i,r],labels:t,xaxis:{labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},yaxis:{labels:{formatter:e=>I(e),style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},grid:{borderColor:"#f1f5f9",strokeDashArray:4},tooltip:{shared:!0,intersect:!1},legend:{position:"top",horizontalAlign:"right",fontSize:"12px",fontWeight:"600"},dataLabels:{enabled:!1}}),y.render(),v&&v.destroy(),v=new ApexCharts(document.querySelector("#growthChart"),{series:[{name:"Total Exposure",data:o.map(e=>(e.total_principal||0)+(e.projected_interest||0))}],chart:{height:300,type:"area",toolbar:{show:!1},fontFamily:"Inter",dropShadow:{enabled:!0,color:i,top:8,blur:10,opacity:.2}},colors:[i],stroke:{curve:"smooth",width:3},fill:{type:"gradient",gradient:{shadeIntensity:1,opacityFrom:.5,opacityTo:.1,stops:[0,90,100]}},xaxis:{categories:t,labels:{style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},yaxis:{labels:{formatter:e=>E(e),style:{colors:"#64748b",fontSize:"11px",fontWeight:"600"}}},grid:{borderColor:"#f1f5f9",strokeDashArray:4},dataLabels:{enabled:!1},tooltip:{y:{formatter:e=>I(e)}}}),v.render()}function Z(a){const i=document.getElementById("cards-container"),{primary:r,secondary:o}=d(),t=[{title:"Total Revenue",amount:a.total_collected,sub:"Lifetime Collections",icon:"fa-coins",gradient:`linear-gradient(135deg, ${r} 0%, ${o} 100%)`},{title:"Total Disbursed",amount:a.total_disbursed,sub:"Principal Lent",icon:"fa-arrow-trend-up",gradient:`linear-gradient(135deg, ${o} 0%, ${r} 100%)`},{title:"Cash Flow",amount:a.realized_cash_flow,sub:"Net Collections",icon:"fa-chart-line",gradient:`linear-gradient(135deg, ${r} 0%, #10b981 100%)`},{title:"Active Loans",amount:a.active_loans_count,sub:"Current Portfolio",icon:"fa-file-contract",gradient:`linear-gradient(135deg, ${r} 0%, ${o} 100%)`,isCount:!0}];i.innerHTML=t.map(e=>`
      <div class="kpi-card" style="background:${e.gradient};">
        <div style="position: relative; z-index: 10;">
          <div class="kpi-icon"><i class="fa-solid ${e.icon}"></i></div>
          <div class="kpi-label">${e.title}</div>
          <div class="kpi-value">${e.isCount?e.amount:E(e.amount)}</div>
          <div style="font-size: 0.75rem; opacity: 0.85; font-weight: 600;">${e.sub}</div>
        </div>
      </div>`).join("")}function tt(a){const i=a&&a.length?a:[{name:"No Data",value:1}],{primary:r,secondary:o}=d(),t={series:i.map(e=>e.value),labels:i.map(e=>e.name),chart:{type:"donut",height:320,fontFamily:"Inter"},colors:[r,o,"#10b981","#f59e0b"],plotOptions:{pie:{donut:{size:"70%",labels:{show:!0,total:{show:!0,label:"Total Loans",fontSize:"14px",fontWeight:"700",color:"#64748b",formatter:e=>e.globals.seriesTotals.reduce((s,l)=>s+l,0)},value:{fontSize:"28px",fontWeight:"800",color:"#0f172a"}}}}},legend:{position:"bottom",fontSize:"12px",fontWeight:"600",labels:{colors:"#64748b"}},dataLabels:{enabled:!1},stroke:{show:!1}};new ApexCharts(document.querySelector("#donutChart"),t).render()}function et(a,i){const r={STARTED:a.filter(t=>t.status==="STARTED").length,BANK_LINKING:a.filter(t=>["BANK_LINKING","AFFORD_OK"].includes(t.status)).length,OFFERED:a.filter(t=>t.status==="OFFERED").length,CONTRACT_SIGN:a.filter(t=>["CONTRACT_SIGN","OFFER_ACCEPTED"].includes(t.status)).length,READY_TO_DISBURSE:a.filter(t=>t.status==="READY_TO_DISBURSE").length},o=(i||[]).map(t=>({cohort:t.month_year,recovery_rate:t.disbursed_amount>0?Math.round(t.repaid_amount/t.disbursed_amount*100):0})).filter(t=>t.cohort>="2024-01");return{funnel:r,vintage:o,risk_matrix:[]}}
