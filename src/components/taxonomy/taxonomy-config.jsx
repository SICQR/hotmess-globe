export default {
  "meta": {
    "id": "discovery-taxonomy-v1",
    "version": "1.0.0",
    "generatedAt": "2025-12-31",
    "timezone": "Asia/Bangkok",
    "locale": "en-GB"
  },
  "privacy": {
    "visibilityLevels": [
      { "id": "public", "label": "Public" },
      { "id": "matches", "label": "Matches" },
      { "id": "nobody", "label": "Nobody" }
    ],
    "defaults": {
      "substancesVisibility": "nobody",
      "healthVisibility": "nobody",
      "aftercareVisibility": "matches",
      "essentialsVisibility": "matches",
      "statsVisibility": "public",
      "distanceVisibility": "public"
    }
  },
  "lanes": [
    {
      "id": "right_now",
      "label": "Right Now",
      "description": "Available now. Auto-expires.",
      "defaultPresetId": "preset_right_now_chem_free_aftercare"
    },
    {
      "id": "browse",
      "label": "Browse",
      "description": "Scroll, vibe, chat.",
      "defaultPresetId": "preset_browse_open"
    },
    {
      "id": "dates",
      "label": "Dates",
      "description": "Slower burn. Better outcomes.",
      "defaultPresetId": "preset_dates_intentional"
    }
  ],
  "filters": {
    "quickToggles": [
      { "id": "onlineNow", "type": "boolean", "label": "Online", "default": false },
      { "id": "rightNow", "type": "boolean", "label": "Right Now", "default": false },
      { "id": "nearMe", "type": "boolean", "label": "Near me", "default": false },
      { "id": "hasFace", "type": "boolean", "label": "Face", "default": false },
      { "id": "chemFree", "type": "boolean", "label": "Chem-free", "default": false }
    ],
    "groups": [
      {
        "id": "intent",
        "label": "Intent",
        "fields": [
          {
            "id": "lookingFor",
            "type": "multi_select",
            "label": "Looking for",
            "options": ["Chat", "Dates", "Mates", "Play", "Friends", "Something ongoing"],
            "default": []
          },
          {
            "id": "meetAt",
            "type": "multi_select",
            "label": "Meet at",
            "options": ["My place", "Your place", "Hotel", "Sauna/club", "Outdoors", "Not sure yet"],
            "default": []
          }
        ]
      },
      {
        "id": "logistics",
        "label": "Logistics",
        "fields": [
          {
            "id": "availabilityWindow",
            "type": "single_select",
            "label": "Availability",
            "options": ["Now", "Tonight", "This weekend"],
            "default": null
          },
          {
            "id": "hostTravel",
            "type": "multi_select",
            "label": "Hosting / travel",
            "options": ["Can host", "Can travel", "Hotel ok", "Undecided"],
            "default": []
          },
          {
            "id": "distanceKm",
            "type": "range",
            "label": "Distance (km)",
            "min": 0,
            "max": 200,
            "step": 1,
            "default": [0, 30]
          },
          {
            "id": "hideExactDistance",
            "type": "boolean",
            "label": "Hide exact distance",
            "default": false
          }
        ]
      },
      {
        "id": "vibe",
        "label": "Vibe",
        "fields": [
          {
            "id": "vibeTags",
            "type": "multi_select",
            "label": "Vibe",
            "options": ["Low-key", "Loud", "Romantic", "Dirty (consensual)", "Comedy-first"],
            "default": []
          },
          {
            "id": "communicationStyle",
            "type": "multi_select",
            "label": "Communication style",
            "options": ["Direct", "Flirty", "Slow burn"],
            "default": []
          }
        ]
      },
      {
        "id": "basics",
        "label": "Basics",
        "fields": [
          {
            "id": "ageRange",
            "type": "range",
            "label": "Age",
            "min": 18,
            "max": 80,
            "step": 1,
            "default": [18, 45]
          },
          {
            "id": "heightCm",
            "type": "range",
            "label": "Height (cm)",
            "min": 130,
            "max": 220,
            "step": 1,
            "default": null
          },
          {
            "id": "weightKg",
            "type": "range",
            "label": "Weight (kg)",
            "min": 35,
            "max": 200,
            "step": 1,
            "default": null
          },
          {
            "id": "bodyType",
            "type": "multi_select",
            "label": "Body type",
            "options": ["Slim", "Average", "Athletic", "Muscular", "Stocky", "Chubby"],
            "default": []
          },
          {
            "id": "position",
            "type": "multi_select",
            "label": "Position",
            "options": ["Top", "Vers", "Bottom", "Side"],
            "default": []
          }
        ]
      },
      {
        "id": "photos",
        "label": "Photos",
        "fields": [
          { "id": "hasPhotos", "type": "boolean", "label": "Has photos", "default": false },
          { "id": "hasFacePhoto", "type": "boolean", "label": "Has face pic", "default": false }
        ]
      },
      {
        "id": "relationship",
        "label": "Relationship",
        "fields": [
          {
            "id": "relationshipStatus",
            "type": "multi_select",
            "label": "Relationship",
            "options": ["Single", "Dating", "Partnered", "Open", "Married", "It's complicated"],
            "default": []
          }
        ]
      },
      {
        "id": "tribes",
        "label": "Tribes",
        "fields": [
          { "id": "tribeInclude", "type": "multi_select_ref", "label": "Include tribes", "ref": "tribes", "default": [] },
          { "id": "tribeExclude", "type": "multi_select_ref", "label": "Exclude tribes", "ref": "tribes", "default": [] }
        ]
      },
      {
        "id": "care_boundaries",
        "label": "Care & boundaries",
        "fields": [
          { "id": "consentForward", "type": "boolean", "label": "Consent-forward", "default": false },
          { "id": "aftercareOffered", "type": "boolean", "label": "Aftercare offered", "default": false },
          { "id": "aftercareNeeded", "type": "boolean", "label": "Aftercare needed", "default": false },
          { "id": "cuddlesOk", "type": "boolean", "label": "Cuddles ok", "default": false },
          { "id": "noPressure", "type": "boolean", "label": "No pressure", "default": false },
          {
            "id": "dealbreakers",
            "type": "multi_select",
            "label": "Make dealbreakers",
            "options": [
              "Consent-forward",
              "Aftercare offered",
              "Aftercare needed",
              "Chem-free",
              "Sober",
              "Cali sober",
              "420-friendly",
              "Alcohol ok",
              "Recovery-friendly"
            ],
            "default": []
          }
        ]
      },
      {
        "id": "substances",
        "label": "Substances",
        "fields": [
          {
            "id": "substancesPrefs",
            "type": "multi_select_ref",
            "label": "Substances",
            "ref": "tags",
            "allowedTagCategoryIds": ["substances"],
            "default": []
          }
        ]
      }
    ],
    "presets": [
      {
        "id": "preset_right_now_chem_free_aftercare",
        "label": "Right Now • Chem-free • Aftercare",
        "laneId": "right_now",
        "values": {
          "rightNow": true,
          "availabilityWindow": "Now",
          "chemFree": true,
          "consentForward": true,
          "aftercareOffered": true
        }
      },
      {
        "id": "preset_browse_open",
        "label": "Browse • Open",
        "laneId": "browse",
        "values": {
          "rightNow": false,
          "onlineNow": false,
          "noPressure": true
        }
      },
      {
        "id": "preset_dates_intentional",
        "label": "Dates • Intentional",
        "laneId": "dates",
        "values": {
          "lookingFor": ["Dates", "Something ongoing"],
          "noPressure": true,
          "consentForward": true
        }
      }
    ]
  },
  "tribes": [
    { "id": "bear", "label": "Bear" },
    { "id": "otter", "label": "Otter" },
    { "id": "twink", "label": "Twink" },
    { "id": "twunk", "label": "Twunk" },
    { "id": "jock", "label": "Jock" },
    { "id": "hunk", "label": "Hunk" },
    { "id": "muscle", "label": "Muscle" },
    { "id": "daddy", "label": "Daddy" },
    { "id": "leather", "label": "Leather" },
    { "id": "rugged", "label": "Rugged" },
    { "id": "clean_cut", "label": "Clean-cut" },
    { "id": "geek", "label": "Geek" },
    { "id": "discreet", "label": "Discreet" },
    { "id": "pup_handler", "label": "Pup/Handler" },
    { "id": "chub", "label": "Chub" },
    { "id": "cub", "label": "Cub" },
    { "id": "masc", "label": "Masc" },
    { "id": "femme", "label": "Femme" },
    { "id": "alt_goth", "label": "Alt/Goth" },
    { "id": "raver", "label": "Raver" }
  ],
  "tagCategories": [
    { "id": "care_consent", "label": "Care & consent" },
    { "id": "substances", "label": "Substances" },
    { "id": "logistics", "label": "Logistics" },
    { "id": "connection", "label": "Connection" },
    { "id": "culture", "label": "Culture" },
    { "id": "fitness", "label": "Fitness" },
    { "id": "relationship", "label": "Relationship" },
    { "id": "kink", "label": "Kink" }
  ],
  "tags": [
    { "id": "consent_forward", "label": "Consent-forward", "categoryId": "care_consent", "isSensitive": false },
    { "id": "boundaries_first", "label": "Boundaries first", "categoryId": "care_consent", "isSensitive": false },
    { "id": "aftercare_offered", "label": "Aftercare offered", "categoryId": "care_consent", "isSensitive": false },
    { "id": "aftercare_needed", "label": "Aftercare needed", "categoryId": "care_consent", "isSensitive": false },
    { "id": "check_in_text", "label": "Check-in text", "categoryId": "care_consent", "isSensitive": false },
    { "id": "cuddles", "label": "Cuddles", "categoryId": "care_consent", "isSensitive": false },
    { "id": "gentle", "label": "Gentle", "categoryId": "care_consent", "isSensitive": false },
    { "id": "no_pressure", "label": "No pressure", "categoryId": "care_consent", "isSensitive": false },
    { "id": "sober", "label": "Sober", "categoryId": "substances", "isSensitive": true },
    { "id": "cali_sober", "label": "Cali sober", "categoryId": "substances", "isSensitive": true },
    { "id": "friendly_420", "label": "420-friendly", "categoryId": "substances", "isSensitive": true },
    { "id": "alcohol_ok", "label": "Alcohol ok", "categoryId": "substances", "isSensitive": true },
    { "id": "chem_free", "label": "Chem-free", "categoryId": "substances", "isSensitive": true },
    { "id": "recovery_friendly", "label": "Recovery-friendly", "categoryId": "substances", "isSensitive": true },
    { "id": "ask_me_substances", "label": "Ask me", "categoryId": "substances", "isSensitive": true },
    { "id": "can_host", "label": "Can host", "categoryId": "logistics", "isSensitive": false },
    { "id": "can_travel", "label": "Can travel", "categoryId": "logistics", "isSensitive": false },
    { "id": "hotel_ok", "label": "Hotel ok", "categoryId": "logistics", "isSensitive": false },
    { "id": "plan_first", "label": "Plan-first", "categoryId": "logistics", "isSensitive": false },
    { "id": "dates", "label": "Dates", "categoryId": "connection", "isSensitive": false },
    { "id": "mates", "label": "Mates", "categoryId": "connection", "isSensitive": false },
    { "id": "ongoing", "label": "Ongoing", "categoryId": "connection", "isSensitive": false },
    { "id": "house_techno", "label": "House/Techno", "categoryId": "culture", "isSensitive": false },
    { "id": "dnb", "label": "DnB", "categoryId": "culture", "isSensitive": false },
    { "id": "fashion", "label": "Fashion", "categoryId": "culture", "isSensitive": false },
    { "id": "gym_regular", "label": "Gym regular", "categoryId": "fitness", "isSensitive": false },
    { "id": "single", "label": "Single", "categoryId": "relationship", "isSensitive": false },
    { "id": "open", "label": "Open", "categoryId": "relationship", "isSensitive": false },
    { "id": "partnered", "label": "Partnered", "categoryId": "relationship", "isSensitive": false },
    { "id": "kink_friendly", "label": "Kink-friendly", "categoryId": "kink", "isSensitive": true },
    { "id": "dominant", "label": "Dominant", "categoryId": "kink", "isSensitive": true },
    { "id": "submissive", "label": "Submissive", "categoryId": "kink", "isSensitive": true },
    { "id": "switch", "label": "Switch", "categoryId": "kink", "isSensitive": true }
  ],
  "synonyms": [
    { "input": "calisober", "tagId": "cali_sober" },
    { "input": "cali-sober", "tagId": "cali_sober" },
    { "input": "california sober", "tagId": "cali_sober" },
    { "input": "cali sober", "tagId": "cali_sober" },
    { "input": "chem free", "tagId": "chem_free" },
    { "input": "chem-free", "tagId": "chem_free" },
    { "input": "no chem", "tagId": "chem_free" },
    { "input": "no chems", "tagId": "chem_free" },
    { "input": "in recovery", "tagId": "recovery_friendly" },
    { "input": "recovery", "tagId": "recovery_friendly" },
    { "input": "recovery friendly", "tagId": "recovery_friendly" },
    { "input": "12 step", "tagId": "recovery_friendly" },
    { "input": "12-step", "tagId": "recovery_friendly" }
  ],
  "profile": {
    "limits": { "tribesMax": 3, "tagsMax": 10 },
    "sections": [
      { "id": "basics", "label": "Basics", "fields": [{ "id": "displayName", "type": "text", "required": true }] }
    ]
  },
  "compatibility": {
    "badges": [
      { "id": "green", "label": "Compatible", "description": "Your essentials align." },
      { "id": "amber", "label": "Check details", "description": "Preferences might differ—read first." },
      { "id": "muted", "label": "Not set", "description": "Not enough info to confirm." }
    ],
    "rules": {
      "minSharedEssentialsForGreen": 2,
      "greenRequiresNoDealbreakerConflict": true,
      "amberIfNoDealbreakerConflictButSharedEssentialsLessThan": 2,
      "mutedIfEitherUserHasNoEssentialsSet": true,
      "dealbreakerConflictBehaviour": "flag",
      "dealbreakerConflictBadgeId": "amber"
    }
  },
  "compliance": {
    "ageGate": { "minAge": 18, "blockUnderage": true, "reportUnderageShortcut": true },
    "consentGate": {
      "requiredBeforeExplicitChat": true,
      "copy": {
        "title": "Consent check",
        "body": "Ask first. Confirm yes. Respect no. No screenshots. No pressure.",
        "checkbox": "I understand",
        "cta": "Continue"
      }
    },
    "aftercare": {
      "checkInEnabled": true,
      "checkInDelayMinutes": 75,
      "copy": { "prompt": "You good?", "options": ["All good", "Need a minute", "Need support"] }
    },
    "gdpr": { "exportEnabled": true, "deleteEnabled": true, "rightNowStatusRetentionMinutes": 180 }
  },
  "moderation": {
    "rules": [
      {
        "id": "block_discriminatory_exclusion_phrases",
        "type": "regex_block",
        "appliesTo": ["about", "customTags"],
        "pattern": "(^|\\\\s)(no\\\\s+(fems|fatt?ies|chubs)\\\\b)|(masc\\\\s*4\\\\s*masc\\\\b)|(only\\\\s+masc\\\\b)",
        "action": "block_with_message",
        "message": "That phrasing can target or exclude people. Rewrite it as what you DO want."
      }
    ],
    "reportReasons": [
      { "id": "harassment", "label": "Harassment" },
      { "id": "hate", "label": "Hate or discrimination" },
      { "id": "underage", "label": "Seems under 18" }
    ]
  },
  "navigation": {
    "routes": [
      { "id": "care", "label": "Care", "path": "/care" },
      { "id": "shop", "label": "Shop", "path": "/market" },
      { "id": "radio", "label": "Radio", "path": "/music/live" },
      { "id": "affiliate", "label": "Affiliate", "path": "/settings" }
    ],
    "contextLinks": [
      { "context": "discover_footer", "routeId": "care", "label": "Aftercare tips" }
    ]
  }
};