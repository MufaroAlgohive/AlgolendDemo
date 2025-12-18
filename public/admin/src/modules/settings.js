// src/modules/settings.js
import { initLayout } from '../shared/layout.js';
import { supabase } from '../services/supabaseClient.js';
import {
  fetchUsers,
  updateMyProfile,
  updateUserRole,
  getPaymentMethods,
  addPaymentMethod,
  updateMyAvatar,
  fetchSystemSettings,
  updateSystemSettings,
  DEFAULT_SYSTEM_SETTINGS
} from '../services/dataService.js';
import {
  ensureThemeLoaded,
  previewTheme,
  persistTheme,
  resetThemePreview,
  getCachedTheme
} from '../shared/theme.js';

const cloneCarouselSlides = (slides = []) => {
  if (!Array.isArray(slides)) return []; 
  return slides.map((slide = {}) => ({
    title: typeof slide.title === 'string' ? slide.title : '',
    text: typeof slide.text === 'string' ? slide.text : ''
  }));
};

const ensureCarouselSlides = (slides) => {
  const fallback = DEFAULT_SYSTEM_SETTINGS.carousel_slides || [];
  const incoming = cloneCarouselSlides(Array.isArray(slides) && slides.length ? slides : fallback);
  const length = fallback.length || 3;
  while (incoming.length < length) {
    const ref = fallback[incoming.length] || { title: '', text: '' };
    incoming.push({ ...ref });
  }
  return incoming.slice(0, length).map((slide, index) => ({
    title: slide.title?.trim() || fallback[index]?.title || '',
    text: slide.text?.trim() || fallback[index]?.text || ''
  }));
};

const normalizeBooleanSetting = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

