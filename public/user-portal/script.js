// Handles page switching
// Main Dashboard Script

const NAV_SEARCH_ITEMS = [
  { label: 'Dashboard', page: 'dashboard', keywords: ['home', 'overview', 'metrics'] },
  { label: 'Apply Loan', page: 'apply-loan', keywords: ['documents', 'upload', 'kyc'] },
  { label: 'Apply Loan - Offers', page: 'apply-loan-2', keywords: ['credit', 'offer', 'summary'] },
  { label: 'Apply Loan - Config', page: 'apply-loan-3', keywords: ['loan config', 'terms', 'offer builder'] },
  { label: 'Confirmation', page: 'confirmation', keywords: ['bank', 'payout', 'final'] },
  { label: 'Payments', page: 'documents', keywords: ['transactions', 'payments', 'bank accounts'] },
  { label: 'Transcripts', page: 'transcripts', keywords: ['credit report', 'history', 'documents'] },
  { label: 'Notifications', page: 'notifications', keywords: ['alerts', 'messages'] },
  { label: 'Support', page: 'support', keywords: ['help', 'contact'] },
  { label: 'Loan Calculator', page: 'loan-calculator', keywords: ['calculator', 'estimate'] }
];

let navSearchMatches = [];
let navSearchActiveIndex = -1;
let globalUserProfile = null;
const DEFAULT_BRAND_LOGO = 'https://static.wixstatic.com/media/f82622_cde1fbd5680141c5b0fccca81fb92ad6~mv2.png';
const FALLBACK_SYSTEM_THEME = {
  primary_color: '#E7762E',
  secondary_color: '#F97316',
  tertiary_color: '#FACC15',
  theme_mode: 'light',
  company_logo_url: null
};
const SYSTEM_THEME_CACHE_MS = 5 * 60 * 1000;
let cachedSystemTheme = null;
let systemThemeFetchedAt = 0;
let systemThemePromise = null;

// Measure the navbar height and expose it as a CSS variable so sticky headers
// can position themselves directly beneath the navbar on all screen sizes.
function setNavbarOffset() {
  try {
    const navbar = document.getElementById('navbar');
    const isMobile = window.innerWidth <= 768;

    // Only apply navbar offset on mobile; on desktop we keep it 0 to avoid extra top padding
    const navbarOffset = (isMobile && navbar) ? (navbar.offsetHeight || 64) : 0;
    document.documentElement.style.setProperty('--navbar-offset', `${navbarOffset}px`);

    // Measure dashboard header (if present) so we can account for its height on mobile
    const header = document.querySelector('#main-content .dashboard-header');
    // Use getBoundingClientRect for a more accurate height (includes transforms)
    const headerOffset = (isMobile && header) ? (Math.ceil(header.getBoundingClientRect().height) || 56) : 0;
    document.documentElement.style.setProperty('--dashboard-header-offset', `${headerOffset}px`);

    // Small extra offset to ensure the top of the first card is fully visible on mobile
    // Increase to 24px to reduce chance of clipping across devices
    const extraOffset = isMobile ? 24 : 0;
    document.documentElement.style.setProperty('--dashboard-extra-offset', `${extraOffset}px`);

    // Also update dashboard container inline padding so the first card is visible immediately
    const dashContainer = document.querySelector('#main-content .dashboard-container');
    if (dashContainer) dashContainer.style.paddingTop = `calc(1rem + ${navbarOffset}px + ${headerOffset}px + ${extraOffset}px)`;
  } catch (err) {
    console.warn('setNavbarOffset error', err);
  }
}

// Initialize observers to watch navbar and dashboard header for size/content changes
function initOffsetObservers() {
  try {
    const navbar = document.getElementById('navbar');
    const header = document.querySelector('#main-content .dashboard-header');

    // Debounced runner
    function scheduleRecalc() {
      if (window.__setNavbarOffsetTimeout) clearTimeout(window.__setNavbarOffsetTimeout);
      window.__setNavbarOffsetTimeout = setTimeout(() => setNavbarOffset(), 60);
    }

    // Use ResizeObserver when available to watch for element size changes
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => scheduleRecalc());
      if (navbar) ro.observe(navbar);
      if (header) ro.observe(header);
      // store for potential cleanup
      window.__zw_ro = ro;
    }

    // Also use MutationObserver to catch content changes that can affect height
    if (header && window.MutationObserver) {
      const mo = new MutationObserver(() => scheduleRecalc());
      mo.observe(header, { childList: true, subtree: true, characterData: true });
      window.__zw_mo = mo;
    }
  } catch (err) {
    console.warn('initOffsetObservers error', err);
  }
}

async function getSystemTheme(force = false) {
  const now = Date.now();
  const isCacheFresh = !force && cachedSystemTheme && (now - systemThemeFetchedAt) < SYSTEM_THEME_CACHE_MS;
  if (isCacheFresh) return cachedSystemTheme;

  if (!force && systemThemePromise) return systemThemePromise;

  systemThemePromise = (async () => {
    try {
      const response = await fetch('/api/system-settings');
      if (!response.ok) throw new Error(`Theme fetch failed (${response.status})`);
      const payload = await response.json();
      const normalized = { ...FALLBACK_SYSTEM_THEME, ...(payload?.data || payload || {}) };
      cachedSystemTheme = normalized;
      systemThemeFetchedAt = now;
      return normalized;
    } catch (error) {
      console.warn('System theme request failed:', error.message || error);
      if (!cachedSystemTheme) {
        cachedSystemTheme = { ...FALLBACK_SYSTEM_THEME };
      }
      return cachedSystemTheme;
    } finally {
      systemThemePromise = null;
    }
  })();

  return systemThemePromise;
}

function applyBrandLogo(theme) {
  const desiredLogo = (theme?.company_logo_url || '').trim() || DEFAULT_BRAND_LOGO;
  const targets = document.querySelectorAll('[data-brand-logo]');
  targets.forEach((target) => {
    if (target.tagName === 'IMG') {
      if (target.src !== desiredLogo) {
        target.src = desiredLogo;
      }
      target.onload = () => target.classList.remove('hidden');
      target.onerror = () => {
        target.src = DEFAULT_BRAND_LOGO;
      };
    } else {
      target.style.backgroundImage = `url('${desiredLogo}')`;
    }
  });
}

async function hydrateBranding() {
  try {
    const theme = await getSystemTheme();
    applyBrandLogo(theme);
  } catch (error) {
    console.warn('Branding hydration error:', error);
    applyBrandLogo(FALLBACK_SYSTEM_THEME);
  }
}

// Periodic session validation (every 2 minutes)
// Catches edge cases where auth state change doesn't fire
setInterval(async () => {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('🔒 Session validation failed - redirecting to login');
      window.location.replace('/auth/login.html');
    }
  } catch (err) {
    console.error('Session check error:', err);
  }
}, 2 * 60 * 1000); // Every 2 minutes

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const userProfile = await checkAuth();
  
  // Store profile globally
  globalUserProfile = userProfile;
  
  // PROFILE COMPLETION GUARD: Redirect immediately if incomplete
  if (userProfile && !userProfile.isProfileComplete) {
    const currentPage = getPageFromURL() || 'dashboard';
    if (currentPage !== 'profile') {
      console.log('⚠️ Profile incomplete - redirecting to profile page');
      window.location.replace('/user-portal/?page=profile');
      return; // Stop execution to prevent loading other pages
    }
  }
  
  // Load navbar and sidebar
  await loadNavbar();
  // apply offset once navbar is rendered
  setNavbarOffset();
  await loadSidebar();
  // re-apply offset after sidebar (layout) has been added
  setNavbarOffset();
  
  // Populate user info in dropdown
  if (userProfile) {
    populateUserDropdown(userProfile);
  }

  // Get initial page from URL or default to dashboard
  const initialPage = getPageFromURL() || 'dashboard';
  await loadPage(initialPage);
  // ensure offsets are applied after the page content is loaded
  setNavbarOffset();

  // Setup navigation listeners
  setupNavigation();

  // Setup notification button
  setupNotificationButton();

  // Setup account dropdown
  setupAccountDropdown();

  // Setup notification dropdown
  setupNotificationDropdown();

  // Keep the CSS variable updated when the viewport changes
  window.addEventListener('resize', setNavbarOffset);

  // Observe navbar/header size changes and keep offsets in sync
  initOffsetObservers();

  // Logout button is setup in loadSidebar() after sidebar loads
});

/**
 * Check if user is authenticated and has borrower role
 * ============================================
 * AUTH GUARD: Protects user portal from unauthorized access
 * Only borrower role can access this portal
 * ============================================
 */
async function checkAuth() {
  const { supabase } = await import('/Services/supabaseClient.js');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('⛔ No session - redirecting to login');
    window.location.replace('/auth/login.html');
    return null;
  }
  
  // Check if user has borrower role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  if (!profile || profile.role !== 'borrower') {
    console.log('⛔ Access denied. Not a borrower. Role:', profile?.role);
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
    return null;
  }
  
  console.log('✅ Access granted for borrower:', profile.full_name);
  
  // Check if financial profile and declarations are complete
  const { data: financialProfile } = await supabase
    .from('financial_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();
  
  const { data: declarations } = await supabase
    .from('declarations')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle();
  
  profile.hasFinancialProfile = !!financialProfile && financialProfile.monthly_income > 0;
  profile.hasDeclarations = !!declarations && declarations.accepted_std_conditions === true;
  profile.isProfileComplete = profile.hasFinancialProfile && profile.hasDeclarations;
  
  console.log('📊 Profile completion:', {
    financial: profile.hasFinancialProfile,
    declarations: profile.hasDeclarations,
    complete: profile.isProfileComplete
  });
  
  return profile;
}

