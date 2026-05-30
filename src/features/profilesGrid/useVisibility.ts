import { useEffect, useMemo, useState } from 'react';

export type UseVisibilityOptions = {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
};

export function useVisibility(options: UseVisibilityOptions = {}) {
  const { rootMargin = '0px', threshold = 0.1, once = false } = options;

  const [node, setNode] = useState<Element | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const ref = useMemo(() => {
    return (el: Element | null) => setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, once, rootMargin, threshold]);

  return { ref, isVisible };
}
