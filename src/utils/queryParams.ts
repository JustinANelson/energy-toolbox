/**
 * Utility functions for reading and writing calculator state to URL query parameters.
 */

// Get the active tool ID from the URL query string
export function getActiveToolFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('tool');
}

// Set the active tool ID in the URL without reloading
export function setActiveToolInUrl(toolId: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  
  // If we change the tool, we clear other parameters to avoid mixing states,
  // or we keep them if we want to retain state. Let's clear other params
  // so the new tool loads with its own url parameters or defaults.
  url.search = `?tool=${toolId}`;
  window.history.replaceState({ path: url.toString() }, '', url.toString());
}

// Parse tool state from the URL, using default values for missing keys
export function getToolStateFromUrl<T extends Record<string, any>>(
  defaults: T
): T {
  if (typeof window === 'undefined') return defaults;
  const params = new URLSearchParams(window.location.search);
  const state = { ...defaults };

  Object.keys(defaults).forEach((key) => {
    const val = params.get(key);
    if (val !== null) {
      const defaultValue = defaults[key];
      if (typeof defaultValue === 'number') {
        const parsedNum = parseFloat(val);
        state[key as keyof T] = (isNaN(parsedNum) ? defaultValue : parsedNum) as any;
      } else if (typeof defaultValue === 'boolean') {
        state[key as keyof T] = (val === 'true') as any;
      } else {
        state[key as keyof T] = val as any;
      }
    }
  });

  return state;
}

// Write the current active tool and its inputs to the URL parameters
export function updateUrlForTool(toolId: string, state: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tool', toolId);
  
  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    } else {
      url.searchParams.delete(key);
    }
  });

  window.history.replaceState({ path: url.toString() }, '', url.toString());
}

// Helper to copy current URL to clipboard
export async function copyShareLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch (err) {
    console.error('Failed to copy link:', err);
    return false;
  }
}
