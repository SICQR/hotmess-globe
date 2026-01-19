import { useEffect, useMemo, useState } from "react"
import { Toaster as Sonner } from "sonner"

const getSonnerTheme = () => {
  if (typeof window === 'undefined') return 'system';

  const root = window.document?.documentElement;
  if (root?.classList?.contains('dark')) return 'dark';
  if (root?.classList?.contains('light')) return 'light';

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  return prefersDark ? 'dark' : 'light';
};

const Toaster = ({
  ...props
}) => {
  const [theme, setTheme] = useState(getSonnerTheme);

  const media = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  }, []);

  useEffect(() => {
    setTheme(getSonnerTheme());

    const root = window.document?.documentElement;
    const observer = root
      ? new MutationObserver(() => setTheme(getSonnerTheme()))
      : null;

    observer?.observe(root, { attributes: true, attributeFilter: ['class'] });

    const onMediaChange = () => setTheme(getSonnerTheme());
    media?.addEventListener?.('change', onMediaChange);

    return () => {
      observer?.disconnect();
      media?.removeEventListener?.('change', onMediaChange);
    };
  }, [media]);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster }
