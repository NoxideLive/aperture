## signaturePaste.ts

**Purpose:** Server-side handler for `POST /api/v1/signatures/paste` — parses probe-scanner text and commits the same lazy-delete bulk paste the web UI uses.
**File:** `src/lib/userApi/signaturePaste.ts`

### serveUserApiSignaturePaste
**Parameters:** the HTTP request and an authorised `UserApiTokenRecord` with the `signatures_write` scope.

Parses `systemId` and `text`, runs `parseSignaturePaste`, resolves rows, and calls `pasteSignatures` with `LAZY_DELETE_PASTE_OPTIONS`. Attributes the change to the token owner's main character. Clears projection caches after a successful commit.

**Returns:** `UserApiMutationOutcome` with summary counts on success. Refusals use `invalid_request`, `payload_too_large` when `text` exceeds `USER_API_SIGNATURE_PASTE_MAX_TEXT`, `not_scanner_data`, `paste_too_many_rows` (more than 500 parsed rows), `system_not_on_map` (404), or `access_lost` when the account has no usable main.