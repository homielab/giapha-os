# Mobile API Reference - v1.8.0

This document describes the backend API endpoints for the Giapha OS mobile application (React Native/Expo).

## Base URL

```
Production: https://giapha-os.vercel.app/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All endpoints (except `/auth/login` and `/auth/refresh`) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained from the `/auth/login` endpoint and refreshed using `/auth/refresh`.

## Endpoints

### Authentication

#### POST /auth/login

Authenticate a user and obtain access/refresh tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "refresh_token_...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_role": "member",
  "user_email": "user@example.com",
  "user_name": "John Doe"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email/password format
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limited (3 attempts per 5 minutes)

**Rate Limiting:**
- Maximum 3 failed login attempts per 5-minute window per IP
- Returns `Retry-After` header with seconds to wait

**Code Examples:**

**cURL:**
```bash
curl -X POST https://giapha-os.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

**TypeScript (React Native):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function login(email: string, password: string) {
  const response = await fetch('https://giapha-os.vercel.app/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Store tokens securely
  await AsyncStorage.setItem('access_token', data.access_token);
  await AsyncStorage.setItem('refresh_token', data.refresh_token);
  
  return data;
}
```

**Python:**
```python
import requests
import json

def login(email: str, password: str):
    response = requests.post(
        'https://giapha-os.vercel.app/api/v1/auth/login',
        json={'email': email, 'password': password}
    )
    response.raise_for_status()
    data = response.json()
    
    # Store tokens (use keyring for production)
    with open('.auth.json', 'w') as f:
        json.dump(data, f)
    
    return data

try:
    result = login('user@example.com', 'securePassword123')
    print(f"Logged in as {result['user_name']}")
except requests.exceptions.RequestException as e:
    print(f"Login failed: {e}")
```

---

#### POST /auth/refresh

Refresh an expired access token using a refresh token.

**Request:**
```json
{
  "refresh_token": "refresh_token_..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "refresh_token_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid refresh token
- `401 Unauthorized`: Refresh token expired or revoked

**Code Examples:**

**TypeScript (React Native):**
```typescript
async function refreshToken(refreshToken: string) {
  const response = await fetch('https://giapha-os.vercel.app/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  await AsyncStorage.setItem('access_token', data.access_token);
  
  return data;
}

// Use in fetch interceptor
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = await AsyncStorage.getItem('access_token');
  
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const newTokens = await refreshToken(refreshToken!);
    token = newTokens.access_token;
    
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  return response;
}
```

---

### Data Sync

#### GET /sync

Fetch incremental changes since a given timestamp (offline-first sync).

**Query Parameters:**
- `since` (optional): ISO 8601 timestamp. Default: 24 hours ago
- `branch_id` (optional): UUID. Filter to specific branch

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-03-07T21:59:00Z",
  "persons": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "branch_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "full_name": "Nguyễn Văn A",
      "date_of_birth": "1980-01-15",
      "date_of_death": null,
      "gender": "male",
      "lunar_date_of_birth": "1979-12-10",
      "lunar_date_of_death": null,
      "religion": "buddhist",
      "updated_at": "2026-03-07T20:00:00Z"
    }
  ],
  "relationships": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "person_id": "550e8400-e29b-41d4-a716-446655440000",
      "related_person_id": "770e8400-e29b-41d4-a716-446655440000",
      "relationship_type": "child",
      "updated_at": "2026-03-07T19:00:00Z"
    }
  ],
  "custom_events": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "person_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_name": "Wedding",
      "event_date": "2005-06-20",
      "lunar_month": 5,
      "lunar_day": 14,
      "updated_at": "2026-03-07T18:00:00Z"
    }
  ],
  "changes": {
    "persons": 3,
    "relationships": 2,
    "events": 1
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid timestamp format
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Database error

**Conflict Resolution:**
Uses last-write-wins strategy based on `updated_at` timestamp. The client should:
1. Keep local row if local `updated_at` > server `updated_at`
2. Replace with server row otherwise

**Code Examples:**

**TypeScript (React Native):**
```typescript
import SQLite from 'react-native-sqlite-storage';

async function syncData(since?: Date) {
  const token = await AsyncStorage.getItem('access_token');
  const sinceParam = since ? since.toISOString() : '';
  
  const response = await fetch(
    `https://giapha-os.vercel.app/api/v1/sync?since=${sinceParam}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Sync failed');
  }

  const data = await response.json();
  const db = await SQLite.openDatabase({ name: 'giapha.db' });

  // Merge persons
  for (const person of data.persons) {
    await db.executeSql(
      `INSERT OR REPLACE INTO persons (id, full_name, updated_at, ...)
       VALUES (?, ?, ?, ...)
       WHERE updated_at < ?`,
      [person.id, person.full_name, person.updated_at, person.updated_at]
    );
  }

  // Similar for relationships and events
  
  return data.changes;
}