/**
 * Load navbar component
 */
async function loadNavbar() {
  try {
    const response = await fetch('/user-portal/layouts/navbar.html');
    const html = await response.text();
    document.getElementById('navbar').innerHTML = html;
    setupNavbarSearch();
    hydrateBranding();
  } catch (error) {
    console.error('Error loading navbar:', error);
  }
}

/**
 * Load sidebar component
 */
async function loadSidebar() {
  try {
    const response = await fetch('/user-portal/layouts/sidebar.html');
    const html = await response.text();
    document.getElementById('sidebar').innerHTML = html;
    hydrateBranding();
    
    // Setup logout button after sidebar is loaded
    setupLogout();
    
    // Setup mobile nav controls after both navbar and sidebar are loaded
    setupMobileNavControls();
    
    // Lock sidebar if profile incomplete
    if (globalUserProfile && !globalUserProfile.isProfileComplete) {
      lockSidebar();
    }
  } catch (error) {
    console.error('Error loading sidebar:', error);
  }
}

/**
 * Load page content dynamically
 */
async function loadPage(pageName) {
  try {
    // Profile completion guard - redirect to profile if incomplete
    if (globalUserProfile && !globalUserProfile.isProfileComplete && pageName !== 'profile') {
      console.log('🚫 Navigation blocked - profile completion required');
      showProfileIncompleteToast();
      // Force redirect to profile page
      window.history.replaceState({}, '', '/user-portal/?page=profile');
      pageName = 'profile';
    }
    
    // Phone number guard - block navigation if phone missing
    if (globalUserProfile && globalUserProfile.needsPhoneNumber && pageName !== 'profile') {
      console.log('🚫 Navigation blocked - phone number required');
      showPhoneNumberRequiredToast();
      return;
    }
    
    showLoading(true);

    // Load HTML
    const htmlResponse = await fetch(`/user-portal/pages/${pageName}.html`);
    if (!htmlResponse.ok) throw new Error(`Page not found: ${pageName}`);
    const htmlContent = await htmlResponse.text();


    // Load CSS with error handling
    const oldCss = document.getElementById('page-specific-css');
    if (oldCss) {
      oldCss.remove();
    }

    let cssPageName = pageName;
    if (pageName.startsWith('apply-loan-')) {
      cssPageName = 'apply-loan';
    }
    const cssUrl = `/user-portal/pages-css/${cssPageName}.css`;

    try {
      const cssResponse = await fetchWithTimeout(cssUrl, 2000);
      if (cssResponse.ok) {
        const link = document.createElement('link');
        link.id = 'page-specific-css';
        link.rel = 'stylesheet';
        link.href = `${cssUrl}?t=${Date.now()}`; // Cache-busting
        document.head.appendChild(link);
      } else {
         console.warn(`CSS for ${pageName} not found.`);
      }
    } catch (e) {
      console.warn(`Could not fetch CSS for ${pageName}.`);
    }

    // Insert HTML into main content
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = htmlContent;
    mainContent.classList.add('fade-in');

    // Recalculate offsets now that page HTML is present
    setNavbarOffset();
    // Re-init observers so newly-inserted elements (like dashboard header)
    // are observed for size/content changes. This prevents stale offsets
    // when navigating to the dashboard without a full page refresh.
    if (typeof initOffsetObservers === 'function') initOffsetObservers();

    const scriptLoaded = await loadPageScript(pageName);
    if (!scriptLoaded) {
      console.warn(`JS for ${pageName} not found or failed to load.`);
    }

    // Dispatch custom event for page load - allows pages to re-initialize
    document.dispatchEvent(new CustomEvent('pageLoaded', { detail: { pageName } }));
    window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { pageName } }));
    
    console.log('📄 Page loaded:', pageName);
    
    // Special handling for dashboard - always reload data
    if (pageName === 'dashboard') {
      console.log('🔄 Dashboard loaded - fetching fresh data...');
      // Wait a bit for the script to be loaded and parsed
      setTimeout(() => {
        if (typeof loadDashboardData === 'function') {
          loadDashboardData();
        }
      }, 100);
    }

    // Special handling for apply-loan - load document upload module scripts
    if (pageName === 'apply-loan') {
      console.log('📄 Loading document upload module scripts...');
      // Wait for page script to load and initialize first
      await new Promise(resolve => setTimeout(resolve, 150));
      const modules = ['tillslip', 'bankstatement', 'idcard'];
      for (const module of modules) {
        try {
          await import(`/user-portal/modules-js/${module}.js?t=${Date.now()}`);
          console.log(`✅ ${module} module loaded`);
        } catch (error) {
          console.error(`❌ Failed to load ${module} module:`, error);
        }
      }
    }

    // Special handling for apply-loan-2 - load credit check module script
    if (pageName === 'apply-loan-2') {
      console.log('💳 Loading credit check module script...');
      try {
        const scriptUrl = `/user-portal/modules-js/credit-check.js?t=${Date.now()}`;
        fetch(scriptUrl)
          .then(response => response.text())
          .then(scriptContent => {
            const script = document.createElement('script');
            script.textContent = scriptContent;
            document.body.appendChild(script);
            console.log('✅ Credit check module script loaded');
          })
          .catch(error => console.error('❌ Failed to load credit check script:', error));
      } catch (e) {
        console.error('❌ Error loading credit check module:', e);
      }
    }

    // Special handling for apply-loan-3 - load loan config module script
    if (pageName === 'apply-loan-3') {
      console.log('💰 Loading loan config module script...');
      try {
        const scriptUrl = `/user-portal/modules-js/loan-config.js?t=${Date.now()}`;
        fetch(scriptUrl)
          .then(response => response.text())
          .then(scriptContent => {
            const script = document.createElement('script');
            script.textContent = scriptContent;
            document.body.appendChild(script);
            console.log('✅ Loan config module script loaded');
          })
          .catch(error => console.error('❌ Failed to load loan config script:', error));
      } catch (e) {
        console.error('❌ Error loading loan config module:', e);
      }
    }

    // Update active nav link
    updateActiveNavLink(pageName);

    // Update URL
    window.history.pushState({ page: pageName }, '', `/user-portal/?page=${pageName}`);

    showLoading(false);
  } catch (error) {
    console.error('Error loading page:', error);
    showLoading(false);
    document.getElementById('main-content').innerHTML = `
      <div class="page-content">
        <div class="card">
          <h2>⚠ Error Loading Page</h2>
          <p>Sorry, we couldn't load the page you requested. Please try again.</p>
        </div>
      </div>
    `;
  }
}

