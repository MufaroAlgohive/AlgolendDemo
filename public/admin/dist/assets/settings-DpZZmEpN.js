import{s as h}from"./supabaseClient-CsC_yag8.js";import{D as m,i as Ce,e as Se,a as me,p as ge,r as $e,b as Ue}from"./layout-DKFM-dk0.js";/* empty css               */import{g as Te,h as Pe,u as Ae,i as Me,j as Ne,k as je,l as Fe,m as He}from"./dataService-Bp3rTtkG.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";const Re=(e=[])=>Array.isArray(e)?e.map((t={})=>({title:typeof t.title=="string"?t.title:"",text:typeof t.text=="string"?t.text:""})):[],j=e=>{const t=m.carousel_slides||[],a=Re(Array.isArray(e)&&e.length?e:t),r=t.length||3;for(;a.length<r;){const o=t[a.length]||{title:"",text:""};a.push({...o})}return a.slice(0,r).map((o,l)=>{var c,i,f,b;return{title:((c=o.title)==null?void 0:c.trim())||((i=t[l])==null?void 0:i.title)||"",text:((f=o.text)==null?void 0:f.trim())||((b=t[l])==null?void 0:b.text)||""}})},S=(e,t=!1)=>{if(typeof e=="boolean")return e;if(typeof e=="string"){const a=e.toLowerCase();if(a==="true")return!0;if(a==="false")return!1}if(typeof e=="number"){if(e===1)return!0;if(e===0)return!1}return t},L=e=>{if(!e)return null;let t=e.trim().replace("#","");return t.length===3&&(t=t.split("").map(a=>a+a).join("")),/^[0-9A-Fa-f]{6}$/.test(t)?`#${t.toUpperCase()}`:null},be=e=>(typeof e=="string"?e.trim():"")||m.company_name,g=(e={})=>({...m,...e,company_name:be(e==null?void 0:e.company_name),auth_overlay_color:L(e==null?void 0:e.auth_overlay_color)||m.auth_overlay_color,auth_overlay_enabled:S(e==null?void 0:e.auth_overlay_enabled,m.auth_overlay_enabled),auth_background_flip:S(e==null?void 0:e.auth_background_flip,m.auth_background_flip),carousel_slides:j(e.carousel_slides)}),F=()=>j(s==null?void 0:s.carousel_slides);let M="borrower",p=null,se=[],A=!1,x=g(m),s=g(m),k=!1,_=!1,I={updated_at:null,updated_by:null};const $="avatars",ze=2*1024*1024,De=["image/png","image/jpeg","image/svg+xml","image/webp"],We=6*1024*1024,qe=["image/png","image/jpeg","image/webp"];let fe=!1,ye=!1;const d=(e,t="success")=>{let a=document.getElementById("toast-container");a||(a=document.createElement("div"),a.id="toast-container",a.className="fixed top-4 right-4 z-[10000] flex flex-col space-y-3 pointer-events-none",document.body.appendChild(a));const r=t==="success"?"bg-white border-l-4 border-green-500 text-gray-800":"bg-white border-l-4 border-red-500 text-gray-800",o=t==="success"?'<i class="fa-solid fa-check-circle text-green-500 text-xl"></i>':'<i class="fa-solid fa-circle-exclamation text-red-500 text-xl"></i>',l=document.createElement("div");l.className=`${r} shadow-lg rounded-r-lg p-4 flex items-center space-x-3 min-w-[300px] transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto`,l.innerHTML=`
    ${o}
    <div class="flex-1">
      <p class="font-medium text-sm">${t==="success"?"Success":"Error"}</p>
      <p class="text-xs text-gray-500">${e}</p>
    </div>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
      <i class="fa-solid fa-times"></i>
    </button>
  `,a.appendChild(l),requestAnimationFrame(()=>{l.classList.remove("translate-x-10","opacity-0")}),setTimeout(()=>{l.classList.add("translate-x-10","opacity-0"),setTimeout(()=>l.remove(),300)},4e3)},xe=e=>e!=null&&e.avatar_url?`${e.avatar_url}?t=${Date.now()}`:null,Oe=(e="")=>e.trim().split(/\s+/).map(t=>t[0]).filter(Boolean).slice(0,2).join("").toUpperCase()||"U",H=(e={},t={})=>{const{sizeClass:a="w-10 h-10",textClass:r="text-sm",sharedClasses:o="",imageClasses:l="",placeholderClasses:c="",variant:i="primary",altFallback:f="User"}=t,b=(e==null?void 0:e.full_name)||f,v=xe(e);if(v){const T=[a,"rounded-full","object-cover",o,l].filter(Boolean).join(" ")||a;return`<img src="${v}" alt="${b}" class="${T}" loading="lazy">`}const w=["avatar-placeholder",a,r,o,c];i==="gradient"&&w.push("avatar-placeholder--gradient");const U=Oe(b);return`<div class="${w.filter(Boolean).join(" ").trim()}" aria-hidden="true">${U}</div>`},Ge=e=>{switch(e){case"super_admin":return"bg-red-100 text-red-800";case"admin":return"bg-blue-100 text-blue-800";case"base_admin":return"bg-yellow-100 text-yellow-800";default:return"bg-gray-100 text-gray-800"}},N=[{key:"primary_color",label:"Primary Color",description:"Used for CTAs, highlights and primary focus states."},{key:"secondary_color",label:"Secondary Color",description:"Used for gradients, hover states and charts."},{key:"tertiary_color",label:"Tertiary Color",description:"Used for gradients and subtle accents."}],E=(e="")=>e?e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):"",Ye=(e="")=>e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):"",C=()=>{N.forEach(({key:r})=>{const o=document.querySelector(`[data-color-picker="${r}"]`),l=document.querySelector(`[data-color-input="${r}"]`);o&&(o.value=s[r]),l&&(l.value=s[r])});const e=document.getElementById("brand-gradient-preview");e&&(e.style.backgroundImage=`linear-gradient(120deg, ${s.primary_color}, ${s.secondary_color}, ${s.tertiary_color})`),document.querySelectorAll("[data-theme-mode]").forEach(r=>{r.dataset.themeMode===s.theme_mode?r.classList.add("bg-brand-accent","text-white","shadow"):r.classList.remove("bg-brand-accent","text-white","shadow")});const a=document.getElementById("company-name-input");a&&document.activeElement!==a&&(a.value=s.company_name||""),ve(),_e(),Le(),Xe(),R()},R=()=>{const e=document.getElementById("save-system-settings"),t=document.getElementById("reset-system-settings");e&&(e.disabled=!k||_,e.innerHTML=_?'<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving':"Save Theme"),t&&(t.disabled=_);const a=document.getElementById("system-settings-status");a&&(a.textContent=k?"You have unsaved changes":"Theme matches saved configuration")},Ve=()=>{k=!0,R()},u=e=>{const t={...e};Object.prototype.hasOwnProperty.call(e,"carousel_slides")&&(t.carousel_slides=j(e.carousel_slides)),s=g({...s,...t}),Ve(),Ue(s),C()},z=()=>(s.company_logo_url||"").trim(),ve=()=>{const e=z(),t=document.getElementById("company-logo-preview"),a=document.getElementById("company-logo-empty"),r=document.getElementById("remove-logo-btn"),o=document.getElementById("logo-url-input");t&&(e?(t.src=e,t.classList.remove("hidden"),t.onerror=()=>{t.classList.add("hidden"),a==null||a.classList.remove("hidden")}):(t.src="",t.classList.add("hidden"))),a&&a.classList.toggle("hidden",!!e),r&&(r.disabled=!e||fe),o&&document.activeElement!==o&&(o.value=e)},de=e=>{fe=e;const t=document.getElementById("logo-upload-btn"),a=document.getElementById("remove-logo-btn");t&&(t.disabled=e,t.innerHTML=e?'<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Uploading...':'<i class="fa-solid fa-cloud-arrow-up mr-2"></i>Upload Logo'),a&&(a.disabled=e||!z())},D=()=>(s.auth_background_url||"").trim(),he=()=>S(s.auth_background_flip,!1),we=()=>L(s.auth_overlay_color)||m.auth_overlay_color,Ee=()=>S(s.auth_overlay_enabled,m.auth_overlay_enabled),_e=()=>{const e=D(),t=document.getElementById("auth-bg-preview"),a=document.getElementById("auth-bg-empty"),r=document.getElementById("remove-wallpaper-btn"),o=document.getElementById("wallpaper-url-input"),l=document.getElementById("wallpaper-flip-toggle"),c=he();t&&(e?(t.style.backgroundImage=`url('${e}')`,t.style.backgroundColor="#0f172a"):(t.style.backgroundImage="none",t.style.backgroundColor="#0f172a"),t.style.transform=c?"scaleX(-1)":"scaleX(1)"),a&&a.classList.toggle("hidden",!!e),r&&(r.disabled=!e||ye),o&&document.activeElement!==o&&(o.value=e),l&&document.activeElement!==l&&(l.checked=c)},Le=()=>{const e=we(),t=Ee(),a=document.getElementById("overlay-color-picker"),r=document.getElementById("overlay-color-input"),o=document.getElementById("overlay-disable-toggle");a&&document.activeElement!==a&&(a.value=e),r&&document.activeElement!==r&&(r.value=e),o&&document.activeElement!==o&&(o.checked=!t)},Xe=()=>{F().forEach((t,a)=>{const r=document.querySelector(`[data-carousel-field="title"][data-carousel-index="${a}"]`),o=document.querySelector(`[data-carousel-field="text"][data-carousel-index="${a}"]`);r&&r!==document.activeElement&&(r.value=t.title),o&&o!==document.activeElement&&(o.value=t.text)})},ie=e=>{ye=e;const t=document.getElementById("wallpaper-upload-btn"),a=document.getElementById("remove-wallpaper-btn");t&&(t.disabled=e,t.innerHTML=e?'<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Uploading...':'<i class="fa-solid fa-image mr-2"></i>Upload Wallpaper'),a&&(a.disabled=e||!D())};async function Je(e){var a;const t=(a=e.target.files)==null?void 0:a[0];if(t){if(!De.includes(t.type)){d("Please upload a PNG, JPG, SVG or WEBP image.","error"),e.target.value="";return}if(t.size>ze){d("Logo must be smaller than 2MB.","error"),e.target.value="";return}de(!0);try{const o=t.name.replace(/\s+/g,"-").toLowerCase().split(".").pop(),l=`system-branding/${Date.now()}.${o}`,{error:c}=await h.storage.from($).upload(l,t,{cacheControl:"3600",upsert:!0});if(c)throw c;const{data:i}=h.storage.from($).getPublicUrl(l);if(!(i!=null&&i.publicUrl))throw new Error("Unable to resolve uploaded logo URL.");u({company_logo_url:i.publicUrl}),d("Logo uploaded. Save settings to publish it everywhere.","success")}catch(r){console.error("Logo upload failed:",r),d(r.message||"Unable to upload logo","error")}finally{de(!1),e.target.value="",ve()}}}function ce(){const e=document.getElementById("logo-url-input");if(!e)return;const t=e.value.trim();if(!t){u({company_logo_url:null}),d("Logo cleared. Save to remove it from navbars.","success");return}try{const a=new URL(t);if(!["http:","https:"].includes(a.protocol))throw new Error("Logo URL must use HTTP or HTTPS");u({company_logo_url:a.toString()}),d("Logo link updated. Remember to save settings.","success")}catch(a){d(a.message||"Enter a valid logo URL","error")}}function Ze(){z()&&(u({company_logo_url:null}),d("Logo removed. Save to revert to the default mark.","success"))}async function Ke(e){var a;const t=(a=e.target.files)==null?void 0:a[0];if(t){if(!qe.includes(t.type)){d("Wallpaper must be a PNG, JPG or WEBP image.","error"),e.target.value="";return}if(t.size>We){d("Wallpaper must be smaller than 6MB.","error"),e.target.value="";return}ie(!0);try{const o=t.name.replace(/\s+/g,"-").toLowerCase().split(".").pop(),l=`system-branding/auth-wallpapers/${Date.now()}.${o}`,{error:c}=await h.storage.from($).upload(l,t,{cacheControl:"3600",upsert:!0});if(c)throw c;const{data:i}=h.storage.from($).getPublicUrl(l);if(!(i!=null&&i.publicUrl))throw new Error("Unable to resolve uploaded wallpaper URL.");u({auth_background_url:i.publicUrl}),d("Auth wallpaper uploaded. Save to push it live.","success")}catch(r){console.error("Wallpaper upload failed:",r),d(r.message||"Unable to upload wallpaper","error")}finally{ie(!1),e.target.value="",_e()}}}function ue(){const e=document.getElementById("wallpaper-url-input");if(!e)return;const t=e.value.trim();if(!t){u({auth_background_url:null}),d("Wallpaper cleared. Save to revert to the default.","success");return}try{const a=new URL(t);if(!["http:","https:"].includes(a.protocol))throw new Error("Wallpaper URL must use HTTP or HTTPS");u({auth_background_url:a.toString()}),d("Wallpaper link updated. Remember to save settings.","success")}catch(a){d(a.message||"Enter a valid wallpaper URL","error")}}function Qe(){D()&&(u({auth_background_url:null}),d("Wallpaper removed. Save to restore the fallback image.","success"))}function et(e){u({auth_background_flip:e.target.checked})}function tt(e){const t=L(e.target.value);t&&u({auth_overlay_color:t})}function pe(e){const t=L(e.target.value);if(!t){d("Enter a valid hex color (e.g. #EA580C)","error"),Le();return}u({auth_overlay_color:t})}function at(e){const t=!e.target.checked;u({auth_overlay_enabled:t})}async function rt(){const{data:e,error:t}=await Te();if(t){console.error("Failed to load system settings:",t);const r=me()||m,o=g(r);x=o,s=g(o),d("Unable to load saved theme. Using defaults.","error");return}x=g(e),s=g(x),I={updated_at:(e==null?void 0:e.updated_at)||null,updated_by:(e==null?void 0:e.updated_by)||null},ge(x)}function ot(){const e=document.getElementById("main-content");if(!e)return;e.innerHTML=`
    <div class="bg-white rounded-lg shadow-lg relative flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
      
      <nav id="settings-tabs" class="flex-none flex border-b border-gray-200 px-6 bg-gray-50 z-10 overflow-x-auto">
        <button class="tab-button active" data-tab="profile">
          <i class="fa-solid fa-user-edit w-5 mr-2"></i>My Profile
        </button>
        <button class="tab-button" data-tab="security">
          <i class="fa-solid fa-lock w-5 mr-2"></i>Security
        </button>
        ${M==="super_admin"?`
          <button class="tab-button" data-tab="billing">
            <i class="fa-solid fa-credit-card w-5 mr-2"></i>Billing & Payments
          </button>
          <button class="tab-button" data-tab="usermanagement">
            <i class="fa-solid fa-users-cog w-5 mr-2"></i>User Management
          </button>
          <button class="tab-button" data-tab="system">
            <i class="fa-solid fa-sliders w-5 mr-2"></i>System Settings
          </button>
        `:""}
      </nav>
        
      <div id="settings-content" class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white">
        </div>

      <div id="role-modal" class="absolute inset-0 z-50 bg-gray-900 bg-opacity-20 hidden flex items-center justify-center backdrop-blur-[2px] transition-all duration-200">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 transform scale-100">
              <div class="flex justify-between items-center mb-4">
                  <h2 class="text-lg font-bold text-gray-800">Change User Role</h2>
                  <button id="close-role-modal" type="button" class="text-gray-400 hover:text-gray-600 transition-colors">
                      <i class="fa-solid fa-times text-lg"></i>
                  </button>
              </div>
              <form id="role-form">
                  <input type="hidden" id="modal-user-id">
                  <div class="bg-blue-50 p-3 rounded-lg mb-5 flex items-start border border-blue-100">
                    <i class="fa-solid fa-info-circle text-blue-500 mt-0.5 mr-2"></i>
                    <p class="text-sm text-blue-800">Changing role for <strong id="modal-user-name">User</strong></p>
                  </div>
                  <div class="mb-6">
                      <label for="modal-role-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Role</label>
                      <select id="modal-role-select" class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-shadow">
                          <option value="borrower">Borrower</option>
                          <option value="base_admin">Base Admin</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                      </select>
                  </div>
                  <div class="flex justify-end pt-2 space-x-3 border-t border-gray-100 mt-2">
                      <button type="button" id="cancel-role-modal" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" id="submit-role-change" class="px-4 py-2 text-sm font-medium text-white bg-brand-accent border border-transparent rounded-lg shadow-sm hover:bg-brand-accent-hover transition-colors flex items-center">
                          Save Changes
                      </button>
                  </div>
              </form>
          </div>
      </div>
    </div>
  `;const t=document.createElement("style");t.innerHTML=`
    .tab-button {
      padding: 1rem 1.25rem;
      margin-bottom: -1px;
      border-bottom: 3px solid transparent;
      color: #6B7280;
      font-weight: 500;
      transition: all 0.2s ease-in-out;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }
    .tab-button:hover {
      color: #111827;
      background-color: #F9FAFB;
    }
    .tab-button.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
      font-weight: 600;
      background-color: white;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
  `,document.head.appendChild(t),bt();const a=()=>document.getElementById("role-modal").classList.add("hidden");document.getElementById("cancel-role-modal").addEventListener("click",a),document.getElementById("close-role-modal").addEventListener("click",a),document.getElementById("role-modal").addEventListener("click",r=>{r.target.id==="role-modal"&&a()}),Be()}function Be(){const e=document.getElementById("settings-content");e&&(e.innerHTML=`
    <h3 class="text-2xl font-bold text-gray-900">My Profile</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage your personal account details.</p>
    
    <div class="p-6 rounded-lg border border-gray-200 bg-white">
      <form id="profile-form" class="space-y-6">
        <div class="flex items-center space-x-4 pb-6 border-b">
          <div class="relative w-20 h-20 rounded-full group">
            <div id="avatar-preview">
              ${H(p,{sizeClass:"w-20 h-20",textClass:"text-2xl",sharedClasses:"shadow-sm",variant:"gradient",altFallback:"Profile"})}
            </div>
            <label for="avatar-upload" 
              class="absolute inset-0 w-full h-full bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200">
              <i class="fa-solid fa-camera text-white opacity-0 group-hover:opacity-100 text-xl"></i>
            </label>
            <input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg">
            <div id="avatar-spinner" class="absolute inset-0 w-full h-full bg-black bg-opacity-70 rounded-full flex items-center justify-center hidden">
              <i class="fa-solid fa-spinner fa-spin text-white text-xl"></i>
            </div>
          </div>
          <div>
            <h4 class="text-lg font-semibold text-gray-900">${p.full_name||"N/A"}</h4>
            <p class="text-sm text-gray-500">${p.email||"N/A"}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div>
            <label for="full_name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" id="full_name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" value="${p.full_name||""}">
          </div>
          <div>
            <label for="contact_number" class="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input type="text" id="contact_number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" value="${p.contact_number||""}">
          </div>
        </div>
        
        <div class="flex justify-end pt-4">
          <button type="submit" id="save-profile-btn" class="bg-brand-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-accent-hover transition disabled:bg-gray-400">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `,document.getElementById("profile-form").addEventListener("submit",ft),document.getElementById("avatar-upload").addEventListener("change",yt))}function lt(){const e=document.getElementById("settings-content");e&&(e.innerHTML=`
    <h3 class="text-2xl font-bold text-gray-900">Security</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage your account security and password.</p>
    
    <div class="p-6 rounded-lg border border-gray-200 bg-white">
      <h4 class="text-lg font-semibold text-gray-800 mb-3">Change Password</h4>
      <form id="password-form" class="space-y-4">
        <div>
          <label for="new_password" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" id="new_password" class="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" placeholder="••••••••" required>
        </div>
        <div>
          <label for="confirm_password" class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input type="password" id="confirm_password" class="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" placeholder="••••••••" required>
        </div>
        <div class="flex justify-start pt-2">
          <button type="submit" id="save-password-btn" class="bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-900 transition disabled:bg-gray-400">
            Update Password
          </button>
        </div>
      </form>
    </div>
  `,document.getElementById("password-form").addEventListener("submit",xt))}async function nt(){const e=document.getElementById("settings-content");e&&(e.innerHTML=`
    <h3 class="text-2xl font-bold text-gray-900">Billing & Payment Methods</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage the company's payment methods for disbursements.</p>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <div class="p-6 rounded-lg border border-gray-200 bg-white">
          <h4 class="text-lg font-semibold text-gray-800 mb-3">Add New Card</h4>
          <form id="card-form" class="space-y-4">
            <div>
              <label for="card_type" class="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
              <select id="card_type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" required>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
              </select>
            </div>
            <div>
              <label for="last_four" class="block text-sm font-medium text-gray-700 mb-1">Last 4 Digits</label>
              <input type="text" id="last_four" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" placeholder="1234" maxlength="4" required>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="expiry_month" class="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input type="text" id="expiry_month" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" placeholder="MM" maxlength="2" required>
              </div>
              <div>
                <label for="expiry_year" class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input type="text" id="expiry_year" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" placeholder="YYYY" maxlength="4" required>
              </div>
            </div>
            <div class="pt-2">
              <button type="submit" id="save-card-btn" class="w-full bg-brand-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-accent-hover transition disabled:bg-gray-400">
                Add Card
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div id="saved-cards-list" class="lg:col-span-2 p-6 rounded-lg border border-gray-200 bg-white">
        <h4 class="text-lg font-semibold text-gray-800 mb-3">Saved Payment Methods</h4>
        <div class="space-y-3 list-container">
          <div class="p-10 text-center text-gray-500">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
          </div>
        </div>
      </div>
    </div>
  `,document.getElementById("card-form").addEventListener("submit",vt),ke())}async function ke(){const e=document.querySelector("#saved-cards-list .list-container");if(!e)return;const{data:t,error:a}=await Fe();if(a){e.innerHTML=`<p class="text-red-600">Error loading cards: ${a.message}</p>`;return}if(t.length===0){e.innerHTML='<p class="text-sm text-gray-500">No payment methods have been added yet.</p>';return}e.innerHTML=t.map(r=>`
    <div class="p-4 rounded-lg border border-gray-300 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div class="flex items-center">
        ${r.card_type==="visa"?'<i class="fa-brands fa-cc-visa text-4xl text-blue-800"></i>':'<i class="fa-brands fa-cc-mastercard text-4xl text-orange-500"></i>'}
        <div class="ml-4">
          <p class="font-semibold text-gray-900 capitalize">${r.card_type} •••• ${r.last_four}</p>
          <p class="text-xs text-gray-500">Expires ${r.expiry_month}/${r.expiry_year}</p>
        </div>
      </div>
      ${r.is_default?'<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Default</span>':""}
    </div>
  `).join("")}async function Ie(){const e=document.getElementById("settings-content");if(!e)return;e.innerHTML=`
    <h3 class="text-2xl font-bold text-gray-900">User Management</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage roles for all users in the system.</p>
    
    <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div id="user-management-list">
        <div class="p-10 text-center text-gray-500">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
        </div>
      </div>
    </div>
  `;const{data:t,error:a}=await Pe();if(a){e.querySelector("#user-management-list").innerHTML=`<p class="p-4 text-red-600">Error loading users: ${a.message}</p>`;return}se=t;const r=e.querySelector("#user-management-list");r.innerHTML=`
    <ul class="divide-y divide-gray-200">
      ${se.map(o=>`
        <li class="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div class="flex items-center space-x-3">
            ${H(o,{sizeClass:"w-10 h-10",textClass:"text-xs",imageClasses:"border border-gray-200",variant:"primary",altFallback:o.full_name||"User"})}
            <div>
              <p class="text-sm font-semibold text-gray-900">${o.full_name||"N/A"}</p>
              <p class="text-xs text-gray-500">${o.email||"No Email"}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="px-2 py-0.5 text-xs font-medium rounded-full ${Ge(o.role)} capitalize border border-transparent shadow-sm">
              ${o.role.replace("_"," ")}
            </span>
            ${o.id!==p.id?`<button class="change-role-btn text-xs font-semibold text-brand-accent hover:text-brand-accent-hover border border-brand-accent rounded px-3 py-1 hover:bg-orange-50 transition-colors" 
                  data-user-id="${o.id}" 
                  data-user-name="${o.full_name||"User"}" 
                  data-user-role="${o.role}">
                Edit Role
              </button>`:'<span class="text-xs text-gray-400 italic">Current User</span>'}
          </div>
        </li>
      `).join("")}
    </ul>
  `,r.querySelectorAll(".change-role-btn").forEach(o=>{o.addEventListener("click",()=>{document.getElementById("modal-user-id").value=o.dataset.userId,document.getElementById("modal-user-name").textContent=o.dataset.userName,document.getElementById("modal-role-select").value=o.dataset.userRole,document.getElementById("role-modal").classList.remove("hidden")})})}function st(){var W,q,O,G,Y,V,X,J,Z,K,Q,ee,te,ae,re,oe,le,ne;const e=document.getElementById("settings-content");if(!e)return;const t=I.updated_at?new Date(I.updated_at).toLocaleString("en-ZA",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Not saved yet",a=be(s.company_name),r=E(a),o=E(m.company_name),l=s.company_logo_url||"",c=E(l),i=s.auth_background_url||"",f=E(i),b=he(),v=we(),w=E(v),U=!Ee(),T=F();e.innerHTML=`
    <div class="space-y-6">
      <section class="system-card border rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-gray-900">Company Name</h4>
            <p class="text-sm text-gray-500">Used across navbars, auth, exports, and notifications.</p>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Brand</span>
        </div>
        <div class="space-y-2">
          <label for="company-name-input" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Display Name</label>
          <input type="text" id="company-name-input" value="${r}" placeholder="${o}" maxlength="120" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm" />
          <p class="text-xs text-gray-500">Leave blank to use the default brand. This name appears on dashboards, exports, and emails.</p>
        </div>
      </section>

      <div class="flex flex-col lg:flex-row gap-6">
        <section class="system-card border rounded-2xl p-6 flex-1">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-xl font-bold text-gray-900">Brand Palette</h3>
              <p class="text-sm text-gray-500">These three stops generate every CTA, focus state and gradient.</p>
            </div>
            <span class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Live Preview</span>
          </div>
          <div class="space-y-5">
            ${N.map(({key:n,label:y,description:B})=>`
              <div class="flex flex-wrap items-center gap-4" data-color-row="${n}">
                <div class="flex items-center gap-3">
                  <input type="color" data-color-picker="${n}" value="${s[n]}" class="h-12 w-12 rounded-xl border border-gray-200 shadow-inner cursor-pointer">
                  <div>
                    <p class="text-sm font-semibold text-gray-800">${y}</p>
                    <p class="text-xs text-gray-500">${B}</p>
                  </div>
                </div>
                <div class="flex-1 min-w-[180px]">
                  <label class="text-xs font-medium text-gray-500 tracking-wider uppercase">HEX</label>
                  <input type="text" maxlength="7" data-color-input="${n}" value="${s[n]}" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent uppercase" placeholder="#FFFFFF">
                </div>
              </div>
            `).join("")}
          </div>
        </section>

        <section class="system-card border rounded-2xl p-6 w-full lg:w-96">
          <h4 class="text-lg font-semibold text-gray-900">Gradient Preview</h4>
          <p class="text-sm text-gray-500 mb-4">Primary → Secondary → Tertiary</p>
          <div id="brand-gradient-preview" class="h-36 rounded-2xl border border-gray-100 shadow-inner mb-5"></div>
          <div class="settings-card border border-dashed rounded-2xl p-4 space-y-2 text-sm">
            <p class="text-gray-500">Sample button</p>
            <button class="w-full py-3 rounded-xl text-sm font-semibold shadow-lg bg-brand-gradient text-white">Send Funds</button>
            <div class="pt-3 border-t border-gray-100 text-xs flex items-center justify-between text-gray-500">
              <span>${s.primary_color}</span>
              <span>${s.secondary_color}</span>
              <span>${s.tertiary_color}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="system-card border rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-gray-900">Theme Mode</h4>
            <p class="text-sm text-gray-500">Switch between light and dark experiences instantly.</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <button type="button" data-theme-mode="light" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold transition">Light Mode</button>
          <button type="button" data-theme-mode="dark" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold transition">Dark Mode</button>
        </div>
      </section>

      <section class="system-card border rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-gray-900">Company Logo</h4>
            <p class="text-sm text-gray-500">Used on admin + borrower shells and every auth screen.</p>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Nav &amp; Auth</span>
        </div>
        <div class="flex flex-col lg:flex-row gap-6">
          <div class="flex-1 space-y-4">
            <div id="logo-preview-frame" class="h-28 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center px-6 relative overflow-hidden">
              <img id="company-logo-preview" src="${c}" alt="Company logo preview" class="max-h-20 w-auto object-contain ${l?"":"hidden"}">
              <div id="company-logo-empty" class="text-center ${l?"hidden":""}">
                <p class="text-sm font-semibold text-gray-700">No logo on file</p>
                <p class="text-xs text-gray-500">Upload a PNG/JPG/SVG/WEBP to personalize every navbar.</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <input type="file" id="logo-file-input" class="hidden" accept="image/png,image/jpeg,image/svg+xml,image/webp">
              <button type="button" id="logo-upload-btn" class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                Upload Logo
              </button>
              <button type="button" id="remove-logo-btn" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition" ${l?"":"disabled"}>
                Remove
              </button>
            </div>
            <p class="text-xs text-gray-500">Transparent background recommended. Max size 2MB.</p>
          </div>
          <div class="w-full lg:w-80 space-y-3">
            <label for="logo-url-input" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Use hosted logo</label>
            <input type="url" id="logo-url-input" value="${c}" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm" placeholder="https://cdn.yourbrand.com/logo.png">
            <button type="button" id="apply-logo-url" class="w-full px-4 py-2 rounded-xl border border-brand-accent text-brand-accent text-sm font-semibold hover:bg-orange-50 transition">Use Link</button>
            <p class="text-xs text-gray-400">Paste a direct image URL if your logo already lives on a CDN.</p>
          </div>
        </div>
      </section>

      <section class="system-card border rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-gray-900">Auth Wallpaper</h4>
            <p class="text-sm text-gray-500">Swap the login hero with a custom illustration or brand photography.</p>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Auth Experience</span>
        </div>
        <div class="flex flex-col lg:flex-row gap-6">
          <div class="flex-1 space-y-4">
            <div id="auth-bg-preview" class="h-32 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden" style="background-color:#0f172a; background-size:cover; background-position:center; background-image:${i?`url('${f}')`:"none"}; transform: scaleX(${b?"-1":"1"});">
              <div id="auth-bg-empty" class="text-center text-white/80 ${i?"hidden":""}">
                <p class="text-sm font-semibold">No wallpaper selected</p>
                <p class="text-xs text-white/70">Landscape images work best (min 1600px wide).</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <input type="file" id="wallpaper-file-input" class="hidden" accept="image/png,image/jpeg,image/webp">
              <button type="button" id="wallpaper-upload-btn" class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2">
                <i class="fa-solid fa-image"></i>
                Upload Wallpaper
              </button>
              <button type="button" id="remove-wallpaper-btn" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition" ${i?"":"disabled"}>
                Remove
              </button>
            </div>
            <p class="text-xs text-gray-500">PNG/JPG/WEBP up to 6MB. We recommend 16:9 or wider ratios.</p>
            <label class="flex items-center gap-3 text-sm text-gray-700 pt-3 border-t border-gray-100">
              <input type="checkbox" id="wallpaper-flip-toggle" class="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" ${b?"checked":""}>
              <span>Flip wallpaper horizontally</span>
            </label>
            <p class="text-xs text-gray-400 -mt-1">Mirror the hero so subjects face the form if needed.</p>
            <div class="mt-4 border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50">
              <p class="text-sm font-semibold text-gray-900">Overlay Filter</p>
              <p class="text-xs text-gray-500 mb-3">Tint color that sits above the wallpaper on the auth page.</p>
              <div class="flex flex-wrap items-center gap-4">
                <input type="color" id="overlay-color-picker" value="${v}" class="h-12 w-12 rounded-xl border border-gray-200 shadow-inner cursor-pointer">
                <div class="flex-1 min-w-[160px]">
                  <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">HEX</label>
                  <input type="text" id="overlay-color-input" maxlength="7" value="${w}" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent uppercase" placeholder="#EA580C">
                </div>
              </div>
              <label class="flex items-start gap-3 mt-4">
                <input type="checkbox" id="overlay-disable-toggle" class="mt-1 h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" ${U?"checked":""}>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Remove filter overlay</p>
                  <p class="text-xs text-gray-500">Check this to disable the tinted blend entirely and show the raw wallpaper.</p>
                </div>
              </label>
            </div>
          </div>
          <div class="w-full lg:w-80 space-y-3">
            <label for="wallpaper-url-input" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Use hosted wallpaper</label>
            <input type="url" id="wallpaper-url-input" value="${f}" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm" placeholder="https://cdn.yourbrand.com/auth-hero.jpg">
            <button type="button" id="apply-wallpaper-url" class="w-full px-4 py-2 rounded-xl border border-brand-accent text-brand-accent text-sm font-semibold hover:bg-orange-50 transition">Use Link</button>
            <p class="text-xs text-gray-400">Paste a full image URL if the hero is hosted elsewhere.</p>
          </div>
        </div>
      </section>

      <section class="system-card border rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-gray-900">Auth Carousel Copy</h4>
            <p class="text-sm text-gray-500">Update the headline and supporting text for each slide on the login hero.</p>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">Carousel 1-3</span>
        </div>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          ${T.map((n,y)=>`
            <div class="border border-gray-200 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900">Carousel ${y+1}</p>
                  <p class="text-xs text-gray-500">Shown to desktop users in rotation.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wider text-gray-400">Slide ${y+1}</span>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Heading</label>
                <input type="text" value="${E(n.title)}" maxlength="120"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm"
                  data-carousel-index="${y}" data-carousel-field="title" placeholder="Financial Freedom">
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Paragraph</label>
                <textarea rows="3"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm resize-none"
                  data-carousel-index="${y}" data-carousel-field="text" placeholder="Summarize the benefit">${Ye(n.text)}</textarea>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <div class="system-card border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <p id="system-settings-status" class="text-sm font-medium text-gray-800">Theme matches saved configuration</p>
          <p class="text-xs text-gray-500">Last saved: ${t}</p>
        </div>
        <div class="md:ml-auto flex items-center gap-3">
          <button type="button" id="reset-system-settings" class="px-5 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition">Reset to Saved</button>
          <button type="button" id="save-system-settings" class="px-5 py-2 rounded-xl bg-brand-accent text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition">Save Theme</button>
        </div>
      </div>
    </div>
  `,N.forEach(({key:n})=>{const y=document.querySelector(`[data-color-picker="${n}"]`),B=document.querySelector(`[data-color-input="${n}"]`);y==null||y.addEventListener("input",P=>it(n,P.target.value)),B==null||B.addEventListener("change",P=>ct(n,P.target.value))}),(W=document.getElementById("company-name-input"))==null||W.addEventListener("input",dt),document.querySelectorAll("[data-theme-mode]").forEach(n=>{n.addEventListener("click",()=>ut(n.dataset.themeMode))}),(q=document.getElementById("reset-system-settings"))==null||q.addEventListener("click",mt),(O=document.getElementById("save-system-settings"))==null||O.addEventListener("click",gt),(G=document.getElementById("logo-upload-btn"))==null||G.addEventListener("click",()=>{var n;return(n=document.getElementById("logo-file-input"))==null?void 0:n.click()}),(Y=document.getElementById("logo-file-input"))==null||Y.addEventListener("change",Je),(V=document.getElementById("apply-logo-url"))==null||V.addEventListener("click",ce),(X=document.getElementById("logo-url-input"))==null||X.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),ce())}),(J=document.getElementById("remove-logo-btn"))==null||J.addEventListener("click",Ze),(Z=document.getElementById("wallpaper-upload-btn"))==null||Z.addEventListener("click",()=>{var n;return(n=document.getElementById("wallpaper-file-input"))==null?void 0:n.click()}),(K=document.getElementById("wallpaper-file-input"))==null||K.addEventListener("change",Ke),(Q=document.getElementById("apply-wallpaper-url"))==null||Q.addEventListener("click",ue),(ee=document.getElementById("wallpaper-url-input"))==null||ee.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),ue())}),(te=document.getElementById("remove-wallpaper-btn"))==null||te.addEventListener("click",Qe),(ae=document.getElementById("wallpaper-flip-toggle"))==null||ae.addEventListener("change",et),(re=document.getElementById("overlay-color-picker"))==null||re.addEventListener("input",tt),(oe=document.getElementById("overlay-color-input"))==null||oe.addEventListener("change",pe),(le=document.getElementById("overlay-color-input"))==null||le.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),pe(n))}),(ne=document.getElementById("overlay-disable-toggle"))==null||ne.addEventListener("change",at),document.querySelectorAll("[data-carousel-field]").forEach(n=>n.addEventListener("input",pt)),C()}function dt(e){u({company_name:e.target.value||""})}function it(e,t){const a=L(t);a&&u({[e]:a})}function ct(e,t){const a=L(t);if(!a){d("Enter a valid 6-digit hex color (e.g. var(--color-primary))","error"),C();return}u({[e]:a})}function ut(e){!e||s.theme_mode===e||u({theme_mode:e})}function pt(e){const{carouselIndex:t,carouselField:a}=e.target.dataset||{};if(typeof t>"u"||!a)return;const r=Number(t);if(Number.isNaN(r))return;const o=a==="title"?"title":"text",l=F().map(c=>({...c}));l[r]={...l[r],[o]:e.target.value},u({carousel_slides:l})}function mt(){s=g(x),k=!1,$e(),C()}async function gt(){if(_)return;_=!0,R();const{data:e,error:t}=await He(s);t?(console.error("Theme save failed:",t),d(t,"error")):(x=g(e||s),s=g(x),k=!1,I.updated_at=(e==null?void 0:e.updated_at)||new Date().toISOString(),I.updated_by=(e==null?void 0:e.updated_by)||(p==null?void 0:p.id)||null,ge(x),d("Theme updated for all admins.","success")),_=!1,C()}function bt(){const e=document.querySelectorAll(".tab-button");e.forEach(t=>{t.addEventListener("click",()=>{e.forEach(r=>r.classList.remove("active")),t.classList.add("active");const a=t.dataset.tab;a==="profile"?Be():a==="security"?lt():a==="billing"?nt():a==="usermanagement"?Ie():a==="system"&&st()})}),document.getElementById("role-form").addEventListener("submit",ht)}async function ft(e){e.preventDefault();const t=document.getElementById("save-profile-btn");t.disabled=!0,t.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving...';const a={full_name:document.getElementById("full_name").value,contact_number:document.getElementById("contact_number").value},{error:r}=await Me(a);r?d(r.message,"error"):(d("Profile updated successfully!","success"),document.querySelector("#header-container span").textContent=`Hello, ${a.full_name} 👋`,p.full_name=a.full_name,p.contact_number=a.contact_number),t.disabled=!1,t.textContent="Save Changes"}async function yt(e){if(A)return;const t=e.target.files[0];if(!t)return;A=!0;const a=document.getElementById("avatar-spinner");a.classList.remove("hidden");try{const r=t.name.split(".").pop(),o=`${p.id}/${Date.now()}.${r}`,{error:l}=await h.storage.from("avatars").upload(o,t,{cacheControl:"3600",upsert:!0});if(l)throw l;const{data:c}=h.storage.from("avatars").getPublicUrl(o),i=c.publicUrl,{error:f}=await Ne(i);if(f)throw f;await h.auth.updateUser({data:{avatar_url:i}}),p.avatar_url=i;const b=xe(p),v=document.getElementById("avatar-preview");v&&(v.innerHTML=H(p,{sizeClass:"w-20 h-20",textClass:"text-2xl",sharedClasses:"shadow-sm",variant:"gradient",altFallback:"Profile"}));const w=document.querySelector("#header-container img");w&&b&&(w.src=b),d("Profile picture updated!","success")}catch(r){console.error("Avatar upload error:",r),d(r.message,"error")}finally{A=!1,a.classList.add("hidden")}}async function xt(e){e.preventDefault();const t=document.getElementById("save-password-btn"),a=document.getElementById("new_password").value,r=document.getElementById("confirm_password").value;if(a!==r){d("Passwords do not match.","error");return}if(a.length<6){d("Password must be at least 6 characters.","error");return}t.disabled=!0,t.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Updating...';const{error:o}=await h.auth.updateUser({password:a});o?d(o.message,"error"):(d("Password changed successfully!","success"),e.target.reset()),t.disabled=!1,t.textContent="Update Password"}async function vt(e){e.preventDefault();const t=document.getElementById("save-card-btn");t.disabled=!0,t.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Adding...';const a={p_card_type:document.getElementById("card_type").value,p_last_four:document.getElementById("last_four").value,p_expiry_month:document.getElementById("expiry_month").value,p_expiry_year:document.getElementById("expiry_year").value};if(a.p_last_four.length!==4||isNaN(a.p_last_four)){d("Please enter exactly 4 digits.","error"),t.disabled=!1,t.textContent="Add Card";return}const{error:r}=await je(a);r?d(r.message,"error"):(d("Payment method added!","success"),e.target.reset(),ke()),t.disabled=!1,t.textContent="Add Card"}async function ht(e){e.preventDefault();const t=document.getElementById("submit-role-change"),a=document.getElementById("modal-user-id").value,r=document.getElementById("modal-role-select").value;t.disabled=!0,t.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving...';const{error:o}=await Ae(a,r);o?d(o.message,"error"):(d("User role updated successfully!","success"),document.getElementById("role-modal").classList.add("hidden"),Ie()),t.disabled=!1,t.textContent="Save Changes"}document.addEventListener("DOMContentLoaded",async()=>{const e=await Ce();if(!e)return;if(M=e.role,p=e.profile,M==="super_admin")await rt();else{await Se();const a=me();if(a){const r=g(a);x=r,s=g(r)}}const t=document.getElementById("page-title");t&&(t.textContent="Admin Settings"),ot()});
