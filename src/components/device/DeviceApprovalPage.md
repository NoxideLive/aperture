## DeviceApprovalPage

**Purpose:** Lets a signed-in user approve or deny a device authorization request and pick which map to mint a token on.
**File:** `src/components/device/DeviceApprovalPage.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| userCode | string | yes | The `user_code` from the device flow URL |

### Behaviour & Interactions
- Loads pending session and eligible maps via `getDeviceApprovalState`.
- Only lists maps with `apiEnabled`.
- Approve calls `submitDeviceApproval` with the chosen `mapId`.

### Emits / Calls
- `getDeviceApprovalState`, `submitDeviceApproval` server actions