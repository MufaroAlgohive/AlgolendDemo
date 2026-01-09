import"./supabaseClient-CsC_yag8.js";import{i as L}from"./layout-DKFM-dk0.js";/* empty css               */import{a as f,b as k}from"./utils-D6Z1B7Jq.js";import{B as E,C as B,D as I,r as S,E as _,v as D,F as P}from"./dataService-Bp3rTtkG.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";let v=[],l=new Set,b="pending";const g="tab-toggle flex-1 py-3 text-sm font-bold transition-colors";function A(){const t=document.getElementById("main-content");t&&(t.innerHTML=`
    <div id="payout-stats-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      ${x("Total Disbursed")}
      ${x("Pending Queue")}
      ${x("Pending Value")}
    </div>
  
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-270px)]">
        
        <div class="md:col-span-1 lg:col-span-1 border-r border-gray-200 flex flex-col">
          
           <div class="flex border-b border-gray-200 bg-white">
             <button id="tab-pending" class="${g} active">
                Pending Queue
             </button>
             <button id="tab-history" class="${g}">
                History
             </button>
          </div>

          <div id="bulk-actions-toolbar" class="p-4 border-b border-gray-200 bg-gray-50 transition-all duration-300 overflow-hidden" style="max-height: 200px;">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Bulk Actions</h3>
                <span id="selection-count" class="selection-count-badge text-xs font-bold px-2 py-1 rounded-full hidden">0 Selected</span>
            </div>
            
            <div class="flex gap-2 mb-3">
                 <button id="btn-bulk-disburse" class="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm" disabled>
                    <i class="fa-solid fa-file-csv mr-1"></i> Disburse & CSV
                </button>
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="select-all-checkbox" class="rounded border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer">
                <label for="select-all-checkbox" class="text-xs font-bold text-gray-600 cursor-pointer select-none">Select All Pending</label>
            </div>
          </div>

          <div class="p-3 border-b border-gray-200 bg-white">
             <input type="search" id="payout-search-input" placeholder="Search name..." class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-accent text-sm">
          </div>

          <div id="payout-list-container" class="flex-1 overflow-y-auto relative bg-white">
            <div class="p-10 text-center text-gray-500">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
            </div>
          </div>
        </div>
        
        <div id="payout-detail-panel" class="md:col-span-2 lg:col-span-3 overflow-y-auto p-6 bg-gray-50">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <i class="fa-solid fa-hand-holding-dollar text-4xl mb-3"></i>
            <p class="text-lg font-medium">Select a payout to view details</p>
          </div>
        </div>
        
      </div>
    </div>
  `,U())}function C(t){const s=document.getElementById("payout-list-container"),n=document.getElementById("select-all-checkbox");if(s){if(s.innerHTML="",t.length===0){const e=b==="pending"?"Queue is empty.":"No history found.";s.innerHTML=`<div class="flex flex-col items-center justify-center h-40 text-gray-400"><i class="fa-regular fa-folder-open text-2xl mb-2"></i><p class="text-sm">${e}</p></div>`,n&&(n.disabled=!0);return}n&&(n.disabled=!1),t.forEach(e=>{var p;const a=l.has(e.id),d=e.status==="pending_disbursement",i=document.createElement("div");i.className=`payout-card-row flex items-center p-3 border-b border-gray-100 ${a?"selected":""}`;const r=b==="pending"?`<div class="mr-3"><input type="checkbox" class="payout-checkbox rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer" data-id="${e.id}" ${a?"checked":""}></div>`:'<div class="mr-3 w-4"></div>',c=d?'<span class="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase font-bold">Ready</span>':'<span class="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 uppercase font-bold">Disbursed</span>';i.innerHTML=`
      ${r}
      <div class="flex-1 cursor-pointer card-clickable" data-id="${e.id}">
        <div class="flex justify-between items-start">
            <p class="text-sm font-bold text-gray-900 truncate w-32">${((p=e.profile)==null?void 0:p.full_name)||"Unknown"}</p>
            <p class="text-sm font-bold text-gray-900">${f(e.amount)}</p>
        </div>
        <div class="flex justify-between items-center mt-1">
             ${c}
             <span class="text-xs text-gray-400 font-mono">#${e.application_id}</span>
        </div>
      </div>
    `;const u=i.querySelector(".payout-checkbox");u&&u.addEventListener("change",w=>{w.stopPropagation(),T(e.id,w.target.checked)}),i.querySelector(".card-clickable").addEventListener("click",()=>R(e.id)),s.appendChild(i)})}}function $(t){b=t,l.clear();const s=document.getElementById("tab-pending"),n=document.getElementById("tab-history"),e=document.getElementById("bulk-actions-toolbar");s&&(s.className=`${g} ${t==="pending"?"active":""}`),n&&(n.className=`${g} ${t==="history"?"active":""}`),t==="pending"?(e.style.maxHeight="200px",e.style.padding="1rem",e.style.opacity="1",e.classList.remove("border-b-0")):(e.style.maxHeight="0px",e.style.padding="0px",e.style.opacity="0",e.classList.add("border-b-0")),m(),h()}function T(t,s){s?l.add(t):l.delete(t),m()}function j(t){document.querySelectorAll(".payout-checkbox").forEach(n=>{n.checked=t;const e=parseInt(n.getAttribute("data-id"));t?l.add(e):l.delete(e)}),m()}function m(){const t=document.getElementById("selection-count"),s=document.getElementById("btn-bulk-disburse"),n=l.size;n>0?(t.textContent=`${n} Selected`,t.classList.remove("hidden"),s.disabled=!1,s.innerHTML=`<i class="fa-solid fa-file-csv mr-1"></i> Disburse ${n} items`):(t.classList.add("hidden"),s.disabled=!0,s.innerHTML='<i class="fa-solid fa-file-csv mr-1"></i> Disburse & CSV')}async function H(){if(l.size===0||!window.confirm(`Are you sure you want to mark ${l.size} items as DISBURSED and download the CSV?`))return;const s=v.filter(a=>l.has(a.id));M(s);const n=document.getElementById("btn-bulk-disburse"),e=n.innerHTML;n.innerHTML='<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...',n.disabled=!0;try{for(const a of s)await I(a.id),await S(a.application_id,"DISBURSED");alert("Disbursement processed successfully!"),l.clear(),await y(),document.getElementById("payout-detail-panel").innerHTML='<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fa-solid fa-check-circle text-4xl mb-3 text-green-500"></i><p class="text-lg font-medium">Batch Complete</p></div>'}catch(a){console.error(a),alert("Some updates failed. Please refresh and check."),await y()}finally{n.innerHTML=e}}function M(t){const s=["Payout ID","Recipient Name","Account Number","Bank","Amount","Reference"],n=t.map(r=>{var c,u,o;return[r.id,`"${((c=r.profile)==null?void 0:c.full_name)||"Unknown"}"`,`"${((u=r.bank_account)==null?void 0:u.account_number)||"N/A"}"`,`"${((o=r.bank_account)==null?void 0:o.bank_name)||"N/A"}"`,r.amount,`LOAN-${r.application_id}`]}),e=[s.join(","),...n.map(r=>r.join(","))].join(`
`),a=new Blob([e],{type:"text/csv;charset=utf-8;"}),d=URL.createObjectURL(a),i=document.createElement("a");i.href=d,i.download=`disbursement_batch_${new Date().toISOString().slice(0,19)}.csv`,document.body.appendChild(i),i.click(),document.body.removeChild(i)}async function R(t){const s=document.getElementById("payout-detail-panel");if(!s)return;s.innerHTML=`
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i>
    </div>
  `;const{data:n,error:e}=await _(t);if(e){s.innerHTML=`<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: ${e.message}</div>`;return}const{payout:a,profile:d,application:i}=n,r=a.status==="pending_disbursement";let c="System / Unknown";try{const{data:o}=await D(a.application_id);if(o&&o.reviewed_by_admin){const{data:p}=await P(o.reviewed_by_admin);p&&(c=p.email||p.full_name||"Unknown Admin")}}catch(o){console.warn("Could not fetch admin details",o)}const u=r?'<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase rounded-full border border-yellow-200">Pending</span>':'<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-full border border-green-200">Disbursed</span>';s.innerHTML=`
    <div class="pb-4 border-b border-gray-200 bg-white p-6 rounded-xl shadow-sm">
      <div class="flex justify-between items-start">
        <div>
            <p class="text-sm text-gray-500 uppercase tracking-wide font-bold">Review Disbursement</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">${(d==null?void 0:d.full_name)||"N/A"}</p>
        </div>
        ${u}
      </div>
      <div class="mt-6">
        <p class="text-4xl font-mono font-bold text-gray-900">${f(a.amount)}</p>
        <p class="text-sm text-gray-500 mt-1">Created: ${k(a.created_at)}</p>
      </div>
      
      <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
         <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs"><i class="fa-solid fa-user-shield"></i></div>
         <div>
            <p class="text-[10px] text-gray-400 uppercase font-bold">Approved By</p>
            <p class="text-sm font-bold text-gray-800">${c}</p>
         </div>
      </div>
    </div>
    
    <div class="p-6 space-y-4">
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Recipient ID</span>
            <span class="font-mono text-xs text-gray-700">${a.user_id}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Payout ID</span>
            <span class="font-mono text-xs text-gray-700">${a.id}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Loan Purpose</span>
            <span class="text-sm text-gray-700 text-right">${(i==null?void 0:i.purpose)||"N/A"}</span>
        </div>
        ${r?"":`
        <div class="flex justify-between border-b border-gray-100 pb-2">
            <span class="text-gray-500">Disbursed Date</span>
            <span class="text-sm font-bold text-green-600">${k(a.disbursed_at||a.updated_at)}</span>
        </div>`}
    </div>

    <div class="p-6 pt-0">
        <a href="/admin/application-detail?id=${a.application_id}" class="flex items-center justify-center w-full py-3 bg-white border-2 border-brand-accent text-brand-accent font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all shadow-sm group">
            View Full Application 
            <i class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
        </a>
    </div>
  `}const h=()=>{const t=document.getElementById("payout-search-input");if(!t)return;const s=t.value.toLowerCase();let n=v.filter(e=>b==="pending"?e.status==="pending_disbursement":b==="history"?e.status==="disbursed":!1);s&&(n=n.filter(e=>{var a;return((a=e.profile)==null?void 0:a.full_name)&&e.profile.full_name.toLowerCase().includes(s)})),C(n)};function U(){var t,s,n,e,a;(t=document.getElementById("payout-search-input"))==null||t.addEventListener("input",h),(s=document.getElementById("select-all-checkbox"))==null||s.addEventListener("change",d=>j(d.target.checked)),(n=document.getElementById("btn-bulk-disburse"))==null||n.addEventListener("click",H),(e=document.getElementById("tab-pending"))==null||e.addEventListener("click",()=>$("pending")),(a=document.getElementById("tab-history"))==null||a.addEventListener("click",()=>$("history"))}async function y(){l.clear(),m();try{const{data:t,error:s}=await E();if(s)throw s;v=t,h();const n=t.filter(e=>e.status==="pending_disbursement");N(n)}catch(t){document.getElementById("payout-list-container").innerHTML=`<p class="p-6 text-center text-red-600 text-sm">Error: ${t.message}</p>`}}function N(t){const s=document.getElementById("payout-stats-cards");if(!s)return;const n=t.length,e=t.reduce((a,d)=>a+parseFloat(d.amount||0),0);B().then(({data:a})=>{const d=(a==null?void 0:a.total_disbursed)||0;s.innerHTML=`
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                     <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Disbursed</p>
                     <p class="mt-1 text-2xl font-bold text-gray-900">${f(d)}</p>
                </div>
                <div class="p-2 bg-green-50 text-green-600 rounded-lg"><i class="fa-solid fa-money-bill-wave"></i></div>
              </div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Value</p>
                    <p class="mt-1 text-2xl font-bold text-yellow-600">${f(e)}</p>
                </div>
                <div class="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><i class="fa-solid fa-clock"></i></div>
              </div>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Queue</p>
                    <p class="mt-1 text-2xl font-bold text-gray-900">${n}</p>
                </div>
                <div class="p-2 bg-gray-50 text-gray-600 rounded-lg"><i class="fa-solid fa-list-check"></i></div>
              </div>
            </div>
        `})}function x(t){return`
    <div class="bg-white p-5 rounded-lg shadow-sm">
      <p class="text-sm font-medium text-gray-500">${t}</p>
      <div class="mt-2 h-8 w-3/4 bg-gray-200 rounded animate-pulse"></div>
    </div>
  `}document.addEventListener("DOMContentLoaded",async()=>{await L()&&(A(),await y())});
