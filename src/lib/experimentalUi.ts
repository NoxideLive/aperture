export const AP_UI_COOKIE = 'ap_ui';

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/** Resolved experimental UI mode derived from the `ap_ui` cookie or `<html>` attributes. */
export type ExperimentalUiMode = 'off' | 'dark' | 'light';

/** Parse the raw `ap_ui` cookie value (`exp-dark` | `exp-light`; anything else ⇒ off). */
export function parseApUiCookie(raw: string | undefined): ExperimentalUiMode {
  if (raw === 'exp-dark') return 'dark';
  if (raw === 'exp-light') return 'light';
  return 'off';
}

/** Cookie value written for a given mode (`off` clears the cookie). */
export function experimentalUiModeToCookieValue(mode: ExperimentalUiMode): string | null {
  switch (mode) {
    case 'dark':
      return 'exp-dark';
    case 'light':
      return 'exp-light';
    case 'off':
      return null;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** `data-ui` / `data-theme` props for `<html>` when SSR knows the cookie (empty when off). */
export function experimentalUiHtmlAttributes(
  mode: ExperimentalUiMode,
): { 'data-ui'?: 'experimental'; 'data-theme'?: 'dark' | 'light' } {
  if (mode === 'off') return {};
  return { 'data-ui': 'experimental', 'data-theme': mode };
}

/** Read the mode from the live `<html>` attributes (client-only). */
export function readExperimentalUiFromHtml(): ExperimentalUiMode {
  if (typeof document === 'undefined') return 'off';
  const root = document.documentElement;
  if (root.getAttribute('data-ui') !== 'experimental') return 'off';
  const theme = root.getAttribute('data-theme');
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  return 'off';
}

function secureCookieSuffix(): string {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
}

/** Persist the preference and mirror it on `<html>` without a reload. */
export function writeExperimentalUi(mode: ExperimentalUiMode): void {
  const root = document.documentElement;
  const suffix = secureCookieSuffix();

  if (mode === 'off') {
    root.removeAttribute('data-ui');
    root.removeAttribute('data-theme');
    document.cookie = `${AP_UI_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${suffix}`;
    return;
  }

  root.setAttribute('data-ui', 'experimental');
  root.setAttribute('data-theme', mode);
  const value = experimentalUiModeToCookieValue(mode);
  if (value) {
    document.cookie = `${AP_UI_COOKIE}=${value}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax${suffix}`;
  }
}

export function isExperimentalUiActive(mode: ExperimentalUiMode): boolean {
  return mode !== 'off';
}
