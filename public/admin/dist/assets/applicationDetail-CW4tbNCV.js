import{s as g}from"./supabaseClient-CsC_yag8.js";import{i as Z}from"./layout-DKFM-dk0.js";/* empty css               */import{b as y,a as b}from"./utils-D6Z1B7Jq.js";import{r as T,t as ee,v as te,w as ae,x as se}from"./dataService-Bp3rTtkG.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";const A="/api/docuseal",re="2190507";function W(){return!!re}async function ne(t,e){try{if(!W())throw new Error("DocuSeal integration is disabled");const a=await fetch(`${A}/send-contract`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({applicationData:t,profileData:e})});if(!a.ok){const o=await a.json().catch(()=>({}));throw console.error("DocuSeal proxy error:",a.status,o),new Error(o.error||o.message||`Failed to send contract: ${a.status}`)}const s=await a.json();if(!s||!Array.isArray(s)||s.length===0)throw new Error("Invalid response from DocuSeal API");const r=s[0];return await ie(r,t.id),{submission_id:r.submission_id,submitter_id:r.id,slug:r.slug,status:r.status,embed_src:r.embed_src,email:r.email}}catch(a){throw console.error("DocuSeal send contract error:",a),a}}async function oe(t){try{const e=await fetch(`${A}/submissions/${t}`);if(!e.ok){const a=await e.json().catch(()=>({}));throw new Error(a.error||a.message||`Failed to fetch submission status: ${e.status}`)}return await e.json()}catch(e){throw console.error("DocuSeal get status error:",e),e}}async function de(t){try{const{data:e,error:a}=await g.from("docuseal_submissions").select("*").eq("application_id",t).order("created_at",{ascending:!1});if(a)throw a;return e||[]}catch(e){return console.error("Error fetching submissions:",e),[]}}async function ie(t,e){try{const{error:a}=await g.from("docuseal_submissions").insert({application_id:e,submission_id:t.submission_id,submitter_id:t.id,slug:t.slug,status:t.status||"pending",email:t.email,name:t.name,role:t.role,embed_src:t.embed_src,sent_at:t.sent_at,opened_at:t.opened_at,completed_at:t.completed_at,metadata:t.metadata||{},created_at:new Date().toISOString()});if(a)throw a}catch(a){throw console.error("Error saving submission to database:",a),a}}async function le(t,e,a={}){try{const{error:s}=await g.from("docuseal_submissions").update({status:e,...a,updated_at:new Date().toISOString()}).eq("submission_id",t);if(s)throw s}catch(s){throw console.error("Error updating submission status:",s),s}}async function ce(t,e,a={}){try{const{error:s}=await g.from("docuseal_submissions").update({status:e,...a,updated_at:new Date().toISOString()}).eq("submitter_id",t);if(s)throw s}catch(s){throw console.error("Error updating submitter status:",s),s}}function ue(t){return`https://docuseal.co/s/${t}`}async function be(t,e={}){try{const a=await fetch(`${A}/submitters/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({send_email:!0,...e})});if(!a.ok){const r=await a.json().catch(()=>({}));throw new Error(r.error||r.message||`Failed to resend contract: ${a.status}`)}const s=await a.json();return await ce(t,s.status,{sent_at:s.sent_at}),s}catch(a){throw console.error("DocuSeal resend error:",a),a}}async function me(t){try{const e=await fetch(`${A}/submissions/${t}`,{method:"DELETE"});if(!e.ok){const s=await e.json().catch(()=>({}));throw new Error(s.error||s.message||`Failed to archive submission: ${e.status}`)}const a=await e.json();return await le(t,"archived",{archived_at:a.archived_at}),a}catch(e){throw console.error("DocuSeal archive error:",e),e}}async function ge(t,e=null){try{const a=await oe(t);if(!a.submitters||a.submitters.length===0)throw new Error("No submitters found for this submission");if(e){const s=a.submitters.find(r=>r.email===e);if(!s)throw new Error(`No submitter found with email: ${e}`);return s.id}return a.submitters[0].id}catch(a){throw console.error("Error getting submitter ID:",a),a}}let d=null,D=null,Y=!1,C=null,k=null,L=!1,F=!1;const pe=5e3,xe=[{value:"STARTED",label:"Step 1: New Application"},{value:"BANK_LINKING",label:"Bank Analysis"},{value:"AFFORD_OK",label:"Step 3: Affordability OK"},{value:"AFFORD_REFER",label:"Affordability Refer"},{value:"OFFERED",label:"Step 4: Contract Sent"},{value:"OFFER_ACCEPTED",label:"Contract Signed"},{value:"READY_TO_DISBURSE",label:"Step 6: Queue Disburse"},{value:"DECLINED",label:"Declined"}],fe=`
<div id="application-detail-content" class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div id="loading-state" class="text-center p-20">
    <i class="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600"></i>
    <p class="mt-4 text-gray-600 font-medium animate-pulse">Loading Complete Application Data...</p>
  </div>

  <div id="page-header" class="mb-8 hidden animate-fade-in">
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
       <a href="/admin/applications" class="hover:text-orange-600 transition-colors">Applications</a>
       <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
       <span id="breadcrumb-name" class="font-medium text-gray-900">Applicant</span>
    </nav>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
       <div>
         <h1 id="applicant-name-header" class="text-3xl font-extrabold text-gray-900 tracking-tight">Loading...</h1>
         <div class="flex items-center gap-3 mt-2">
            <p class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md font-mono">ID: <span id="header-id-val">...</span></p>
            <span id="header-date" class="text-sm text-gray-500"></span>
         </div>
       </div>
       <span id="header-status-badge" class="px-5 py-2 text-sm font-bold rounded-full bg-gray-200 text-gray-700 shadow-sm uppercase tracking-wide">Status</span>
    </div>
  </div>

  <div id="content-grid" class="grid grid-cols-1 lg:grid-cols-12 gap-8 hidden animate-slide-up">
    
    <div class="lg:col-span-8 flex flex-col gap-6">
      
       <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div class="flex overflow-x-auto scrollbar-hide border-b border-gray-100">
            <button class="tab-btn active flex-1 py-4 px-4 text-sm font-bold text-center border-b-2 border-orange-600 text-orange-600 bg-orange-50/50 transition-all whitespace-nowrap" data-tab="personal">Personal</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="financial">Financial & Credit</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="documents">Documents</button>
            <button class="tab-btn flex-1 py-4 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all whitespace-nowrap" data-tab="loan">Loan & History</button>
         </div>
       </div>

       <div id="tab-contents" class="relative min-h-[400px]">
       
          <div id="personal-tab" class="tab-pane bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-gray-400"></i> Personal Information
             </h3>
             
             <div class="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-100">
                <div class="shrink-0 mx-auto md:mx-0">
                   <div class="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                      <img id="profile-image" src="" alt="Profile" class="w-full h-full object-cover" onerror="this.src='https://ui-avatars.com/api/?name=User&background=random'">
                   </div>
                </div>
                <div class="flex-grow grid grid-cols-1 gap-y-5">
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Full Name</span>
                      <div class="sm:col-span-2">
                         <div id="detail-fullname" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-semibold"></div>
                      </div>
                   </div>
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Email Address</span>
                      <div class="sm:col-span-2">
                         <div id="detail-email" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"></div>
                      </div>
                   </div>
                   <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                      <span class="text-sm font-medium text-gray-500">Mobile Number</span>
                      <div class="sm:col-span-2">
                         <div id="detail-mobile" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm"></div>
                      </div>
                   </div>
                </div>
             </div>
             <h4 class="text-md font-bold text-gray-900 mb-4">Linked Bank Accounts</h4>
             <div id="bank-accounts-container" class="space-y-3">
                </div>
          </div>

          <div id="financial-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6">Financial Snapshot</h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="p-5 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 shadow-sm">
                   <div class="flex items-center gap-3 mb-2">
                      <div class="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-up"></i></div>
                      <span class="text-xs font-bold text-green-700 uppercase tracking-wider">Monthly Income</span>
                   </div>
                   <div id="fin-income" class="text-2xl font-bold text-gray-900">R 0.00</div>
                </div>
                <div class="p-5 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100 shadow-sm">
                   <div class="flex items-center gap-3 mb-2">
                      <div class="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><i class="fa-solid fa-arrow-trend-down"></i></div>
                      <span class="text-xs font-bold text-red-700 uppercase tracking-wider">Monthly Expenses</span>
                   </div>
                   <div id="fin-expenses" class="text-2xl font-bold text-gray-900">R 0.00</div>
                </div>
             </div>
             <div class="pt-8 border-t border-gray-100">
                <div class="flex justify-between items-center mb-6">
                   <h4 class="text-lg font-bold text-gray-900">Credit Bureau Report</h4>
                   <div class="flex items-center gap-3">
                      <span id="credit-date" class="text-sm text-gray-500 font-medium"></span>
                      <button id="btn-download-xml" class="hidden text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-2">
                         <i class="fa-solid fa-file-code"></i> Download XML
                      </button>
                   </div>
                </div>
                <div id="credit-check-content" class="bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
                   </div>
             </div>
          </div>

          <div id="documents-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-gray-900">All User Documents</h3>
                <span id="doc-count" class="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">0</span>
             </div>
             <div id="documents-list" class="grid grid-cols-1 gap-4">
                </div>
          </div>

          <div id="loan-tab" class="tab-pane hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
             <h3 class="text-lg font-bold text-gray-900 mb-6">Current Application Data</h3>
             <div class="space-y-6 mb-10">
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Application ID</span>
                   <div class="sm:col-span-2 font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded-md inline-block border border-gray-200" id="detail-app-id"></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Submitted Date</span>
                   <div class="sm:col-span-2 text-sm text-gray-900" id="detail-date"></div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center border-b border-gray-50 pb-4">
                   <span class="text-sm font-medium text-gray-500">Loan Purpose</span>
                   <div class="sm:col-span-2 text-sm text-gray-900 font-medium" id="detail-purpose"></div>
                </div>
                <div class="pt-2">
                   <label class="text-sm font-medium text-gray-700 block mb-2">Admin Notes</label>
                   
                   <textarea id="detail-notes" class="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700 h-32 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none" placeholder="Add internal notes here..."></textarea>
                   <div class="mt-2 text-right">
                       <button id="btn-save-notes" class="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-all shadow-sm">
                           <i class="fa-solid fa-floppy-disk mr-1"></i> Save Notes
                       </button>
                   </div>

                </div>
             </div>
             
             <h3 class="text-lg font-bold text-gray-900 mb-4 border-t border-gray-100 pt-8">Client History</h3>
             <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Previous Loans</h4>
                <div id="loan-history-list" class="space-y-2">
                   <p class="text-sm text-gray-400 italic">No previous loan history found.</p>
                </div>
             </div>
             <div>
                <h4 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Other Applications</h4>
                <div id="app-history-list" class="space-y-2">
                   <p class="text-sm text-gray-400 italic">No other applications on record.</p>
                </div>
             </div>
          </div>
       </div>

           <div id="contract-status-card" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
              <i class="fa-solid fa-file-signature text-orange-600"></i> Contract Status
            </h3>
            <div id="contract-status-empty" class="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center">
              No contracts sent yet.
            </div>
            <div id="contract-status-section" class="hidden mt-4 border-t border-gray-100 pt-4">
              <h4 class="text-xs font-bold text-gray-400 uppercase mb-3">History</h4>
              <div id="contract-status-content" class="space-y-2">
                </div>
            </div>
           </div>
    </div>

    <div class="lg:col-span-4">
       <div class="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 sticky top-28 overflow-hidden">
          <div class="p-6 border-b border-gray-100 bg-gray-50/50">
             <h3 class="font-bold text-gray-900">Loan Status</h3>
             <div id="status-alert" class="mt-3 p-3 rounded-lg text-xs font-medium leading-relaxed hidden animate-pulse">
                </div>
          </div>

          <div class="p-6 space-y-6">
             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Requested Amount</label>
                <div id="sidebar-amount" class="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">R 0.00</div>
             </div>
             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Term Length</label>
                <div class="mt-2 flex items-center gap-2">
                   <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center"><i class="fa-regular fa-calendar"></i></div>
                   <div id="sidebar-term" class="text-lg font-semibold text-gray-800">0 Months</div>
                </div>
             </div>

             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Est. Monthly Payment</label>
                <div class="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                   <div id="sidebar-payment" class="text-xl font-bold text-gray-800">R 0.00</div>
                   <div class="text-xs text-gray-400 mt-1">(Principal Only)</div>
                </div>
             </div>

             <div id="financial-breakdown" class="pt-4 border-t border-gray-100 space-y-4">
                </div>

             <div>
                <label class="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Status</label>
                <div id="sidebar-status" class="mt-2 text-lg font-bold text-orange-600">Pending</div>
             </div>
          </div>
          
          <div class="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3" id="action-buttons-container">
              </div>

          <div class="p-6 bg-white border-t border-gray-200">
              <label class="text-xs font-bold text-gray-400 uppercase mb-2 block">Manual Override (Restricted)</label>
              <div class="flex gap-2">
                  <select id="status-override-select" class="flex-1 text-xs border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500">
                      ${xe.map(t=>`<option value="${t.value}">${t.label}</option>`).join("")}
                  </select>
                  <button id="manual-update-btn" onclick="manualStatusChange()" class="px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition">
                      Update
                  </button>
              </div>
              <p id="override-hint" class="text-[10px] text-gray-400 mt-1 italic">Use only for corrections. Bureau statuses locked.</p>
          </div>

       </div>
    </div>
  </div>

  <div id="feedback-container" class="fixed bottom-6 right-6 z-50 hidden"></div>
</div>
`,M=t=>{if(!t)return"bg-gray-100 text-gray-800 border border-gray-200";switch(t){case"READY_TO_DISBURSE":case"approved":case"DISBURSED":case"AFFORD_OK":case"BUREAU_OK":return"bg-green-100 text-green-800 border border-green-200";case"declined":case"DECLINED":case"AFFORD_FAIL":return"bg-red-100 text-red-800 border border-red-200";case"OFFERED":case"OFFER_ACCEPTED":return"bg-purple-100 text-purple-800 border border-purple-200";default:return"bg-yellow-100 text-yellow-800 border border-yellow-200"}},N=t=>{const e=document.getElementById("header-status-badge");!e||!t||(e.textContent=t,e.className=`px-4 py-1.5 text-sm font-bold rounded-full shadow-sm ${M(t)}`)};window.viewBureauReport=t=>{try{const e=atob(t),a=new Array(e.length);for(let n=0;n<e.length;n++)a[n]=e.charCodeAt(n);const s=new Uint8Array(a),r=new Blob([s],{type:"application/pdf"}),o=URL.createObjectURL(r);window.open(o,"_blank")}catch(e){console.error("PDF Render Error:",e),alert("Unable to display the PDF format. Please ensure the bureau data is valid.")}};const m=(t,e="success")=>{const a=document.getElementById("feedback-container");if(!a)return;const s=e==="success";a.innerHTML=`
    <div class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${s?"bg-white border-green-100":"bg-white border-red-100"} transform transition-all duration-300">
        <div class="w-8 h-8 rounded-full ${s?"bg-green-100 text-green-600":"bg-red-100 text-red-600"} flex items-center justify-center">
            <i class="fa-solid ${s?"fa-check":"fa-exclamation"}"></i>
        </div>
        <div>
            <p class="text-sm font-bold text-gray-900">${s?"Success":"Error"}</p>
            <p class="text-xs text-gray-500">${t}</p>
        </div>
    </div>
  `,a.classList.remove("hidden"),setTimeout(()=>{a.classList.add("hidden")},5e3)},ye=async()=>{const t=document.getElementById("contract-status-empty"),e=document.getElementById("contract-status-section");if(!W()){R(),e&&e.classList.add("hidden"),t&&(t.classList.remove("hidden"),t.innerHTML=`
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
          <div class="flex items-start gap-3">
            <i class="fa-solid fa-triangle-exclamation text-yellow-600 text-xl mt-0.5"></i>
            <div>
              <h4 class="font-semibold text-yellow-900 mb-1">DocuSeal Not Configured</h4>
              <p class="text-sm text-yellow-700">
                E-signature features are currently disabled. Please configure DocuSeal API credentials to enable contract tracking.
              </p>
            </div>
          </div>
        </div>
      `);return}t&&(t.classList.remove("hidden"),t.textContent="No contracts sent yet."),await I()},ve=async(t=null)=>{if(!d||!d.profiles){alert("Error: Application data not loaded");return}const e=t||document.getElementById("btn-send-contract"),a=e?e.innerHTML:"";e&&(e.disabled=!0,e.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Sending...');try{const s=await ne(d,d.profiles);alert(`✅ Contract sent successfully to ${d.profiles.email}`),await T(d.id,"OFFERED"),await I(),await v()}catch(s){console.error("Send contract error:",s),alert(`❌ Failed to send contract: ${s.message}`)}finally{e&&(e.disabled=!1,e.innerHTML=a)}},he=()=>{window.open("https://docuseal.co/templates/2190507","_blank")},we=()=>{if(!d)return!1;const t=d.status||"";return["OFFERED"].includes(t)},Ee=()=>{k||!we()||(k=setInterval(()=>{I(!0)},pe))},R=()=>{k&&(clearInterval(k),k=null)},_e=async()=>{if(!(F||L||!d)){F=!0,L=!0,R();try{if(d.status!=="OFFER_ACCEPTED"){const{error:t}=await T(d.id,"OFFER_ACCEPTED");if(t){console.error("Auto advance to Contract Signed failed:",t),L=!1;return}d.status="OFFER_ACCEPTED",d.contract_signed_at=new Date().toISOString()}$(d),N("OFFER_ACCEPTED"),m("Contract signed! Advanced to approval phase.","success"),await v()}catch(t){console.error("handleContractCompleted error:",t),L=!1}finally{F=!1}}},I=async(t=!1)=>{var e,a,s;if(d!=null&&d.id)try{const r=await de(d.id),o=document.getElementById("contract-status-section"),n=document.getElementById("contract-status-empty");if(r.length===0){o&&o.classList.add("hidden"),n&&(n.classList.remove("hidden"),n.textContent="No contracts sent yet."),R(),J(!1);return}n&&n.classList.add("hidden"),o&&o.classList.remove("hidden"),Se(r);const c=((s=(a=(e=r[0])==null?void 0:e.status)==null?void 0:a.toLowerCase)==null?void 0:s.call(a))||"";J(c==="declined"),c==="completed"&&!L?await _e():c!=="completed"&&!t&&Ee()}catch(r){console.error("Load contract status error:",r)}},Se=t=>{const e=document.getElementById("contract-status-content");e&&(e.innerHTML=t.map(a=>{const s=Ce(a.status),r=Le(a.status);return`
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center">
              <i class="${r}"></i>
            </div>
            <div>
              <div class="font-semibold text-gray-900 text-sm">Contract #${a.submission_id.slice(-8)}</div>
              <div class="text-xs text-gray-500">Sent ${y(a.created_at)}</div>
            </div>
          </div>
          <span class="px-3 py-1 text-xs font-bold rounded-full ${s.badge}">${a.status}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="window.viewSubmission('${a.slug}')" class="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold">
            <i class="fa-solid fa-eye mr-1"></i> View
          </button>
          ${a.status==="pending"?`
            <button onclick="window.resendSubmission('${a.submitter_id}', '${a.submission_id}')" class="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-semibold">
              <i class="fa-solid fa-paper-plane mr-1"></i> Resend
            </button>
          `:""}
          ${a.status!=="completed"&&a.status!=="voided"?`
            <button onclick="window.voidSubmission('${a.submission_id}')" class="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-xs font-semibold">
              <i class="fa-solid fa-ban mr-1"></i> Void
            </button>
          `:""}
        </div>
      </div>
    `}).join(""))},J=t=>{if(typeof t!="boolean"||!d||t===Y)return;Y=t;const e="contract-declined-banner",a=document.getElementById(e),s=document.getElementById("contract-status-card");if(t){if(!C&&d.status!=="DECLINED"&&(C=d.status),d.status="DECLINED",N("DECLINED"),$(d),!a&&s){const r=document.createElement("div");r.id=e,r.className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2",r.innerHTML=`
        <i class="fa-solid fa-circle-xmark text-red-500"></i>
        <span>Contract was declined by the applicant.</span>
      `;const o=s.querySelector("h3");o&&o.parentNode?o.parentNode.insertBefore(r,o.nextSibling):s.prepend(r)}}else a&&a.remove(),C&&(d.status=C),C=null,$(d),N(d.status)},Ce=t=>{const e=(t||"").toLowerCase(),a={pending:{bg:"bg-yellow-100",text:"text-yellow-600",badge:"bg-yellow-100 text-yellow-700"},completed:{bg:"bg-green-100",text:"text-green-600",badge:"bg-green-100 text-green-700"},expired:{bg:"bg-red-100",text:"text-red-600",badge:"bg-red-100 text-red-700"},voided:{bg:"bg-gray-100",text:"text-gray-600",badge:"bg-gray-100 text-gray-700"},declined:{bg:"bg-red-100",text:"text-red-600",badge:"bg-red-100 text-red-700"}};return a[e]||a.pending},Le=t=>{const e=(t||"").toLowerCase(),a={pending:"fa-solid fa-clock",completed:"fa-solid fa-check-circle",expired:"fa-solid fa-exclamation-circle",voided:"fa-solid fa-ban",declined:"fa-solid fa-circle-xmark"};return a[e]||a.pending};window.viewSubmission=t=>{window.open(ue(t),"_blank")};window.resendSubmission=async(t,e=null)=>{if(confirm("Resend contract email to the applicant?"))try{let a=t;if(!a){if(!e)throw new Error("Unable to determine DocuSeal submitter");a=await ge(e)}await be(a),alert("✅ Contract email resent successfully"),await I()}catch(a){alert(`❌ Failed to resend: ${a.message}`)}};window.voidSubmission=async t=>{if(confirm("Void this contract submission? This cannot be undone."))try{await me(t),alert("✅ Submission voided successfully"),await I()}catch(e){alert(`❌ Failed to void: ${e.message}`)}};const ke=()=>{const t=document.querySelectorAll(".tab-btn"),e=document.querySelectorAll(".tab-pane");t.forEach(a=>{a.addEventListener("click",()=>{t.forEach(o=>{o.classList.remove("active","text-orange-600","border-orange-600","bg-orange-50/50"),o.classList.add("text-gray-500","border-transparent")}),a.classList.remove("text-gray-500","border-transparent"),a.classList.add("active","text-orange-600","border-orange-600","bg-orange-50/50"),e.forEach(o=>o.classList.add("hidden"));const s=a.getAttribute("data-tab")+"-tab",r=document.getElementById(s);r&&r.classList.remove("hidden")})})};window.updateStatus=async t=>{const{error:e}=await T(d.id,t);e?m(e.message,"error"):(m(`Status updated to ${t}`,"success"),v()),B()};window.saveNotes=async()=>{const t=document.getElementById("detail-notes").value,e=document.getElementById("btn-save-notes");if(!t.trim())return;const a=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Saving...';try{const{error:s}=await ee(d.id,t);if(s)throw s;m("Notes saved successfully","success"),e.innerHTML='<i class="fa-solid fa-check mr-1"></i> Saved!',e.classList.remove("bg-gray-800"),e.classList.add("bg-green-600"),setTimeout(()=>{e.innerHTML=a,e.disabled=!1,e.classList.remove("bg-green-600"),e.classList.add("bg-gray-800")},2e3)}catch(s){m(s.message,"error"),e.disabled=!1,e.innerHTML=a}};window.manualStatusChange=async()=>{if(d.status==="DISBURSED"){alert(`⛔ ACTION BLOCKED

This application has already been disbursed. To maintain financial integrity, you cannot change the status of an active loan.`);return}const e=document.getElementById("status-override-select").value;if(e!==d.status){if(e.includes("BUREAU")){alert("Cannot manually override Bureau statuses. These are automated.");return}if(confirm(`Are you sure you want to manually force status to "${e}"?`)){const{error:a}=await T(d.id,e);a?m(a.message,"error"):(m("Status manually updated.","success"),v())}}};const E=document.getElementById("confirmation-modal"),Q=document.getElementById("modal-title"),G=document.getElementById("modal-body"),Ie=(t,e,a)=>{Q&&(Q.textContent=t),G&&(G.textContent=e),D=a,E?(E.classList.remove("hidden"),E.classList.add("flex")):confirm(e)&&a()},B=()=>{E&&(E.classList.add("hidden"),E.classList.remove("flex")),D=null},De=async()=>{const{data:{user:t}}=await g.auth.getUser(),e={application_id:d.id,user_id:d.user_id,amount:d.amount,status:"pending_disbursement"},{error:a}=await ae(e);if(a){m(a.message,"error"),B();return}const{error:s}=await g.from("loan_applications").update({status:"READY_TO_DISBURSE",reviewed_by_admin:t==null?void 0:t.id}).eq("id",d.id);s?(await se(d.id),m(s.message,"error")):(m("Application approved. Sent to disbursement queue.","success"),v()),B()},Be=(t,e)=>{const a=(t==null?void 0:t.full_name)||"Unknown User",s=(t==null?void 0:t.avatar_url)||`https://ui-avatars.com/api/?name=${a.replace(" ","+")}&background=random`;document.getElementById("profile-image").src=s,document.getElementById("detail-fullname").textContent=a,document.getElementById("detail-email").textContent=(t==null?void 0:t.email)||"N/A",document.getElementById("detail-mobile").textContent=(t==null?void 0:t.contact_number)||"N/A";const r=document.getElementById("bank-accounts-container");r&&(r.innerHTML="",e&&e.length>0?e.forEach(o=>{const n=document.createElement("div");n.className="p-4 border border-gray-200 rounded-xl bg-white flex justify-between items-center hover:border-orange-300 hover:shadow-sm transition-all",n.innerHTML=`
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <i class="fa-solid fa-building-columns"></i>
            </div>
            <div>
                <p class="text-sm font-bold text-gray-900">${o.bank_name||"Unknown Bank"}</p>
                <p class="text-xs text-gray-500 font-mono">${o.account_number||"----"} • ${o.account_type||"Savings"}</p>
            </div>
        </div>
        ${o.is_primary?'<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold border border-green-200">Primary</span>':""}
      `,r.appendChild(n)}):r.innerHTML='<div class="text-sm text-gray-500 italic p-4 border border-dashed border-gray-300 rounded-xl text-center">No bank accounts linked to this profile.</div>')},$e=async t=>{const e=document.getElementById("personal-tab");if(!e||!t)return;const{data:a}=await g.from("declarations").select("*").eq("user_id",t).maybeSingle();if(!a)return;const s=document.createElement("div");s.className="mt-8 pt-8 border-t border-gray-100",s.innerHTML=`
        <h4 class="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-file-shield text-gray-400"></i> Compliance & Statutory Data
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p class="text-[10px] text-gray-400 uppercase font-bold">Marital Status</p>
                <p class="text-sm font-semibold text-gray-700 capitalize">${a.marital_status||"Not Set"}</p>
            </div>
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p class="text-[10px] text-gray-400 uppercase font-bold">Residential Status</p>
                <p class="text-sm font-semibold text-gray-700 capitalize">${a.home_ownership||"Not Set"}</p>
            </div>
        </div>

        ${a.referral_provided?`
        <div class="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p class="text-[10px] text-blue-400 uppercase font-bold mb-2">Referral Information</p>
            <div class="flex flex-col sm:flex-row gap-4">
                <div><span class="text-xs text-blue-600">Name:</span> <span class="text-sm font-bold text-blue-900">${a.referral_name}</span></div>
                <div><span class="text-xs text-blue-600">Phone:</span> <span class="text-sm font-bold text-blue-900">${a.referral_phone}</span></div>
            </div>
        </div>`:""}
    `,e.appendChild(s)},Te=(t,e)=>{const a=t&&t[0]?t[0]:{},s=a.parsed_data||{income:{},expenses:{}};document.getElementById("fin-income").textContent=b(a.monthly_income||0),document.getElementById("fin-expenses").textContent=b(a.monthly_expenses||0);const r=document.getElementById("credit-check-content"),o=document.getElementById("credit-date"),n=document.getElementById("btn-download-xml");if(!r)return;let c=document.getElementById("affordability-breakdown-list");if(!c){const l=document.querySelector("#financial-tab .grid"),u=document.createElement("div");u.id="affordability-breakdown-list",u.className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-200",l.after(u),c=u}c.innerHTML=`
    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <i class="fa-solid fa-list-check"></i> Monthly Budget Breakdown
    </h4>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">Basic Salary (Net)</span>
            <span class="text-sm font-bold text-gray-900">${b(s.income.salary||0)}</span>
        </div>
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">Housing / Rent</span>
            <span class="text-sm font-bold text-gray-900">${b(s.expenses.housing_rent||0)}</span>
        </div>
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">Other Earnings</span>
            <span class="text-sm font-bold text-gray-900">${b(s.income.other_monthly_earnings||0)}</span>
        </div>
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">School Fees</span>
            <span class="text-sm font-bold text-gray-900">${b(s.expenses.school||0)}</span>
        </div>
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">Disposable Surplus</span>
            <span class="text-sm font-bold text-brand-accent">${b(a.affordability_ratio||0)}</span>
        </div>
        <div class="flex justify-between border-b border-gray-200 pb-1">
            <span class="text-sm text-gray-500">Transport / Fuel</span>
            <span class="text-sm font-bold text-gray-900">${b(s.expenses.petrol||0)}</span>
        </div>
    </div>
  `;const i=e&&e.length>0?e[0]:null;if(i){const l=i.credit_score||0,u=l>600?"text-green-600":l>500?"text-yellow-600":"text-red-600";if(o&&(o.textContent=`Checked on ${y(i.checked_at||i.created_at||new Date)}`),n){const p=i.raw_xml_data;p?(n.classList.remove("hidden"),n.innerHTML='<i class="fa-solid fa-file-pdf mr-2"></i> View Bureau Report',n.className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-medium flex items-center gap-2",n.onclick=()=>window.viewBureauReport(p)):n.classList.add("hidden")}r.innerHTML=`
        <div class="p-6 border-b border-gray-200 text-center bg-white">
            <div class="text-6xl font-extrabold ${u} mb-2 tracking-tighter">${l}</div>
            <p class="font-bold text-gray-700 uppercase tracking-wide text-xs">Bureau Score</p>
            <span class="inline-block mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200">${i.score_band||"Standard"}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-gray-50">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-gray-800">${i.total_accounts||0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Total Acc</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-red-600">${i.accounts_with_arrears||0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Arrears</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-orange-600">${i.total_enquiries||0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Enquiries</span>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <span class="block text-2xl font-bold text-gray-800">${i.total_judgments||0}</span>
                <span class="text-xs text-gray-400 font-bold uppercase mt-1">Judgments</span>
            </div>
        </div>
        <div class="p-6 bg-white border-t border-gray-200 space-y-4">
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-sm text-gray-500">Total Balance</span>
                <span class="font-bold text-gray-900">${b(i.total_balance||0)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Judgment Value</span>
                <span class="font-bold text-red-600">${b(i.total_judgment_amount||0)}</span>
            </div>
        </div>
      `}else o&&(o.textContent=""),n&&n.classList.add("hidden"),r.innerHTML='<div class="py-12 text-center text-gray-400"><p>No bureau data available.</p></div>'},Ae=t=>{const e=document.getElementById("documents-list"),a=document.getElementById("doc-count");if(!e||!a)return;const s=[{key:"idcard",label:"ID Document"},{key:"till_slip",label:"Latest Payslip"},{key:"bank_statement",label:"Bank Statement"}];a.textContent=(t==null?void 0:t.length)||0,e.innerHTML="",s.forEach(r=>{const o=t.find(l=>l.file_type===r.key),n=o?"text-green-600 bg-green-100":"text-gray-400 bg-gray-100",c=o?"fa-check-circle":"fa-upload",i=document.createElement("div");i.className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-300 transition-all group",i.innerHTML=`
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl ${n} flex items-center justify-center">
                <i class="fa-solid ${c} text-xl"></i>
            </div>
            <div class="flex-grow min-w-0">
                <p class="text-sm font-bold text-gray-900">${r.label}</p>
                <p class="text-xs text-gray-500">${o?"File Verified":"Missing Document"}</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            ${o?`
            <button onclick="handleSmartDownload('${o.file_path}')" class="w-10 h-10 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all">
                <i class="fa-solid fa-eye"></i>
            </button>`:""}
            
            <label class="cursor-pointer bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all">
                ${o?"Replace":"Upload"}
                <input type="file" class="hidden admin-doc-upload" data-type="${r.key}" accept=".pdf,.jpg,.png,.jpeg">
            </label>
        </div>
      `,e.appendChild(i)}),Re()},Re=()=>{document.querySelectorAll(".admin-doc-upload").forEach(t=>{t.addEventListener("change",async e=>{const a=e.target.files[0];if(!a||!d)return;const s=e.target.dataset.type,r=e.target.parentElement,o=r.childNodes[0].textContent;r.childNodes[0].textContent="Processing...";try{const{data:{session:n}}=await g.auth.getSession(),c=n.user.id,i=a.name.split(".").pop(),l=`${s}_${Date.now()}.${i}`,u=`${c}/${d.user_id}_${l}`,{error:p}=await g.storage.from("client_docs").upload(u,a,{upsert:!0});if(p)throw p;const{error:x}=await g.rpc("register_admin_upload",{p_user_id:d.user_id,p_app_id:d.id,p_file_name:l,p_original_name:a.name,p_file_path:u,p_file_type:s,p_mime_type:a.type,p_file_size:a.size});if(x)throw x;m("Document Updated Successfully","success"),v()}catch(n){console.error(n),m(n.message,"error")}finally{r.childNodes[0].textContent=o}})})};window.handleSmartDownload=async t=>{try{let e=t;t.includes("/storage/v1/object/")&&(e=t.split("/").slice(8).join("/"));let{data:a,error:s}=await g.storage.from("client_docs").createSignedUrl(e,60);if((s||!a)&&({data:a,error:s}=await g.storage.from("documents").createSignedUrl(e,60)),s)throw s;window.open(a.signedUrl,"_blank")}catch(e){console.error("Smart Download Error:",e),m("File not found in any bucket. Please check storage manually.","error")}};const Fe=async(t,e,a)=>{var n,c;const s=document.getElementById("loan-history-list"),r=document.getElementById("app-history-list");let o=document.getElementById("admin-metadata-container");if(a){const i=document.getElementById("loan-tab");if(!o){o=document.createElement("div"),o.id="admin-metadata-container",o.className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-8";const l=Array.from(i.querySelectorAll("h3")).find(u=>u.textContent.includes("Client History"));l?i.insertBefore(o,l):i.appendChild(o)}try{const l=[a.created_by_admin,a.reviewed_by_admin].filter(Boolean),{data:u}=await g.from("profiles").select("id, full_name").in("id",l),p=((n=u==null?void 0:u.find(h=>h.id===a.created_by_admin))==null?void 0:n.full_name)||"System / User",x=((c=u==null?void 0:u.find(h=>h.id===a.reviewed_by_admin))==null?void 0:c.full_name)||"Pending Review";o.innerHTML=`
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p class="text-[10px] text-gray-400 uppercase font-black mb-2 tracking-widest">Created By</p>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-bold">
                        ${p.charAt(0)}
                    </div>
                    <span class="text-sm font-bold text-gray-800">${p}</span>
                </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p class="text-[10px] text-gray-400 uppercase font-black mb-2 tracking-widest">Reviewed By</p>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-bold">
                        ${x.charAt(0)}
                    </div>
                    <span class="text-sm font-bold text-gray-800">${x}</span>
                </div>
            </div>
          `}catch(l){console.error("Admin UUID Lookup Error:",l)}}s&&(s.innerHTML="",t&&t.length>0?t.forEach(i=>{const l=document.createElement("div");l.className="p-3 border-b border-gray-100 last:border-0",l.innerHTML=`
                <div class="flex justify-between items-center">
                    <div>
                        <span class="block font-bold text-gray-800 text-sm">Loan #${i.id}</span>
                        <span class="text-xs text-gray-500">${y(i.start_date||i.created_at)}</span>
                    </div>
                    <div class="text-right">
                        <span class="block font-bold text-gray-900 text-sm">${b(i.principal_amount||0)}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold uppercase">${i.status||"Active"}</span>
                    </div>
                </div>
            `,s.appendChild(l)}):s.innerHTML='<p class="text-sm text-gray-400 italic p-2">No previous loan history found.</p>'),r&&(r.innerHTML="",e&&e.length>0?e.forEach(i=>{const l=document.createElement("div");l.className="p-3 border-b border-gray-100 last:border-0",l.innerHTML=`
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold block text-gray-800 text-sm">App #${i.id}</span>
                        <span class="text-xs text-gray-500">${y(i.created_at)}</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-gray-600 font-medium text-sm">${b(i.amount||0)}</span>
                        <span class="text-[10px] uppercase font-bold text-orange-500">${i.status}</span>
                    </div>
                </div>
            `,r.appendChild(l)}):r.innerHTML='<p class="text-sm text-gray-400 italic p-2">No other applications on record.</p>')},$=t=>{var K,z,V;if(!t)return;const e=t.status||"pending",a=document.getElementById("sidebar-status"),s=document.getElementById("status-alert"),r=document.getElementById("action-buttons-container"),o=((K=t.loan_history)==null?void 0:K.length)||0,n=parseFloat(t.amount||0),c=parseInt(t.term_months||1),i=t.offer_details||{},l=60,u=.15,x=(o<3?.2:.18)-u,h=n*x*(c/12),O=n*u*c,U=l*c,j=n+h+U+O,X=j/c,P=i.first_payment_date||t.repayment_start_date;document.getElementById("sidebar-amount").textContent=b(n),document.getElementById("sidebar-term").textContent=`${c} Month${c>1?"s":""}`,document.getElementById("sidebar-payment").textContent=b(X);let w=document.getElementById("financial-breakdown");if(!w){const S=document.getElementById("sidebar-payment").parentElement.parentElement;w=document.createElement("div"),w.id="financial-breakdown",w.className="pt-4 border-t border-gray-100 space-y-4",S.after(w)}w.innerHTML=`
    <div class="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-500">Tiered Interest (${(x*100).toFixed(1)}%)</span>
            <span class="font-bold text-gray-900">${b(h)}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-500">Initiation Fee (15%)</span>
            <span class="font-bold text-gray-900">${b(O)}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
            <span class="text-gray-500">Monthly Service Fee</span>
            <span class="font-bold text-gray-900">${b(U)}</span>
        </div>
        <div class="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span class="text-xs font-black uppercase text-gray-700">Total Repayable</span>
            <span class="text-sm font-black text-green-600">${b(j)}</span>
        </div>
    </div>
    
    <div class="mt-4">
        <label class="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1 block">Scheduled Payout Info</label>
        <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <div class="flex items-center justify-between">
                <span class="text-xs text-orange-800 font-medium">First Repayment:</span>
                <span class="text-xs font-bold text-orange-900">
                    ${P?y(P):"Not Scheduled"}
                </span>
            </div>
        </div>
    </div>
  `,a&&(a.textContent=e.replace("_"," "),a.className=`mt-2 text-lg font-bold uppercase tracking-wide ${M(e).split(" ")[0].replace("bg-","text-").replace("-100","-600")}`);const H=document.getElementById("status-override-select");H&&(H.value=e);const _=document.getElementById("status-override-select"),f=document.getElementById("manual-update-btn"),q=document.getElementById("override-hint");if(e==="DISBURSED"?(_&&(_.disabled=!0),f&&(f.disabled=!0,f.classList.add("opacity-50","cursor-not-allowed"),f.innerText="Locked"),q&&(q.textContent="🔒 Application is active. Modifications disabled.")):(_&&(_.disabled=!1,_.value=e),f&&(f.disabled=!1,f.innerText="Update")),s&&(s.className="mt-3 p-3 rounded-lg text-xs font-medium leading-relaxed hidden",e==="OFFERED"?(s.textContent="Contract Sent. Waiting for user to sign.",s.classList.add("bg-purple-50","text-purple-700","block")):e==="READY_TO_DISBURSE"?(s.textContent="Application is queued for disbursement.",s.classList.add("bg-green-50","text-green-700","block")):e.includes("BUREAU")&&(s.textContent="System is performing automated checks.",s.classList.add("bg-blue-50","text-blue-700","block"))),r)if(r.innerHTML="",["BUREAU_OK","BANK_LINKING","STARTED","AFFORD_REFER","BUREAU_REFER"].includes(e)){const S=e==="AFFORD_REFER"||e==="BUREAU_REFER"?'<div class="p-3 bg-orange-50 border border-orange-100 rounded-lg mb-3 text-xs text-orange-700 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i> Currently Under Manual Review</div>':"";r.innerHTML=`
            ${S}
            <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Assessment</h4>
            <button onclick="updateStatus('AFFORD_OK')" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl mb-2 shadow-lg"><i class="fa-solid fa-check-circle mr-2"></i> Confirm Affordability</button>
            ${e.includes("REFER")?"":`<button onclick="updateStatus('AFFORD_REFER')" class="w-full py-3 bg-white border border-orange-200 text-orange-600 text-sm font-bold rounded-xl mb-2"><i class="fa-solid fa-magnifying-glass mr-2"></i> Refer</button>`}
            <button onclick="updateStatus('DECLINED')" class="w-full py-3 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl"><i class="fa-solid fa-xmark mr-2"></i> Decline</button>
          `}else e==="AFFORD_OK"?(r.innerHTML=`
            <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3 text-xs text-blue-700">Client passed assessment. Ready for Contract.</div>
            <button id="action-send-contract" class="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><i class="fa-solid fa-paper-plane"></i> Send Contract</button>
            <button id="action-preview-contract" class="w-full py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2"><i class="fa-solid fa-eye"></i> Preview Template</button>
          `,(z=document.getElementById("action-send-contract"))==null||z.addEventListener("click",S=>ve(S.currentTarget)),(V=document.getElementById("action-preview-contract"))==null||V.addEventListener("click",he)):e==="OFFERED"?r.innerHTML=`
            <div class="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mb-2"><i class="fa-solid fa-clock"></i></div>
                <p class="text-sm font-bold text-gray-800">Waiting for Client</p>
                <p class="text-xs text-gray-500 mt-1">Contract sent. Actions locked until client signs.</p>
            </div>
          `:e==="OFFER_ACCEPTED"?(r.innerHTML=`
             <div class="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-3 text-xs text-purple-700"><i class="fa-solid fa-signature mr-1"></i> Client Signed.</div>
             <button id="btn-approve-contract" class="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg"><i class="fa-solid fa-file-signature mr-2"></i> Approve & Queue Payout</button>
          `,document.getElementById("btn-approve-contract").onclick=()=>Ie("Approve","Mark contract as valid and ready for payout?",De)):e==="READY_TO_DISBURSE"?r.innerHTML='<div class="p-4 bg-green-50 border border-green-100 rounded-xl text-center"><p class="text-sm font-bold text-green-800">Queued for Payout</p></div>':e==="DECLINED"?r.innerHTML=`
            <div class="p-3 bg-red-50 border border-red-100 rounded-lg mb-3 text-xs text-red-700"><i class="fa-solid fa-circle-xmark mr-1"></i> Application Declined</div>
            <button onclick="updateStatus('AFFORD_OK')" class="w-full py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl shadow-sm"><i class="fa-solid fa-rotate-right mr-2"></i> Draft New Offer</button>
          `:e.includes("BUREAU")?r.innerHTML='<div class="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center"><p class="text-sm font-bold text-blue-800"><i class="fa-solid fa-robot mr-2"></i> System Processing</p></div>':e==="DISBURSED"&&(r.innerHTML='<div class="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center"><p class="text-sm font-bold text-gray-600">Loan Active / Completed</p></div>')},Ne=t=>{var a;if(!t)return;document.getElementById("applicant-name-header").textContent=((a=t.profiles)==null?void 0:a.full_name)||"Unknown",document.getElementById("header-id-val").textContent=t.id,document.getElementById("header-date").textContent=y(t.created_at),document.getElementById("detail-app-id").textContent=`#${t.id}`,document.getElementById("detail-date").textContent=y(t.created_at),document.getElementById("detail-purpose").textContent=t.purpose||"Personal Loan",document.getElementById("detail-notes").value=t.notes||"";const e=document.getElementById("header-status-badge");e&&(e.textContent=t.status,e.className=`px-4 py-1.5 text-sm font-bold rounded-full shadow-sm ${M(t.status)}`)},v=async()=>{var a,s,r,o;const e=new URLSearchParams(window.location.search).get("id");if(e)try{const n=await te(e);d=n,R(),(a=document.getElementById("contract-declined-banner"))==null||a.remove(),Ne(n),Be(n.profiles||{},n.bank_accounts),await $e(n.user_id),Te(n.financial_profiles,n.credit_checks),Ae(n.documents),await Fe(n.loan_history,n.application_history,n),$(n),await ye(),(s=document.getElementById("loading-state"))==null||s.classList.add("hidden"),(r=document.getElementById("content-grid"))==null||r.classList.remove("hidden"),(o=document.getElementById("page-header"))==null||o.classList.remove("hidden")}catch(n){console.error("Integration Error:",n),m("Failed to load full application data.","error")}};document.addEventListener("DOMContentLoaded",async()=>{var s;await Z();let t=document.getElementById("main-content");t||(t=document.createElement("main"),t.id="main-content",t.className="flex-1 p-6 pt-24",document.getElementById("app-shell").appendChild(t)),t.innerHTML=fe,ke(),await v(),(s=document.getElementById("btn-save-notes"))==null||s.addEventListener("click",saveNotes);const e=document.getElementById("modal-confirm-btn"),a=document.getElementById("modal-cancel-btn");e&&e.addEventListener("click",()=>{typeof D=="function"&&D()}),a&&a.addEventListener("click",B)});