async function loadPageScript(pageName) {
  return new Promise((resolve) => {
    const existingScript = document.getElementById('page-specific-js');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'page-specific-js';
    script.type = 'module';
    script.src = `/user-portal/pages-js/${pageName}.js?t=${Date.now()}`;
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

async function fetchWithTimeout(resource, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(resource, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Setup navigation click listeners
 */
function setupNavigation() {
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
      e.preventDefault();
      const pageName = navLink.dataset.page;
      loadPage(pageName);
    }
  });
}

function setupNavbarSearch() {
  const input = document.getElementById('navbarSearchInput');
  const button = document.getElementById('navbarSearchButton');
  const dropdown = document.getElementById('navbarSearchResults');

  if (!input) {
    return;
  }

  const submitSearch = () => {
    const query = input.value.trim();
    if (!query) {
      showNavbarSearchFeedback('Type to search');
      return;
    }

    const handled = handleNavbarSearch(query);
    if (!handled) {
      showNavbarSearchFeedback('No matches found');
    }
    closeNavbarSearchDropdown();
  };

  if (!input.dataset.bound) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (navSearchActiveIndex >= 0 && navSearchMatches[navSearchActiveIndex]) {
          navigateToPage(navSearchMatches[navSearchActiveIndex].page);
          closeNavbarSearchDropdown();
        } else {
          submitSearch();
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        highlightNavbarSearchResult(navSearchActiveIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        highlightNavbarSearchResult(navSearchActiveIndex - 1);
      } else if (event.key === 'Escape') {
        closeNavbarSearchDropdown();
      }
    });
    input.addEventListener('input', (event) => {
      updateNavbarSearchDropdown(event.target.value);
    });
    input.addEventListener('focus', (event) => {
      updateNavbarSearchDropdown(event.target.value);
    });
    input.dataset.bound = 'true';
  }

  if (button && !button.dataset.bound) {
    button.addEventListener('click', submitSearch);
    button.dataset.bound = 'true';
  }

  if (dropdown && !dropdown.dataset.bound) {
    dropdown.addEventListener('mousedown', (event) => {
      const item = event.target.closest('[data-search-index]');
      if (!item) {
        return;
      }
      event.preventDefault();
      const index = Number(item.dataset.searchIndex);
      const match = navSearchMatches[index];
      if (match) {
        navigateToPage(match.page);
        closeNavbarSearchDropdown();
      }
    });
    dropdown.dataset.bound = 'true';
  }

  if (!document.body.dataset.navSearchListener) {
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.navbar-search')) {
        closeNavbarSearchDropdown();
      }
    });
    document.body.dataset.navSearchListener = 'true';
  }
}

