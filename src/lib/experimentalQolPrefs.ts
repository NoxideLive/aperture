'use client';

import { readExperimentalUiFromHtml, isExperimentalUiActive } from '@/lib/experimentalUi';

const KEEP_SELECTION_KEY = 'aperture:experimental:keep-map-selection';
const POINTER_CURSOR_KEY = 'aperture:experimental:pointer-cursor';
const PASTE_PREVIEW_KEY = 'aperture:experimental:paste-preview';

export const EXPERIMENTAL_POINTER_CURSOR_DEFAULT = true;

function experimentalOnly<T>(read: () => T, fallback: T): T {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return fallback;
  return read();
}

export function readKeepMapSelection(): boolean {
  return experimentalOnly(() => {
    try {
      return localStorage.getItem(KEEP_SELECTION_KEY) === '1';
    } catch {
      return false;
    }
  }, false);
}

export function writeKeepMapSelection(on: boolean): void {
  try {
    localStorage.setItem(KEEP_SELECTION_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent('aperture:experimental-qol-prefs'));
}

export function readExperimentalPointerCursor(): boolean {
  return experimentalOnly(() => {
    try {
      const raw = localStorage.getItem(POINTER_CURSOR_KEY);
      if (raw === null) return EXPERIMENTAL_POINTER_CURSOR_DEFAULT;
      return raw === '1';
    } catch {
      return EXPERIMENTAL_POINTER_CURSOR_DEFAULT;
    }
  }, false);
}

export function writeExperimentalPointerCursor(on: boolean): void {
  try {
    localStorage.setItem(POINTER_CURSOR_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  applyPointerCursorAttribute(on);
  window.dispatchEvent(new CustomEvent('aperture:experimental-qol-prefs'));
}

export function applyPointerCursorAttribute(on: boolean): void {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) {
    document.documentElement.removeAttribute('data-pointer-cursor');
    return;
  }
  document.documentElement.setAttribute('data-pointer-cursor', on ? 'on' : 'off');
}

export function readPastePreviewOnCtrlV(): boolean {
  return experimentalOnly(() => {
    try {
      return localStorage.getItem(PASTE_PREVIEW_KEY) === '1';
    } catch {
      return false;
    }
  }, false);
}

export function writePastePreviewOnCtrlV(on: boolean): void {
  try {
    localStorage.setItem(PASTE_PREVIEW_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent('aperture:experimental-qol-prefs'));
}
