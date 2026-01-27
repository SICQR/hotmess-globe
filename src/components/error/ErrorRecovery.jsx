import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Clock, Shield, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorInfo, ErrorCategory } from '@/utils/errorHandler';

/**
 * Error Recovery Component
 * Provides user-friendly error display with recovery actions
 */
export function ErrorRecovery({ 
  error, 
  onRetry, 
  onDismiss,
  showDetails = false,
  className = '' 
}) {
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const errorInfo = getErrorInfo(error);
  
  // Auto-retry countdown for network errors
  useEffect(() => {
    if (errorInfo.category === ErrorCategory.NETWORK && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    
    if (countdown === 0 && errorInfo.category === ErrorCategory.NETWORK) {
      handleRetry();
    }
  }, [countdown, errorInfo.category]);
  
  const handleRetry = async () => {
    if (!onRetry) return;
    
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };
  
  const startAutoRetry = () => {
    setCountdown(5);
  };
  
  const getIcon = () => {
    switch (errorInfo.category) {
      case ErrorCategory.NETWORK:
        return <WifiOff className="w-8 h-8 text-yellow-500" />;
      case ErrorCategory.AUTH:
        return <Shield className="w-8 h-8 text-red-500" />;
      case ErrorCategory.RATE_LIMIT:
        return <Clock className="w-8 h-8 text-orange-500" />;
      case ErrorCategory.PERMISSION:
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (errorInfo.category) {
      case ErrorCategory.NETWORK:
        return 'bg-yellow-500/10 border-yellow-500/40';
      case ErrorCategory.AUTH:
      case ErrorCategory.PERMISSION:
        return 'bg-red-500/10 border-red-500/40';
      case ErrorCategory.RATE_LIMIT:
        return 'bg-orange-500/10 border-orange-500/40';
      default:
        return 'bg-red-500/10 border-red-500/40';
    }
  };
  
  return (
    <div className={`rounded-xl border-2 p-6 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold mb-1">{errorInfo.title}</h3>
          <p className="text-white/80 text-sm mb-4">{errorInfo.message}</p>
          
          {showDetails && import.meta.env.DEV && error.stack && (
            <details className="mb-4 text-xs">
              <summary className="cursor-pointer text-white/40 hover:text-white/60">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-black/50 rounded text-white/60 overflow-x-auto whitespace-pre-wrap">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="flex flex-wrap gap-3">
            {errorInfo.retryable && onRetry && (
              <Button
                onClick={handleRetry}
                disabled={retrying || countdown > 0}
                className="bg-white text-black hover:bg-white/90"
              >
                {retrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Retrying in {countdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            {errorInfo.category === ErrorCategory.NETWORK && !countdown && (
              <Button
                onClick={startAutoRetry}
                variant="outline"
                className="border-white/20 text-white"
              >
                Auto-retry in 5s
              </Button>
            )}
            
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Error Message
 * Compact error display for inline use
 */
export function InlineError({ error, onRetry, className = '' }) {
  const errorInfo = getErrorInfo(error);
  
  return (
    <div className={`flex items-center gap-2 text-sm text-red-500 ${className}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{errorInfo.message}</span>
      {errorInfo.retryable && onRetry && (
        <button 
          onClick={onRetry}
          className="underline hover:no-underline ml-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Error Toast Content
 * For use with toast notifications
 */
export function ErrorToastContent({ error }) {
  const errorInfo = getErrorInfo(error);
  
  return (
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{errorInfo.title}</p>
        <p className="text-sm text-white/80">{errorInfo.message}</p>
      </div>
    </div>
  );
}

/**
 * Graceful Degradation Wrapper
 * Shows fallback content when data fails to load
 */
export function GracefulDegradation({ 
  error, 
  isLoading,
  children,
  fallback,
  loadingComponent,
  onRetry 
}) {
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
      </div>
    );
  }
  
  if (error) {
    const errorInfo = getErrorInfo(error);
    
    // Show fallback for non-recoverable errors
    if (!errorInfo.recoverable && fallback) {
      return fallback;
    }
    
    return (
      <ErrorRecovery 
        error={error} 
        onRetry={onRetry}
      />
    );
  }
  
  return children;
}

export default ErrorRecovery;