const normalizeHex = (value) => {
  if (!value) return null;
  let hex = value.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`;
  }
  return null;
};

const cloneSystemSettings = (settings = {}) => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...settings,
  auth_overlay_color: normalizeHex(settings?.auth_overlay_color) || DEFAULT_SYSTEM_SETTINGS.auth_overlay_color,
  auth_overlay_enabled: normalizeBooleanSetting(settings?.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled),
  auth_background_flip: normalizeBooleanSetting(settings?.auth_background_flip, DEFAULT_SYSTEM_SETTINGS.auth_background_flip),
  carousel_slides: ensureCarouselSlides(settings.carousel_slides)
});

const getCarouselSlidesDraft = () => ensureCarouselSlides(systemSettingsDraft?.carousel_slides);

// --- State ---
let userRole = 'borrower';
let currentUserProfile = null;
let allUsers = []; 
let isUploading = false;
let systemSettings = cloneSystemSettings(DEFAULT_SYSTEM_SETTINGS);
let systemSettingsDraft = cloneSystemSettings(DEFAULT_SYSTEM_SETTINGS);
let themeHasPendingChanges = false;
let isSavingTheme = false;
let systemSettingsMetadata = { updated_at: null, updated_by: null };

const BRANDING_STORAGE_BUCKET = 'branding';
const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_WALLPAPER_FILE_SIZE = 6 * 1024 * 1024; // 6 MB
const ALLOWED_WALLPAPER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
let isUploadingLogo = false;
let isUploadingWallpaper = false;

// --- Helper: Toast Notification System ---
const showToast = (message, type = 'success') => {
  // 1. Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-[10000] flex flex-col space-y-3 pointer-events-none';
    document.body.appendChild(container);
  }

  // 2. Define styles
  const styles = type === 'success' 
    ? 'bg-white border-l-4 border-green-500 text-gray-800' 
    : 'bg-white border-l-4 border-red-500 text-gray-800';
    
  const icon = type === 'success'
    ? '<i class="fa-solid fa-check-circle text-green-500 text-xl"></i>'
    : '<i class="fa-solid fa-circle-exclamation text-red-500 text-xl"></i>';

  // 3. Create toast element
  const toast = document.createElement('div');
  toast.className = `${styles} shadow-lg rounded-r-lg p-4 flex items-center space-x-3 min-w-[300px] transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    ${icon}
    <div class="flex-1">
      <p class="font-medium text-sm">${type === 'success' ? 'Success' : 'Error'}</p>
      <p class="text-xs text-gray-500">${message}</p>
    </div>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
      <i class="fa-solid fa-times"></i>
    </button>
  `;

  // 4. Append and animate
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-10', 'opacity-0');
  });

  // 5. Auto remove
  setTimeout(() => {
    toast.classList.add('translate-x-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// --- Helper: Avatars ---
const getAvatarUrl = (profile) => {
  if (!profile?.avatar_url) return null;
  return `${profile.avatar_url}?t=${Date.now()}`;
};

const getInitials = (name = '') => {
  return name
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
};

const renderAvatar = (profile = {}, options = {}) => {
  const {
    sizeClass = 'w-10 h-10',
    textClass = 'text-sm',
    sharedClasses = '',
    imageClasses = '',
    placeholderClasses = '',
    variant = 'primary',
    altFallback = 'User'
  } = options;

  const fullName = profile?.full_name || altFallback;
  const avatarUrl = getAvatarUrl(profile);

  if (avatarUrl) {
    const classes = [sizeClass, 'rounded-full', 'object-cover', sharedClasses, imageClasses]
      .filter(Boolean)
      .join(' ') || sizeClass;
    return `<img src="${avatarUrl}" alt="${fullName}" class="${classes}" loading="lazy">`;
  }

  const classes = ['avatar-placeholder', sizeClass, textClass, sharedClasses, placeholderClasses];
  if (variant === 'gradient') classes.push('avatar-placeholder--gradient');
  const initials = getInitials(fullName);
  return `<div class="${classes.filter(Boolean).join(' ').trim()}" aria-hidden="true">${initials}</div>`;
};

// --- Helper: Role Badges ---
const getRoleBadge = (role) => {
  switch (role) {
    case 'super_admin': return 'bg-red-100 text-red-800';
    case 'admin': return 'bg-blue-100 text-blue-800';
    case 'base_admin': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const COLOR_FIELDS = [
  {
    key: 'primary_color',
    label: 'Primary Color',
    description: 'Used for CTAs, highlights and primary focus states.'
  },
  {
    key: 'secondary_color',
    label: 'Secondary Color',
    description: 'Used for gradients, hover states and charts.'
  },
  {
    key: 'tertiary_color',
    label: 'Tertiary Color',
    description: 'Used for gradients and subtle accents.'
  }
];

const escapeHtmlAttr = (value = '') => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const escapeHtmlContent = (value = '') => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const updateThemePreviewUI = () => {
  COLOR_FIELDS.forEach(({ key }) => {
    const colorInput = document.querySelector(`[data-color-picker="${key}"]`);
    const hexInput = document.querySelector(`[data-color-input="${key}"]`);
    if (colorInput) colorInput.value = systemSettingsDraft[key];
    if (hexInput) hexInput.value = systemSettingsDraft[key];
  });

  const preview = document.getElementById('brand-gradient-preview');
  if (preview) {
    preview.style.backgroundImage = `linear-gradient(120deg, ${systemSettingsDraft.primary_color}, ${systemSettingsDraft.secondary_color}, ${systemSettingsDraft.tertiary_color})`;
  }

  const modeButtons = document.querySelectorAll('[data-theme-mode]');
  modeButtons.forEach((btn) => {
    if (btn.dataset.themeMode === systemSettingsDraft.theme_mode) {
      btn.classList.add('bg-brand-accent', 'text-white', 'shadow');
    } else {
      btn.classList.remove('bg-brand-accent', 'text-white', 'shadow');
    }
  });

  updateLogoPreviewUI();
  updateWallpaperPreviewUI();
  updateOverlayControlsUI();
  updateCarouselFieldsUI();
  updateThemeSaveState();
};

const updateThemeSaveState = () => {
  const saveBtn = document.getElementById('save-system-settings');
  const resetBtn = document.getElementById('reset-system-settings');
  if (saveBtn) {
    saveBtn.disabled = !themeHasPendingChanges || isSavingTheme;
    saveBtn.innerHTML = isSavingTheme
      ? '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving'
      : 'Save Theme';
  }
  if (resetBtn) {
    resetBtn.disabled = isSavingTheme;
  }

  const status = document.getElementById('system-settings-status');
  if (status) {
    status.textContent = themeHasPendingChanges
      ? 'You have unsaved changes'
      : 'Theme matches saved configuration';
  }
};

const markThemeDirty = () => {
  themeHasPendingChanges = true;
  updateThemeSaveState();
};

const commitThemeDraft = (patch) => {
  const sanitizedPatch = { ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, 'carousel_slides')) {
    sanitizedPatch.carousel_slides = ensureCarouselSlides(patch.carousel_slides);
  }
  systemSettingsDraft = cloneSystemSettings({ ...systemSettingsDraft, ...sanitizedPatch });
  markThemeDirty();
  previewTheme(systemSettingsDraft);
  updateThemePreviewUI();
};

const getLogoValue = () => (systemSettingsDraft.company_logo_url || '').trim();

const updateLogoPreviewUI = () => {
  const logoUrl = getLogoValue();
  const previewImg = document.getElementById('company-logo-preview');
  const emptyState = document.getElementById('company-logo-empty');
  const removeBtn = document.getElementById('remove-logo-btn');
  const linkInput = document.getElementById('logo-url-input');

  if (previewImg) {
    if (logoUrl) {
      previewImg.src = logoUrl;
      previewImg.classList.remove('hidden');
      previewImg.onerror = () => {
        previewImg.classList.add('hidden');
        emptyState?.classList.remove('hidden');
      };
    } else {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
  }

  if (emptyState) {
    emptyState.classList.toggle('hidden', Boolean(logoUrl));
  }

  if (removeBtn) {
    removeBtn.disabled = !logoUrl || isUploadingLogo;
  }

  if (linkInput && document.activeElement !== linkInput) {
    linkInput.value = logoUrl;
  }
};

const setLogoUploadState = (state) => {
  isUploadingLogo = state;
  const uploadBtn = document.getElementById('logo-upload-btn');
  const removeBtn = document.getElementById('remove-logo-btn');
  if (uploadBtn) {
    uploadBtn.disabled = state;
    uploadBtn.innerHTML = state
      ? '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Uploading...'
      : '<i class="fa-solid fa-cloud-arrow-up mr-2"></i>Upload Logo';
  }
  if (removeBtn) {
    removeBtn.disabled = state || !getLogoValue();
  }
};

const getWallpaperValue = () => (systemSettingsDraft.auth_background_url || '').trim();
const getWallpaperFlipValue = () => normalizeBooleanSetting(systemSettingsDraft.auth_background_flip, false);
const getOverlayColorValue = () => normalizeHex(systemSettingsDraft.auth_overlay_color) || DEFAULT_SYSTEM_SETTINGS.auth_overlay_color;
const getOverlayEnabledValue = () => normalizeBooleanSetting(systemSettingsDraft.auth_overlay_enabled, DEFAULT_SYSTEM_SETTINGS.auth_overlay_enabled);

const updateWallpaperPreviewUI = () => {
  const wallpaperUrl = getWallpaperValue();
  const preview = document.getElementById('auth-bg-preview');
  const emptyState = document.getElementById('auth-bg-empty');
  const removeBtn = document.getElementById('remove-wallpaper-btn');
  const linkInput = document.getElementById('wallpaper-url-input');
  const flipToggle = document.getElementById('wallpaper-flip-toggle');
  const isFlipped = getWallpaperFlipValue();

  if (preview) {
    if (wallpaperUrl) {
      preview.style.backgroundImage = `url('${wallpaperUrl}')`;
      preview.style.backgroundColor = '#0f172a';
    } else {
      preview.style.backgroundImage = 'none';
      preview.style.backgroundColor = '#0f172a';
    }
    preview.style.transform = isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
  }

  if (emptyState) {
    emptyState.classList.toggle('hidden', Boolean(wallpaperUrl));
  }

  if (removeBtn) {
    removeBtn.disabled = !wallpaperUrl || isUploadingWallpaper;
  }

  if (linkInput && document.activeElement !== linkInput) {
    linkInput.value = wallpaperUrl;
  }

  if (flipToggle && document.activeElement !== flipToggle) {
    flipToggle.checked = isFlipped;
  }
};

const updateOverlayControlsUI = () => {
  const overlayColor = getOverlayColorValue();
  const overlayEnabled = getOverlayEnabledValue();
  const colorPicker = document.getElementById('overlay-color-picker');
  const colorInput = document.getElementById('overlay-color-input');
  const disableToggle = document.getElementById('overlay-disable-toggle');

  if (colorPicker && document.activeElement !== colorPicker) {
    colorPicker.value = overlayColor;
  }
  if (colorInput && document.activeElement !== colorInput) {
    colorInput.value = overlayColor;
  }
  if (disableToggle && document.activeElement !== disableToggle) {
    disableToggle.checked = !overlayEnabled;
  }
};

const updateCarouselFieldsUI = () => {
  const slides = getCarouselSlidesDraft();
  slides.forEach((slide, index) => {
    const heading = document.querySelector(`[data-carousel-field="title"][data-carousel-index="${index}"]`);
    const paragraph = document.querySelector(`[data-carousel-field="text"][data-carousel-index="${index}"]`);
    if (heading && heading !== document.activeElement) {
      heading.value = slide.title;
    }
    if (paragraph && paragraph !== document.activeElement) {
      paragraph.value = slide.text;
    }
  });
};

const setWallpaperUploadState = (state) => {
  isUploadingWallpaper = state;
  const uploadBtn = document.getElementById('wallpaper-upload-btn');
  const removeBtn = document.getElementById('remove-wallpaper-btn');
  if (uploadBtn) {
    uploadBtn.disabled = state;
    uploadBtn.innerHTML = state
      ? '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Uploading...'
      : '<i class="fa-solid fa-image mr-2"></i>Upload Wallpaper';
  }
  if (removeBtn) {
    removeBtn.disabled = state || !getWallpaperValue();
  }
};

async function handleLogoFileInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    showToast('Please upload a PNG, JPG, SVG or WEBP image.', 'error');
    event.target.value = '';
    return;
  }

  if (file.size > MAX_LOGO_FILE_SIZE) {
    showToast('Logo must be smaller than 2MB.', 'error');
    event.target.value = '';
    return;
  }

  setLogoUploadState(true);

  try {
    const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase();
    const fileExt = sanitizedName.split('.').pop();
    const filePath = `system-branding/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(BRANDING_STORAGE_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BRANDING_STORAGE_BUCKET).getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error('Unable to resolve uploaded logo URL.');

    commitThemeDraft({ company_logo_url: data.publicUrl });
    showToast('Logo uploaded. Save settings to publish it everywhere.', 'success');
  } catch (error) {
    console.error('Logo upload failed:', error);
    showToast(error.message || 'Unable to upload logo', 'error');
  } finally {
    setLogoUploadState(false);
    event.target.value = '';
    updateLogoPreviewUI();
  }
}

