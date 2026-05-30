# HOTMESS Music — Dev Enforcement Brief
**Date:** April 2026  
**Status:** Sealed. Build only against this brief and the acceptance tests in Music v2 FINAL doc.

---

## Four Hard Rules (do not skip these)

### 1. Audio Coordinator — No Exceptions
```typescript
// src/lib/localAudioCoordinator.ts — build this first
let activeLocalAudio: HTMLAudioElement | null = null;
export const claimLocalAudio = (el: HTMLAudioElement) => {
  if (activeLocalAudio && activeLocalAudio !== el) activeLocalAudio.pause();
  activeLocalAudio = el;
};
export const releaseLocalAudio = (el: HTMLAudioElement) => {
  if (activeLocalAudio === el) activeLocalAudio = null;
};
```
Every local TrackPlayer calls `claimLocalAudio(audioRef.current)` on play.  
No audio plays without this claim. Radio still takes priority via RadioContext.

### 2. Music Signal — Privacy First
`profiles.music_visibility` default: `"matches"`.  
- `"matches"`: `current_track_title` only returned in `/api/profiles` SELECT after taps table mutual pair check. Server-side, not client.
- `"hidden"`: field excluded from SELECT entirely. Never written to DB.
- Signal only shows if `track_started_at > now() - 600s AND is_online = true`.
- Pause clears `is_music_playing` immediately — no TTL.

### 3. Globe Signal — Aggregate Only
Do NOT emit one `radio_signal` row per user play.  
Use `increment_label_play_bucket` RPC: one signal per city + label + 60-second window.  
At current scale (123 profiles) the existing 5-minute per-user throttle is acceptable. Revisit at >20 concurrent listeners.

### 4. Sound Anchor — No Exact Location
Sound Anchor (shared listening proximity) uses `user_presence_locations` for distance calculation server-side.  
Distance result returned as boolean (`within_300m: true/false`).  
Raw coordinates never returned to client. PostGIS `ST_DWithin` in the RPC, not client-side haversine.

---

## Build Order
1. `localAudioCoordinator.ts`
2. Profile columns: `is_music_playing`, `current_track_title`, `track_started_at`, `music_visibility`
3. RLS / API enforcement for `music_visibility`
4. Music → Ghosted context (`deriveContext()` update)
5. Music → Wingman (`/api/ai/wingman` body update)
6. Music → Market bridge (optional, `linked_track_id` FK)
7. Music → Events bridge (optional, `linked_event_id` FK)

---

## Reference
Full spec: `HOTMESS-Music-Records-v2-FINAL.docx` — Sections 12–23.
