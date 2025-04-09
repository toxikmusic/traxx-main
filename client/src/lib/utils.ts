import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges Tailwind CSS classes using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the system theme preference (dark or light)
 */
export function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Applies a theme to the document root element
 */
export function applyTheme(theme: 'dark' | 'light' | 'system'): void {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('dark', 'light');
  
  // Apply the appropriate theme
  if (theme === 'system') {
    root.classList.add(getSystemTheme());
  } else {
    root.classList.add(theme);
  }
}

/**
 * Detects if high contrast mode should be enabled
 */
export function shouldUseHighContrast(): boolean {
  // Check for prefers-contrast media query
  return window.matchMedia('(prefers-contrast: more)').matches;
}