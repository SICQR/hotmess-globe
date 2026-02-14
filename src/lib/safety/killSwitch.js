/**
 * HOTMESS City Safety Switch
 * Emergency control to disable all signals from a city
 */

import logger from '@/utils/logger';

const safetyState = { cities: new Set(), categories: new Set(), global: false, lastSync: null };

export function isCityDisabled(cityId) {
  return safetyState.global || safetyState.cities.has(cityId?.toLowerCase());
}

export function isCategoryDisabled(category) {
  return safetyState.global || safetyState.categories.has(category?.toLowerCase());
}

export function isDisabled(cityId, category) {
  return safetyState.global || isCityDisabled(cityId) || isCategoryDisabled(category);
}

export function getSafetyState() {
  return {
    disabledCities: Array.from(safetyState.cities),
    disabledCategories: Array.from(safetyState.categories),
    globalDisabled: safetyState.global,
    lastSync: safetyState.lastSync,
  };
}

export async function applySafetySwitch(action, target, reason, adminId) {
  const actions = {
    disable_city: () => safetyState.cities.add(target.toLowerCase()),
    enable_city: () => safetyState.cities.delete(target.toLowerCase()),
    disable_category: () => safetyState.categories.add(target.toLowerCase()),
    enable_category: () => safetyState.categories.delete(target.toLowerCase()),
    disable_global: () => { safetyState.global = true; },
    enable_global: () => { safetyState.global = false; },
  };
  actions[action]?.();
  return { success: true, state: getSafetyState() };
}

export async function loadSafetyState() {
  try {
    const res = await fetch('/api/admin/safety-switch');
    if (!res.ok) return;
    const data = await res.json();
    safetyState.cities = new Set(data.disabled_cities || []);
    safetyState.categories = new Set(data.disabled_categories || []);
    safetyState.global = data.global_disabled || false;
    safetyState.lastSync = new Date().toISOString();
  } catch (e) { logger.error(e); }
}

export function filterBySafety(items, cityKey = 'city', categoryKey = 'category') {
  return items.filter(item => !isDisabled(item[cityKey], item[categoryKey]));
}
