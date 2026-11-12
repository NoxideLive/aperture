'use client';

import { readExperimentalUiFromHtml, isExperimentalUiActive } from '@/lib/experimentalUi';

const EXIT_ORIGIN_KEY = 'aperture:experimental:route-exit-origin';
const INCLUDE_JUMPBRIDGE_KEY = 'aperture:experimental:route-include-jb';

export type ExperimentalExitOrigin = 'chain' | 'selected';

export const EXPERIMENTAL_INCLUDE_JUMPBRIDGE_DEFAULT = true;

function experimentalOnly<T>(read: () => T, fallback: T): T {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return fallback;
  return read();
}

export function readExperimentalExitOrigin(): ExperimentalExitOrigin {
  return experimentalOnly(() => {
    try {
      return localStorage.getItem(EXIT_ORIGIN_KEY) === 'selected' ? 'selected' : 'chain';
    } catch {
      return 'chain';
    }
  }, 'chain');
}

export function writeExperimentalExitOrigin(v: ExperimentalExitOrigin): void {
  try {
    localStorage.setItem(EXIT_ORIGIN_KEY, v);
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent('aperture:experimental-route-prefs'));
}

export function readExperimentalIncludeJumpBridge(): boolean {
  return experimentalOnly(() => {
    try {
      const raw = localStorage.getItem(INCLUDE_JUMPBRIDGE_KEY);
      if (raw === null) return EXPERIMENTAL_INCLUDE_JUMPBRIDGE_DEFAULT;
      return raw === '1';
    } catch {
      return EXPERIMENTAL_INCLUDE_JUMPBRIDGE_DEFAULT;
    }
  }, true);
}

export function writeExperimentalIncludeJumpBridge(on: boolean): void {
  try {
    localStorage.setItem(INCLUDE_JUMPBRIDGE_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent('aperture:experimental-route-prefs'));
}

export function subscribeExperimentalRoutePrefs(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener('aperture:experimental-route-prefs', handler);
  return () => window.removeEventListener('aperture:experimental-route-prefs', handler);
}
