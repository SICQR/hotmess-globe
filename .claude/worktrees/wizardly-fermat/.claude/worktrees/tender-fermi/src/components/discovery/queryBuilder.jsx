/**
 * Query builder for HOTMESS discovery filters (Vite/React).
 * Converts FiltersDrawer "values" into URL params + API payload.
 *
 * Assumes values are shaped by discovery-taxonomy.v1.json defaults.
 */

function isNonEmptyArray(x) {
  return Array.isArray(x) && x.length > 0;
}

function isBool(x) {
  return typeof x === "boolean";
}

function isString(x) {
  return typeof x === "string";
}

function isRangeTuple(x) {
  return Array.isArray(x) && x.length === 2 && typeof x[0] === "number" && typeof x[1] === "number";
}

function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || typeof v === "undefined") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * URL encoding strategy:
 * - booleans: 1/0
 * - single string: as-is
 * - arrays: comma-separated
 * - range tuples: "min..max"
 */
export function valuesToSearchParams(values) {
  const params = new URLSearchParams();

  for (const [key, v] of Object.entries(values || {})) {
    if (v === null || typeof v === "undefined") continue;

    if (isBool(v)) {
      if (v) params.set(key, "1");
      // omit false to keep URLs clean
      continue;
    }

    if (isRangeTuple(v)) {
      // omit if it looks like "any" range? we keep it explicit if provided
      params.set(key, `${v[0]}..${v[1]}`);
      continue;
    }

    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      params.set(key, v.join(","));
      continue;
    }

    if (isString(v) && v.trim() !== "") {
      params.set(key, v);
      continue;
    }

    // fallback for numbers/others
    if (typeof v === "number") {
      params.set(key, String(v));
    }
  }

  return params;
}

/**
 * Parse URLSearchParams back into values.
 * NOTE: this needs defaults injected so we can preserve shapes.
 */
export function searchParamsToValues(searchParams, defaults) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  const out = { ...(defaults || {}) };

  for (const [key, raw] of params.entries()) {
    const d = out[key];

    // infer type from defaults shape
    if (typeof d === "boolean") {
      out[key] = raw === "1" || raw === "true";
      continue;
    }

    if (isRangeTuple(d) || d === null) {
      // range is stored as "a..b"
      if (raw.includes("..")) {
        const [a, b] = raw.split("..").map((n) => Number(n));
        if (!Number.isNaN(a) && !Number.isNaN(b)) out[key] = [a, b];
      } else {
        // if someone passes "any"
        out[key] = null;
      }
      continue;
    }

    if (Array.isArray(d)) {
      out[key] = raw.split(",").filter(Boolean);
      continue;
    }

    // string / number fallback
    if (typeof d === "number") out[key] = Number(raw);
    else out[key] = raw;
  }

  return out;
}

/**
 * API payload strategy:
 * Normalize into consistent sections:
 * - flags: booleans
 * - ranges: {field: {min,max}}
 * - enums: single selects
 * - lists: multi selects & ref selects
 *
 * Plus convenience fields:
 * - tribes: { include: [], exclude: [] }
 */
export function valuesToApiPayload(values) {
  const v = values || {};

  const flags = {};
  const ranges = {};
  const enums = {};
  const lists = {};

  for (const [key, val] of Object.entries(v)) {
    if (val === null || typeof val === "undefined") continue;

    if (isBool(val)) {
      // include only true flags to reduce payload size
      if (val) flags[key] = true;
      continue;
    }

    if (isRangeTuple(val)) {
      ranges[key] = { min: val[0], max: val[1] };
      continue;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      lists[key] = val;
      continue;
    }

    if (isString(val) && val.trim() !== "") {
      enums[key] = val;
      continue;
    }

    if (typeof val === "number") enums[key] = val;
  }

  const tribes = {
    include: Array.isArray(v.tribeInclude) ? v.tribeInclude : [],
    exclude: Array.isArray(v.tribeExclude) ? v.tribeExclude : []
  };

  // ensure exclude doesn't contain included ids
  if (tribes.include.length && tribes.exclude.length) {
    const inc = new Set(tribes.include);
    tribes.exclude = tribes.exclude.filter((id) => !inc.has(id));
  }

  // If you want the backend to treat certain labels as dealbreakers,
  // keep them as-is (strings). Later we can map them to canonical tagIds.
  const payload = compact({
    flags,
    ranges,
    enums,
    lists,
    tribes
  });

  return payload;
}

/**
 * Local filtering for user profiles with real data.
 *
 * profile shape (example):
 * {
 *   id,
 *   onlineNow: boolean,
 *   rightNow: boolean,
 *   hasFace: boolean,
 *   age: number,
 *   tribes: string[] (tribeIds),
 *   tags: string[] (tagIds),
 *   lookingFor: string[],
 *   meetAt: string[],
 *   relationshipStatus: string[],
 *   distanceKm: number
 * }
 */
