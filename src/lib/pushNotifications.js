/**
 * Push Notifications Library
 * 
 * Manages web push notifications for match alerts and re-engagement.
 */

import { trackEvent } from './analytics';

// ============================================================================
// Configuration
// ============================================================================

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const SW_PATH = '/service-worker.js';
const PERMISSION_STORAGE_KEY = 'hotmess_push_permission';

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current permission state
 */
export function getPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', 'default'
}

/**
 * Check if we should show the permission prompt
 */
export function shouldShowPermissionPrompt() {
  if (!isPushSupported()) return false;
  
  const permission = getPermissionState();
  if (permission === 'denied') return false;
  if (permission === 'granted') return false;
  
  // Check if user dismissed prompt recently
  const lastPrompt = localStorage.getItem(PERMISSION_STORAGE_KEY);
  if (lastPrompt) {
    const daysSince = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return false; // Don't ask again for 7 days
  }
  
  return true;
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    
    trackEvent('push_permission_requested', { result: permission });
    
    if (permission === 'granted') {
      const subscription = await subscribeToPush();
      return { success: true, subscription };
    }
    
    // Store that we asked
    localStorage.setItem(PERMISSION_STORAGE_KEY, Date.now().toString());
    
    return { success: false, reason: permission };
  } catch (error) {
    console.error('Permission request error:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Mark permission prompt as dismissed
 */
export function dismissPermissionPrompt() {
  localStorage.setItem(PERMISSION_STORAGE_KEY, Date.now().toString());
  trackEvent('push_permission_dismissed');
}

// ============================================================================
// Service Worker & Subscription
// ============================================================================

/**
 * Register service worker and subscribe to push
 */
export async function subscribeToPush() {
  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send to backend
      await saveSubscription(subscription);
      
      trackEvent('push_subscribed');
    }

    return subscription;
  } catch (error) {
    console.error('Push subscription error:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscription(subscription);
      
      trackEvent('push_unsubscribed');
    }

    return { success: true };
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save subscription to backend
 */
async function saveSubscription(subscription) {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }
}

/**
 * Remove subscription from backend
 */
async function removeSubscription(subscription) {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  });
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification configurations for different types
 */
export const NOTIFICATION_TYPES = {
  new_match: {
    title: 'New High Match!',
    icon: '/icons/match-icon.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    tag: 'new-match',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'View Profile' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  },
  
  new_message: {
    title: 'New Message',
    icon: '/icons/message-icon.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    tag: 'new-message',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'view', title: 'View' },
    ],
  },
  
  live_match: {
    title: 'Match is Live!',
    icon: '/icons/live-icon.png',
    badge: '/icons/badge.png',
    vibrate: [300, 100, 300],
    tag: 'live-match',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'connect', title: 'Connect Now' },
      { action: 'later', title: 'Later' },
    ],
  },
  
  weekly_matches: {
    title: 'Your Weekly Matches',
    icon: '/icons/weekly-icon.png',
    badge: '/icons/badge.png',
    vibrate: [100],
    tag: 'weekly-matches',
    renotify: false,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'See Matches' },
    ],
  },
};

// ============================================================================
// Local Notifications (Fallback)
// ============================================================================

/**
 * Show a local notification (when service worker is not available)
 */
export function showLocalNotification(type, data) {
  if (Notification.permission !== 'granted') return;

  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.new_match;
  
  const notification = new Notification(config.title, {
    body: data.body,
    icon: config.icon,
    badge: config.badge,
    tag: config.tag,
    renotify: config.renotify,
    data: data,
  });

  notification.onclick = () => {
    window.focus();
    if (data.url) {
      window.location.href = data.url;
    }
    notification.close();
  };

  trackEvent('notification_shown', { type, ...data });

  return notification;
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing push notification permission
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(getPermissionState());
  const [isSupported] = useState(isPushSupported());
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setShouldPrompt(shouldShowPermissionPrompt());
  }, []);

  const request = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await requestPermission();
      setPermission(getPermissionState());
      setShouldPrompt(false);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    dismissPermissionPrompt();
    setShouldPrompt(false);
  }, []);

  return {
    permission,
    isSupported,
    shouldPrompt,
    isLoading,
    request,
    dismiss,
    isEnabled: permission === 'granted',
    isDenied: permission === 'denied',
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default {
  isPushSupported,
  getPermissionState,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
  NOTIFICATION_TYPES,
};
