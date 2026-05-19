/**
 * src/components/system/Toast.tsx
 * Toast — re-export of sonner with the design system theme applied once.
 *
 * App code imports `toast` from here, not from 'sonner', so swapping
 * toast libs or adjusting visual style happens in one place.
 *
 * Usage:
 *   import { toast } from '@/components/system/Toast';
 *   toast.success('Sent');
 *   toast.error('Failed');
 *
 * For the toaster root element, render <ToastRoot /> once in your shell.
 */
import * as React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export const toast = sonnerToast;

export const ToastRoot: React.FC = () => (
  <SonnerToaster
    position="top-center"
    theme="dark"
    richColors={false}
    closeButton={false}
    toastOptions={{
      className: 'font-mono text-body',
      style: {
        background: '#0D0D0D',
        color: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: '12px',
        fontFamily: "'Space Mono', 'SF Mono', Menlo, monospace",
      },
    }}
  />
);

export default toast;
