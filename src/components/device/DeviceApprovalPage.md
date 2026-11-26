## DeviceApprovalPage

**Purpose:** Lets a signed-in user approve or deny a device authorization request and pick which map to mint a token on.
**File:** `src/components/device/DeviceApprovalPage.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| userCode | string | yes | The `user_code` from the device flow URL |

### Behaviour & Interactions
- Loads pending session and eligible maps via `getDeviceApprovalState`.
- Only lists maps with `apiEnabled` whose exposed scopes cover the request.
- **Deny** is always available, even when no map qualifies; it calls `submitDeviceApproval` with `approve: false`.
- Approve requires a selected map and calls `submitDeviceApproval` with `approve: true` and `mapId`.
- After approval, when the server returns a raw token, shows it once with a copy control and notes that the desktop client can also receive it via poll.

### Renders
Pending form with client label, requested scopes, map picker, Approve and Deny. Approved state shows optional one-time token display; denied state is a short confirmation.

### Emits / Calls
- `getDeviceApprovalState`, `submitDeviceApproval` server actions