# SoundCloud API Field Requirements (Implementation Cheat Sheet)

This document captures required/optional request parameters for key SoundCloud endpoints, as provided in the project’s updated report.

## API Field Requirements

| Endpoint                                              | Purpose                                          | Required parameters                                                                                                                               | Optional / notable parameters |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **`GET /tracks`**                                     | Search for tracks.                               | `q` – the search query is optional but recommended; specify `linked_partitioning` for pagination.                                                 | `ids`, `urns`, `genres`, `tags`, `bpm`, `duration`, `created_at`, `access`, `limit`, `offset`. |
| **`POST /tracks`**                                    | Upload a new track.                              | Multipart form data with at least `track[title]` and `track[asset_data]` (the binary audio file).                                                 | `track[permalink]`, `track[sharing]` (public/private), `track[embeddable_by]` (all/me/none), `track[purchase_url]`, `track[description]`, `track[genre]`, `track[tag_list]`, `track[label_name]`, `track[release]`, `track[release_date]`, `track[streamable]`, `track[downloadable]`, `track[license]`, `track[commentable]`, `track[isrc]`, `track[artwork_data]` (binary for PRO users). |
| **`PUT /tracks/{id}`**                                | Update track metadata.                           | Path parameter `id` (track identifier); body requires at least one updatable field.                                                               | Same fields as above except `asset_data`; you cannot change the audio file. |
| **`GET /playlists`**                                  | Search for playlists.                            | None required.                                                                                                                                    | `q` (search query), `access` (playable/preview/blocked), `show_tracks` (include track details), `limit`, `offset`, `linked_partitioning`. |
| **`POST /playlists`**                                 | Create a new playlist.                           | For JSON: `playlist.title` (string); for multipart form: `playlist[title]` (string).                                                              | `playlist[description]`, `playlist[sharing]` (public/private), `playlist[tracks]` (array of track objects `{id: number}`). |
| **`GET /users`**                                      | Search for users.                                | None.                                                                                                                                             | `q` (query), `ids`, `urns`, `limit`, `offset`, `linked_partitioning`. |
| **`POST /likes/tracks/{id}`**                         | Like a track.                                    | Path parameter `id` – the track ID.                                                                                                               | Requires OAuth token with appropriate scope. |
| **`POST /likes/playlists/{id}`**                      | Like a playlist.                                 | Path parameter `id` – the playlist ID.                                                                                                            | Same as above. |
| **`PUT /me/followings/{user_id}`**                    | Follow a user.                                   | Path parameter `user_id` – the user’s ID.                                                                                                         | None. |
| **`DELETE /me/followings/{user_id}`**                 | Unfollow a user.                                 | Path parameter `user_id`.                                                                                                                         | None. |
| **`POST /tracks/{track_id}/comments`**                | Create a comment on a track.                     | Path parameter `track_id`; body with `comment[body]` (text).                                                                                      | `comment[timestamp]` (milliseconds into the track). |
| **`GET /tracks/{id}/stream`**                         | Retrieve stream URL(s).                          | Path parameter `id`.                                                                                                                              | For private tracks, include `secret_token` query parameter. |
| **`GET /resolve`**                                    | Resolve a SoundCloud permalink.                  | Query parameter `url` – the permalink to a track, playlist or user.                                                                               | Requires `access_token` if resolving private resources. |
| **`GET /authorize`** (via `secure.soundcloud.com`)    | Start OAuth 2.1 authorization code flow.         | Query parameters: `client_id`, `redirect_uri`, `response_type=code`, `code_challenge` (PKCE), `code_challenge_method=S256`, `state`.              | Provide `scope` when requesting specific permissions. |
| **`POST /oauth/token`** (via `secure.soundcloud.com`) | Exchange authorization code for an access token. | Body fields: `client_id`, `client_secret`, `grant_type=authorization_code`, `code` (from authorize step), `redirect_uri`, `code_verifier` (PKCE). | Use `refresh_token` grant type to refresh expired tokens. |

## Notes For This Codebase

- This repo currently embeds SoundCloud players from stored `soundcloud_url`/`soundcloud_urn` values and does **not** have a production upload integration yet.
- The current server-side placeholder has been changed to fail fast (so it cannot return “mock success”):
  - `functions/pushToSoundCloud.ts`

## Where This Will Be Implemented

- Admin upload UI (currently uploads WAV to storage and creates beacons):
  - `src/components/admin/RecordManager.tsx`
  - `src/pages/RecordManager.jsx`
- SoundCloud player embed (URN/URL → iframe):
  - `src/components/media/SoundCloudEmbed.jsx`

## Implementation Choices (Decide Before Coding)

- OAuth client type:
  - If this is a **server-side** integration, do the code exchange on the server and store refresh tokens securely.
  - If this is a **SPA/PKCE** integration without a backend exchange, do **not** depend on `client_secret` in the browser.
- Access scope and allowed endpoints depend on the SoundCloud app configuration and account tier.
