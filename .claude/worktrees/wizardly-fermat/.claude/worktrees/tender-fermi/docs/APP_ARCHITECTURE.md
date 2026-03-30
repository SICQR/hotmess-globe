# HOTMESS-GLOBE App Architecture

## Component Map

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                  HOTMESS-GLOBE                                   ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║         [HeaderBar: HOTMESS]   [Bell]   [Add]                                    ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ [SearchBar: ___ [SearchIcon]]                                                    ║
║                                                                                  ║
║ ┌─────────Trending/Live───────────┐                                              ║
║ │    [EventCountdownCard]         │                                              ║
║ │    [LiveRadioBar]               │                                              ║
║ └─────────────────────────────────┘                                              ║
║                                                                                  ║
║ ┌───────────Quick Links Bar─────────────┐                                        ║
║ │ Home │ Pulse │ Ghosted │ Market │ Profile │                                    ║
║ └────────────────────────────────────────┘                                       ║
║                                                                                  ║
║ ┌──────────────Friends/Ghosted Grid─────────────┐                                ║
║ │ [UserGrid]                                    │                                ║
║ │   [UserCard: Name, Distance, Status]          │                                ║
║ │   ...                                         │                                ║
║ └───────────────────────────────────────────────┘                                ║
║                                                                                  ║
║ ┌──────────────Chat/Meetup Flow─────────────┐                                    ║
║ │ [ChatHeader: Name, Location, Emoji]       │                                    ║
║ │ [ChatList]:                               │                                    ║
║ │   [ChatBubble: incoming]                  │                                    ║
║ │   [ChatBubble: outgoing]                  │                                    ║
║ │   ...                                     │                                    ║
║ │ [MapCard: Soho Cluster, Route, Share]     │                                    ║
║ │ [MessageInputBar]                         │                                    ║
║ └───────────────────────────────────────────┘                                    ║
║                                                                                  ║
║ ┌──────────────Market/Shop Flow─────────────┐                                    ║
║ │ [Header: MARKET, Add]                     │                                    ║
║ │ [CategoryTabs: RAW, HUNG, HIGH]           │                                    ║
║ │ [ProductCard: Image, Brand, Name, Price]  │                                    ║
║ │   [LevelGateOverlay if gated]             │                                    ║
║ │   [Button: Buy Now, Details]              │                                    ║
║ └───────────────────────────────────────────┘                                    ║
║                                                                                  ║
║ ┌──────────────Event/Squad Flow─────────────┐                                    ║
║ │ [EventCountdownCard]                      │                                    ║
║ │ [SquadMemberCard xN]                      │                                    ║
║ │ [SquadActionBar: Invite, Chat, Settings]  │                                    ║
║ └───────────────────────────────────────────┘                                    ║
║                                                                                  ║
║ ┌────────────Pop-ups, Modals, Gates─────────┐                                    ║
║ │ [BottomSheet: Purchase Confirm, etc.]     │                                    ║
║ │ [ConsentDialog: Location, Data, etc.]     │                                    ║
║ │ [ConfirmationModal: Success/Error]        │                                    ║
║ │ [LevelGateOverlay: Blur+Upgrade]          │                                    ║
║ │ [LoadingOverlay: Spinner+Message]         │                                    ║
║ └───────────────────────────────────────────┘                                    ║
║                                                                                  ║
║ ┌────────────────────────AppNavBar───────────────────────────┐                   ║
║ │ Home │ Pulse │ Ghosted │ Market │ Profile │  (Gold accent) │                   ║
║ └────────────────────────────────────────────────────────────┘                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `dark` | `#181820` | Main background |
| `darkest` | `#101017` | NavBar, sheets |
| `light` | `#ECECEC` | Primary text |
| `gold` | `#FFB800` | Accents, CTAs |
| `goldGlow` | `#FFC940` | Hover/glow states |
| `accent` | `#FF1493` | Highlights |
| `chatGray` | `#2D2D39` | Card backgrounds |
| `online` | `#38E38D` | Online status |
| `borderGlow` | `#ffaa3b` | Borders |
| `muted` | `#8F8FA1` | Secondary text |

## Component Library (27 Total)

### Layout & Structure
- `Header` — Top bar with title, back, options
- `Card` — Generic container with optional glow
- `Divider` — Gold-tinted horizontal rule
- `BottomSheet` — Slide-up modal drawer

### Navigation
- `SearchBar` — Rounded search input
- `CategoryTabs` — RAW/HUNG/HIGH filters
- `AppNavBar` — 5-tab bottom navigation

### Social & Users
- `UserCard` — Grid card with avatar, status
- `UserGrid` — 2-column responsive grid
- `Avatar` — Circular image with status dot
- `UserInfoBar` — Avatar + name + distance row
- `SquadMemberCard` — Member with promote/kick
- `SquadActionBar` — Invite/Chat/Settings buttons

### Chat & Messaging
- `ChatBubble` — In/out message variants
- `MessageInputBar` — Input + send + attach
- `MapCard` — Location with Route/Share CTAs

### Market & Products
- `ProductCard` — Image, brand, price, buttons
- `ClusterCard` — Map cluster with View button
- `EventCard` — Trending item with image

### Live & Events
- `LiveRadioBar` — LIVE badge, listen/follow
- `EventCountdownCard` — Timer + notify button

### Forms & Actions
- `Button` — Primary/secondary/ghost variants
- `TextInput` — Rounded with gold focus
- `Badge` — Gold/pink/green pill labels

### Gates & Modals
- `LevelGateOverlay` — Blur content, show upgrade
- `ConsentDialog` — Permission request modal
- `ConfirmationModal` — Success/error states
- `LoadingOverlay` — Full-screen spinner

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomeMode | Main dashboard |
| `/ghosted` | GhostedMode | User grid |
| `/pulse` | PulseMode | Globe view |
| `/market` | MarketMode | Marketplace |
| `/profile` | ProfileMode | Settings hub |
| `/radio` | RadioMode | Live radio |
| `/chats` | ChatHistoryPage | Conversations |
| `/chat/meetup` | ChatMeetupPage | Chat + map |
| `/chat/:threadId` | ChatMeetupPage | Thread view |
| `/examples/*` | Example screens | Design demos |
| `/v2/*` | Unified design pages | New UI |

## Motion Presets

```typescript
messageIn: { y: 25 → 0, spring }
sheetUp: { y: '100%' → 0, spring }
modalIn: { scale: 0.95 → 1 }
buttonTap: { scale: 0.97 }
pulseGlow: { boxShadow animation, 2s loop }
```

## Accessibility

- All touch targets ≥ 44px
- High contrast text on dark backgrounds
- Focus rings on interactive elements
- Status indicators use color + icon

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   └── design-system.tsx  ← 27 atomic components
│   ├── nav/
│   │   └── AppNavBar.tsx      ← Bottom navigation
│   └── sheets/
│       └── *.tsx              ← L2 sheet system
├── examples/
│   ├── ChatWithMapExample.tsx
│   ├── GhostedGridExample.tsx
│   └── MarketExample.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── ProfilePage.tsx
│   ├── MarketPage.tsx
│   ├── MapPage.tsx
│   ├── ChatMeetupPage.tsx
│   └── ChatHistoryPage.tsx
├── modes/
│   ├── HomeMode.tsx
│   ├── GhostedMode.tsx
│   ├── PulseMode.tsx
│   ├── RadioMode.tsx
│   ├── ProfileMode.tsx
│   └── MarketMode.tsx
└── lib/
    └── featureFlags.js        ← Gamification toggle
```

---

**Zero drift. All components use centralized tokens.**
