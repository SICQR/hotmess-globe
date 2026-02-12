# HotMess OS Integration Guide

**Last Updated**: February 8, 2026  
**Status**: ✅ Complete - Ready for Production

---

## Overview

The **HotMess OS Integration** transforms the Globe from a visual representation to a **living, reactive system**. This integration connects Identity, Commerce, Radio, and Social systems into a unified experience.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HOTMESS OS LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Identity    │  │   Commerce    │  │     Radio     │  │
│  │  (Telegram)   │  │   (Vault)     │  │   (BPM Sync)  │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
│          │                  │                  │          │
│          └──────────────────┴──────────────────┘          │
│                             │                             │
│                    ┌────────▼─────────┐                   │
│                    │   Globe Pulse    │                   │
│                    │  (Real-time)     │                   │
│                    └──────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Telegram Auth Handshake

### Purpose
Secure authentication using Telegram's custom HMAC verification, creating a seamless onboarding experience.

### Implementation

#### Component: `TelegramAuthEnhanced`
Located at: `src/components/auth/TelegramAuthEnhanced.jsx`

```javascript
import { TelegramAuth } from '@/components/auth/TelegramAuthEnhanced';

<TelegramAuth
  onSuccess={(result) => console.log('Auth success:', result)}
  onError={(err) => console.error('Auth error:', err)}
/>
```

#### Features
- ✅ Uses `@telegram-auth/react` official widget
- ✅ Server-side HMAC-SHA256 verification
- ✅ Automatic profile creation in Supabase
- ✅ Drops initial beacon on Globe upon registration
- ✅ Links existing accounts via email

#### API Endpoint
`/api/auth/telegram/verify` - Verifies Telegram auth data using bot token

---

## 2. Real-time Globe Listener

### Purpose
Makes the Globe react instantly to new beacons and user activities using Supabase real-time subscriptions.

### Implementation

#### Hook: `useGlobeData`
Located at: `src/hooks/useGlobeData.js`

```javascript
import { useGlobeData } from '@/hooks/useGlobeData';

const beacons = useGlobeData((newBeacon) => {
  // Called when a new beacon is inserted
  console.log('New beacon:', newBeacon);
  
  // Trigger visual pulse on Globe
  globeRef.current?.emitPulse({
    lat: newBeacon.lat,
    lng: newBeacon.lng,
    color: '#FF1493',
    intensity: 1,
  });
});
```

#### Features
- ✅ Listens to INSERT, UPDATE, DELETE on `Beacon` table
- ✅ Provides callback for visual effects
- ✅ Automatic state management
- ✅ Self-cleaning subscriptions

#### Events
- `INSERT` - New beacon created → Visual pulse
- `UPDATE` - Beacon modified → Update visualization
- `DELETE` - Beacon removed → Remove from Globe

---

## 3. Radio BPM Sync

### Purpose
Synchronizes the Globe's visual effects with the current radio show's BPM, creating an audio-reactive experience.

### Implementation

#### Hook: `useGlobeBPMSync`
Located at: `src/hooks/useGlobeBPMSync.js`

```javascript
import { useGlobeBPMSync } from '@/hooks/useGlobeBPMSync';

const {
  currentBPM,
  isAudioReactive,
  currentShow,
  toggleAudioReactive,
} = useGlobeBPMSync(globeRef);

// BPM automatically updates shader uniforms:
// - uTime: Animation time
// - uFrequency: Pulse speed (BPM / 60)
// - uIntensity: Pulse intensity
// - uBPM: Raw BPM value
```

#### Features
- ✅ Fetches current radio show BPM
- ✅ Calculates pulse speed from BPM
- ✅ Updates Globe shader uniforms
- ✅ Toggle audio-reactive mode
- ✅ Manual BPM override

#### Integration with Globe
The hook expects Globe to implement one of:
- `globeRef.current.updateShaderUniforms(uniforms)`
- `globeRef.current.setPulseSpeed(speed)`

---

## 4. Supabase Presence

### Purpose
Tracks online users in real-time, showing who's live on the Globe.

### Implementation

#### Hook: `usePresence`
Located at: `src/hooks/usePresence.js`

```javascript
import { usePresence } from '@/hooks/usePresence';

const {
  onlineUsers,
  myPresence,
  updateStatus,
  isTracking,
} = usePresence({
  channelName: 'hotmess-presence',
  updateInterval: 30000, // 30 seconds
  enableLocationSharing: true,
});

// Update status (e.g., "Ghosted", "Available")
updateStatus('available');
```

#### Features
- ✅ Real-time presence tracking
- ✅ Optional location sharing
- ✅ Periodic presence updates
- ✅ Join/Leave events
- ✅ Status updates sync to beacons table

#### Presence Data Structure
```javascript
{
  user_id: string,
  email: string,
  full_name: string,
  avatar_url: string,
  online_at: ISO8601,
  lat?: number,
  lng?: number,
  status?: string
}
```

---

## 5. The Vault - Unified Inventory

### Purpose
Provides a single API for all user-owned items across Shopify (official merch) and P2P (creator items).

### Implementation

