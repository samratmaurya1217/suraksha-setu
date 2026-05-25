/**
 * Browser Push Notification Utilities
 * Handles notification permissions, service worker registration, and push subscriptions
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Check if browser supports notifications
 */
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser');
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    return await registration.unregister();
  }
  return false;
};

/**
 * Convert base64 string to Uint8Array (for VAPID key)
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (vapidPublicKey = null) => {
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription;
    }

    // Get VAPID public key from backend if not provided
    if (!vapidPublicKey) {
      const response = await fetch(`${API_URL}/api/push/vapid-public-key`);
      if (!response.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const data = await response.json();
      vapidPublicKey = data.publicKey;
    }

    // Subscribe to push notifications
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log('Push notification subscription:', subscription);

    // Send subscription to backend
    await sendSubscriptionToBackend(subscription);

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe();
      
      // Remove from backend
      await removeSubscriptionFromBackend(subscription);
      
      console.log('Unsubscribed from push notifications');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

/**
 * Send subscription to backend
 */
const sendSubscriptionToBackend = async (subscription) => {
  try {
    const response = await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }

    const data = await response.json();
    console.log('Subscription saved to backend:', data);
    return data;
  } catch (error) {
    console.error('Error sending subscription to backend:', error);
    throw error;
  }
};

/**
 * Remove subscription from backend
 */
const removeSubscriptionFromBackend = async (subscription) => {
  try {
    const response = await fetch(`${API_URL}/api/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from backend');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing subscription from backend:', error);
    throw error;
  }
};

/**
 * Show a local notification (for testing or fallback)
 */
export const showLocalNotification = async (title, options = {}) => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.showNotification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      ...options,
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    // Fallback to browser notification
    return new Notification(title, options);
  }
};

/**
 * Get current push subscription
 */
export const getCurrentSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting current subscription:', error);
    return null;
  }
};

/**
 * Initialize push notifications (request permission + subscribe)
 */
export const initializePushNotifications = async () => {
  try {
    // Check support
    if (!isNotificationSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    // Register service worker
    await registerServiceWorker();

    // Request permission
    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Subscribe to push
    const subscription = await subscribeToPushNotifications();

    console.log('Push notifications initialized successfully');
    
    return {
      success: true,
      subscription,
      permission,
    };
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  unregisterServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  showLocalNotification,
  getCurrentSubscription,
  initializePushNotifications,
};
