# Giapha OS — Mobile App Development Plan

**Version:** v1.0 (Planning)  
**Target Release:** Q2-Q3 2026  
**Platform:** iOS + Android  
**Technology:** React Native / Expo or Flutter  
**Last Updated:** March 2026

---

## 🎯 Strategic Overview

### Why Mobile?
1. **Family Context:** Often used at family gatherings, on-the-go
2. **Real-time Access:** Check birthdays, anniversaries while away
3. **Notification Push:** Reminders push to phone (vs. email/bot)
4. **Offline Support:** View cached family tree without internet
5. **Camera Integration:** Quick photo capture for grave updates
6. **GPS:** Mark locations for cemetery map

### Market Opportunity
- **Target Users:** Vietnamese diaspora & extended families
- **Use Cases:** 
  - Genealogy research at home or in-person meetings
  - Birthday/anniversary reminders (push notifications)
  - Cemetery visits (GPS + offline map)
  - Member photo gallery
  - Quick member search and kinship lookup
  - Invite family members (via QR code)

---

## �� Feature Priority (MVP → Full Release)

### Phase 1: MVP (Q2 2026)
**Target:** Minimum viable mobile app to complement web

- **Auth:** Login with email/password (Supabase Auth)
- **Member List:** Browse family members (cached)
- **Tree View:** Simple tree visualization (2-level deep)
- **Member Detail:** View member info + photos
- **Search:** Quick member search
- **Offline Support:** Sync data when online, read offline
- **Push Notifications:** Birthday/anniversary reminders

**Scope:**
- 2-3 developers
- 8-12 weeks
- Focus: iOS + Android parity
- No: editing, advanced features

### Phase 2: Enhanced (Q3 2026)
- **Edit Member:** Create/update members
- **Add Relationships:** Link family members
- **Custom Events:** Create family events
- **Full Tree:** Interactive tree zoom/pan
- **Map:** Cemetery locations + photo gallery
- **Dark Mode:** Follow system theme
- **i18n:** Vietnamese, English, Chinese

### Phase 3: Full Feature (Q4 2026+)
- **AI Chat:** Branch bot integration
- **Telegram Bot:** Interact with bot from app
- **Advanced Filters:** Generation, branch, status
- **Timeline:** Activity feed
- **Sharing:** Share member profile via QR code
- **Analytics:** Family statistics

---

## 🛠️ Technology Decision

### Option A: React Native (Expo)

**Pros:**
- Code sharing: 80% shared with web (React)
- Fast development: Expo for OTA updates
- Learning curve: Team already knows React
- Ecosystem: Rich library ecosystem

**Cons:**
- Performance: Slower than native for complex UI
- Camera/GPS: Requires native module bridges
- App size: ~30-50MB base

**Tech Stack:**
```
Frontend: React Native + React Navigation
State: Redux or Zustand
Database: SQLite (local) + Supabase (remote)
Auth: Supabase Auth SDK
Push: Expo Notifications (Firebase Cloud Messaging)
Storage: Expo FileSystem
Camera: expo-camera
Geolocation: expo-location
Maps: react-native-maps
```

**Example Structure:**
```
mobile-app/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (drawer)/
│   │   ├── (tabs)/
│   │   │   ├── members/
│   │   │   ├── tree/
│   │   │   ├── map/
│   │   │   └── events/
│   │   └── settings/
│   └── _layout.tsx
├── components/
│   ├── MemberCard/
│   ├── TreeView/
│   ├── EventCard/
│   └── ...shared
├── utils/
│   ├── supabase.ts
│   ├── offline-sync.ts
│   └── kinship.ts
└── package.json
```

### Option B: Flutter

**Pros:**
- Performance: Native-speed compiled code
- Beautiful UI: Material + Cupertino design
- Single codebase: Android + iOS seamlessly
- State management: Provider, Riverpod

**Cons:**
- Learning curve: Team must learn Dart
- Code reuse: Can't share React code
- Ecosystem: Smaller than React Native
- Development speed: Slower than Expo

**Not recommended:** Team is JavaScript/TypeScript focused. Switching to Dart adds complexity.

---

