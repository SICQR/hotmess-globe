import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function PageShell({
  eyebrow,
  title,
  subtitle,
  maxWidth = '6xl',
  back,
  backLabel = 'Back',
  right,
  children,
  className,
  headerClassName,
}) {
  const navigate = useNavigate();

  const showHeader = eyebrow || title || subtitle || back || right;

  const onBack = () => {
    if (typeof back === 'function') return back();
    if (typeof back === 'string') return navigate(back);
    if (back) return navigate(-1);
    return null;
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-10', MAX_WIDTH[maxWidth] || MAX_WIDTH['6xl'])}>
        {showHeader ? (
          <div className={cn('mb-6 md:mb-8', headerClassName)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {back ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="-ml-2 px-2 text-white/70 hover:text-white hover:bg-white/5"
                  >
                    <ArrowLeft />
                    {backLabel}
                  </Button>
                ) : null}

                {eyebrow ? (
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                    {eyebrow}
                  </div>
                ) : null}

                {title ? (
                  <h1 className="mt-2 text-3xl md:text-4xl font-black uppercase tracking-tight break-words">
                    {title}
                  </h1>
                ) : null}

                {subtitle ? (
                  <p className="mt-2 text-sm md:text-base text-white/60 max-w-3xl">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {right ? <div className="flex items-center gap-2 flex-shrink-0">{right}</div> : null}
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export default PageShell;
