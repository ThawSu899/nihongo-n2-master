export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nihongo-theme';

/**
 * Retrieves the persisted theme from localStorage.
 * Defaults to 'light' ("Modern Academic Paper").
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Fallback if localStorage is unavailable
  }
  return 'light';
}

/**
 * Applies the theme by toggling the `dark` class on the document root
 * and persists the preference to localStorage.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Synchronize browser theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#09090b' : '#f5f5f4');
    }

    // Broadcast change for multi-component or tab sync
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  } catch {
    // Ignore storage/DOM errors in restricted environments
  }
}

/**
 * Initializes the theme state on app load.
 */
export function initTheme(): ThemeMode {
  const current = getStoredTheme();
  applyTheme(current);
  return current;
}
