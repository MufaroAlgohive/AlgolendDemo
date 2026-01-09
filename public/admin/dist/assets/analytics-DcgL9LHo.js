import"./supabaseClient-C9gCct-F.js";import{c as h,D as v,i as w,a as _}from"./layout-DndgIVcP.js";import{a as g}from"./utils-D6Z1B7Jq.js";import{G as L}from"./dataService-d5RfGeK7.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";const E=(t="")=>`${t}`.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),y=()=>h(_())||v.company_name,I=()=>(y()||"Company").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").substring(0,60)||"company";window.XLSX={utils:{json_to_sheet:t=>t,book_new:()=>({Sheets:{},SheetNames:[]}),book_append_sheet:(t,a,e)=>{t.Sheets[e]=a,t.SheetNames.push(e)}},writeFile:(t,a)=>{const e=t.SheetNames[0],r=t.Sheets[e];if(!r||r.length===0)return;const n=Object.keys(r[0]),l=[n.join(","),...r.map(i=>n.map(c=>{const x=i[c]===null||i[c]===void 0?"":i[c];return typeof x=="string"?`"${x.replace(/"/g,'""')}"`:x}).join(","))].join(`
`),p=new Blob(["\uFEFF"+l],{type:"text/csv;charset=utf-8;"}),o=document.createElement("a"),d=URL.createObjectURL(p);o.setAttribute("href",d),o.setAttribute("download",a.replace(".xlsx",".csv")),o.style.visibility="hidden",document.body.appendChild(o),o.click(),document.body.removeChild(o)}};let s={rawData:[],processedData:[],filterArrears:!1,sortMode:"month_desc",hiddenRows:new Set,flaggedRows:new Set,exportPeriod:"all"};const b=t=>`${t.loan_id}-${t.month}`;function A(){if(typeof XLSX>"u")return alert("Excel library not loaded.");const t=s.processedData.map(r=>({"Loan ID":r.loan_id,Customer:r.customer||"N/A","Statement Period":r.month,"Principal (ZAR)":parseFloat(r.principal_outstanding||0),"Interest (ZAR)":parseFloat(r.interest_receivable||0),"Fees (ZAR)":parseFloat(r.fee_receivable||0),"Arrears (ZAR)":parseFloat(r.arrears_amount||0)})),a=XLSX.utils.json_to_sheet(t),e=XLSX.utils.book_new();XLSX.utils.book_append_sheet(e,a,"Analytics"),XLSX.writeFile(e,`${I()}_Analytics_${s.exportPeriod}.xlsx`)}const S=E(y()),R=`
    <div class="flex flex-col space-y-6">
        <style>
            /* UI PRIVACY: Hides sidebar and nav ONLY during print/export */
            @media print {
                @page { size: landscape; margin: 10mm; }
                body { background: white !important; }
                nav, aside, header, .hamburger, .sidebar, .notification-bell, .user-profile, 
                .rounded-full, .print\\:hidden, #searchInput, .period-tab-container, .hide-btn, .flag-btn { 
                    display: none !important; 
                }
                table { width: 100% !important; border-collapse: collapse !important; font-size: 10px !important; }
                th, td { border: 1px solid #e5e7eb !important; padding: 6px !important; }
            }

            /* FIXED TOTALS ROW & HEADER */
            .sticky-header { position: sticky; top: 0; z-index: 30; }
            .sticky-totals { position: sticky; top: 41px; z-index: 25; background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
        </style>

        <div class="hidden print:flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">${S}</h1>
                <p class="text-sm text-gray-500 uppercase font-semibold">Revenue Analytics Report</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold">Generated: ${new Date().toLocaleDateString("en-GB")}</p>
            </div>
        </div>

        <div class="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-6 gap-4 print:hidden">
            <div>
                <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Revenue Analytics</h1>
                <p class="text-sm text-gray-500 mt-2">Portfolio Revenue & Amortisation Statement</p>
            </div>
            
            <div class="flex items-center space-x-4">
                <div class="bg-gray-100 p-1 rounded-lg flex space-x-1 period-tab-container">
                    <button id="tab-current_month" class="period-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500">1M</button>
                    <button id="tab-last_3_months" class="period-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500">3M</button>
                    <button id="tab-ytd" class="period-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500">YTD</button>
                    <button id="tab-all" class="period-tab px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white text-blue-600 shadow-sm">ALL</button>
                </div>

                <div class="relative group">
                    <button class="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-md">
                        <i class="fa-solid fa-file-export mr-2"></i> Export <i class="fa-solid fa-chevron-down ml-2 text-xs opacity-70"></i>
                    </button>
                    <div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                        <button id="printPdfBtn" class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center border-b border-gray-100">
                            <i class="fa-solid fa-file-pdf mr-3 text-red-500"></i> Save as PDF
                        </button>
                        <button id="exportExcelBtn" class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                            <i class="fa-solid fa-file-excel mr-3 text-green-600"></i> Download Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <div class="relative w-full md:w-96">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="searchInput" placeholder="Search customer or loan ID..." class="w-full pl-10 pr-4 py-2 text-sm border-none bg-gray-50 rounded-lg outline-none">
                </div>
                <button id="resetViewBtn" class="hidden items-center px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all whitespace-nowrap">
                    <i class="fa-solid fa-rotate-left mr-2"></i> Reset View
                </button>
            </div>
            
            <div class="flex items-center gap-2">
                <button id="filterBtn" class="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <i class="fa-solid fa-filter mr-2"></i> <span>Filter: All</span>
                </button>
                <button id="sortBtn" class="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <i class="fa-solid fa-sort mr-2"></i> <span>Sort: Date (Newest)</span>
                </button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative print:border-none">
            <div class="overflow-x-auto max-h-[75vh] print:max-h-none print:overflow-visible">
                <table class="w-full text-sm text-left relative border-collapse">
                    <thead class="bg-gray-50 text-gray-500 font-semibold text-[11px] border-b border-gray-200 uppercase sticky-header shadow-sm print:static">
                        <tr>
                            <th class="pl-6 py-4 bg-gray-50">Loan ID</th>
                            <th class="px-4 py-4 bg-gray-50">Customer</th>
                            <th class="px-4 py-4 bg-gray-50">Month</th>
                            <th class="px-4 py-4 text-right bg-gray-50">Principal</th>
                            <th class="px-4 py-4 text-right bg-gray-50">Interest</th>
                            <th class="px-4 py-4 text-right bg-gray-50">Fees</th>
                            <th class="px-4 py-4 text-right bg-gray-50">Arrears</th>
                            <th class="px-4 py-4 text-center bg-gray-50 print:hidden">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="analytics-table-body" class="divide-y divide-gray-100 bg-white">
                        <tr>
                            <td colspan="8" class="text-center py-20 text-gray-400">
                                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600"></i>
                                <p class="mt-2">Initializing Financial Data...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;function D(t){var e;s.exportPeriod=t,document.querySelectorAll(".period-tab").forEach(r=>{r.classList.remove("bg-white","text-blue-600","shadow-sm"),r.classList.add("text-gray-500")});const a=document.getElementById(`tab-${t}`);a&&(a.classList.remove("text-gray-500"),a.classList.add("bg-white","text-blue-600","shadow-sm")),m((e=document.getElementById("searchInput"))==null?void 0:e.value)}function m(t=""){let a=[...s.rawData];const e=new Date;if(s.exportPeriod!=="all"&&(a=a.filter(r=>{const[n,l]=r.month.split("-").map(Number),p=new Date(n,l-1,1);return s.exportPeriod==="current_month"?p.getMonth()===e.getMonth()&&p.getFullYear()===e.getFullYear():s.exportPeriod==="last_3_months"?p>=new Date(e.getFullYear(),e.getMonth()-2,1):s.exportPeriod==="ytd"?n===e.getFullYear():!0})),t){const r=t.toLowerCase();a=a.filter(n=>n.customer&&String(n.customer).toLowerCase().includes(r)||n.loan_id&&String(n.loan_id).toLowerCase().includes(r))}s.filterArrears&&(a=a.filter(r=>parseFloat(r.arrears_amount)>0)),a.sort((r,n)=>{switch(s.sortMode){case"month_desc":return n.month.localeCompare(r.month);case"month_asc":return r.month.localeCompare(n.month);case"amount_desc":return parseFloat(n.principal_outstanding)-parseFloat(r.principal_outstanding);case"amount_asc":return parseFloat(r.principal_outstanding)-parseFloat(n.principal_outstanding);default:return 0}}),s.processedData=a,u()}function u(){const t=document.getElementById("analytics-table-body"),a=s.processedData,e=document.getElementById("resetViewBtn");if(!a.length){t.innerHTML='<tr><td colspan="8" class="text-center py-12 text-gray-400">No records found.</td></tr>';return}s.hiddenRows.size>0||s.flaggedRows.size>0?(e==null||e.classList.remove("hidden"),e==null||e.classList.add("flex")):e==null||e.classList.add("hidden");let r=a.filter(i=>!s.hiddenRows.has(b(i)));const n=s.flaggedRows.size>0;n&&(r=r.filter(i=>s.flaggedRows.has(b(i))));const l=r.reduce((i,c)=>(i.p+=parseFloat(c.principal_outstanding||0),i.i+=parseFloat(c.interest_receivable||0),i.f+=parseFloat(c.fee_receivable||0),i.a+=parseFloat(c.arrears_amount||0),i),{p:0,i:0,f:0,a:0,count:r.length}),d=`
        <tr class="bg-gray-50 font-bold border-b-2 border-gray-200 sticky-totals shadow-sm print:static">
            <td class="pl-6 py-4 text-xs uppercase ${n?"text-orange-600":"text-gray-900"}">${n?"HIGHLIGHTED TOTALS":"VISIBLE TOTALS"}</td>
            <td class="px-4 py-4 text-xs text-gray-500">${l.count} Items</td>
            <td></td>
            <td class="px-4 py-4 text-right text-gray-900">${g(l.p)}</td>
            <td class="px-4 py-4 text-right text-gray-900">${g(l.i)}</td>
            <td class="px-4 py-4 text-right text-blue-700">${g(l.f)}</td>
            <td class="px-4 py-4 text-right text-red-600">${g(l.a)}</td>
            <td class="print:hidden"></td>
        </tr>`;t.innerHTML=d+a.map(i=>T(i)).join(""),B()}const T=t=>{const a=b(t),e=s.hiddenRows.has(a),r=s.flaggedRows.has(a),n=parseFloat(t.arrears_amount)>0?"text-red-600 font-bold":"text-gray-400";let l="border-b border-gray-50 transition-colors group";return e?l+=" bg-gray-50 opacity-40 grayscale":r?l+=" bg-yellow-50 border-l-4 border-l-orange-400":l+=" hover:bg-gray-50",`
        <tr class="${l}">
            <td class="pl-6 py-4 font-medium text-gray-900">${t.loan_id}</td>
            <td class="px-4 py-4 text-gray-700 font-medium">${t.customer||"N/A"}</td>
            <td class="px-4 py-4 text-gray-500 font-mono text-xs">${t.month}</td>
            <td class="px-4 py-4 text-right text-gray-700">${g(t.principal_outstanding)}</td>
            <td class="px-4 py-4 text-right text-gray-600">${g(t.interest_receivable)}</td>
            <td class="px-4 py-4 text-right text-blue-600 font-medium">${g(t.fee_receivable)}</td>
            <td class="px-4 py-4 text-right ${n}">${g(t.arrears_amount)}</td>
            <td class="px-4 py-4 text-center print:hidden">
                <div class="flex items-center justify-center gap-2">
                    <button class="hide-btn p-1.5 hover:bg-gray-200 rounded-md" data-id="${a}">
                        <i class="${e?"fa-solid fa-eye text-gray-600":"fa-regular fa-eye-slash text-gray-400"}"></i>
                    </button>
                    <button class="flag-btn p-1.5 hover:bg-orange-100 rounded-md" data-id="${a}">
                        <i class="${r?"fa-solid fa-flag text-orange-600":"fa-regular fa-flag text-gray-400"}"></i>
                    </button>
                </div>
            </td>
        </tr>`};function $(){var a,e,r,n,l,p;["current_month","last_3_months","ytd","all"].forEach(o=>{var d;(d=document.getElementById(`tab-${o}`))==null||d.addEventListener("click",()=>D(o))}),(a=document.getElementById("resetViewBtn"))==null||a.addEventListener("click",()=>{s.hiddenRows.clear(),s.flaggedRows.clear(),u()});let t;(e=document.getElementById("searchInput"))==null||e.addEventListener("input",o=>{clearTimeout(t),t=setTimeout(()=>m(o.target.value),300)}),(r=document.getElementById("filterBtn"))==null||r.addEventListener("click",()=>{var d;s.filterArrears=!s.filterArrears;const o=document.getElementById("filterBtn");o.innerHTML=s.filterArrears?'<i class="fa-solid fa-filter mr-2"></i> <span>Filter: Arrears Only</span>':'<i class="fa-solid fa-filter mr-2"></i> <span>Filter: All</span>',o.className=s.filterArrears?"px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg":"px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50",m((d=document.getElementById("searchInput"))==null?void 0:d.value)}),(n=document.getElementById("sortBtn"))==null||n.addEventListener("click",()=>{var c;const o=["month_desc","month_asc","amount_desc","amount_asc"],d=["Date (Newest)","Date (Oldest)","Principal (High)","Principal (Low)"],i=(o.indexOf(s.sortMode)+1)%o.length;s.sortMode=o[i],document.getElementById("sortBtn").innerHTML=`<i class="fa-solid fa-sort mr-2"></i> <span>Sort: ${d[i]}</span>`,m((c=document.getElementById("searchInput"))==null?void 0:c.value)}),(l=document.getElementById("printPdfBtn"))==null||l.addEventListener("click",()=>window.print()),(p=document.getElementById("exportExcelBtn"))==null||p.addEventListener("click",()=>A())}function B(){document.querySelectorAll(".hide-btn").forEach(t=>{t.addEventListener("click",a=>{const e=a.currentTarget.dataset.id;s.hiddenRows.has(e)?s.hiddenRows.delete(e):s.hiddenRows.add(e),u()})}),document.querySelectorAll(".flag-btn").forEach(t=>{t.addEventListener("click",a=>{const e=a.currentTarget.dataset.id;s.flaggedRows.has(e)?s.flaggedRows.delete(e):s.flaggedRows.add(e),u()})})}async function f(){const t=setTimeout(()=>{const a=document.getElementById("main-content");a&&a.innerHTML.includes("Initializing")&&(a.innerHTML='<div class="p-12 text-center text-red-500"><i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i><p>Network Error. Please refresh.</p></div>')},8e3);try{await w(),document.getElementById("main-content").innerHTML=R,$();const{data:a,error:e}=await L();if(clearTimeout(t),e)throw e;s.rawData=a||[],m()}catch(a){console.error("Init Error:",a)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();
