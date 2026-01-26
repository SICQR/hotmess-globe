export const TELEGRAM_DOMAIN = 'Hotmess_feed' as const;

export const TELEGRAM_HTTP_URL = `https://t.me/${TELEGRAM_DOMAIN}` as const;
export const TELEGRAM_TG_URL = `tg://resolve?domain=${TELEGRAM_DOMAIN}` as const;

export type TelegramLinkChoice = {
  primaryUrl: string;
  fallbackUrl: string;
  isMobile: boolean;
};

export const isMobileUserAgent = (userAgent: string): boolean => {
  const ua = String(userAgent || '');
  return /android|iphone|ipad|ipod|iemobile|opera mini/i.test(ua);
};

export const chooseTelegramLinks = (userAgent: string): TelegramLinkChoice => {
  const isMobile = isMobileUserAgent(userAgent);

  return {
    isMobile,
    primaryUrl: isMobile ? TELEGRAM_TG_URL : TELEGRAM_HTTP_URL,
    fallbackUrl: TELEGRAM_HTTP_URL,
  };
};

const safeOpenNewTab = (win: Window, url: string) => {
  const opened = win.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    win.location.href = url;
  }
};

export const openTelegramGroup = (options: {
  userAgent?: string;
  win?: Window;
  preferNativeOnMobile?: boolean;
} = {}): void => {
  const win = options.win ?? window;
  const ua = options.userAgent ?? win.navigator.userAgent;
  const preferNativeOnMobile = options.preferNativeOnMobile ?? true;

  const { isMobile, primaryUrl, fallbackUrl } = chooseTelegramLinks(ua);

  // Desktop: open the HTTPS link in a new tab so the user can continue browsing the grid.
  if (!isMobile) {
    safeOpenNewTab(win, primaryUrl);
    return;
  }

  // Mobile: attempt native deep-link first and fall back to HTTPS.
  if (!preferNativeOnMobile) {
    win.location.href = fallbackUrl;
    return;
  }

  let didHide = false;
  const onVis = () => {
    if (document.visibilityState === 'hidden') didHide = true;
  };

  document.addEventListener('visibilitychange', onVis);

  try {
    win.location.href = primaryUrl;
  } catch {
    // ignore
  }

  // If the app switch succeeds, the page typically becomes hidden.
  // If not, fall back to the web link after a short delay.
  win.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVis);
    if (didHide) return;
    win.location.href = fallbackUrl;
  }, 900);
};