## 📐 Architecture

### Data Sync Strategy

**Local Storage:** SQLite
```
|- families
|- persons
|- relationships
|- events
|- graves
|- custom_events
```

**Sync Mechanism:**
```typescript
// Initial sync (on first login)
async function initialSync() {
  // 1. Fetch all family data from Supabase
  const families = await supabase.from('families').select();
  const persons = await supabase.from('persons').select();
  const relationships = await supabase.from('relationships').select();
  
  // 2. Store in local SQLite
  await localDB.batch([
    db.insertMultiple('families', families),
    db.insertMultiple('persons', persons),
    db.insertMultiple('relationships', relationships),
  ]);
  
  // 3. Mark sync timestamp
  await localDB.setSyncTimestamp(new Date());
}

// Incremental sync (every 30 mins or on open)
async function incrementalSync() {
  const lastSync = await localDB.getSyncTimestamp();
  
  // 1. Fetch only changed records since lastSync
  const changed = await supabase
    .from('audit_logs')
    .select()
    .gte('changed_at', lastSync.toISOString());
  
  // 2. Update local DB
  for (const log of changed) {
    if (log.operation === 'INSERT' || log.operation === 'UPDATE') {
      await localDB.upsert(log.table_name, log.new_data);
    } else if (log.operation === 'DELETE') {
      await localDB.delete(log.table_name, log.record_id);
    }
  }
  
  // 3. Push local mutations back to server (if any)
  const localChanges = await localDB.getPendingChanges();
  for (const change of localChanges) {
    await supabase.from(change.table).upsert(change.data);
    await localDB.markSynced(change.id);
  }
}
```

### Authentication Flow

```
1. User opens app
2. Check local token (SecureStore)
3. If expired, refresh via Supabase.auth.refreshSession()
4. If valid, load dashboard
5. If expired/invalid, redirect to login

SecureStore (iOS Keychain / Android Keystore):
- Access token
- Refresh token
- User ID
```

### Push Notifications

**Setup:**
```typescript
// app.json (Expo config)
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/notification-icon.png",
        "color": "#ffffff",
        "sounds": ["./assets/notification-sound.wav"]
      }
    ],
    [
      "expo-device",
      {
        "isOnPhysicalDevice": true
      }
    ]
  ]
}
```

**Subscribe to Channel:**
```typescript
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications(userId: string) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Send to backend to associate with user
  await supabase
    .from('user_push_tokens')
    .upsert({ user_id: userId, token, device: 'ios' });
}

// Listen for notifications
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  if (data.eventId) {
    // Navigate to event detail
  }
});
```

---

## 🎨 UI/UX Design

### Design System (iOS + Android)

**Color Palette:**
- Primary: #007AFF (iOS Blue)
- Secondary: #5AC8FA (Light Blue)
- Success: #34C759 (Green)
- Error: #FF3B30 (Red)
- Neutral: #8E8E93 (Gray)

**Typography:**
- Heading 1: 32px, bold
- Heading 2: 24px, semibold
- Body: 16px, regular
- Caption: 12px, regular

**Spacing:** 8px base unit (4, 8, 12, 16, 24, 32, 40)

### Key Screens (MVP)

**1. Login Screen**
```
[Logo]
[Email Input]
[Password Input]
[Remember Me] [Forgot Password]
[Login Button]
[Don't have account? Sign up]
```

**2. Dashboard / Tab Navigation**
```
┌─────────────────────┐
│ 👨‍👩‍👧‍👦 Danh sách  📊 Thống kê
│ 🌳 Cây phả    🗺️ Bản đồ
│ 🎂 Sự kiện    ⚙️ Cài đặt
└─────────────────────┘
```

**3. Member List Screen**
```
[Search Bar]
[Member Card 1]
├── Avatar
├── Name + Gender
├── Age + Status
└── [Edit] [Detail]

[Member Card 2]
...
[+ Add Member]
```

**4. Tree View Screen**
```
[Filters: Ancestor | Max Depth]
[Root: Select person ▼]
[Interactive Tree View]
├── Pinch to zoom
├── Pan with fingers
└── Tap node for detail
```

