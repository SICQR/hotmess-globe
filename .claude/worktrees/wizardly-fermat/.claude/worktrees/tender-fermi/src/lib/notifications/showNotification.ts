// Shows a notification via the Notifications API (no push server needed for foreground)
// Falls back gracefully if permission not granted

export async function showLocalNotification(
  title: string,
  body: string,
  url = '/',
  tag = 'hotmess'
): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (reg) {
    reg.showNotification(title, {
      body,
      tag,
      icon: '/assets/icon-192.png',
      data: { url },
    });
  } else {
    new Notification(title, {
      body,
      tag,
      icon: '/assets/icon-192.png',
    });
  }
}