function handleLogoUrlApply() {
  const input = document.getElementById('logo-url-input');
  if (!input) return;
  const url = input.value.trim();

  if (!url) {
    commitThemeDraft({ company_logo_url: null });
    showToast('Logo cleared. Save to remove it from navbars.', 'success');
    return;
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Logo URL must use HTTP or HTTPS');
    }
    commitThemeDraft({ company_logo_url: parsed.toString() });
    showToast('Logo link updated. Remember to save settings.', 'success');
  } catch (error) {
    showToast(error.message || 'Enter a valid logo URL', 'error');
  }
}

function handleLogoRemove() {
  if (!getLogoValue()) return;
  commitThemeDraft({ company_logo_url: null });
  showToast('Logo removed. Save to revert to the default mark.', 'success');
}

async function handleWallpaperFileInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!ALLOWED_WALLPAPER_TYPES.includes(file.type)) {
    showToast('Wallpaper must be a PNG, JPG or WEBP image.', 'error');
    event.target.value = '';
    return;
  }

  if (file.size > MAX_WALLPAPER_FILE_SIZE) {
    showToast('Wallpaper must be smaller than 6MB.', 'error');
    event.target.value = '';
    return;
  }

  setWallpaperUploadState(true);

  try {
    const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase();
    const fileExt = sanitizedName.split('.').pop();
    const filePath = `system-branding/auth-wallpapers/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(BRANDING_STORAGE_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BRANDING_STORAGE_BUCKET).getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error('Unable to resolve uploaded wallpaper URL.');

    commitThemeDraft({ auth_background_url: data.publicUrl });
    showToast('Auth wallpaper uploaded. Save to push it live.', 'success');
  } catch (error) {
    console.error('Wallpaper upload failed:', error);
    showToast(error.message || 'Unable to upload wallpaper', 'error');
  } finally {
    setWallpaperUploadState(false);
    event.target.value = '';
    updateWallpaperPreviewUI();
  }
}

function handleWallpaperUrlApply() {
  const input = document.getElementById('wallpaper-url-input');
  if (!input) return;
  const url = input.value.trim();

  if (!url) {
    commitThemeDraft({ auth_background_url: null });
    showToast('Wallpaper cleared. Save to revert to the default.', 'success');
    return;
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Wallpaper URL must use HTTP or HTTPS');
    }
    commitThemeDraft({ auth_background_url: parsed.toString() });
    showToast('Wallpaper link updated. Remember to save settings.', 'success');
  } catch (error) {
    showToast(error.message || 'Enter a valid wallpaper URL', 'error');
  }
}

function handleWallpaperRemove() {
  if (!getWallpaperValue()) return;
  commitThemeDraft({ auth_background_url: null });
  showToast('Wallpaper removed. Save to restore the fallback image.', 'success');
}

function handleWallpaperFlipToggle(event) {
  commitThemeDraft({ auth_background_flip: event.target.checked });
}

function handleOverlayColorPicker(event) {
  const normalized = normalizeHex(event.target.value);
  if (!normalized) return;
  commitThemeDraft({ auth_overlay_color: normalized });
}

function handleOverlayColorInput(event) {
  const normalized = normalizeHex(event.target.value);
  if (!normalized) {
    showToast('Enter a valid hex color (e.g. #EA580C)', 'error');
    updateOverlayControlsUI();
    return;
  }
  commitThemeDraft({ auth_overlay_color: normalized });
}

function handleOverlayDisableToggle(event) {
  const overlayEnabled = !event.target.checked;
  commitThemeDraft({ auth_overlay_enabled: overlayEnabled });
}

async function loadSystemSettingsState() {
  const { data, error } = await fetchSystemSettings();
  if (error) {
    console.error('Failed to load system settings:', error);
    const cached = getCachedTheme();
    const fallbackSource = cached || DEFAULT_SYSTEM_SETTINGS;
    const fallback = cloneSystemSettings(fallbackSource);
    systemSettings = fallback;
    systemSettingsDraft = cloneSystemSettings(fallback);
    showToast('Unable to load saved theme. Using defaults.', 'error');
    return;
  }
  systemSettings = cloneSystemSettings(data);
  systemSettingsDraft = cloneSystemSettings(systemSettings);
  systemSettingsMetadata = {
    updated_at: data?.updated_at || null,
    updated_by: data?.updated_by || null
  };
  persistTheme(systemSettings);
}

// --- Main Page Rendering ---

function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg relative flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
      
      <nav id="settings-tabs" class="flex-none flex border-b border-gray-200 px-6 bg-gray-50 z-10 overflow-x-auto">
        <button class="tab-button active" data-tab="profile">
          <i class="fa-solid fa-user-edit w-5 mr-2"></i>My Profile
        </button>
        <button class="tab-button" data-tab="security">
          <i class="fa-solid fa-lock w-5 mr-2"></i>Security
        </button>
        ${userRole === 'super_admin' ? `
          <button class="tab-button" data-tab="billing">
            <i class="fa-solid fa-credit-card w-5 mr-2"></i>Billing & Payments
          </button>
          <button class="tab-button" data-tab="usermanagement">
            <i class="fa-solid fa-users-cog w-5 mr-2"></i>User Management
          </button>
          <button class="tab-button" data-tab="system">
            <i class="fa-solid fa-sliders w-5 mr-2"></i>System Settings
          </button>
        ` : ''}
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
  `;
  
  // Custom Styles for Tabs & Scrollbar
  const style = document.createElement('style');
  style.innerHTML = `
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
  `;
  document.head.appendChild(style);

  attachTabListeners();
  
  // Modal Close Logic
  const hideModal = () => document.getElementById('role-modal').classList.add('hidden');
  document.getElementById('cancel-role-modal').addEventListener('click', hideModal);
  document.getElementById('close-role-modal').addEventListener('click', hideModal);
  
  // Close if clicking outside modal card
  document.getElementById('role-modal').addEventListener('click', (e) => {
    if (e.target.id === 'role-modal') hideModal();
  });

  renderProfileTab();
}