**5. Member Detail Screen**
```
[Photo]
[Name]
[Birth Date] [Age] [Gender]
[Generation] [Branch]
[Add Relationship]
[Edit Member]
[View Photos]
[...Other Info]
```

---

## 📡 API Endpoints (Mobile-Specific)

### Sync Endpoint
```
GET /api/v1/sync?since=2026-03-07T10:00:00Z
Response: {
  families: [...],
  persons: [...],
  relationships: [...],
  events: [...],
  deleted_ids: { persons: [...], events: [...] },
  last_sync: "2026-03-07T11:00:00Z"
}
```

### Mobile-Specific Mutations
```
POST /api/v1/members (create/edit)
POST /api/v1/relationships (add relationship)
POST /api/v1/events (add event)
POST /api/v1/notifications/register (push token)
```

### Offline Queue
```
// Mobile persists unsent mutations in local queue
{
  id: "mutation_1",
  endpoint: "/api/v1/members",
  method: "POST",
  data: { full_name: "Tôi", gender: "male" },
  timestamp: 1234567890,
  synced: false
}

// On network restore, send queued mutations
```

---

## 🔐 Security Considerations

### Token Management
```typescript
// Secure storage (iOS Keychain, Android Keystore)
import * as SecureStore from 'expo-secure-store';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function getToken() {
  return await SecureStore.getItemAsync('auth_token');
}
```

### Certificate Pinning (Optional)
```typescript
// Prevent MITM attacks
import { fetch } from 'react-native';

const certPin = 'sha256/AAAAAAA...';

fetch(url, {
  certificate: certPin,
  // ...
});
```

### Biometric Auth (Optional)
```typescript
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export async function enableBiometric(token: string) {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  
  await SecureStore.setItemAsync('auth_token', token);
  
  // App will ask for Face ID / Touch ID on next open
}
```

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| App startup | < 2 seconds |
| Tree render (500 members) | < 1 second |
| Search query | < 100ms |
| Offline sync | < 5 seconds |
| Push notification | < 3 seconds |
| Map load (100 graves) | < 2 seconds |

---

## 📅 Development Timeline

### Phase 1: MVP (8-12 weeks)
```
Week 1-2:   Project setup, auth, local DB
Week 3-4:   Member list + search, offline sync
Week 5-6:   Tree visualization, detail screen
Week 7-8:   Push notifications, events
Week 9-10:  Testing, bug fixes
Week 11-12: App Store / Play Store submission
```

### Team Requirements
- 1 Lead (React Native expert)
- 1 Mobile Developer
- 1 QA Tester
- Shared backend support

### Budget Estimate
- Development: $40K-$60K
- Design: $5K-$10K
- App Store fees: $99 + $25
- Server costs: ~$100/month

---

## 🔗 Data Sharing with Web

### Sync Bidirectional

```
Mobile ←→ Backend (Supabase) ←→ Web
  │                              │
  └──── Shared PostgreSQL DB ────┘
  
- Edit member on web → See on mobile (after sync)
- Add event on mobile → See on web (after refresh)
- Delete relationship on either → Synced via audit_logs
```

### Offline Resilience
```
Mobile (Offline)
  ├── Read from SQLite ✓
  ├── Write to SQLite ✓
  └── Queue mutations ✓
       ↓
    (Network restored)
       ↓
  Send queued mutations to backend
  Update local DB with server response
```

---

## 📚 Related Documentation

- **DATABASE_ARCHITECTURE.md** — Schema for mobile sync
- **BACKEND_ARCHITECTURE.md** — API endpoints
- **FRONTEND_ARCHITECTURE.md** — UI/UX patterns to reuse

---

## 🎓 Decision Matrix

| Aspect | React Native | Flutter |
|--------|--------------|---------|
| Dev speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Code reuse (React) | ⭐⭐⭐⭐⭐ | ❌ |
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Learning curve | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Library ecosystem | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Recommendation:** **React Native (Expo)** — Best fit for team already familiar with React.

---

**Bottom Line:** Mobile app is strategic for user engagement. Phase 1 MVP in Q2 2026 is realistic with 2-person team.

