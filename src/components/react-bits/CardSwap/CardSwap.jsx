import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CardSwap.css';

const uniq = (arr) => {
  const out = [];
  for (const item of Array.isArray(arr) ? arr : []) {
    const value = typeof item === 'string' ? item.trim() : '';
    if (!value) continue;
    if (out.includes(value)) continue;
    out.push(value);
  }
  return out;
};

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefers(!!mq.matches);

    onChange();

    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else mq.addListener?.(onChange);

    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
      else mq.removeListener?.(onChange);
    };
  }, []);

  return prefers;
};

export default function CardSwap({
  urls,
  active = false,
  alt = 'Profile media',
  intervalMs = 2200,
  className = '',
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const items = useMemo(() => uniq(urls).slice(0, 4), [urls]);
  const cardRefs = useRef([]);
  const timelineRef = useRef(null);

  // Keep refs aligned with render count.
  cardRefs.current = [];

  useEffect(() => {
    let cancelled = false;

    const stop = async () => {
      if (timelineRef.current) {
        try {
          timelineRef.current.kill();
        } catch {
          // ignore
        }
        timelineRef.current = null;
      }
    };

    const start = async () => {
      await stop();

      if (!active) return;
      if (prefersReducedMotion) return;
      if (!items || items.length < 2) return;

      const { gsap } = await import('gsap');
      if (cancelled) return;

      const els = cardRefs.current.filter(Boolean);
      if (els.length < 2) return;

      // Initial state: show the first card.
      gsap.set(els, { opacity: 0, scale: 1 });
      gsap.set(els[0], { opacity: 1, scale: 1 });

      let current = 0;

      const tl = gsap.timeline({ repeat: -1 });
      timelineRef.current = tl;

      const step = () => {
        const next = (current + 1) % els.length;

        // Ensure the next card is above the current.
        gsap.set(els[next], { zIndex: 3 });
        gsap.set(els[current], { zIndex: 2 });

        tl.to(els[next], { opacity: 1, duration: 0.55, ease: 'power2.out' }, `+=${intervalMs / 1000}`);
        tl.fromTo(
          els[next],
          { scale: 0.985, y: 6, rotate: -1 },
          { scale: 1, y: 0, rotate: 0, duration: 0.55, ease: 'power2.out' },
          '<'
        );
        tl.to(els[current], { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, '<');

        current = next;
      };

      // Build steps equal to number of cards to keep the loop smooth.
      for (let i = 0; i < els.length; i += 1) step();
    };

    start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, intervalMs, items, prefersReducedMotion]);

  if (!items.length) return null;

  // Reduced motion or inactive: render the first image only.
  if (!active || prefersReducedMotion || items.length < 2) {
    return (
      <img
        className={`hm-card-swap-static ${className}`.trim()}
        src={items[0]}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          const t = e.target;
          if (t) t.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className={`hm-card-swap ${className}`.trim()} aria-hidden="true">
      {items.map((src, idx) => (
        <img
          key={`${src}-${idx}`}
          ref={(el) => {
            if (el) cardRefs.current.push(el);
          }}
          className="hm-card-swap-card"
          src={src}
          alt={idx === 0 ? alt : ''}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            const t = e.target;
            if (t) t.style.display = 'none';
          }}
        />
      ))}
    </div>
  );
}