// --- Tab Rendering Functions ---

function renderProfileTab() {
  const content = document.getElementById('settings-content');
  if (!content) return;
  
  content.innerHTML = `
    <h3 class="text-2xl font-bold text-gray-900">My Profile</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage your personal account details.</p>
    
    <div class="p-6 rounded-lg border border-gray-200 bg-white">
      <form id="profile-form" class="space-y-6">
        <div class="flex items-center space-x-4 pb-6 border-b">
          <div class="relative w-20 h-20 rounded-full group">
            <div id="avatar-preview">
              ${renderAvatar(currentUserProfile, { sizeClass: 'w-20 h-20', textClass: 'text-2xl', sharedClasses: 'shadow-sm', variant: 'gradient', altFallback: 'Profile' })}
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
            <h4 class="text-lg font-semibold text-gray-900">${currentUserProfile.full_name || 'N/A'}</h4>
            <p class="text-sm text-gray-500">${currentUserProfile.email || 'N/A'}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div>
            <label for="full_name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" id="full_name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" value="${currentUserProfile.full_name || ''}">
          </div>
          <div>
            <label for="contact_number" class="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input type="text" id="contact_number" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent outline-none" value="${currentUserProfile.contact_number || ''}">
          </div>
        </div>
        
        <div class="flex justify-end pt-4">
          <button type="submit" id="save-profile-btn" class="bg-brand-accent text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-accent-hover transition disabled:bg-gray-400">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
  document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
}

function renderSecurityTab() {
  const content = document.getElementById('settings-content');
  if (!content) return;
  
  content.innerHTML = `
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
  `;
  
  document.getElementById('password-form').addEventListener('submit', handlePasswordUpdate);
}

async function renderBillingTab() {
  const content = document.getElementById('settings-content');
  if (!content) return;

  content.innerHTML = `
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
  `;
  
  document.getElementById('card-form').addEventListener('submit', handleAddCard);
  loadSavedCards();
}

async function loadSavedCards() {
  const listContainer = document.querySelector('#saved-cards-list .list-container');
  if (!listContainer) return;
  
  const { data, error } = await getPaymentMethods();
  
  if (error) {
    listContainer.innerHTML = `<p class="text-red-600">Error loading cards: ${error.message}</p>`;
    return;
  }
  
  if (data.length === 0) {
    listContainer.innerHTML = `<p class="text-sm text-gray-500">No payment methods have been added yet.</p>`;
    return;
  }
  
  listContainer.innerHTML = data.map(card => `
    <div class="p-4 rounded-lg border border-gray-300 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div class="flex items-center">
        ${card.card_type === 'visa' ? 
          `<i class="fa-brands fa-cc-visa text-4xl text-blue-800"></i>` : 
          `<i class="fa-brands fa-cc-mastercard text-4xl text-orange-500"></i>`
        }
        <div class="ml-4">
          <p class="font-semibold text-gray-900 capitalize">${card.card_type} •••• ${card.last_four}</p>
          <p class="text-xs text-gray-500">Expires ${card.expiry_month}/${card.expiry_year}</p>
        </div>
      </div>
      ${card.is_default ? 
        `<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Default</span>` :
        '' 
      }
    </div>
  `).join('');
}

async function renderUserManagementTab() {
  const content = document.getElementById('settings-content');
  if (!content) return;

  content.innerHTML = `
    <h3 class="text-2xl font-bold text-gray-900">User Management</h3>
    <p class="text-gray-500 mt-1 mb-6">Manage roles for all users in the system.</p>
    
    <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div id="user-management-list">
        <div class="p-10 text-center text-gray-500">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-accent"></i>
        </div>
      </div>
    </div>
  `;
  
  const { data, error } = await fetchUsers();
  
  if (error) {
    content.querySelector('#user-management-list').innerHTML = `<p class="p-4 text-red-600">Error loading users: ${error.message}</p>`;
    return;
  }
  
  allUsers = data;
  
  const listContainer = content.querySelector('#user-management-list');
  listContainer.innerHTML = `
    <ul class="divide-y divide-gray-200">
      ${allUsers.map(user => `
        <li class="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
          <div class="flex items-center space-x-3">
            ${renderAvatar(user, { sizeClass: 'w-10 h-10', textClass: 'text-xs', imageClasses: 'border border-gray-200', variant: 'primary', altFallback: user.full_name || 'User' })}
            <div>
              <p class="text-sm font-semibold text-gray-900">${user.full_name || 'N/A'}</p>
              <p class="text-xs text-gray-500">${user.email || 'No Email'}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(user.role)} capitalize border border-transparent shadow-sm">
              ${user.role.replace('_', ' ')}
            </span>
            ${user.id !== currentUserProfile.id ? 
              `<button class="change-role-btn text-xs font-semibold text-brand-accent hover:text-brand-accent-hover border border-brand-accent rounded px-3 py-1 hover:bg-orange-50 transition-colors" 
                  data-user-id="${user.id}" 
                  data-user-name="${user.full_name || 'User'}" 
                  data-user-role="${user.role}">
                Edit Role
              </button>` :
              '<span class="text-xs text-gray-400 italic">Current User</span>'
            }
          </div>
        </li>
      `).join('')}
    </ul>
  `;

  // Attach Change Role listeners
  listContainer.querySelectorAll('.change-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('modal-user-id').value = btn.dataset.userId;
      document.getElementById('modal-user-name').textContent = btn.dataset.userName;
      document.getElementById('modal-role-select').value = btn.dataset.userRole;
      document.getElementById('role-modal').classList.remove('hidden');
    });
  });
}

function renderSystemSettingsTab() {
  const content = document.getElementById('settings-content');
  if (!content) return;

  const lastUpdated = systemSettingsMetadata.updated_at
    ? new Date(systemSettingsMetadata.updated_at).toLocaleString('en-ZA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Not saved yet';
  const currentLogo = systemSettingsDraft.company_logo_url || '';
  const currentLogoAttr = escapeHtmlAttr(currentLogo);
  const currentWallpaper = systemSettingsDraft.auth_background_url || '';
  const currentWallpaperAttr = escapeHtmlAttr(currentWallpaper);
  const wallpaperFlipChecked = getWallpaperFlipValue();
  const overlayColor = getOverlayColorValue();
  const overlayColorAttr = escapeHtmlAttr(overlayColor);
  const overlayDisabledChecked = !getOverlayEnabledValue();
  const carouselSlides = getCarouselSlidesDraft();

  content.innerHTML = `
    <div class="space-y-6">
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
            ${COLOR_FIELDS.map(({ key, label, description }) => `
              <div class="flex flex-wrap items-center gap-4" data-color-row="${key}">
                <div class="flex items-center gap-3">
                  <input type="color" data-color-picker="${key}" value="${systemSettingsDraft[key]}" class="h-12 w-12 rounded-xl border border-gray-200 shadow-inner cursor-pointer">
                  <div>
                    <p class="text-sm font-semibold text-gray-800">${label}</p>
                    <p class="text-xs text-gray-500">${description}</p>
                  </div>
                </div>
                <div class="flex-1 min-w-[180px]">
                  <label class="text-xs font-medium text-gray-500 tracking-wider uppercase">HEX</label>
                  <input type="text" maxlength="7" data-color-input="${key}" value="${systemSettingsDraft[key]}" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent uppercase" placeholder="#FFFFFF">
                </div>
              </div>
            `).join('')}
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
              <span>${systemSettingsDraft.primary_color}</span>
              <span>${systemSettingsDraft.secondary_color}</span>
              <span>${systemSettingsDraft.tertiary_color}</span>
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
              <img id="company-logo-preview" src="${currentLogoAttr}" alt="Company logo preview" class="max-h-20 w-auto object-contain ${currentLogo ? '' : 'hidden'}">
              <div id="company-logo-empty" class="text-center ${currentLogo ? 'hidden' : ''}">
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
              <button type="button" id="remove-logo-btn" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition" ${currentLogo ? '' : 'disabled'}>
                Remove
              </button>
            </div>
            <p class="text-xs text-gray-500">Transparent background recommended. Max size 2MB.</p>
          </div>
          <div class="w-full lg:w-80 space-y-3">
            <label for="logo-url-input" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Use hosted logo</label>
            <input type="url" id="logo-url-input" value="${currentLogoAttr}" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm" placeholder="https://cdn.yourbrand.com/logo.png">
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
            <div id="auth-bg-preview" class="h-32 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden" style="background-color:#0f172a; background-size:cover; background-position:center; background-image:${currentWallpaper ? `url('${currentWallpaperAttr}')` : 'none'}; transform: scaleX(${wallpaperFlipChecked ? '-1' : '1'});">
              <div id="auth-bg-empty" class="text-center text-white/80 ${currentWallpaper ? 'hidden' : ''}">
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
              <button type="button" id="remove-wallpaper-btn" class="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition" ${currentWallpaper ? '' : 'disabled'}>
                Remove
              </button>
            </div>
            <p class="text-xs text-gray-500">PNG/JPG/WEBP up to 6MB. We recommend 16:9 or wider ratios.</p>
            <label class="flex items-center gap-3 text-sm text-gray-700 pt-3 border-t border-gray-100">
              <input type="checkbox" id="wallpaper-flip-toggle" class="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" ${wallpaperFlipChecked ? 'checked' : ''}>
              <span>Flip wallpaper horizontally</span>
            </label>
            <p class="text-xs text-gray-400 -mt-1">Mirror the hero so subjects face the form if needed.</p>
            <div class="mt-4 border border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50">
              <p class="text-sm font-semibold text-gray-900">Overlay Filter</p>
              <p class="text-xs text-gray-500 mb-3">Tint color that sits above the wallpaper on the auth page.</p>
              <div class="flex flex-wrap items-center gap-4">
                <input type="color" id="overlay-color-picker" value="${overlayColor}" class="h-12 w-12 rounded-xl border border-gray-200 shadow-inner cursor-pointer">
                <div class="flex-1 min-w-[160px]">
                  <label class="text-xs font-medium text-gray-500 uppercase tracking-wider">HEX</label>
                  <input type="text" id="overlay-color-input" maxlength="7" value="${overlayColorAttr}" class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent uppercase" placeholder="#EA580C">
                </div>
              </div>
              <label class="flex items-start gap-3 mt-4">
                <input type="checkbox" id="overlay-disable-toggle" class="mt-1 h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" ${overlayDisabledChecked ? 'checked' : ''}>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Remove filter overlay</p>
                  <p class="text-xs text-gray-500">Check this to disable the tinted blend entirely and show the raw wallpaper.</p>
                </div>
              </label>
            </div>
          </div>
          <div class="w-full lg:w-80 space-y-3">
            <label for="wallpaper-url-input" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Use hosted wallpaper</label>
            <input type="url" id="wallpaper-url-input" value="${currentWallpaperAttr}" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm" placeholder="https://cdn.yourbrand.com/auth-hero.jpg">
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
          ${carouselSlides.map((slide, index) => `
            <div class="border border-gray-200 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-900">Carousel ${index + 1}</p>
                  <p class="text-xs text-gray-500">Shown to desktop users in rotation.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wider text-gray-400">Slide ${index + 1}</span>
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Heading</label>
                <input type="text" value="${escapeHtmlAttr(slide.title)}" maxlength="120"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm"
                  data-carousel-index="${index}" data-carousel-field="title" placeholder="Financial Freedom">
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Paragraph</label>
                <textarea rows="3"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-brand-accent focus:border-brand-accent text-sm resize-none"
                  data-carousel-index="${index}" data-carousel-field="text" placeholder="Summarize the benefit">${escapeHtmlContent(slide.text)}</textarea>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <div class="system-card border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <p id="system-settings-status" class="text-sm font-medium text-gray-800">Theme matches saved configuration</p>
          <p class="text-xs text-gray-500">Last saved: ${lastUpdated}</p>
        </div>
        <div class="md:ml-auto flex items-center gap-3">
          <button type="button" id="reset-system-settings" class="px-5 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition">Reset to Saved</button>
          <button type="button" id="save-system-settings" class="px-5 py-2 rounded-xl bg-brand-accent text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition">Save Theme</button>
        </div>
      </div>
    </div>
  `;

  COLOR_FIELDS.forEach(({ key }) => {
    const colorPicker = document.querySelector(`[data-color-picker="${key}"]`);
    const hexInput = document.querySelector(`[data-color-input="${key}"]`);
    colorPicker?.addEventListener('input', (e) => handleThemeColorChange(key, e.target.value));
    hexInput?.addEventListener('change', (e) => handleThemeHexInput(key, e.target.value));
  });

  document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
    btn.addEventListener('click', () => handleThemeModeChange(btn.dataset.themeMode));
  });

  document.getElementById('reset-system-settings')?.addEventListener('click', handleThemeReset);
  document.getElementById('save-system-settings')?.addEventListener('click', handleSystemSettingsSave);
  document.getElementById('logo-upload-btn')?.addEventListener('click', () => document.getElementById('logo-file-input')?.click());
  document.getElementById('logo-file-input')?.addEventListener('change', handleLogoFileInput);
  document.getElementById('apply-logo-url')?.addEventListener('click', handleLogoUrlApply);
  document.getElementById('logo-url-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLogoUrlApply();
    }
  });
  document.getElementById('remove-logo-btn')?.addEventListener('click', handleLogoRemove);
  document.getElementById('wallpaper-upload-btn')?.addEventListener('click', () => document.getElementById('wallpaper-file-input')?.click());
  document.getElementById('wallpaper-file-input')?.addEventListener('change', handleWallpaperFileInput);
  document.getElementById('apply-wallpaper-url')?.addEventListener('click', handleWallpaperUrlApply);
  document.getElementById('wallpaper-url-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleWallpaperUrlApply();
    }
  });
  document.getElementById('remove-wallpaper-btn')?.addEventListener('click', handleWallpaperRemove);
  document.getElementById('wallpaper-flip-toggle')?.addEventListener('change', handleWallpaperFlipToggle);
  document.getElementById('overlay-color-picker')?.addEventListener('input', handleOverlayColorPicker);
  document.getElementById('overlay-color-input')?.addEventListener('change', handleOverlayColorInput);
  document.getElementById('overlay-color-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleOverlayColorInput(event);
    }
  });
  document.getElementById('overlay-disable-toggle')?.addEventListener('change', handleOverlayDisableToggle);
  document.querySelectorAll('[data-carousel-field]')
    .forEach((field) => field.addEventListener('input', handleCarouselFieldInput));

  updateThemePreviewUI();
}

