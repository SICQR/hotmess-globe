import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import logger from '@/utils/logger';
import { trackError } from '@/components/utils/analytics';
import { captureError } from '@/lib/sentry';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('PageErrorBoundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    try {
      const payload = {
        message: error?.message || String(error),
        name: error?.name,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        href: typeof window !== 'undefined' ? window.location.href : undefined,
        ts: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        window.__lastPageError = payload;
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('last_page_error', JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      boundary: 'PageErrorBoundary',
      errorCount: this.state.errorCount + 1,
    });
    
    // Send to analytics
    trackError(error, {
      componentStack: errorInfo.componentStack,
      boundary: 'PageErrorBoundary',
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = createPageUrl('Home');
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDev = import.meta.env.DEV;

      let persisted = null;
      if (isDev) {
        try {
          persisted = typeof sessionStorage !== 'undefined'
            ? JSON.parse(sessionStorage.getItem('last_page_error') || 'null')
            : null;
        } catch {
          persisted = null;
        }
      }

      // If error keeps happening, show simpler recovery
      if (errorCount > 2) {
        return (
          <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="max-w-md text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black mb-2">Persistent Error</h2>
              <p className="text-white/60 mb-6">
                Something is broken. Try clearing your cache or reloading.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-[#C8962C] text-black font-black"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Hard Reload
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-red-600/10 border-2 border-red-600 p-8 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <h1 className="text-3xl font-black">Something Went Wrong</h1>
              </div>
              
              <p className="text-white/80 mb-6">
                This page encountered an error. You can try refreshing or go back home.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  className="bg-[#C8962C] text-black font-black"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </div>

            {isDev && error && (
              <details className="bg-white/5 border border-white/10 p-4">
                <summary className="text-sm font-bold text-white/60 cursor-pointer mb-2">
                  Developer Info
                </summary>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="text-red-400 font-bold mb-1">Error:</div>
                    <pre className="bg-black/50 p-2 overflow-x-auto text-red-300">
                      {error.toString()}
                    </pre>
                  </div>
                  {error?.stack && (
                    <div>
                      <div className="text-orange-300 font-bold mb-1">JS Stack:</div>
                      <pre className="bg-black/50 p-2 overflow-x-auto text-orange-200">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div>
                      <div className="text-yellow-400 font-bold mb-1">Stack:</div>
                      <pre className="bg-black/50 p-2 overflow-x-auto text-yellow-300">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  {persisted?.href && (
                    <div>
                      <div className="text-white/50 font-bold mb-1">URL:</div>
                      <pre className="bg-black/50 p-2 overflow-x-auto text-white/60">
                        {persisted.href}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;