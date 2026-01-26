import React, { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  TELEGRAM_DOMAIN,
  TELEGRAM_HTTP_URL,
  TELEGRAM_TG_URL,
  chooseTelegramLinks,
  openTelegramGroup,
} from './telegramLinks';

export type TelegramPanelProps = {
  open: boolean;
  onClose: () => void;
};

const getFocusableElements = (root: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
};

export default function TelegramPanel({ open, onClose }: TelegramPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const bodyOverflowRef = useRef<string>('');

  const linkChoice = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return chooseTelegramLinks(ua);
  }, []);

  useEffect(() => {
    if (!open) return;

    lastActiveElementRef.current = (document.activeElement as HTMLElement) || null;
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button for immediate keyboard control.
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = bodyOverflowRef.current;
      lastActiveElementRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleEnterFeed = async () => {
    try {
      toast.message('Telegram bot connection placeholder', {
        description: 'Bot integration will be enabled when the telebot repo is wired in.',
      });
      openTelegramGroup();
    } catch (err: any) {
      toast.error(err?.message || 'Could not start Telegram feed handshake');
    }
  };

  const handleTrapKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== 'Tab') return;

    const root = panelRef.current;
    if (!root) return;

    const focusables = getFocusableElements(root);
    if (!focusables.length) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (!active || active === first) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="HOTMESS Feed"
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="absolute inset-0 flex items-center justify-center p-4 md:justify-end md:items-stretch"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          onClose();
        }}
      >
        <div
          ref={panelRef}
          onKeyDown={handleTrapKeyDown}
          className="w-full max-w-md rounded-lg border border-border bg-background p-4 text-foreground shadow-lg md:h-full md:w-[420px] md:max-w-none md:rounded-none md:border-l"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">HOTMESS Feed</div>
              <div className="text-xs text-muted-foreground">Telegram group: {TELEGRAM_DOMAIN}</div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleEnterFeed}
              className="w-full rounded-md border border-border bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Enter HOTMESS Feed
            </button>

            <button
              type="button"
              onClick={() => openTelegramGroup()}
              className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-black/5"
            >
              Open {TELEGRAM_DOMAIN}
            </button>

            <div className="rounded-md border border-border bg-background p-3 text-sm">
              <div className="text-xs font-semibold">Links</div>
              <div className="mt-2 space-y-1 break-all text-xs">
                <div>
                  <span className="font-semibold">Primary:</span>{' '}
                  <a
                    href={TELEGRAM_HTTP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {TELEGRAM_HTTP_URL}
                  </a>
                </div>
                <div>
                  <span className="font-semibold">Deep link:</span>{' '}
                  <a href={TELEGRAM_TG_URL} className="underline">
                    {TELEGRAM_TG_URL}
                  </a>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Preferred on this device: <span className="font-semibold">{linkChoice.primaryUrl}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              If the group does not exist yet, an admin must create it in Telegram and set the public username to{' '}
              <span className="font-semibold">{TELEGRAM_DOMAIN}</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
