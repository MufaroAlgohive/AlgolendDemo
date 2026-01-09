import"./supabaseClient-C9gCct-F.js";import{i as f}from"./layout-DndgIVcP.js";/* empty css               */import{h as m,n as b,o as v}from"./dataService-d5RfGeK7.js";import{b as c,a as n}from"./utils-D6Z1B7Jq.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";let g=[];const x=e=>{switch(e){case"super_admin":return"bg-red-100 text-red-800";case"admin":return"bg-blue-100 text-blue-800";case"base_admin":return"bg-yellow-100 text-yellow-800";default:return"bg-gray-100 text-gray-800"}},y=e=>{if(!e)return"bg-gray-100 text-gray-800";switch(e.toLowerCase()){case"approved":case"disbursed":return"bg-green-100 text-green-800";case"declined":return"bg-red-100 text-red-800";case"pending":case"submitted":case"started":return"bg-yellow-100 text-yellow-800";case"offered":return"bg-purple-100 text-purple-800";default:return"bg-gray-100 text-gray-800"}},h=(e="")=>e.trim().split(/\s+/).map(t=>t[0]).filter(Boolean).slice(0,2).join("").toUpperCase()||"U",p=(e={},t={})=>{const{sizeClass:r="w-10 h-10",textClass:a="text-sm",extraClasses:s="",altFallback:o="User"}=t,l=e.full_name||o;return e.avatar_url?`<img src="${e.avatar_url}" alt="${l}" class="${r} rounded-full object-cover ${s}">`:`<div class="avatar-placeholder ${r} ${a} ${s}" aria-hidden="true">${h(l)}</div>`};function w(){const e=document.getElementById("main-content");e&&(e.innerHTML=`
    <div id="user-stats-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      ${d("Total Users")}
      ${d("Total Admins")}
      ${d("Total Borrowers")}
    </div>
    
    <div class="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-220px)]">
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
        
        <div class="md:col-span-1 lg:col-span-1 border-r border-gray-200 flex flex-col h-full">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">All Users</h2>
            <div class="flex flex-col sm:flex-row gap-2 mt-3">
              <input type="search" id="user-search-input" placeholder="Search..." class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <select id="role-filter" class="w-full sm:w-auto px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="all">All Roles</option>
                <option value="borrower">Borrowers</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
          </div>
          <div id="user-list-container" class="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div class="p-10 text-center text-gray-500"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading users...</div>
          </div>
        </div>
        
        <div id="user-detail-panel" class="md:col-span-2 lg:col-span-3 overflow-y-auto p-6 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div class="flex flex-col items-center justify-center h-full text-gray-400">
            <i class="fa-solid fa-user-check text-4xl mb-3"></i>
            <p>Select a user from the list to view details</p>
          </div>
        </div>
        
      </div>
    </div>
  `,_())}function $(e){const t=document.getElementById("user-list-container");if(t){if(t.innerHTML="",!e||e.length===0){t.innerHTML='<p class="p-6 text-center text-gray-500 text-sm">No users found.</p>';return}e.forEach(r=>{var s;const a=document.createElement("button");a.className="user-card w-full text-left flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-all focus:outline-none focus:bg-orange-50 group",a.innerHTML=`
      ${p(r,{sizeClass:"w-10 h-10",textClass:"text-xs",extraClasses:"mr-3 border border-gray-200 group-hover:border-orange-300 transition-colors"})}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-gray-900 truncate group-hover:text-tertiary transition-colors">${r.full_name||"Unknown"}</p>
        <p class="text-xs text-gray-500 truncate">${r.email||""}</p>
      </div>
      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${x(r.role)} uppercase tracking-wider">${(s=r.role)==null?void 0:s.replace("_"," ")}</span>
    `,a.onclick=()=>L(r.id,a),t.appendChild(a)})}}async function L(e,t){const r=document.getElementById("user-detail-panel");document.querySelectorAll(".user-card").forEach(a=>a.classList.remove("bg-orange-50","border-l-4","border-orange-500")),t.classList.add("bg-orange-50","border-l-4","border-orange-500"),r.innerHTML=`
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-orange-500"></i>
      <p class="mt-3 font-medium">Loading user details...</p>
    </div>`;try{const{data:a,error:s}=await v(e);if(s)throw new Error(s);C(a)}catch(a){console.error("Detail render error:",a),r.innerHTML=`
        <div class="flex flex-col items-center justify-center h-full">
            <div class="p-6 bg-red-50 text-red-800 rounded-xl border border-red-100 text-center max-w-md">
                <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
                <p class="font-bold">Failed to load user</p>
                <p class="text-sm mt-1">${a.message}</p>
            </div>
        </div>`}}function C(e){var o;const t=document.getElementById("user-detail-panel");if(!e||!e.profile){t.innerHTML='<div class="p-4 text-gray-500">User data not found.</div>';return}const{profile:r,financials:a,applications:s}=e;t.innerHTML=`
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        ${p(r,{sizeClass:"w-20 h-20",textClass:"text-2xl",extraClasses:"border-4 border-gray-50 shadow-sm"})}
        <div class="text-center sm:text-left">
          <h2 class="text-2xl font-bold text-gray-900">${r.full_name||"Unknown"}</h2>
          <p class="text-gray-500">${r.email}</p>
          <div class="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
             <span class="px-3 py-1 text-xs font-bold rounded-full ${x(r.role)} uppercase tracking-wider">${(o=r.role)==null?void 0:o.replace("_"," ")}</span>
             <span class="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600 font-mono border border-gray-200">ID: ${r.id}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slide-up">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                <i class="fa-regular fa-id-card text-gray-400"></i> Contact Details
            </h3>
            <div class="space-y-4 text-sm">
                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span class="text-gray-500">Phone</span> <span class="font-medium font-mono text-gray-900">${r.contact_number||"Not provided"}</span></div>
                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span class="text-gray-500">Joined</span> <span class="font-medium text-gray-900">${c(r.created_at)}</span></div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                <i class="fa-solid fa-coins text-gray-400"></i> Financial Snapshot
            </h3>
            ${a?`
                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div class="p-4 bg-green-50 rounded-xl border border-green-100">
                        <div class="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Monthly Income</div>
                        <div class="text-xl font-extrabold text-gray-900">${n(a.monthly_income)}</div>
                    </div>
                    <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div class="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">Monthly Expenses</div>
                        <div class="text-xl font-extrabold text-gray-900">${n(a.monthly_expenses)}</div>
                    </div>
                </div>
            `:'<div class="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm">No financial profile data.</div>'}
        </div>
    </div>

    <div class="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up" style="animation-delay: 0.1s;">
        <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
                <i class="fa-solid fa-file-signature text-gray-400"></i> Application History
            </h3>
            <span class="bg-white px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200">${s.length}</span>
        </div>
        
        ${s.length>0?`
            <div class="divide-y divide-gray-100">
                ${s.map(l=>`
                    <a href="/admin/application-detail?id=${l.id}" class="block p-4 hover:bg-gray-50 transition-all flex items-center justify-between group">
                        <div>
                            <div class="font-bold text-gray-900 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                ${n(l.amount)} 
                                <span class="text-gray-400 text-xs font-normal">• ${l.purpose||"Personal Loan"}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <i class="fa-regular fa-calendar"></i> ${c(l.created_at)}
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 text-xs font-bold rounded-full ${y(l.status)} capitalize shadow-sm border border-white/20">
                                ${l.status}
                            </span>
                            <i class="fa-solid fa-chevron-right text-gray-300 text-xs group-hover:text-orange-400"></i>
                        </div>
                    </a>
                `).join("")}
            </div>
        `:'<div class="p-12 text-center text-gray-400 italic">No loan applications found for this user.</div>'}
    </div>
  `}function d(e){return`<div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100"><p class="text-xs font-bold uppercase text-gray-400 mb-2">${e}</p><div class="h-8 w-16 bg-gray-100 rounded animate-pulse"></div></div>`}async function E(){const e=document.getElementById("user-stats-cards");if(e)try{const{data:t,error:r}=await b();if(r)throw r;t&&(e.innerHTML=`
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Total Users</p>
                <p class="mt-2 text-3xl font-extrabold text-gray-900">${t.total_users}</p>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Admins</p>
                <p class="mt-2 text-3xl font-extrabold text-blue-600">${t.total_admins}</p>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Borrowers</p>
                <p class="mt-2 text-3xl font-extrabold text-orange-600">${t.total_borrowers}</p>
            </div>`)}catch{e.innerHTML='<div class="col-span-3 p-4 bg-red-50 text-red-600 text-sm rounded-lg text-center">Failed to load stats.</div>'}}const i=()=>{var a,s;const e=((a=document.getElementById("user-search-input"))==null?void 0:a.value.toLowerCase())||"",t=((s=document.getElementById("role-filter"))==null?void 0:s.value)||"all",r=g.filter(o=>{const l=t==="all"||o.role===t,u=(o.full_name||"").toLowerCase().includes(e)||(o.email||"").toLowerCase().includes(e);return l&&u});$(r)};function _(){var e,t;(e=document.getElementById("user-search-input"))==null||e.addEventListener("input",i),(t=document.getElementById("role-filter"))==null||t.addEventListener("change",i)}document.addEventListener("DOMContentLoaded",async()=>{await f(),w(),await E();try{const{data:e,error:t}=await m();if(t)throw t;g=e,i()}catch{const t=document.getElementById("user-list-container");t&&(t.innerHTML='<p class="p-6 text-center text-red-500 text-sm">Failed to load users.</p>')}});