function handleThemeColorChange(key, value) {
  const normalized = normalizeHex(value);
  if (!normalized) return;
  commitThemeDraft({ [key]: normalized });
}

function handleThemeHexInput(key, value) {
  const normalized = normalizeHex(value);
  if (!normalized) {
    showToast('Enter a valid 6-digit hex color (e.g. var(--color-primary))', 'error');
    updateThemePreviewUI();
    return;
  }
  commitThemeDraft({ [key]: normalized });
}

function handleThemeModeChange(mode) {
  if (!mode || systemSettingsDraft.theme_mode === mode) return;
  commitThemeDraft({ theme_mode: mode });
}

function handleCarouselFieldInput(event) {
  const { carouselIndex, carouselField } = event.target.dataset || {};
  if (typeof carouselIndex === 'undefined' || !carouselField) return;
  const index = Number(carouselIndex);
  if (Number.isNaN(index)) return;
  const key = carouselField === 'title' ? 'title' : 'text';
  const slides = getCarouselSlidesDraft().map((slide) => ({ ...slide }));
  slides[index] = { ...slides[index], [key]: event.target.value };
  commitThemeDraft({ carousel_slides: slides });
}

function handleThemeReset() {
  systemSettingsDraft = cloneSystemSettings(systemSettings);
  themeHasPendingChanges = false;
  resetThemePreview();
  updateThemePreviewUI();
}

