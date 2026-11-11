## experimentalUi.ts

**Purpose:** Opt-in experimental UI family — parse and persist the unsigned `ap_ui` cookie, SSR `<html>` attributes, and client-side live toggling without reload.
**File:** `src/lib/experimentalUi.ts`

---

### Constants

| Name | Value |
|---|---|
| `AP_UI_COOKIE` | `ap_ui` |

Cookie values: `exp-dark`, `exp-light`; absent or any other value ⇒ off (`Max-Age` one year, `Path=/`, `SameSite=Lax`, `Secure` on `https` when set from the client).

---

### `parseApUiCookie(raw: string | undefined): ExperimentalUiMode`
Maps `exp-dark` → `dark`, `exp-light` → `light`, else `off`.

---

### `experimentalUiModeToCookieValue(mode: ExperimentalUiMode): string | null`
Inverse of parsing for writes; `off` → `null` (clear).

---

### `experimentalUiHtmlAttributes(mode: ExperimentalUiMode)`
Returns `{ data-ui: 'experimental', data-theme: 'dark' | 'light' }` when active, else `{}`.

---

### `getExperimentalUiFromCookies(): Promise<ExperimentalUiMode>` (`experimentalUi.server.ts`)

**File:** `src/lib/experimentalUi.server.ts` — `server-only`; reads `cookies()` from `next/headers`.

---

### `readExperimentalUiFromHtml(): ExperimentalUiMode`
Client-only: reads `data-ui` / `data-theme` on `document.documentElement`.

---

### `writeExperimentalUi(mode: ExperimentalUiMode): void`
Client-only: sets or clears the cookie and updates `document.documentElement` attributes in place.

---

### `isExperimentalUiActive(mode: ExperimentalUiMode): boolean`
`true` when mode is `dark` or `light`.

---

### `useExperimentalUi()` (`experimentalUi.client.ts`)

**File:** `src/lib/experimentalUi.client.ts` — `'use client'` boundary for the hook (imports this module’s read/write helpers).

**Returns:** `[mode, setMode]` — `setMode` calls `writeExperimentalUi` then updates React state.
