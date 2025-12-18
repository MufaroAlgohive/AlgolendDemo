// src/modules/users.js
import { initLayout, getRole } from '../shared/layout.js';
import { fetchUsers, fetchUserStats, fetchUserDetail } from '../services/dataService.js';
import { formatCurrency, formatDate } from '../shared/utils.js';

// --- State ---
let allUsers = [];
let userRole = 'borrower';

// --- Helpers ---
const getRoleBadge = (role) => {
  switch (role) {
    case 'super_admin': return 'bg-red-100 text-red-800';
    case 'admin': return 'bg-blue-100 text-blue-800';
    case 'base_admin': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// --- FIX: Added the missing function here ---
const getBadgeColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
        case 'approved': case 'disbursed': return 'bg-green-100 text-green-800';
        case 'declined': return 'bg-red-100 text-red-800';
        case 'pending': case 'submitted': case 'started': return 'bg-yellow-100 text-yellow-800';
        case 'offered': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
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
    extraClasses = '',
    altFallback = 'User'
  } = options;

  const fullName = profile.full_name || altFallback;

  if (profile.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="${fullName}" class="${sizeClass} rounded-full object-cover ${extraClasses}">`;
  }

  return `<div class="avatar-placeholder ${sizeClass} ${textClass} ${extraClasses}" aria-hidden="true">${getInitials(fullName)}</div>`;
};

// --- Render Logic ---
function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div id="user-stats-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      ${renderStatCardLoading('Total Users')}
      ${renderStatCardLoading('Total Admins')}
      ${renderStatCardLoading('Total Borrowers')}
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
  `;
  attachEventListeners();
}

function renderUserList(users) {
  const listContainer = document.getElementById('user-list-container');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (!users || users.length === 0) {
    listContainer.innerHTML = `<p class="p-6 text-center text-gray-500 text-sm">No users found.</p>`;
    return;
  }

  users.forEach(user => {
    const card = document.createElement('button');
    card.className = 'user-card w-full text-left flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-all focus:outline-none focus:bg-orange-50 group';
    card.innerHTML = `
      ${renderAvatar(user, { sizeClass: 'w-10 h-10', textClass: 'text-xs', extraClasses: 'mr-3 border border-gray-200 group-hover:border-orange-300 transition-colors' })}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-gray-900 truncate group-hover:text-tertiary transition-colors">${user.full_name || 'Unknown'}</p>
        <p class="text-xs text-gray-500 truncate">${user.email || ''}</p>
      </div>
      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${getRoleBadge(user.role)} uppercase tracking-wider">${user.role?.replace('_', ' ')}</span>
    `;
    card.onclick = () => handleUserClick(user.id, card);
    listContainer.appendChild(card);
  });
}

async function handleUserClick(userId, cardElement) {
  const detailPanel = document.getElementById('user-detail-panel');
  
  // Visual feedback for selection
  document.querySelectorAll('.user-card').forEach(c => c.classList.remove('bg-orange-50', 'border-l-4', 'border-orange-500'));
  cardElement.classList.add('bg-orange-50', 'border-l-4', 'border-orange-500');

  detailPanel.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin text-3xl text-orange-500"></i>
      <p class="mt-3 font-medium">Loading user details...</p>
    </div>`;

  try {
    const { data, error } = await fetchUserDetail(userId);
    if (error) throw new Error(error);
    renderUserDetail(data);
  } catch (err) {
    console.error("Detail render error:", err);
    detailPanel.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="p-6 bg-red-50 text-red-800 rounded-xl border border-red-100 text-center max-w-md">
                <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
                <p class="font-bold">Failed to load user</p>
                <p class="text-sm mt-1">${err.message}</p>
            </div>
        </div>`;
  }
}