async function handleSystemSettingsSave() {
  if (isSavingTheme) return;
  isSavingTheme = true;
  updateThemeSaveState();

  const { data, error } = await updateSystemSettings(systemSettingsDraft);

  if (error) {
    console.error('Theme save failed:', error);
    showToast(error, 'error');
  } else {
    systemSettings = cloneSystemSettings(data || systemSettingsDraft);
    systemSettingsDraft = cloneSystemSettings(systemSettings);
    themeHasPendingChanges = false;
    systemSettingsMetadata.updated_at = data?.updated_at || new Date().toISOString();
    systemSettingsMetadata.updated_by = data?.updated_by || currentUserProfile?.id || null;
    persistTheme(systemSettings);
    showToast('Theme updated for all admins.', 'success');
  }

  isSavingTheme = false;
  updateThemePreviewUI();
}

// --- Event Handlers (Using Toast) ---

function attachTabListeners() {
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      if (tabName === 'profile') renderProfileTab();
      else if (tabName === 'security') renderSecurityTab();
      else if (tabName === 'billing') renderBillingTab();
      else if (tabName === 'usermanagement') renderUserManagementTab();
      else if (tabName === 'system') renderSystemSettingsTab();
    });
  });
  
  // Attach form listeners for the modal
  document.getElementById('role-form').addEventListener('submit', handleRoleUpdate);
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const btn = document.getElementById('save-profile-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving...';
  
  const profileData = {
    full_name: document.getElementById('full_name').value,
    contact_number: document.getElementById('contact_number').value
  };
  
  const { error } = await updateMyProfile(profileData);
  
  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Profile updated successfully!', 'success');
    document.querySelector('#header-container span').textContent = `Hello, ${profileData.full_name} 👋`;
    currentUserProfile.full_name = profileData.full_name;
    currentUserProfile.contact_number = profileData.contact_number;
  }
  
  btn.disabled = false;
  btn.textContent = 'Save Changes';
}

