# Live capture — hotmessldn.com — 2026-05-23 (Chrome MCP)

Captured against production in a connected macOS Chrome session (logged-in user).

## Rendered homepage (visible elements)
- Top bar: HOTMESS wordmark (gold/white), notification bell, profile avatar.
- Hero: eyebrow "HOT MESS"; headline "Tonight's already started."; subtext "Quiet nearby right now"; primary gold button "Enter Pulse" (globe icon).
- Card: "Complete your profile — Add a photo and bio" with "Edit" action.
- Quick links: Ghosted · Market · Music.
- Row: "See who's nearby — Go Live first, or just browse."
- Promo card: HNH MESS — "Care hits different when it's dirty." / "Lube. Aftercare. Radio. No shame. No pretending." / "HNH MESS — REMASTERED" with product image.
- Bottom nav (6): Home · Pulse · Ghosted · Music · Shop · More.
- Theme: dark background, gold #C8962C accents (brand-consistent).

## Console
- No errors or exceptions on load (read after a tracked reload).

## Network
- profiles PATCH -> 204 (Supabase REST)
- user_presence POST -> 200 (Supabase REST)
- No 4xx/5xx requests observed in the captured window.

Method: Chrome MCP navigate -> reload -> read_console_messages(onlyErrors) -> read_network_requests.