function handleNavbarSearch(query) {
  const normalized = query.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  NAV_SEARCH_ITEMS.forEach((item) => {
    const label = item.label.toLowerCase();
    let score = 0;

    if (label === normalized) {
      score = 4;
    } else if (label.startsWith(normalized)) {
      score = 3;
    } else if (label.includes(normalized)) {
      score = 2;
    } else if (item.keywords?.some((kw) => kw.includes(normalized))) {
      score = 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  if (!bestMatch) {
    return false;
  }

  navigateToPage(bestMatch.page);
  return true;
}

function navigateToPage(pageName) {
  if (typeof loadPage === 'function') {
    loadPage(pageName);
  } else {
    window.location.href = `/user-portal/?page=${pageName}`;
  }
}

function showNavbarSearchFeedback(message) {
  const input = document.getElementById('navbarSearchInput');
  if (!input) {
    return;
  }

  const originalPlaceholder = input.getAttribute('data-placeholder') || input.placeholder;
  input.setAttribute('data-placeholder', originalPlaceholder);
  input.value = '';
  input.placeholder = message;
  input.classList.add('search-feedback');

  setTimeout(() => {
    input.placeholder = originalPlaceholder;
    input.classList.remove('search-feedback');
  }, 2000);
}

function updateNavbarSearchDropdown(query = '') {
  const dropdown = document.getElementById('navbarSearchResults');
  if (!dropdown) {
    return;
  }

  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    navSearchMatches = NAV_SEARCH_ITEMS.slice(0, 5);
  } else {
    navSearchMatches = NAV_SEARCH_ITEMS
      .map((item) => ({
        ...item,
        score: getNavbarSearchScore(item, normalized)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  navSearchActiveIndex = navSearchMatches.length > 0 ? 0 : -1;
  renderNavbarSearchDropdown();
}

function getNavbarSearchScore(item, normalizedQuery) {
  const label = item.label.toLowerCase();
  const keywords = (item.keywords || []).map((kw) => kw.toLowerCase());

  if (label === normalizedQuery) return 5;
  if (label.startsWith(normalizedQuery)) return 4;
  if (label.includes(normalizedQuery)) return 3;
  if (keywords.some((kw) => kw === normalizedQuery)) return 2;
  if (keywords.some((kw) => kw.includes(normalizedQuery))) return 1;
  return 0;
}

function renderNavbarSearchDropdown() {
  const dropdown = document.getElementById('navbarSearchResults');
  if (!dropdown) {
    return;
  }

  if (!navSearchMatches || navSearchMatches.length === 0) {
    dropdown.innerHTML = '';
    dropdown.classList.add('hidden');
    return;
  }

  dropdown.innerHTML = navSearchMatches
    .map((item, index) => {
      const keywords = item.keywords?.slice(0, 2).join(', ');
      const meta = keywords ? `${item.page} · ${keywords}` : item.page;
      return `
        <div class="search-result-item ${index === navSearchActiveIndex ? 'active' : ''}" data-search-index="${index}" role="option">
          <span class="search-result-label">${item.label}</span>
          <span class="search-result-meta">${meta}</span>
        </div>
      `;
    })
    .join('');

  dropdown.classList.remove('hidden');
}

function highlightNavbarSearchResult(newIndex) {
  if (!navSearchMatches || navSearchMatches.length === 0) {
    return;
  }

  if (newIndex < 0) {
    newIndex = navSearchMatches.length - 1;
  } else if (newIndex >= navSearchMatches.length) {
    newIndex = 0;
  }

  navSearchActiveIndex = newIndex;
  renderNavbarSearchDropdown();
}

function closeNavbarSearchDropdown() {
  const dropdown = document.getElementById('navbarSearchResults');
  if (!dropdown) {
    return;
  }
  dropdown.classList.add('hidden');
  dropdown.innerHTML = '';
  navSearchMatches = [];
  navSearchActiveIndex = -1;
}

/**
 * Update active nav link styling
 */
function updateActiveNavLink(pageName) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
}

/**
 * Get page name from URL
 */
function getPageFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('page');
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {}

/**
 * Setup notification button (placeholder - actual functionality in setupNotificationDropdown)
 */
function setupNotificationButton() {
  // Notification functionality is handled by setupNotificationDropdown
  // This function is kept for backward compatibility
}

/**
 * Populate user dropdown with profile data
 */
function populateUserDropdown(profile) {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userInitials = document.getElementById('userInitials');
  
  if (userName && profile.full_name) {
    userName.textContent = profile.full_name;
  }
  
  if (userEmail && profile.email) {
    userEmail.textContent = profile.email;
  }
  
  if (userInitials && profile.full_name) {
    const names = profile.full_name.split(' ');
    const initials = names.length > 1 
      ? names[0][0] + names[names.length - 1][0]
      : names[0][0];
    userInitials.textContent = initials.toUpperCase();
  }
}

/**
 * Setup account dropdown toggle
 */
function setupAccountDropdown() {
  const accountToggle = document.getElementById('accountToggle');
  const accountDropdown = document.getElementById('accountDropdown');
  
  if (accountToggle && accountDropdown) {
    accountToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      accountDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!accountToggle.contains(e.target) && !accountDropdown.contains(e.target)) {
        accountDropdown.classList.remove('active');
      }
    });
    
    // Setup logout from dropdown
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
    if (logoutDropdownBtn) {
      logoutDropdownBtn.addEventListener('click', async () => {
        // Show signing out toast
        showToast('Signing Out', 'Please wait while we sign you out...', 'info', 2000);
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        try {
          const { supabase } = await import('/Services/supabaseClient.js');
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            showToast('Error', 'Failed to sign out. Please try again.', 'warning', 3000);
            console.error('Sign out error:', error);
            return;
          }
          
          // Show success toast
          showToast('Goodbye! 👋', 'You have been signed out successfully.', 'success', 2000);
          
          // Redirect after toast
          setTimeout(() => {
            window.location.href = '/auth/login.html';
          }, 1500);
          
        } catch (err) {
          console.error('Logout error:', err);
          showToast('Error', 'Something went wrong. Please try again.', 'warning', 3000);
        }
      });
    }
  }
}

/**
 * Setup notification dropdown toggle
 */
function setupNotificationDropdown() {
  const notificationBtn = document.querySelector('.notification-btn');
  const notificationDropdown = document.querySelector('.notification-dropdown');
  
  if (notificationBtn && notificationDropdown) {
    // Load notifications on first click
    let notificationsLoaded = false;
    
    notificationBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (!notificationsLoaded) {
        await loadNotifications();
        notificationsLoaded = true;
      }
      
      notificationDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
        notificationDropdown.classList.remove('active');
      }
    });
    
    // Mark all as read functionality
    const markAllReadBtn = document.querySelector('.mark-all-read-btn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const { markAllAsRead } = await import('/Services/notificationService.js');
        await markAllAsRead();
        
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => item.classList.remove('unread'));
        
        // Update badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
      });
    }
  }
  
  // Load initial unread count
  loadUnreadCount();
  
  // Setup real-time notification updates
  setupRealtimeNotifications();
}

