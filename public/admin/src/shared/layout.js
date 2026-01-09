import { supabase } from '../services/supabaseClient.js';
import { ensureThemeLoaded, getCompanyName, DEFAULT_SYSTEM_SETTINGS } from './theme.js';

const appShell = document.getElementById('app-shell');
let userProfile = null;
let userRole = 'borrower';
const DEFAULT_BRAND_LOGO = 'https://static.wixstatic.com/media/f82622_cde1fbd5680141c5b0fccca81fb92ad6~mv2.png';

const escapeAttr = (value = '') => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ========================================== 
// INITIALIZATION
// ==========================================
export async function initLayout() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('/auth/login.html'); 
    return null; 
  }

  const [roleRes, profileRes, authRes] = await Promise.all([
    supabase.rpc('get_my_role'),
    supabase.rpc('get_my_profile').single(),
    supabase.rpc('is_role_or_higher', { p_min_role: 'base_admin' })
  ]);

  const { data: role, error: roleError } = roleRes;
  const { data: profile, error: profileError } = profileRes;
  const { data: isAllowed, error: authError } = authRes;

  if (roleError || profileError || authError || !isAllowed) {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html'); 
    return null; 
  }

  userProfile = profile;
  userRole = role;

  const theme = await ensureThemeLoaded();
  renderAppShell(profile, role, theme);
  attachEventListeners();
  highlightActiveLink();
  
  // INIT NOTIFICATIONS (Pass profile.id to track "read" status)
  initNotifications(role, profile.id);

  return { profile, role };
}

export function getProfile() { return userProfile; }
export function getRole() { return userRole; }

