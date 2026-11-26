## deviceAuth.ts

**Purpose:** Server Actions for the `/device` approval page.
**File:** `src/app/(app)/actions/deviceAuth.ts`

### getDeviceApprovalState(userCode)
Loads a pending session and the maps the signed-in account may authorize.

### submitDeviceApproval(input)
Calls `decideDeviceAuthorization` with the session character as audit actor.