/**
 * Load notifications from database
 */
async function loadNotifications() {
  const { fetchUserNotifications } = await import('/Services/notificationService.js');
  const { data: notifications } = await fetchUserNotifications(20);
  
  const notificationBody = document.querySelector('.notification-dropdown-body');
  if (!notificationBody) return;
  
  if (!notifications || notifications.length === 0) {
    notificationBody.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: rgba(255, 255, 255, 0.5);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 12px; opacity: 0.3;">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <p>No notifications yet</p>
      </div>
    `;
    return;
  }
  
  notificationBody.innerHTML = notifications.map(notif => {
    const timeAgo = getTimeAgo(new Date(notif.created_at));
    const iconType = getNotificationIconType(notif.type);
    
    return `
      <div class="notification-item ${!notif.is_read ? 'unread' : ''}" data-id="${notif.id}">
        <div class="notification-icon ${iconType}">
          ${getNotificationIcon(iconType)}
        </div>
        <div class="notification-content">
          <p class="notification-text">${notif.message}</p>
          <span class="notification-time">${timeAgo}</span>
        </div>
        <button class="notification-close-btn" data-id="${notif.id}" title="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Add click handlers to mark as read
  notificationBody.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      // Don't mark as read if clicking the close button
      if (e.target.closest('.notification-close-btn')) return;
      
      const notifId = item.dataset.id;
      if (item.classList.contains('unread')) {
        const { markAsRead } = await import('/Services/notificationService.js');
        await markAsRead(notifId);
        item.classList.remove('unread');
        await loadUnreadCount();
      }
    });
  });
  
  // Add click handlers to close buttons
  notificationBody.querySelectorAll('.notification-close-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const notifId = btn.dataset.id;
      const notifItem = btn.closest('.notification-item');
      
      // Fade out animation
      notifItem.style.opacity = '0';
      notifItem.style.transform = 'translateX(20px)';
      
      setTimeout(async () => {
        const { deleteNotification } = await import('/Services/notificationService.js');
        await deleteNotification(notifId);
        notifItem.remove();
        await loadUnreadCount();
        
        // Check if no notifications left
        const remainingNotifs = notificationBody.querySelectorAll('.notification-item');
        if (remainingNotifs.length === 0) {
          notificationBody.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: rgba(255, 255, 255, 0.5);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 12px; opacity: 0.3;">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <p>No notifications yet</p>
            </div>
          `;
        }
      }, 300);
    });
  });
}

/**
 * Load unread notification count
 */
async function loadUnreadCount() {
  const { getUnreadCount } = await import('/Services/notificationService.js');
  const { count } = await getUnreadCount();
  
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Setup real-time notification updates
 */
async function setupRealtimeNotifications() {
  const { supabase } = await import('/Services/supabaseClient.js');
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('⚠️ Cannot setup real-time notifications: No user session');
    return;
  }
  
  console.log('🔌 Setting up real-time notifications for user:', user.id);
  
  // Subscribe to new notifications with multiple events
  const channel = supabase
    .channel('user-notifications-' + user.id)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE) and respond to them
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('🔔 Real-time notification event:', payload.eventType, payload);
        
        // Always update the unread count
        loadUnreadCount();
        
        // Reload notifications if dropdown is open
        const notificationDropdown = document.querySelector('.notification-dropdown');
        if (notificationDropdown && notificationDropdown.classList.contains('active')) {
          loadNotifications();
        }
        
        // Show toast notification only for new notifications
        if (payload.eventType === 'INSERT') {
          showNotificationToast(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to real-time notifications');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time subscription error:', err);
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Real-time subscription timed out');
      } else {
        console.log('📡 Real-time status:', status);
      }
    });
  
  // Store channel reference for cleanup if needed
  window.notificationChannel = channel;
}

/**
 * Show toast notification for new notification
 */
function showNotificationToast(notification) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <div class="toast-icon">${getNotificationIcon(getNotificationIconType(notification.type))}</div>
    <div class="toast-content">
      <strong>${notification.title || 'New Notification'}</strong>
      <p>${notification.message}</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Show custom toast message
 */
function showToast(title, message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <div class="toast-icon">${getNotificationIcon(type)}</div>
    <div class="toast-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Make showToast globally accessible
window.showToast = showToast;

/**
 * Get notification icon type
 */
function getNotificationIconType(type) {
  const typeMap = {
    'application_status': 'info',
    'payment_due': 'warning',
    'application_submitted': 'success',
    'application_editable': 'info',
    'payment_received': 'success',
    'loan_disbursed': 'success',
    'document_required': 'warning',
    'account_updated': 'info'
  };
  return typeMap[type] || 'info';
}

/**
 * Get notification icon SVG
 */
function getNotificationIcon(type) {
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
  };
  return icons[type] || icons.info;
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
}

/**
 * Setup account button
 */
function setupAccountButton() {
  const accountBtn = document.querySelector('.account-btn');
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      console.log('Account clicked');
      // You can add account info popup here
      alert('Account: John Doe\njohn.doe@example.com');
    });
  }
}

/**
 * Setup mobile nav controls (burger + overlay)
 */
function setupMobileNavControls() {
  const burgerBtn = document.getElementById('mobileNavbarBurger');
  const sidebarContainer = document.getElementById('sidebar');
  const sidebar = sidebarContainer ? sidebarContainer.querySelector('.sidebar') : null;

  if (!burgerBtn || !sidebar) {
    console.log('Mobile nav controls: Missing elements', { burgerBtn: !!burgerBtn, sidebar: !!sidebar });
    return;
  }

  let overlay = document.querySelector('.mobile-sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1350;
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(overlay);
  }

  const openSidebar = () => {
    sidebar.classList.add('active');
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    // Prevent body scroll on mobile when sidebar is open
    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeSidebar = () => {
    sidebar.classList.remove('active');
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (!sidebar.classList.contains('active')) {
        overlay.style.display = 'none';
      }
    }, 250);
    // Restore body scroll
    document.body.style.overflow = '';
  };

  burgerBtn.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      return;
    }
    if (sidebar.classList.contains('active')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink && window.innerWidth <= 768) {
      closeSidebar();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
}

/**
 * Phone Number Guard Functions
 */
function showPhoneNumberRequiredToast() {
  const existingToast = document.querySelector('.phone-required-toast');
  if (existingToast) return; // Don't show multiple toasts
  
  const toast = document.createElement('div');
  toast.className = 'phone-required-toast';
  toast.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    min-width: 350px;
    max-width: 450px;
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 2px solid #EF4444;
    z-index: 9999;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    animation: slideInRight 0.3s ease;
  `;
  
  toast.innerHTML = `
    <i class="fa-solid fa-phone-slash" style="font-size: 24px; flex-shrink: 0; margin-top: 2px;"></i>
    <div style="flex: 1;">
      <strong style="display: block; font-size: 1rem; margin-bottom: 4px;">Phone Number Required</strong>
      <p style="margin: 0; font-size: 0.9rem; opacity: 0.95; line-height: 1.4;">
        Please add your contact number to unlock full access to your account.
      </p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function lockNavigation() {
  // Disable all nav links except profile
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink && globalUserProfile?.needsPhoneNumber) {
      const page = navLink.dataset.page;
      if (page !== 'profile') {
        e.preventDefault();
        e.stopPropagation();
        showPhoneNumberRequiredToast();
      }
    }
  }, true);
  
  // Add visual indicator to locked nav items
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.dataset.page !== 'profile') {
      link.style.opacity = '0.5';
      link.style.cursor = 'not-allowed';
      link.style.pointerEvents = 'none';
    }
  });
}

function unlockNavigation() {
  // Remove visual indicators
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.style.opacity = '';
    link.style.cursor = '';
    link.style.pointerEvents = '';
  });
  
  // Show success notification
  showToast('Account Unlocked', 'You now have full access to all features!', 'success', 3000);
}

// Expose unlockNavigation globally so profile.js can call it
window.unlockNavigation = unlockNavigation;

/**
 * Profile Completion Guard Functions
 */
function showProfileIncompleteToast() {
  const existingToast = document.querySelector('.profile-incomplete-toast');
  if (existingToast) {
    // Pulse existing toast
    existingToast.style.animation = 'none';
    setTimeout(() => {
      existingToast.style.animation = 'pulse 0.3s ease';
    }, 10);
    return;
  }
  
  const toast = document.createElement('div');
  toast.className = 'profile-incomplete-toast';
  toast.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 400px;
    font-weight: 600;
    border: 2px solid rgba(255, 255, 255, 0.2);
  `;
  
  const missingItems = [];
  if (!globalUserProfile?.hasFinancialProfile) missingItems.push('Financial Information');
  if (!globalUserProfile?.hasDeclarations) missingItems.push('Declarations');
  
  toast.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; margin-top: 2px;"></i>
      <div>
        <div style="font-size: 16px; margin-bottom: 8px;">Profile Incomplete</div>
        <div style="font-size: 13px; opacity: 0.95; line-height: 1.5;">
          Please complete: <strong>${missingItems.join(' & ')}</strong>
        </div>
        <div style="font-size: 12px; opacity: 0.85; margin-top: 6px;">
          Go to Profile → ${missingItems[0]}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function lockSidebar() {
  // Disable all nav links except profile
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.dataset.page !== 'profile') {
      link.style.opacity = '0.4';
      link.style.cursor = 'not-allowed';
      link.style.pointerEvents = 'auto'; // Allow clicks to show toast
      link.style.filter = 'grayscale(1)';
      
      // Add lock icon
      const icon = link.querySelector('i');
      if (icon && !link.querySelector('.lock-icon')) {
        const lockIcon = document.createElement('i');
        lockIcon.className = 'fa-solid fa-lock lock-icon';
        lockIcon.style.cssText = 'position: absolute; right: 12px; font-size: 12px; opacity: 0.6;';
        link.style.position = 'relative';
        link.appendChild(lockIcon);
      }
      
      // Add click handler to show warning toast
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showProfileIncompleteToast();
      });
    } else {
      // Highlight profile link
      link.style.background = 'linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.15), rgb(var(--color-primary-rgb) / 0.05))';
      link.style.borderLeft = '4px solid var(--color-primary)';
    }
  });
}