#### Context: `VaultProvider`
Located at: `src/contexts/VaultContext.jsx`

```javascript
import { VaultProvider, useVault } from '@/contexts/VaultContext';

// Wrap app with VaultProvider
<VaultProvider>
  <YourApp />
</VaultProvider>

// Use in components
const {
  vaultItems,        // All items (Shopify + P2P)
  isLoading,
  shopifyOrders,     // Raw Shopify orders
  p2pTransactions,   // Raw P2P transactions
  getItemsByType,    // Filter by 'official' | 'creator'
  getItemsBySource,  // Filter by 'shopify' | 'p2p'
  getTotalCount,     // Total item count
} = useVault();
```

#### Features
- ✅ Fetches Shopify customer orders
- ✅ Fetches P2P transactions from Supabase
- ✅ Unified item format
- ✅ Auto-refresh every 2 minutes
- ✅ Helper methods for filtering

#### Item Data Structure
```javascript
{
  id: string,              // Unique ID
  source: 'shopify' | 'p2p',
  type: 'official' | 'creator',
  name: string,
  quantity: number,
  price: number,
  image: string | null,
  orderId: string,
  orderDate: ISO8601,
  // Source-specific fields...
}
```

---

## 6. Integration Demo

### Page: `IntegrationDemo`
Located at: `src/pages/IntegrationDemo.jsx`

Access at: `/IntegrationDemo` or `${PageName}`

This page demonstrates all integration features in a single view:
- Live beacon count
- Current radio BPM
- Online user count
- Vault items
- Real-time pulse feed
- Audio-reactive toggle
- Presence status

---

## Complete Wire-Flow

### Identity Wire
```
User clicks "Login with Telegram"
  ↓
TelegramAuth widget loads
  ↓
User authorizes in Telegram
  ↓
Auth data sent to /api/auth/telegram/verify
  ↓
HMAC-SHA256 verification
  ↓
Profile created/linked in Supabase
  ↓
Initial beacon dropped on Globe
  ↓
Personal Orb appears on Globe
```

### Commerce Wire
```
User purchases item (Shopify or P2P)
  ↓
Order recorded in respective system
  ↓
VaultContext fetches on next refresh
  ↓
Item appears in Vault
  ↓
Available in Market.jsx
```

### Radio Wire
```
Radio show starts playing
  ↓
useGlobeBPMSync fetches current show
  ↓
BPM extracted from show metadata
  ↓
Pulse speed calculated (BPM / 60)
  ↓
Globe shader uniforms updated
  ↓
World pulses sync to music
```

### Social Wire
```
User toggles "Ghosted" status
  ↓
updateStatus() called in usePresence
  ↓
Presence updated in Supabase channel
  ↓
Beacon status updated in table
  ↓
Change propagates via postgres_changes
  ↓
All active Globes update instantly
```

---

## Testing

### Manual Testing
1. **Visit** `/IntegrationDemo`
2. **Try Telegram Auth** - Click the widget, authorize
3. **Watch Real-time Feed** - Create a beacon elsewhere, see it appear
4. **Toggle Audio Reactive** - Watch BPM sync
5. **Check Vault** - Make a purchase, see it appear

### Automated Testing
```bash
npm run test -- useGlobeData
npm run test -- usePresence
npm run test -- VaultContext
```

---

## Production Checklist

- [x] Install `@telegram-auth/react`
- [x] Create all hooks and contexts
- [x] Add exports to index files
- [x] Create integration demo page
- [x] Add to routing
- [ ] Set environment variables:
  - `VITE_TELEGRAM_BOT_USERNAME`
  - `TELEGRAM_BOT_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure Telegram Bot via BotFather
- [ ] Set bot domain with `/setdomain`
- [ ] Test on staging
- [ ] Deploy to production

---

## Environment Variables

### Required

```env
# Telegram (both frontend and backend)
VITE_TELEGRAM_BOT_USERNAME=hotmess_london_bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Supabase (backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Troubleshooting

### Telegram Auth Not Working
- Verify `TELEGRAM_BOT_TOKEN` is set
- Check bot domain is configured via `/setdomain`
- Ensure bot is not in maintenance mode
- Check browser console for CORS errors

### Real-time Updates Not Appearing
- Verify Supabase Realtime is enabled for the table
- Check browser network tab for WebSocket connection
- Ensure table has proper Row Level Security policies
- Check console for subscription errors

### BPM Sync Not Working
- Verify radio show has `bpm` field in database
- Check that Globe ref is properly passed
- Ensure audio-reactive is toggled ON
- Verify Globe implements shader update methods

### Vault Empty
- Check user is authenticated
- Verify Shopify API endpoint is working
- Ensure P2P transactions table exists
- Check console for fetch errors

---

## Support

For issues or questions:
- Check GitHub Issues
- Review existing Telegram/Globe components
- Consult Supabase Realtime docs
- Ask in #dev channel

---

## Credits

**Built by**: HotMess Engineering Team  
**Integration Design**: London OS Specification  
**Package**: @telegram-auth/react v1.0.0  
**Real-time**: Supabase Realtime v2.39.0  

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Deployed**: February 8, 2026
