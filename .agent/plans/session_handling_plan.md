# Session Handling & Idle Timeout Plan

## 1. Objective
Implement a user-configurable session timeout system that monitors inactivity, warns the user before expiration, and allows them to extend their session or auto-logs them out.

## 2. Backend Implementation (HR.Api)

### AuthController Updates
*   **New Endpoint**: `POST /api/Auth/refresh-token`
    *   **Authorization**: Requires a valid (non-expired) JWT token in headers.
    *   **Logic**: 
        *   Validates the current user is still active.
        *   Generates and returns a **new** JWT token with a fresh expiration time (resetting the clock).
    *   **Why**: This allows the "Stay Connected" button to actually extend the session on the server side, not just the frontend timer.

## 3. Frontend Implementation (hr-web)

### A. Global Error Handling (api.js)
*   **Response Interceptor**: Add an interceptor to `api.js` to catch `401 Unauthorized` errors.
*   **Action**: If a 401 is received (meaning token expired or is invalid), automatically clear `localStorage` and redirect to `/login`. This prevents the "empty screen" issue.

### B. Session Context / Manager
*   Create a `SessionContext.js` to manage:
    *   `limit`: The timeout limit (e.g., 15 minutes, 30 minutes). Configurable by user.
    *   `lastActivity`: Timestamp of last user interaction.
    *   `isWarningVisible`: State to show the modal.

### C. Idle Monitor Component
*   **New Component**: `components/common/SessionMonitor.js`
*   **Events**: Listen for `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`.
*   **Logic**:
    *   **Inactivity Timer**: reset on any event (throttled).
    *   **Warning Zone**: When time remaining < 2 minutes (variable), show "Session Expiring" modal.
    *   **Countdown**: Show a live countdown in the modal.

### D. "Stay Connected" Modal
*   **UI**: "Your session will expire in 01:59. Do you want to stay signed in?"
*   **Action - Yes**: 
    *   Call `authService.refreshToken()`.
    *   Update `localStorage` with new token.
    *   Hide modal and reset timer.
*   **Action - No / Timeout**: 
    *   Call `authService.logout()`.
    *   Redirect to login.

### E. User Settings (Optional/Phase 2)
*   Add a setting in the user profile or navbar to "Set Session Timeout" (e.g., 15m, 30m, 1h). Default to match backend JWT expiry (e.g., 60m).

## 4. Implementation Steps

### Step 1: Backend Refresh
*   [ ] Modify `AuthController.cs` to add `RefreshToken` method.
*   [ ] Verify `GenerateJwtToken` is reusable.

### Step 2: API Interceptor
*   [ ] Update `services/api.js` to handle 401 redirects.

### Step 3: Frontend Feature
*   [ ] Create `SessionMonitor.js`.
*   [ ] Implement the Modal UI.
*   [ ] Integrate into `App.js` or `DashboardLayout`.

### Step 4: Configuration
*   [ ] Ensure frontend timer syncs (roughly) with backend JWT expiry to avoid "Token Expired" errors appearing before the idle warning. 
    *   *Strategy*: Set default frontend idle limit to slightly *less* than backend token lifetime.