function unlockSidebar() {
  // Remove profile incomplete toast if present
  const incompleteToast = document.querySelector('.profile-incomplete-toast');
  if (incompleteToast) {
    incompleteToast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => incompleteToast.remove(), 300);
  }
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.style.opacity = '';
    link.style.cursor = '';
    link.style.pointerEvents = '';
    link.style.filter = '';
    link.style.background = '';
    link.style.borderLeft = '';
    
    const lockIcon = link.querySelector('.lock-icon');
    if (lockIcon) lockIcon.remove();
    
    // Remove click handlers from locked links
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);
  });
  
  // Re-attach navigation after unlocking
  setupNavigation();
  
  showToast('Profile Complete', 'You now have full access to all features!', 'success', 3000);
}

// Expose globally
window.unlockSidebar = unlockSidebar;

/**
 * Setup logout button
 */
async function setupLogout() {
  // Import Supabase client
  const { supabase } = await import('/Services/supabaseClient.js');
  
  const logoutButtons = document.querySelectorAll('.logout-btn');
  logoutButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Show signing out toast
      showToast('Signing Out', 'Please wait while we sign you out...', 'info', 2000);
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          showToast('Error', 'Failed to sign out. Please try again.', 'warning', 3000);
          console.error('Sign out error:', error);
          return;
        }
        
        // Show success toast
        showToast('You have been signed out successfully.', 'success', 2000);
        
        // Redirect after toast
        setTimeout(() => {
          window.location.href = '/auth/login.html';
        }, 1500);
        
      } catch (err) {
        console.error('Logout error:', err);
        showToast('Error', 'Something went wrong. Please try again.', 'warning', 3000);
      }
    });
  });
}

/**
 * Handle browser back/forward buttons
 */
window.addEventListener('popstate', (e) => {
  const pageName = e.state?.page || 'dashboard';
  loadPage(pageName);
});