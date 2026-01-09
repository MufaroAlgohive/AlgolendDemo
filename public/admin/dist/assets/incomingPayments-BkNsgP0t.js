import"./supabaseClient-CsC_yag8.js";import{i as c}from"./layout-DKFM-dk0.js";/* empty css               */import{a as i,b as s}from"./utils-D6Z1B7Jq.js";import{y as m,z as p,A as g}from"./dataService-Bp3rTtkG.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";let d=[];function f(){const r=document.getElementById("main-content");r&&(r.innerHTML=`
    <!-- Master-Detail Container -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- 
        NEW: Set a fixed height for the master-detail view to allow internal scrolling.
        h-[calc(100vh-150px)] is a good height (viewport - header - padding)
      -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-150px)]">
        
        <!-- Master List (Left Column) -->
        <div class="md:col-span-1 lg:col-span-1 border-r border-gray-200 flex flex-col">
          
          <!-- Chart Area -->
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Payments Over Time</h2>
            <div id="payments-chart-container" class="w-full h-[200px] mt-2">
              <div class="text-center p-8"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i></div>
            </div>
          </div>

          <!-- Transaction List Header -->
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-md font-semibold text-gray-900">All Incoming Payments</h3>
            <input type="search" id="payment-search-input" placeholder="Search by name or ID..." class="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:ring-brand-accent focus:border-brand-accent text-sm">
          </div>

          <!-- Transaction List -->
          <div id="payment-list-container" class="flex-1 overflow-y-auto">
            <div class="p-10 text-center text-gray-500">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
            </div>
          </div>
        </div>
        
        <!-- Detail Panel (Right Column) -->
        <div id="payment-detail-panel" class="md:col-span-2 lg:col-span-3 overflow-y-auto p-6 bg-gray-50">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <i class="fa-solid fa-hand-pointer text-4xl mb-3"></i>
            <p class="text-lg font-medium">Select a payment to view details</p>
          </div>
        </div>
        
      </div>
    </div>
  `,h())}function y(r){const n=document.getElementById("payment-list-container");if(n){if(n.innerHTML="",r.length===0){n.innerHTML='<p class="p-6 text-center text-gray-500">No payments match your criteria.</p>';return}r.forEach(e=>{var a;const t=document.createElement("button");t.type="button",t.className="payment-card w-full text-left flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150",t.dataset.paymentId=e.id,t.innerHTML=`
      <div class="flex-1 overflow-hidden">
        <p class="text-sm font-semibold text-gray-900 truncate">${((a=e.profile)==null?void 0:a.full_name)||"N/A"}</p>
        <p class="text-xs text-gray-500 truncate">Loan ID: ${e.loan_id} | ${s(e.payment_date)}</p>
      </div>
      <div class="ml-4">
        <p class="text-sm font-bold text-green-600">+ ${i(e.amount)}</p>
      </div>
    `,t.addEventListener("click",()=>u(e.id,t)),n.appendChild(t)})}}async function u(r,n){const e=document.getElementById("payment-detail-panel");if(!e)return;document.querySelectorAll(".payment-card").forEach(o=>o.classList.remove("selected")),n.classList.add("selected"),e.innerHTML=`
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-accent"></i>
      <p class="mt-3">Loading payment details...</p>
    </div>
  `;const{data:t,error:a}=await g(r);if(a){e.innerHTML=`<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: ${a.message}</div>`;return}x(t)}function x(r){const n=document.getElementById("payment-detail-panel");if(!n||!r.payment){n.innerHTML='<div class="p-4 bg-red-100 text-red-800 rounded-lg">Error: Payment data is incomplete.</div>';return}const{payment:e,profile:t,loan:a}=r;n.innerHTML=`
    <!-- Header -->
    <div class="pb-4 border-b border-gray-200">
      <p class="text-sm text-gray-500">Payment from</p>
      <p class="text-xl font-semibold text-gray-900">${(t==null?void 0:t.full_name)||"N/A"}</p>
      <div class="mt-4">
        <p class="text-4xl font-bold text-green-600">+ ${i(e.amount)}</p>
        <p class="text-sm font-medium text-gray-500">Completed on ${s(e.payment_date)}</p>
      </div>
    </div>
    
    <!-- Details List -->
    <div class="mt-6">
      <dl class="divide-y divide-gray-200">
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Transaction ID</dt>
          <dd class="col-span-2 text-sm text-gray-900 font-mono">${e.id}</dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Payer Email</dt>
          <dd class="col-span-2 text-sm text-gray-900">${(t==null?void 0:t.email)||"N/A"}</dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Loan ID</dt>
          <dd class="col-span-2 text-sm text-brand-accent font-semibold hover:underline">
            <a href="/admin/application-detail?id=${(a==null?void 0:a.application_id)||""}">
              ${e.loan_id}
            </a>
          </dd>
        </div>
        <div class="grid grid-cols-3 gap-4 py-3">
          <dt class="text-sm font-medium text-gray-500">Loan Amount</dt>
          <dd class="col-span-2 text-sm text-gray-900">${i(a==null?void 0:a.principal_amount)}</dd>
        </div>
      </dl>
    </div>
  `}async function v(){const r=document.getElementById("payments-chart-container");if(!r)return;const{data:n,error:e}=await p();if(e||!n||n.length===0){r.innerHTML='<p class="text-center text-sm text-gray-500 pt-16">No payment data for chart.</p>';return}r.innerHTML='<canvas id="paymentsChart"></canvas>';const t=document.getElementById("paymentsChart").getContext("2d");new Chart(t,{type:"line",data:{labels:n.map(a=>a.month_year),datasets:[{label:"Repaid",data:n.map(a=>a.total_repaid),borderColor:"rgb(16, 185, 129)",backgroundColor:"rgba(16, 185, 129, 0.1)",fill:!0,tension:.2,pointBackgroundColor:"rgb(16, 185, 129)"}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0,ticks:{callback:a=>i(a)}},x:{grid:{display:!1}}},plugins:{legend:{display:!1},tooltip:{callbacks:{label:a=>`${a.dataset.label}: ${i(a.raw)}`}}}}})}const l=()=>{const r=document.getElementById("payment-search-input");if(!r)return;const n=r.value.toLowerCase();let e=d;n&&(e=e.filter(t=>{var a;return((a=t.profile)==null?void 0:a.full_name)&&t.profile.full_name.toLowerCase().includes(n)||String(t.id).includes(n)||String(t.loan_id).includes(n)})),y(e)};function h(){var r;(r=document.getElementById("payment-search-input"))==null||r.addEventListener("input",l)}document.addEventListener("DOMContentLoaded",async()=>{if(!await c())return;const n=document.getElementById("page-title");n&&(n.textContent="Incoming Payments"),f(),v();try{const{data:e,error:t}=await m();if(t)throw t;d=e,l()}catch(e){document.getElementById("payment-list-container").innerHTML=`<p class="p-6 text-center text-red-600">Error: ${e.message}</p>`}});
