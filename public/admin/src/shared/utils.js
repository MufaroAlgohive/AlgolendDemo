// src/shared/utils.js

export const formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return 'ZAR 0.00';
    return new Intl.NumberFormat('en-ZA', { 
        style: 'currency', 
        currency: 'ZAR',
        minimumFractionDigits: 2
    }).format(num);
};

// **NEW: Compact formatter for cards (e.g. 1.2k, 1M)**
export const formatCompactNumber = (amount) => {
    const num = Number(amount);
    if (isNaN(num) || num === 0) return 'R 0';
    
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    }).format(num);
};

export const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};