// Schedule sync every 5 minutes when online
useEffect(() => {
  const interval = setInterval(() => {
    syncData();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

**Python:**
```python
import requests
from datetime import datetime, timedelta

def sync_data(access_token: str, since: datetime = None):
    if since is None:
        since = datetime.now() - timedelta(days=1)
    
    params = {'since': since.isoformat()}
    headers = {'Authorization': f'Bearer {access_token}'}
    
    response = requests.get(
        'https://giapha-os.vercel.app/api/v1/sync',
        params=params,
        headers=headers
    )
    response.raise_for_status()
    
    data = response.json()
    print(f"Synced {data['changes']['persons']} persons, "
          f"{data['changes']['relationships']} relationships, "
          f"{data['changes']['events']} events")
    
    return data
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

**Common Error Codes:**
- `INVALID_JSON`: Request body is not valid JSON
- `INVALID_EMAIL`: Email format is invalid
- `INVALID_PASSWORD`: Password too short or invalid
- `AUTH_FAILED`: Email/password authentication failed
- `INVALID_TOKEN`: JWT token is invalid or expired
- `RATE_LIMITED`: Too many requests
- `SYNC_ERROR`: Database error during sync
- `INTERNAL_ERROR`: Server error

---

## Best Practices for Mobile

### 1. Token Management
- Store refresh tokens in SecureStore (Expo SecureStore module)
- Keep access tokens in memory
- Refresh tokens 1 minute before expiry
- Implement automatic refresh on 401 responses

### 2. Offline Sync
- Sync on app launch
- Sync every 5 minutes when online (use NetInfo to detect)
- Batch changes before uploading
- Show "Syncing..." indicator during sync

### 3. Conflict Resolution
- Always check `updated_at` timestamps
- Use last-write-wins for conflicts
- Log conflicts for debugging
- Consider implementing vector clocks for concurrent edits (future)

### 4. Error Handling
- Retry failed requests with exponential backoff
- Show user-friendly error messages
- Log errors to error tracking (Sentry)
- Handle network timeouts gracefully

### 5. Performance
- Use pagination for large datasets (future enhancement)
- Compress JSON payloads (gzip)
- Cache responses locally
- Debounce sync operations

---

## Rate Limits

### Login Endpoint
- 3 failed attempts per 5 minutes per IP
- Returns `429 Too Many Requests` when limit exceeded
- Check `Retry-After` header for wait time

### Sync Endpoint
- 100 requests per hour per user
- 10,000 total rows per hour
- Returns `429 Too Many Requests` if exceeded

---

## Changelog

### v1.8.0 (Current)
- Added JWT authentication endpoints (/auth/login, /auth/refresh)
- Added incremental sync endpoint (/sync)
- Implemented rate limiting for login
- Added token rotation tracking

### Future (v1.9.0+)
- Push notification endpoints
- Batch mutation endpoint for offline changes
- Pagination for large datasets
- Webhooks for real-time sync

---

### Push Notifications

#### POST /notifications/tokens

Register a push notification token (device token from Expo/Firebase).

**Request:**
```json
{
  "token": "ExponentPushToken[abc123...]",
  "platform": "ios",
  "device_name": "iPhone 15 Pro",
  "device_os_version": "18.2"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "ExponentPushToken[abc123...]",
  "platform": "ios",
  "created_at": "2026-03-07T21:59:00Z"
}
```

**Code Examples:**

**TypeScript (React Native/Expo):**
```typescript
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function registerPushToken(accessToken: string) {
  // Get Expo push token
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas.projectId,
  });

  const response = await fetch('https://giapha-os.vercel.app/api/v1/notifications/tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      device_name: Constants.deviceName,
      device_os_version: Platform.Version.toString(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to register token');
  }

  const data = await response.json();
  console.log('Token registered:', data.id);
  return data;
}

// Register on app start and after login
useEffect(() => {
  (async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      await registerPushToken(token);
    }
  })();
}, []);
```

---

#### GET /notifications/tokens

List all registered push notification tokens for current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "tokens": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "token": "ExponentPushToken[abc123...]",
      "platform": "ios",
      "device_name": "iPhone 15 Pro",
      "is_active": true,
      "last_used_at": "2026-03-07T21:55:00Z",
      "created_at": "2026-03-07T21:59:00Z"
    }
  ],
  "count": 1
}
```

---

#### DELETE /notifications/tokens?token=<token>

Unregister a push notification token (e.g., when user logs out).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Token deleted successfully"
}
```

**Code Example:**

**TypeScript (React Native):**
```typescript
async function unregisterPushToken(accessToken: string, token: string) {
  const response = await fetch(
    `https://giapha-os.vercel.app/api/v1/notifications/tokens?token=${encodeURIComponent(token)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to unregister token');
  }

  return await response.json();
}

// Call when user logs out
async function logout() {
  const token = await Notifications.getExpoPushTokenAsync();
  const accessToken = await AsyncStorage.getItem('access_token');
  
  await unregisterPushToken(accessToken!, token.data);
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
}
```

---

## Mobile Sync Strategy

### Data Flow
1. **Auth Phase**
   - User provides email/password
   - Receive JWT (valid 1 hour) + refresh token (valid 7 days)
   - Store refresh token in SecureStore

2. **Sync Phase**
   - Query `since=<last_sync_timestamp>`
   - Receive persons, relationships, custom_events
   - Apply changes to local SQLite DB
   - Use last-write-wins for conflicts

3. **Push Notifications**
   - Register device token on app start
   - Server sends notifications when family events occur
   - User can opt-in/out in app settings

### Offline Handling
- All reads use local SQLite database
- All writes are queued locally
- When online, batch changes to server
- Sync endpoint merges conflicts

### Rate Limits Applied
- Login: 3 attempts per 5 minutes per IP
- Sync: 100 requests per hour per user
- Notifications: No limit on receipt (server-side rate limited)

---

## Implementation Checklist

### Week 1: Authentication ✅
- [x] POST /auth/login endpoint
- [x] POST /auth/refresh endpoint
- [x] JWT token generation and validation
- [x] Rate limiting for login
- [x] Token storage in refresh_tokens table

### Week 2: Sync ✅
- [x] GET /sync endpoint
- [x] Incremental sync by timestamp
- [x] Conflict resolution (last-write-wins)
- [x] Sync logging for monitoring
- [x] Branch filtering support

### Week 3: Push Notifications ✅
- [x] POST /notifications/tokens endpoint
- [x] GET /notifications/tokens endpoint
- [x] DELETE /notifications/tokens endpoint
- [x] POST /notifications/send endpoint (internal)
- [x] Notification token CRUD
- [x] Token expiration and cleanup

### Testing (Recommended)
- [ ] cURL or Postman tests for each endpoint
- [ ] Integration tests with sample data
- [ ] Performance testing with 10k+ users
- [ ] End-to-end tests with Expo app

---

## Troubleshooting

### "Invalid JSON in request body"
- Verify Content-Type header is `application/json`
- Check JSON is valid (use jq or online validator)
- Ensure body is not empty

### "Too many login attempts"
- Wait for Retry-After seconds (check response header)
- Verify email/password before retrying
- Consider suggesting password reset to user

### "Token refresh failed"
- Refresh token may be expired (7 days)
- User logged in from multiple devices (token invalidated)
- User explicitly revoked token in settings
- Solution: Redirect to login screen

### "Failed to fetch tokens"
- User may not have registered any devices yet
- Check Authorization header is correct
- Verify user has valid access token

### Notifications not arriving
- Device token may be invalid (check is_active flag)
- Check if push service (Expo/Firebase) is correctly configured
- Verify notification_logs table for delivery status
- Check OS notification settings on device

---

## Security Best Practices

1. **Token Storage**
   - Store refresh tokens in SecureStore, NOT SharedPreferences
   - Store access tokens in memory only
   - Clear tokens on logout

2. **Network Security**
   - Always use HTTPS (not HTTP)
   - Implement certificate pinning for production
   - Add request signing to prevent tampering

3. **Input Validation**
   - Validate email format on client
   - Validate password minimum length (8 chars)
   - Sanitize user input in custom_events

4. **Rate Limiting**
   - Respect Retry-After headers
   - Implement exponential backoff for failed requests
   - Don't hammer endpoints with rapid requests

5. **Error Handling**
   - Don't expose detailed error messages to user
   - Log errors for debugging
   - Show generic "Something went wrong" message

---

## What's Next

### Phase 3: Mobile App MVP (Q2 2026)
- React Native project setup
- Auth + Secure Storage integration
- SQLite offline database
- Family tree visualization
- App Store + Play Store launch

### Future Enhancements
- Batch mutation endpoint for offline changes
- Pagination for large datasets
- Webhooks for real-time sync
- Vector clocks for concurrent edit resolution
- E2E encryption for sensitive data
