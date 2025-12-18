// theme-init.js
// Temporarily disabled to prevent "require" errors
console.log("Theme init skipped for stability");

import { ensureThemeLoaded } from './theme-runtime.js';

const loadTheme = () => {
  try {
    return ensureThemeLoaded();
  } catch (error) {
    console.error('Theme init failed:', error);
    return Promise.resolve();
  }
};

loadTheme();
