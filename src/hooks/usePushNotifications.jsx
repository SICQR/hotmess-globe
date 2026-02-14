import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

/**
 * Hook for managing push notification subscriptions
 * 
 * Usage:
 * const { 
 *   isSupported, 
 *   permission, 
 *   isSubscribed, 
 *   subscribe, 
 *   unsubscribe 
 * } = usePushNotifications();
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  useEffect(() => {
    if (!isSupported) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        setSubscription(sub);
      } catch (err) {
        logger.error('[PushNotifications] Error checking subscription:', err);
      }
    };

    checkSubscription();
  }, [isSupported]);

  /**
   * Request permission and subscribe to push notifications
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    try {
      setError(null);

      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        logger.warn('[PushNotifications] No VAPID public key configured');
        // Still mark as subscribed for browser notifications
        setIsSubscribed(true);
        return true;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push manager
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setSubscription(sub);
      setIsSubscribed(true);

      // Save subscription to database
      await saveSubscription(sub);

      logger.info('[PushNotifications] Subscribed successfully');
      return true;
    } catch (err) {
      logger.error('[PushNotifications] Subscribe error:', err);
      setError(err.message);
      return false;
    }
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      setIsSubscribed(false);
      return true;
    }

    try {
      setError(null);

      await subscription.unsubscribe();
      
      // Remove subscription from database
      await removeSubscription(subscription);

      setSubscription(null);
      setIsSubscribed(false);

      logger.info('[PushNotifications] Unsubscribed successfully');
      return true;
    } catch (err) {
      logger.error('[PushNotifications] Unsubscribe error:', err);
      setError(err.message);
      return false;
    }
  }, [subscription]);

  /**
   * Send a local notification (for testing)
   */
  const sendTestNotification = useCallback(async (title, body) => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'test-notification',
        vibrate: [200, 100, 200],
      });
      return true;
    } catch (err) {
      logger.error('[PushNotifications] Test notification error:', err);
      return false;
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

/**
 * Save push subscription to database
 */
async function saveSubscription(subscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        user_email: user.email,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.toJSON().keys),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      logger.error('[PushNotifications] Error saving subscription:', error);
    }
  } catch (err) {
    logger.error('[PushNotifications] Save subscription error:', err);
  }
}

/**
 * Remove push subscription from database
 */
async function removeSubscription(subscription) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      logger.error('[PushNotifications] Error removing subscription:', error);
    }
  } catch (err) {
    logger.error('[PushNotifications] Remove subscription error:', err);
  }
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

export default usePushNotifications;