async function handleAvatarUpload(e) {
  if (isUploading) return;
  const file = e.target.files[0];
  if (!file) return;

  isUploading = true;
  const spinner = document.getElementById('avatar-spinner');
  spinner.classList.remove('hidden');
  
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUserProfile.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await updateMyAvatar(publicUrl);
    if (updateError) throw updateError;
    
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    
    currentUserProfile.avatar_url = publicUrl;
    const newAvatarUrl = getAvatarUrl(currentUserProfile);
    const previewContainer = document.getElementById('avatar-preview');
    if (previewContainer) {
      previewContainer.innerHTML = renderAvatar(currentUserProfile, { sizeClass: 'w-20 h-20', textClass: 'text-2xl', sharedClasses: 'shadow-sm', variant: 'gradient', altFallback: 'Profile' });
    }
    const headerImg = document.querySelector('#header-container img');
    if (headerImg && newAvatarUrl) {
      headerImg.src = newAvatarUrl;
    }
    
    showToast('Profile picture updated!', 'success');

  } catch (error) {
    console.error('Avatar upload error:', error);
    showToast(error.message, 'error');
  } finally {
    isUploading = false;
    spinner.classList.add('hidden');
  }
}

async function handlePasswordUpdate(e) {
  e.preventDefault();
  const btn = document.getElementById('save-password-btn');
  const newPassword = document.getElementById('new_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  
  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match.', 'error');
    return;
  }
  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Updating...';

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Password changed successfully!', 'success');
    e.target.reset();
  }
  
  btn.disabled = false;
  btn.textContent = 'Update Password';
}