export function applyLocalFilters(profiles, values, { taxonomyIndex } = {}) {
  const v = values || {};
  const idx = taxonomyIndex;

  const withinRange = (num, tuple) => {
    if (!isRangeTuple(tuple)) return true;
    if (typeof num !== "number") return false;
    return num >= tuple[0] && num <= tuple[1];
  };

  const containsAny = (arr, wanted) => {
    if (!isNonEmptyArray(wanted)) return true;
    if (!Array.isArray(arr)) return false;
    const set = new Set(arr);
    return wanted.some((x) => set.has(x));
  };

  const containsAll = (arr, wanted) => {
    if (!isNonEmptyArray(wanted)) return true;
    if (!Array.isArray(arr)) return false;
    const set = new Set(arr);
    return wanted.every((x) => set.has(x));
  };

  const excludesAny = (arr, banned) => {
    if (!isNonEmptyArray(banned)) return true;
    if (!Array.isArray(arr)) return true;
    const set = new Set(arr);
    return banned.every((x) => !set.has(x));
  };

  const tribeInclude = Array.isArray(v.tribeInclude) ? v.tribeInclude : [];
  const tribeExclude = Array.isArray(v.tribeExclude) ? v.tribeExclude : [];

  // basic booleans (only enforce when true)
  const boolEnforce = (p, key) => (v[key] ? !!p[key] : true);

  // multi-select strings enforce "any match"
  const multiAny = (p, key) => {
    const wanted = Array.isArray(v[key]) ? v[key] : [];
    return containsAny(p[key], wanted);
  };

  return (profiles || []).filter((p) => {
    // quick toggles / flags
    if (!boolEnforce(p, "onlineNow")) return false;
    if (!boolEnforce(p, "rightNow")) return false;
    if (!boolEnforce(p, "hasFace")) return false;
    // note: nearMe is UX-level; distanceKm handles actual
    if (v.nearMe && typeof p.distanceKm === "number" && isRangeTuple(v.distanceKm)) {
      // distance range already applied below; nearMe just ensures distanceKm exists
      // if you want, enforce p.distanceKm != null
      if (typeof p.distanceKm !== "number") return false;
    }
    if (v.hasPhotos && !p.hasPhotos) return false;
    if (v.hasFacePhoto && !p.hasFacePhoto) return false;

    // ranges
    if (v.ageRange && !withinRange(p.age, v.ageRange)) return false;
    if (v.distanceKm && !withinRange(p.distanceKm, v.distanceKm)) return false;
    if (v.heightCm && !withinRange(p.heightCm, v.heightCm)) return false;
    if (v.weightKg && !withinRange(p.weightKg, v.weightKg)) return false;

    // enums / single_select
    if (v.availabilityWindow && p.availabilityWindow && v.availabilityWindow !== p.availabilityWindow) return false;

    // multi selects
    if (!multiAny(p, "lookingFor")) return false;
    if (!multiAny(p, "meetAt")) return false;
    if (!multiAny(p, "relationshipStatus")) return false;
    if (!multiAny(p, "bodyType")) return false;
    if (!multiAny(p, "position")) return false;
    if (!multiAny(p, "hostTravel")) return false;
    if (!multiAny(p, "vibeTags")) return false;
    if (!multiAny(p, "communicationStyle")) return false;

    // tribes include/exclude (ids)
    if (isNonEmptyArray(tribeInclude) && !containsAll(p.tribes || [], tribeInclude)) return false;
    if (isNonEmptyArray(tribeExclude) && !excludesAny(p.tribes || [], tribeExclude)) return false;

    // tag refs (ids) — substancesPrefs uses tagIds
    if (isNonEmptyArray(v.substancesPrefs)) {
      // If you're storing user tags on profiles, this matches tagIds.
      if (!containsAny(p.tags || [], v.substancesPrefs)) return false;
    }

    // chemFree quick toggle: if true, require profile tag "chem_free"
    if (v.chemFree) {
      const chemTagId = "chem_free";
      if (!Array.isArray(p.tags) || !p.tags.includes(chemTagId)) return false;
    }

    // care booleans: treat as flags in profile
    if (v.consentForward && !p.consentForward) return false;
    if (v.aftercareOffered && !p.aftercareOffered) return false;
    if (v.aftercareNeeded && !p.aftercareNeeded) return false;
    if (v.cuddlesOk && !p.cuddlesOk) return false;
    if (v.noPressure && !p.noPressure) return false;

    // dealbreakers: these are labels right now; if you map them to tagIds later, switch to ids.
    // For local dev, we implement a simple rule: if user sets a dealbreaker label,
    // require corresponding boolean/tag where possible.
    if (isNonEmptyArray(v.dealbreakers)) {
      const d = new Set(v.dealbreakers);
      if (d.has("Consent-forward") && !p.consentForward) return false;
      if (d.has("Aftercare offered") && !p.aftercareOffered) return false;
      if (d.has("Aftercare needed") && !p.aftercareNeeded) return false;
      if (d.has("Chem-free")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("chem_free")) return false;
      }
      if (d.has("Sober")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("sober")) return false;
      }
      if (d.has("Cali sober")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("cali_sober")) return false;
      }
      if (d.has("420-friendly")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("friendly_420")) return false;
      }
      if (d.has("Alcohol ok")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("alcohol_ok")) return false;
      }
      if (d.has("Recovery-friendly")) {
        if (!Array.isArray(p.tags) || !p.tags.includes("recovery_friendly")) return false;
      }
    }

    // If you want synonym-based matching for free-text tags later:
    // idx.resolveTagIdFromInput("chem free") => "chem_free"
    // Not needed here unless you allow custom tags.

    return true;
  });
}