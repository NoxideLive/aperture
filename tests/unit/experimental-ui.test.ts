// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  AP_UI_COOKIE,
  experimentalUiHtmlAttributes,
  experimentalUiModeToCookieValue,
  parseApUiCookie,
} from '@/lib/experimentalUi';

describe('parseApUiCookie', () => {
  it.each([
    ['exp-dark', 'dark'],
    ['exp-light', 'light'],
  ] as const)('maps %s to %s', (raw, mode) => {
    expect(parseApUiCookie(raw)).toBe(mode);
  });

  it.each(['', 'garbage', 'dark', 'exp', undefined])('treats %j as off', (raw) => {
    expect(parseApUiCookie(raw)).toBe('off');
  });
});

describe('experimentalUiModeToCookieValue', () => {
  it.each([
    ['dark', 'exp-dark'],
    ['light', 'exp-light'],
    ['off', null],
  ] as const)('maps %s to %j', (mode, cookie) => {
    expect(experimentalUiModeToCookieValue(mode)).toBe(cookie);
  });
});

describe('experimentalUiHtmlAttributes', () => {
  it('returns empty when off', () => {
    expect(experimentalUiHtmlAttributes('off')).toEqual({});
  });

  it('sets data-ui and data-theme when active', () => {
    expect(experimentalUiHtmlAttributes('dark')).toEqual({
      'data-ui': 'experimental',
      'data-theme': 'dark',
    });
    expect(experimentalUiHtmlAttributes('light')).toEqual({
      'data-ui': 'experimental',
      'data-theme': 'light',
    });
  });
});

describe('getExperimentalUiFromCookies', () => {
  it('reads the ap_ui cookie via next/headers', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(async () => ({
        get: (name: string) => (name === AP_UI_COOKIE ? { value: 'exp-light' } : undefined),
      })),
    }));
    const { getExperimentalUiFromCookies } = await import('@/lib/experimentalUi.server');
    await expect(getExperimentalUiFromCookies()).resolves.toBe('light');
    vi.doUnmock('next/headers');
  });
});
