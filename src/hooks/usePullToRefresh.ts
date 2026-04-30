import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * usePullToRefresh — Global gesture for site reload
 * 
 * Detects downward swipe from top. Shows progress. Reloads window.
 */
export function usePullToRefresh(options: { disabled?: boolean } = {}) {
  const { disabled = false } = options;
  const [pullProgress, setPullProgress] = useState(0); // 0 to 1
  const [isRefreshing, setIsRefreshing] = useState(false);

  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const THRESHOLD = 120; // pixels to pull before refresh

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      
      const target = e.target as HTMLElement;

      // SAFETY: Bail if touch starts inside a sheet, modal, or fixed overlay
      // We check for specific roles and common sheet classes
      let check = target;
      while (check && check !== document.body) {
        const style = window.getComputedStyle(check);
        const isFixed = style.position === 'fixed' || style.position === 'absolute';
        const zIndex = parseInt(style.zIndex, 10);
        
        // If we are touching something elevated (z-index > 50) that is fixed/absolute, 
        // it's likely a sheet or overlay.
        if (isFixed && zIndex >= 50) return;
        
        // Explicit sheet check
        if (check.hasAttribute('data-sheet') || check.getAttribute('role') === 'dialog') return;
        
        if (check.scrollTop > 0) return; // Existing scroll check
        check = check.parentElement as HTMLElement;
      }
      
      const isAtTop = window.scrollY <= 0;


      if (isAtTop) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      
      currentY.current = e.touches[0].pageY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0) {
        // Prevent default browser behavior (bouncing)
        if (e.cancelable) e.preventDefault();
        
        const progress = Math.min(diff / THRESHOLD, 1.2);
        setPullProgress(progress);
      } else {
        setPullProgress(0);
        isPulling.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      
      const diff = currentY.current - startY.current;
      if (diff >= THRESHOLD) {
        setIsRefreshing(true);
        setPullProgress(1);
        
        // Final gold toast + reload
        toast.loading('Refreshing HOTMESS...', { 
          duration: 2000,
          style: { background: '#000', color: '#C8962C', border: '1px solid #C8962C' }
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setPullProgress(0);
      }
      
      isPulling.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, disabled]);


  return { pullProgress, isRefreshing };
}
