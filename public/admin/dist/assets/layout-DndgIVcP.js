import{s as u}from"./supabaseClient-C9gCct-F.js";const T="#EA580C",k="Your Company",L=[{title:`A Leap to
Financial Freedom`,text:"We offer credit of up to R200,000, with repayment terms extending up to a maximum of 36 months."},{title:"Flexible Repayments",text:"Repayment terms are tailored to each client's cash flow, risk profile, and agreed-upon conditions."},{title:"Save on Interest",text:"Our interest rates and fees are highly competitive, ensuring great value for our clients."}],m={id:"global",company_name:k,primary_color:"#E7762E",secondary_color:"#F97316",tertiary_color:"#FACC15",theme_mode:"light",company_logo_url:null,auth_background_url:null,auth_background_flip:!1,auth_overlay_color:T,auth_overlay_enabled:!0,carousel_slides:L.map(t=>({...t}))},S=5*60*1e3,C="/api/system-settings";let p=null,E=0,g=null;const x=(t,a=0,e=255)=>Math.max(a,Math.min(e,t)),y=t=>{if(!t)return{r:0,g:0,b:0};let a=t.replace("#","");a.length===3&&(a=a.split("").map(r=>r+r).join(""));const e=parseInt(a,16);return Number.isNaN(e)?{r:0,g:0,b:0}:{r:e>>16&255,g:e>>8&255,b:e&255}},P=(t,a,e)=>{const r=o=>o.toString(16).padStart(2,"0");return`#${r(x(Math.round(t)))}${r(x(Math.round(a)))}${r(x(Math.round(e)))}`.toUpperCase()},b=(t,a=0)=>{const{r:e,g:r,b:o}=y(t),n=s=>a>=0?s+(255-s)*a:s*(1+a);return P(n(e),n(r),n(o))},F=t=>{const{r:a,g:e,b:r}=y(t);return(.299*a+.587*e+.114*r)/255>.5?"#0F172A":"#FFFFFF"},_=(t,a=!1)=>{if(typeof t=="boolean")return t;if(typeof t=="string"){const e=t.toLowerCase();if(e==="true")return!0;if(e==="false")return!1}if(typeof t=="number"){if(t===1)return!0;if(t===0)return!1}return a},v=t=>(typeof t=="string"?t.trim():"")||m.company_name,N=(t,a)=>{if(!t)return a;let e=`${t}`.trim().replace("#","");return e.length===3&&(e=e.split("").map(r=>r+r).join("")),/^[0-9A-Fa-f]{6}$/.test(e)?`#${e.toUpperCase()}`:a},I=(t={},a={})=>{const e=typeof t.title=="string"?t.title.trim():"",r=typeof t.text=="string"?t.text.trim():"";return{title:e||a.title,text:r||a.text}},B=t=>{const a=Array.isArray(t)?t:[];return L.map((e,r)=>I(a[r]||{},e))},D=(t={})=>({...m,...t,company_name:v(t==null?void 0:t.company_name),auth_background_flip:_(t==null?void 0:t.auth_background_flip,m.auth_background_flip),auth_overlay_color:N(t==null?void 0:t.auth_overlay_color,m.auth_overlay_color),auth_overlay_enabled:_(t==null?void 0:t.auth_overlay_enabled,m.auth_overlay_enabled),carousel_slides:B(t.carousel_slides)}),R=t=>{if(typeof document>"u")return;const a=v(t);if(!a)return;const e=document.title||"";if(!e)return;const r=e.replace(/zwane/gi,a);r!==e&&(document.title=r)},f=(t,a)=>{const e=D(t),r=document.documentElement,o=y(e.primary_color),n=y(e.secondary_color),s=y(e.tertiary_color);r.style.setProperty("--color-primary",e.primary_color),r.style.setProperty("--color-primary-rgb",`${o.r} ${o.g} ${o.b}`),r.style.setProperty("--color-primary-hover",b(e.primary_color,-.15)),r.style.setProperty("--color-primary-soft",b(e.primary_color,.2)),r.style.setProperty("--color-primary-strong",b(e.primary_color,-.35)),r.style.setProperty("--color-secondary",e.secondary_color),r.style.setProperty("--color-secondary-rgb",`${n.r} ${n.g} ${n.b}`),r.style.setProperty("--color-secondary-soft",b(e.secondary_color,.15)),r.style.setProperty("--color-tertiary",e.tertiary_color),r.style.setProperty("--color-tertiary-rgb",`${s.r} ${s.g} ${s.b}`),r.style.setProperty("--gradient-brand",`linear-gradient(120deg, ${e.primary_color}, ${e.secondary_color}, ${e.tertiary_color})`),r.style.setProperty("--color-primary-contrast",F(e.primary_color)),r.style.setProperty("--auth-overlay-color",e.auth_overlay_color),r.style.setProperty("--auth-overlay-enabled",e.auth_overlay_enabled?"1":"0");const i=e.theme_mode==="dark"?"dark":"light";return r.setAttribute("data-theme",i),R(e.company_name),a&&(p=e,E=Date.now()),e},z=async t=>!t&&p&&Date.now()-E<S?p:g||(g=(async()=>{try{const a=await fetch(C,{headers:{Accept:"application/json"}});if(!a.ok)throw new Error(`Failed to load theme (${a.status})`);const e=await a.json(),r=(e==null?void 0:e.data)||e;return f(r,!0)}catch(a){console.error("Theme load failed:",a);const e=p||{...m};return f(e,!0)}finally{g=null}})(),g),M=()=>p,j=t=>v(t==null?void 0:t.company_name);async function O(t={}){const a=t.force===!0;return z(a)}function U(t={}){return f({...p||m,...t},!1)}function H(t){return f(t,!0)}function q(){p&&f(p,!1)}const Y=(t={})=>O(t),et=(t={})=>U(t),rt=t=>H(t),at=()=>q(),ot=()=>M(),G=t=>j(t),w=document.getElementById("app-shell");let A=null;const V="https://static.wixstatic.com/media/f82622_cde1fbd5680141c5b0fccca81fb92ad6~mv2.png",$=(t="")=>t?t.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):"";async function nt(){const{data:{session:t}}=await u.auth.getSession();if(!t)return window.location.replace("/auth/login.html"),null;const[a,e,r]=await Promise.all([u.rpc("get_my_role"),u.rpc("get_my_profile").single(),u.rpc("is_role_or_higher",{p_min_role:"base_admin"})]),{data:o,error:n}=a,{data:s,error:i}=e,{data:l,error:c}=r;if(n||i||c||!l)return await u.auth.signOut(),window.location.replace("/auth/login.html"),null;A=s;const d=await Y();return W(s,o,d),K(),Q(),X(o,s.id),{profile:s,role:o}}function st(){return A}function W(t,a,e=null){if(!w)return;const r=(t==null?void 0:t.full_name)||"Admin",n=((e==null?void 0:e.primary_color)||"var(--color-primary)").replace("#","")||"ea580c",s=(t==null?void 0:t.avatar_url)||`https://ui-avatars.com/api/?name=${encodeURIComponent(r.replace(" ","+"))}&background=${n}&color=fff`,i=G(e)||m.company_name,l=((e==null?void 0:e.company_logo_url)||"").trim(),c=$(l||V),d=$(i||"Company"),h=c?`<img src="${c}" alt="${d}" class="h-12 w-auto object-contain max-w-[200px]">`:`<div class="text-xl font-bold text-gray-800">${d}</div>`;w.innerHTML=`
    <div id="sidebar" class="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-gray-100 border-r border-gray-200 text-gray-600 transition-transform duration-300 ease-in-out md:translate-x-0 -translate-x-full shadow-xl">
      
      <div class="flex items-center justify-center h-24 px-6 border-b border-gray-200 bg-gray-100">
        ${h}
      </div>

      <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div class="mb-6">
          <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Overview</p>
          ${J(a)}
        </div>
      </nav>

      <div class="p-4 border-t border-gray-200 bg-gray-200/50">
        <button id="sign-out-btn" class="sign-out-btn flex items-center w-full p-3 rounded-xl border border-transparent transition-all group hover:bg-brand-accent hover:shadow-lg">
           <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs text-gray-700 font-bold mr-3 shadow-sm">
              ${r.charAt(0)}
           </div>
           <div class="flex-1 text-left">
            <p class="text-sm font-bold text-gray-800 transition-colors group-hover:text-white">Sign Out</p>
            <p class="text-[10px] text-gray-500 truncate w-32 transition-colors group-hover:text-white/80">${t.email||""}</p>
           </div>
          <i class="fa-solid fa-arrow-right-from-bracket text-gray-400 transition-colors group-hover:text-white"></i>
        </button>
      </div>
    </div>
    
    <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden hidden"></div>

    <div class="flex flex-col flex-1 md:pl-72 min-h-screen relative overflow-hidden bg-gray-50 font-sans">
      
      <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[120px]" style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);"></div>
        <div class="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[100px]" style="background-color: color-mix(in srgb, var(--color-secondary) 10%, transparent);"></div>
      </div>

      <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div class="flex items-center justify-between h-20 px-8">
          <button id="sidebar-toggle" class="text-gray-500 hover:text-brand-accent md:hidden p-2 -ml-2 transition-colors">
            <i class="fa-solid fa-bars text-xl"></i>
          </button>
          
          <div class="hidden md:block">
            <h1 id="page-title" class="text-xl font-bold text-gray-900">Dashboard</h1>
            <p class="text-xs text-gray-500 mt-0.5">Welcome back, <span class="font-medium text-brand-accent">${r}</span></p>
          </div>

          <div class="flex items-center gap-6">
             
             <div class="relative">
                 <button id="notif-btn" class="relative p-2 text-gray-400 hover:text-brand-accent transition-colors focus:outline-none">
                    <i class="fa-solid fa-bell text-xl"></i>
                    <span id="notif-badge" class="hidden absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                 </button>
                 
                 <div id="notif-dropdown" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right transition-all">
                    <div class="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                        <h3 class="font-bold text-gray-800 text-sm">Notifications</h3>
                        <button id="mark-all-read" class="text-[10px] text-brand-accent font-medium hover:text-brand-accent-hover uppercase tracking-wide">Mark all read</button>
                    </div>
                    <div id="notif-list" class="max-h-64 overflow-y-auto bg-white">
                        <div class="p-6 text-center text-gray-400 text-xs">Loading...</div>
                    </div>
                 </div>
             </div>

             <div class="h-8 w-[1px] bg-gray-200 mx-2"></div>
             <img src="${s}" class="w-10 h-10 rounded-full border-2 shadow-sm" style="border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);" alt="Profile">
          </div>
        </div>
      </header>
      
      <main id="main-content" class="flex-1 p-8 relative z-10">
        </main>
    </div>
  `}function J(t){const a=t==="base_admin"||t==="admin"||t==="super_admin",e=t==="admin"||t==="super_admin",r=t==="super_admin",o="nav-link flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-1 group",n="text-gray-600 hover:bg-white hover:text-brand-accent hover:shadow-sm";return`
    <ul class="space-y-1">
      ${a?`
        <li>
            <a href="/admin/dashboard" class="${o} ${n}">
                <i class="fa-solid fa-chart-line w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Dashboard
            </a>
        </li>
        
        <li>
          <button type="button" id="analytics-toggle" class="w-full flex items-center justify-between ${o} ${n}">
            <span class="flex items-center"><i class="fa-solid fa-chart-pie w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Analytics</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>
          </button>
          <ul id="analytics-submenu" class="hidden pl-4 space-y-1 mt-1">
            <li><a href="/admin/analytics.html" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Customer Analytics</a></li>
            <li><a href="/admin/financials.html" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Financials</a></li>
          </ul>
        </li>

        <li>
            <a href="/admin/applications" class="${o} ${n}">
                <i class="fa-solid fa-file-signature w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Applications
            </a>
        </li>
      `:""}
      
      ${e?`
        <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">Finance</p>
        <li><a href="/admin/users" class="${o} ${n}"><i class="fa-solid fa-users w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Customers</a></li>
        
        <li>
          <button type="button" id="payments-toggle" class="w-full flex items-center justify-between ${o} ${n}">
            <span class="flex items-center"><i class="fa-solid fa-coins w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Payments</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>
          </button>
          <ul id="payments-submenu" class="hidden pl-4 space-y-1 mt-1">
            <li><a href="/admin/incoming-payments" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Incoming</a></li>
            <li><a href="/admin/outgoing-payments" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Outgoing</a></li>
          </ul>
        </li>
      `:""}
      
      ${r?`
        <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">System</p>
        <li><a href="/admin/settings" class="${o} ${n}"><i class="fa-solid fa-sliders w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Config</a></li>
      `:""}
    </ul>
  `}function K(){const t=document.getElementById("sign-out-btn");t&&t.addEventListener("click",async i=>{i.preventDefault(),await u.auth.signOut(),window.location.href="/auth/login.html"});const a=document.getElementById("sidebar-toggle"),e=document.getElementById("sidebar"),r=document.getElementById("sidebar-overlay");a&&e&&(a.addEventListener("click",()=>{e.classList.toggle("-translate-x-full"),r==null||r.classList.toggle("hidden")}),r==null||r.addEventListener("click",()=>{e.classList.add("-translate-x-full"),r.classList.add("hidden")}));const o=(i,l)=>{const c=document.getElementById(i),d=document.getElementById(l);c&&d&&c.addEventListener("click",()=>{d.classList.toggle("hidden"),c.querySelector(".fa-chevron-down").classList.toggle("rotate-180")})};o("payments-toggle","payments-submenu"),o("analytics-toggle","analytics-submenu");const n=document.getElementById("notif-btn"),s=document.getElementById("notif-dropdown");n&&s&&(n.addEventListener("click",i=>{i.stopPropagation(),s.classList.toggle("hidden")}),document.addEventListener("click",i=>{!n.contains(i.target)&&!s.contains(i.target)&&s.classList.add("hidden")}))}function Q(){const t=window.location.pathname;document.querySelectorAll("a").forEach(e=>{if(e.getAttribute("href")===t)if(e.classList.remove("text-gray-600","hover:bg-white","hover:text-brand-accent"),e.parentElement.parentElement.id==="payments-submenu"||e.parentElement.parentElement.id==="analytics-submenu")e.classList.add("text-brand-accent","font-bold","border-brand-accent","bg-white"),e.classList.remove("text-gray-500","border-gray-200"),e.parentElement.parentElement.classList.remove("hidden");else{e.classList.add("bg-brand-accent","text-white","shadow-md"),e.style.boxShadow="0 15px 35px -20px var(--color-shadow)";const r=e.querySelector("i");r&&(r.classList.remove("sidebar-nav-icon"),r.classList.add("text-white"))}})}async function X(t,a){const e=document.getElementById("notif-badge"),r=document.getElementById("notif-list"),o=document.getElementById("mark-all-read"),n=t==="base_admin"?"base_admin":"admin",s=async()=>{const{data:l,error:c}=await u.from("admin_notifications").select("*").eq("target_role",n).order("created_at",{ascending:!1}).limit(20);if(l){const d=l.filter(h=>!(h.read_by||[]).includes(a));i(d)}},i=l=>{if(l.length>0?e.classList.remove("hidden"):e.classList.add("hidden"),l.length===0){r.innerHTML='<div class="p-6 text-center text-gray-400 text-xs">No new notifications</div>';return}r.innerHTML=l.map(c=>`
            <div class="p-3 border-b border-gray-100 hover-brand-sheen transition-colors cursor-pointer relative group">
                <a href="${c.link}" class="block">
                    <p class="text-xs font-bold text-gray-800 mb-0.5">${c.title}</p>
                    <p class="text-[10px] text-gray-500 leading-tight">${c.message}</p>
                    <p class="text-[9px] text-gray-400 mt-1 text-right">${new Date(c.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                </a>
            </div>
        `).join("")};await s(),u.channel("admin_notif_channel").on("postgres_changes",{event:"INSERT",schema:"public",table:"admin_notifications",filter:`target_role=eq.${n}`},l=>{s()}).subscribe(),o&&o.addEventListener("click",async()=>{const{error:l}=await u.rpc("mark_notifications_read",{p_target_role:n});l||s()})}export{m as D,ot as a,et as b,G as c,Y as e,st as g,nt as i,rt as p,at as r};