// ==========================================
// RENDER APP SHELL
// ==========================================
function renderAppShell(profile, role, theme = null) {
  if (!appShell) return;

  const displayName = profile?.full_name || 'Admin';
  const accentHex = theme?.primary_color || 'var(--color-primary)';
  const avatarBg = accentHex.replace('#', '') || 'ea580c';
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.replace(' ', '+'))}&background=${avatarBg}&color=fff`;
  const companyName = getCompanyName(theme) || DEFAULT_SYSTEM_SETTINGS.company_name;
  const customLogo = (theme?.company_logo_url || '').trim();
  const logoSrc = escapeAttr(customLogo || DEFAULT_BRAND_LOGO);
  const logoAlt = escapeAttr(companyName || 'Company');
  const logoMarkup = logoSrc
    ? `<img src="${logoSrc}" alt="${logoAlt}" class="h-12 w-auto object-contain max-w-[200px]">`
    : `<div class="text-xl font-bold text-gray-800">${logoAlt}</div>`;
  
  appShell.innerHTML = `
    <div id="sidebar" class="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-gray-100 border-r border-gray-200 text-gray-600 transition-transform duration-300 ease-in-out md:translate-x-0 -translate-x-full shadow-xl">
      
      <div class="flex items-center justify-center h-24 px-6 border-b border-gray-200 bg-gray-100">
        ${logoMarkup}
      </div>

      <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div class="mb-6">
          <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Overview</p>
          ${renderSidebarNav(role)}
        </div>
      </nav>

      <div class="p-4 border-t border-gray-200 bg-gray-200/50">
        <button id="sign-out-btn" class="sign-out-btn flex items-center w-full p-3 rounded-xl border border-transparent transition-all group hover:bg-brand-accent hover:shadow-lg">
           <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs text-gray-700 font-bold mr-3 shadow-sm">
              ${displayName.charAt(0)}
           </div>
           <div class="flex-1 text-left">
            <p class="text-sm font-bold text-gray-800 transition-colors group-hover:text-white">Sign Out</p>
            <p class="text-[10px] text-gray-500 truncate w-32 transition-colors group-hover:text-white/80">${profile.email || ''}</p>
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
            <p class="text-xs text-gray-500 mt-0.5">Welcome back, <span class="font-medium text-brand-accent">${displayName}</span></p>
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
             <img src="${avatarUrl}" class="w-10 h-10 rounded-full border-2 shadow-sm" style="border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);" alt="Profile">
          </div>
        </div>
      </header>
      
      <main id="main-content" class="flex-1 p-8 relative z-10">
        </main>
    </div>
  `;
}

// ==========================================
// RENDER NAV LINKS
// ==========================================
function renderSidebarNav(role) {
  const isBaseAdmin = (role === 'base_admin' || role === 'admin' || role === 'super_admin');
  const isAdmin = (role === 'admin' || role === 'super_admin');
  const isSuperAdmin = (role === 'super_admin');

  const linkBase = "nav-link flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-1 group";
  const linkInactive = "text-gray-600 hover:bg-white hover:text-brand-accent hover:shadow-sm";
  
  return `
    <ul class="space-y-1">
      ${isBaseAdmin ? `
        <li>
            <a href="/admin/dashboard" class="${linkBase} ${linkInactive}">
                <i class="fa-solid fa-chart-line w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Dashboard
            </a>
        </li>
        
        <li>
          <button type="button" id="analytics-toggle" class="w-full flex items-center justify-between ${linkBase} ${linkInactive}">
            <span class="flex items-center"><i class="fa-solid fa-chart-pie w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Analytics</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>
          </button>
          <ul id="analytics-submenu" class="hidden pl-4 space-y-1 mt-1">
            <li><a href="/admin/analytics.html" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Customer Analytics</a></li>
            <li><a href="/admin/financials.html" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Financials</a></li>
          </ul>
        </li>

        <li>
            <a href="/admin/applications" class="${linkBase} ${linkInactive}">
                <i class="fa-solid fa-file-signature w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Applications
            </a>
        </li>
      ` : ''}
      
      ${isAdmin ? `
        <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">Finance</p>
        <li><a href="/admin/users" class="${linkBase} ${linkInactive}"><i class="fa-solid fa-users w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Customers</a></li>
        
        <li>
          <button type="button" id="payments-toggle" class="w-full flex items-center justify-between ${linkBase} ${linkInactive}">
            <span class="flex items-center"><i class="fa-solid fa-coins w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Payments</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>
          </button>
          <ul id="payments-submenu" class="hidden pl-4 space-y-1 mt-1">
            <li><a href="/admin/incoming-payments" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Incoming</a></li>
            <li><a href="/admin/outgoing-payments" class="block px-4 py-2 text-sm text-gray-500 hover:text-brand-accent border-l-2 border-gray-200 ml-4 hover:border-tertiary transition-all">Outgoing</a></li>
          </ul>
        </li>
      ` : ''}
      
      ${isSuperAdmin ? `
        <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">System</p>
        <li><a href="/admin/settings" class="${linkBase} ${linkInactive}"><i class="fa-solid fa-sliders w-5 h-5 mr-3 sidebar-nav-icon transition-colors"></i>Config</a></li>
      ` : ''}
    </ul>
  `;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function attachEventListeners() {
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/auth/login.html';
    });
  }

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      sidebarOverlay?.classList.toggle('hidden');
    });
    sidebarOverlay?.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
    });
  }

  const setupDropdown = (toggleId, menuId) => {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('hidden');
            toggle.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
        });
    }
  };
  setupDropdown('payments-toggle', 'payments-submenu');
  setupDropdown('analytics-toggle', 'analytics-submenu');

  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  if(notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          notifDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
          if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
              notifDropdown.classList.add('hidden');
          }
      });
  }
}

// ==========================================
// ACTIVE LINK HIGHLIGHTING
// ==========================================
function highlightActiveLink() {
  const currentPage = window.location.pathname;
  const navLinks = document.querySelectorAll('a'); 
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.remove('text-gray-600', 'hover:bg-white', 'hover:text-brand-accent');
      
      if (link.parentElement.parentElement.id === 'payments-submenu' || link.parentElement.parentElement.id === 'analytics-submenu') {
        // Submenu Active State
        link.classList.add('text-brand-accent', 'font-bold', 'border-brand-accent', 'bg-white');
        link.classList.remove('text-gray-500', 'border-gray-200');
        
        const parentSubmenu = link.parentElement.parentElement;
        parentSubmenu.classList.remove('hidden');
      } else {
        // Main Link Active State
        link.classList.add('bg-brand-accent', 'text-white', 'shadow-md');
        link.style.boxShadow = '0 15px 35px -20px var(--color-shadow)';
        const icon = link.querySelector('i');
        if (icon) {
          icon.classList.remove('sidebar-nav-icon');
          icon.classList.add('text-white');
        }
      }
    }
  });
}

// ==========================================
// NOTIFICATION SYSTEM (PERSONALIZED)
// ==========================================
async function initNotifications(role, userId) {
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');
    const markAllReadBtn = document.getElementById('mark-all-read');

    const targetRole = (role === 'base_admin') ? 'base_admin' : 'admin';

    const fetchNotifications = async () => {
        // Fetch last 20 notifications for this role
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('target_role', targetRole)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            // Filter out notifications where current User ID is already in 'read_by'
            // 'read_by' defaults to empty array in DB, but might be null in JS if not set
            const unreadNotifications = data.filter(n => {
                const readers = n.read_by || [];
                return !readers.includes(userId);
            });
            updateNotifUI(unreadNotifications);
        }
    };

    const updateNotifUI = (notifications) => {
        // Badge Visibility
        if (notifications.length > 0) {
            notifBadge.classList.remove('hidden');
        } else {
            notifBadge.classList.add('hidden');
        }

        // List Content
        if (notifications.length === 0) {
          notifList.innerHTML = `<div class="p-6 text-center text-gray-400 text-xs">No new notifications</div>`;
          return;
        }

        notifList.innerHTML = notifications.map(n => `
            <div class="p-3 border-b border-gray-100 hover-brand-sheen transition-colors cursor-pointer relative group">
                <a href="${n.link}" class="block">
                    <p class="text-xs font-bold text-gray-800 mb-0.5">${n.title}</p>
                    <p class="text-[10px] text-gray-500 leading-tight">${n.message}</p>
                    <p class="text-[9px] text-gray-400 mt-1 text-right">${new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </a>
            </div>
        `).join('');
    };

    // 1. Initial Fetch
    await fetchNotifications();

    // 2. Realtime Subscription...
  supabase
    .channel('admin_notif_channel')
    .on(
      'postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'admin_notifications', filter: `target_role=eq.${targetRole}` },
      (payload) => {
        fetchNotifications(); 
      }
    )
    .subscribe();

    // 3. Mark All Read (Personalized)
    if(markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            // Call the RPC to append MY user ID to the read_by array
            const { error } = await supabase.rpc('mark_notifications_read', {
                p_target_role: targetRole
            });
            
            if(!error) fetchNotifications();
        });
    }
}