function renderUserDetail(data) {
  const detailPanel = document.getElementById('user-detail-panel');
  if (!data || !data.profile) {
    detailPanel.innerHTML = `<div class="p-4 text-gray-500">User data not found.</div>`;
    return;
  }

  const { profile, financials, applications } = data;

  detailPanel.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        ${renderAvatar(profile, { sizeClass: 'w-20 h-20', textClass: 'text-2xl', extraClasses: 'border-4 border-gray-50 shadow-sm' })}
        <div class="text-center sm:text-left">
          <h2 class="text-2xl font-bold text-gray-900">${profile.full_name || 'Unknown'}</h2>
          <p class="text-gray-500">${profile.email}</p>
          <div class="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
             <span class="px-3 py-1 text-xs font-bold rounded-full ${getRoleBadge(profile.role)} uppercase tracking-wider">${profile.role?.replace('_', ' ')}</span>
             <span class="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600 font-mono border border-gray-200">ID: ${profile.id}</span>
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
                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span class="text-gray-500">Phone</span> <span class="font-medium font-mono text-gray-900">${profile.contact_number || 'Not provided'}</span></div>
                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded"><span class="text-gray-500">Joined</span> <span class="font-medium text-gray-900">${formatDate(profile.created_at)}</span></div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                <i class="fa-solid fa-coins text-gray-400"></i> Financial Snapshot
            </h3>
            ${financials ? `
                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div class="p-4 bg-green-50 rounded-xl border border-green-100">
                        <div class="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Monthly Income</div>
                        <div class="text-xl font-extrabold text-gray-900">${formatCurrency(financials.monthly_income)}</div>
                    </div>
                    <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div class="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">Monthly Expenses</div>
                        <div class="text-xl font-extrabold text-gray-900">${formatCurrency(financials.monthly_expenses)}</div>
                    </div>
                </div>
            ` : `<div class="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm">No financial profile data.</div>`}
        </div>
    </div>

    <div class="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up" style="animation-delay: 0.1s;">
        <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
                <i class="fa-solid fa-file-signature text-gray-400"></i> Application History
            </h3>
            <span class="bg-white px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200">${applications.length}</span>
        </div>
        
        ${applications.length > 0 ? `
            <div class="divide-y divide-gray-100">
                ${applications.map(app => `
                    <a href="/admin/application-detail?id=${app.id}" class="block p-4 hover:bg-gray-50 transition-all flex items-center justify-between group">
                        <div>
                            <div class="font-bold text-gray-900 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                ${formatCurrency(app.amount)} 
                                <span class="text-gray-400 text-xs font-normal">• ${app.purpose || 'Personal Loan'}</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <i class="fa-regular fa-calendar"></i> ${formatDate(app.created_at)}
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 text-xs font-bold rounded-full ${getBadgeColor(app.status)} capitalize shadow-sm border border-white/20">
                                ${app.status}
                            </span>
                            <i class="fa-solid fa-chevron-right text-gray-300 text-xs group-hover:text-orange-400"></i>
                        </div>
                    </a>
                `).join('')}
            </div>
        ` : `<div class="p-12 text-center text-gray-400 italic">No loan applications found for this user.</div>`}
    </div>
  `;
}

// --- Initialization ---
function renderStatCardLoading(title) {
  return `<div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100"><p class="text-xs font-bold uppercase text-gray-400 mb-2">${title}</p><div class="h-8 w-16 bg-gray-100 rounded animate-pulse"></div></div>`;
}

async function renderUserStats() {
  const statsContainer = document.getElementById('user-stats-cards');
  if (!statsContainer) return;
  
  try {
      const { data, error } = await fetchUserStats();
      if (error) throw error;
      
      if (data) {
        statsContainer.innerHTML = `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Total Users</p>
                <p class="mt-2 text-3xl font-extrabold text-gray-900">${data.total_users}</p>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Admins</p>
                <p class="mt-2 text-3xl font-extrabold text-blue-600">${data.total_admins}</p>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <p class="text-xs font-bold uppercase text-gray-400 tracking-wider">Borrowers</p>
                <p class="mt-2 text-3xl font-extrabold text-orange-600">${data.total_borrowers}</p>
            </div>`;
      }
  } catch (e) {
      statsContainer.innerHTML = `<div class="col-span-3 p-4 bg-red-50 text-red-600 text-sm rounded-lg text-center">Failed to load stats.</div>`;
  }
}

const filterAndRender = () => {
  const search = document.getElementById('user-search-input')?.value.toLowerCase() || '';
  const role = document.getElementById('role-filter')?.value || 'all';
  
  const filtered = allUsers.filter(user => {
    const matchesRole = role === 'all' || user.role === role;
    const matchesSearch = (user.full_name || '').toLowerCase().includes(search) || (user.email || '').toLowerCase().includes(search);
    return matchesRole && matchesSearch;
  });
  renderUserList(filtered);
};

function attachEventListeners() {
  document.getElementById('user-search-input')?.addEventListener('input', filterAndRender);
  document.getElementById('role-filter')?.addEventListener('change', filterAndRender);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initLayout();
  renderPageContent();
  await renderUserStats();
  
  try {
      const { data, error } = await fetchUsers();
      if (error) throw error;
      allUsers = data;
      filterAndRender();
  } catch (e) {
      const list = document.getElementById('user-list-container');
      if(list) list.innerHTML = `<p class="p-6 text-center text-red-500 text-sm">Failed to load users.</p>`;
  }
});