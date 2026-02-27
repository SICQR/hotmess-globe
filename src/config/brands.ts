/**
 * HOTMESS Brand Config
 *
 * Single source of truth for which brands are visible at launch.
 * To flip a brand on: change visible: false → true and deploy.
 * No DB migration, no rebuild of other files needed.
 *
 * BRAND CHANNEL RULES (from CLAUDE.md):
 * - NEVER auto-cross-promote between brands
 * - Each brand has isolated Shopify tags, beacon types, content categories
 * - Cross-brand collabs are HUMAN editorial decisions only (via admin)
 */

export interface BrandConfig {
  key: string;
  name: string;
  visible: boolean;
  description?: string;
  shopifyCollection?: string;
  routes: string[];
}

export const BRAND_CONFIG: Record<string, BrandConfig> = {
  // ── VISIBLE AT LAUNCH ───────────────────────────────────────────────────

  hotmess: {
    key: 'hotmess',
    name: 'HOTMESS',
    visible: true,
    description: 'The social OS',
    routes: ['/', '/pulse', '/ghosted', '/profile', '/safety', '/auth'],
  },

  hotmessRadio: {
    key: 'hotmessRadio',
    name: 'HOTMESS RADIO',
    visible: true,
    description: 'Live radio layer — Wake The Mess, Dial A Daddy, Hand N Hand',
    shopifyCollection: 'hotmess-radio',
    routes: ['/radio'],
  },

  raw: {
    key: 'raw',
    name: 'RAW',
    visible: true,
    description: 'Bold basics clothing line',
    shopifyCollection: 'raw',
    routes: ['/market/raw'],
  },

  messmarket: {
    key: 'messmarket',
    name: 'MESSMARKET',
    visible: true,
    description: 'Preloved P2P marketplace',
    routes: ['/market/preloved', '/market'],
  },

  // ── HIDDEN AT LAUNCH (flip visible → true when ready) ──────────────────

  hung: {
    key: 'hung',
    name: 'HUNG',
    visible: false,
    description: 'Statement pieces clothing line',
    shopifyCollection: 'hung',
    routes: ['/market/hung'],
  },

  high: {
    key: 'high',
    name: 'HIGH',
    visible: false,
    description: 'Elevated essentials clothing line',
    shopifyCollection: 'high',
    routes: ['/market/high'],
  },

  superhung: {
    key: 'superhung',
    name: 'SUPERHUNG',
    visible: true,
    description: 'Ultra-limited drops',
    shopifyCollection: 'superhung',
    routes: ['/market/superhung'],
  },

  superraw: {
    key: 'superraw',
    name: 'SUPERRAW',
    visible: true,
    description: 'Ultra-limited RAW drops',
    shopifyCollection: 'superraw',
    routes: ['/market/superraw'],
  },

  hungmess: {
    key: 'hungmess',
    name: 'HUNGMESS',
    visible: false,
    description: 'Editorial fashion line',
    shopifyCollection: 'hungmess',
    routes: ['/editorial'],
  },

  rawConvictRecords: {
    key: 'rawConvictRecords',
    name: 'RAW CONVICT RECORDS',
    visible: true,
    description: 'The record label',
    shopifyCollection: 'raw-convict-records',
    routes: ['/music'],
  },

  smashDaddys: {
    key: 'smashDaddys',
    name: 'SMASH DADDYS',
    visible: true,
    description: 'In-house music production',
    shopifyCollection: 'smash-daddys',
    routes: ['/production'],
  },

  hnhMess: {
    key: 'hnhMess',
    name: 'HNH MESS',
    visible: true,
    description: 'Lube brand',
    shopifyCollection: 'hnh-mess',
    routes: ['/market/hnh'],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Is this brand visible at launch? */
export function isBrandVisible(brandKey: string): boolean {
  return BRAND_CONFIG[brandKey]?.visible ?? false;
}

/** All brands visible at launch */
export function getVisibleBrands(): BrandConfig[] {
  return Object.values(BRAND_CONFIG).filter(b => b.visible);
}

/** Visible brands that have a Shopify collection (for Market page) */
export function getVisibleShopifyBrands(): BrandConfig[] {
  return getVisibleBrands().filter(b => b.shopifyCollection);
}

/** All brands (admin/analytics use only — never expose to regular users) */
export function getAllBrandsAdmin(): BrandConfig[] {
  return Object.values(BRAND_CONFIG);
}