async function handleAddCard(e) {
  e.preventDefault();
  const btn = document.getElementById('save-card-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Adding...';

  const cardData = {
    p_card_type: document.getElementById('card_type').value,
    p_last_four: document.getElementById('last_four').value,
    p_expiry_month: document.getElementById('expiry_month').value,
    p_expiry_year: document.getElementById('expiry_year').value,
  };

  if (cardData.p_last_four.length !== 4 || isNaN(cardData.p_last_four)) {
    showToast('Please enter exactly 4 digits.', 'error');
    btn.disabled = false;
    btn.textContent = 'Add Card';
    return;
  }

  const { error } = await addPaymentMethod(cardData);

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Payment method added!', 'success');
    e.target.reset();
    loadSavedCards();
  }
  
  btn.disabled = false;
  btn.textContent = 'Add Card';
}

async function handleRoleUpdate(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-role-change');
  const userId = document.getElementById('modal-user-id').value;
  const newRole = document.getElementById('modal-role-select').value;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Saving...';
  
  const { error } = await updateUserRole(userId, newRole);
  
  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('User role updated successfully!', 'success');
    document.getElementById('role-modal').classList.add('hidden');
    renderUserManagementTab(); 
  }
  
  btn.disabled = false;
  btn.textContent = 'Save Changes';
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await initLayout();
  if (!authInfo) return; 
  userRole = authInfo.role; 
  currentUserProfile = authInfo.profile; 
  if (userRole === 'super_admin') {
    await loadSystemSettingsState();
  } else {
    await ensureThemeLoaded();
    const cached = getCachedTheme();
    if (cached) {
      const normalized = cloneSystemSettings(cached);
      systemSettings = normalized;
      systemSettingsDraft = cloneSystemSettings(normalized);
    }
  }
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = 'Admin Settings';

  renderPageContent();
});