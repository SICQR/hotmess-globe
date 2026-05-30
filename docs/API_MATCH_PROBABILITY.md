# Match Probability API Documentation

## Overview

The Match Probability API computes compatibility scores between users based on multiple dimensions, aggregating them into a single match probability percentage (0-100).

## Endpoint

```
GET /api/match-probability
```

## Authentication

Requires a valid Supabase access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | No | - | Viewer's latitude for travel time calculation |
| `lng` | number | No | - | Viewer's longitude for travel time calculation |
| `limit` | integer | No | 40 | Number of profiles to return (1-100) |
| `offset` | integer | No | 0 | Pagination offset |
| `sort` | string | No | 'match' | Sort order: 'match', 'distance', 'lastActive', 'newest' |

## Response Format

```json
{
  "items": [
    {
      "id": "uuid",
      "profileName": "Alex",
      "title": "Gym rat, beach lover",
      "locationLabel": "London",
      "geoLat": 51.5074,
      "geoLng": -0.1278,
      "photos": [],
      "matchProbability": 87.5,
      "matchBreakdown": {
        "travelTime": 18,
        "roleCompat": 15,
        "kinkOverlap": 12,
        "intent": 9,
        "semantic": 10,
        "lifestyle": 8,
        "activity": 8,
        "completeness": 7.5
      },
      "travelTimeMinutes": 12,
      "city": "London",
      "bio": "Gym rat, beach lover",
      "profileType": "standard",
      "age": 28
    }
  ],
  "nextCursor": "40",
  "scoringVersion": "1.0"
}
```

## Scoring Algorithm

The match probability is computed from 8 sub-scores, each contributing different maximum points:

### 1. Travel Time Score (0-20 points)

Rewards closer proximity with decay for longer travel times:

- ≤ 5 minutes: 20 points (walking distance)
- ≤ 15 minutes: 18 points (quick trip)
- ≤ 30 minutes: 15 points (reasonable)
- ≤ 60 minutes: 10 points (committed trip)
- ≤ 120 minutes: 5 points (long journey)
- > 120 minutes: 2 points (very far)
- Unknown: 10 points (neutral)

**Data sources**: Viewer location (lat/lng), candidate location, routing_cache table

### 2. Role Compatibility Score (0-15 points)

Based on sexual position preferences from `user_private_profile.position`:

| User → Match | top | bottom | vers | vers_top | vers_bottom |
|--------------|-----|--------|------|----------|-------------|
| **top** | 5 | **15** | 12 | 8 | 10 |
| **bottom** | **15** | 5 | 12 | 10 | 8 |
| **vers** | 12 | 12 | **15** | 10 | 10 |
| **vers_top** | 5 | 12 | 10 | 8 | **15** |
| **vers_bottom** | 12 | 5 | 10 | **15** | 8 |

**Data sources**: `user_private_profile.position`

### 3. Kink Overlap Score (0-15 points)

Evaluates compatibility of sexual interests and boundaries:

- **Hard limit conflicts**: Severe penalty (max 0, or 5 - conflicts × 3)
  - If user's kink is in match's hard_limits, or vice versa
- **Shared kinks**: Overlap ratio × 15 points
  - `overlap / max(user_kinks, match_kinks)` × 15
- **Both unspecified**: 8 points (neutral)

**Data sources**: `user_private_profile.kinks`, `hard_limits`, `soft_limits`

### 4. Intent Alignment Score (0-12 points)

Matches relationship goals and timelines:

- **Looking for overlap**: Up to 6 points
  - 3 points per matching intent (e.g., both seeking "relationship")
- **Relationship status**: Up to 3 points
  - 3 points for exact match (e.g., both "single")
  - 1.5 points for compatible statuses (e.g., "single" ↔ "open")
- **Time horizon**: 3 points if matching
  - E.g., both seeking "tonight" or both "long-term"

**Data sources**: `user_private_profile.looking_for`, `relationship_status`, `time_horizon`

### 5. Semantic Text Score (0-12 points)

Uses AI embeddings to measure text similarity:

- Compares OpenAI embeddings of combined text fields (bio, turn_ons, turn_offs)
- Cosine similarity normalized to 0-12 scale
- Default: 6 points if embeddings unavailable

**Data sources**: `profile_embeddings.combined_embedding`

### 6. Lifestyle Match Score (0-10 points)

Evaluates compatibility of daily habits:

- **Lifestyle fields**: Up to 8 points (2 each)
  - Exact matches: smoking, drinking, fitness, diet
  - Partial credit for compatible choices (e.g., "never" ↔ "socially")
- **Scene affinity**: Up to 2 points
  - 1 point per shared scene/community (max 2)

**Data sources**: `user_private_profile.smoking`, `drinking`, `fitness`, `diet`, `scene_affinity`

### 7. Activity Recency Score (0-8 points)

Rewards recently active users:

- < 1 hour: 8 points
- < 24 hours: 7 points (active today)
- < 3 days: 5 points
- < 7 days: 3 points (active this week)
- < 30 days: 1 point (active this month)
- Older: 0 points

**Data sources**: `User.last_seen`

### 8. Profile Completeness Score (0-8 points)

Rewards profiles with key fields filled (1 point each):

- bio
- position
- looking_for
- kinks
- turn_ons
- relationship_status
- photos
- age

**Data sources**: Various fields from `User` and `user_private_profile`

## Total Score

Sum of all sub-scores, capped at 100 points. Displayed as `matchProbability` percentage.

## Privacy & Security

- **Server-side computation**: All scoring happens server-side to protect sensitive data
- **RLS policies**: Private profile data is only accessible to authorized users
- **Service role**: Uses service role for batch queries while respecting RLS
- **No data leakage**: Match breakdown only includes aggregate scores, not raw private data

## Performance Considerations

- **Batch processing**: Fetches candidates, private profiles, and embeddings in batches
- **Pagination**: Returns limited results with cursor-based pagination
- **Caching**: Travel time scores leverage existing routing_cache
- **Approximate distances**: Uses Haversine formula for quick distance estimation when routing cache unavailable

## Example Usage

```javascript
// Fetch top matches near viewer location
const response = await fetch(
  '/api/match-probability?lat=51.5074&lng=-0.1278&limit=20&sort=match',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const { items, nextCursor } = await response.json();

// items[0].matchProbability = 87.5
// items[0].matchBreakdown = { travelTime: 18, roleCompat: 15, ... }
```

## Future Enhancements

1. **A/B Testing**: Use `scoring_config` table to test different weight configurations
2. **ML Optimization**: Feed interaction data to learn optimal weights per user segment
3. **Real-time Updates**: Cache computed scores with TTL for frequently viewed profiles
4. **Feature Flags**: Gate new scoring dimensions behind feature flags
5. **Embedding Generation**: Add endpoint to generate/update embeddings on profile save
6. **Filtering**: Add filters for minimum match threshold, distance radius, etc.

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Missing Authorization bearer token"
}
```

### 404 Not Found
```json
{
  "error": "User profile not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch candidates",
  "details": "..."
}
```
