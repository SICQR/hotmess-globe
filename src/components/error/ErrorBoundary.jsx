import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import { trackError } from '@/components/utils/analytics';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    logger.error('ErrorBoundary caught error', { 
      error: error.message, 
      stack: error.stack,
      componentStack: errorInfo.componentStack 
    });
    
    // Send to error tracking service (Sentry, GA4, etc.)
    trackError(error, {
      componentStack: errorInfo.componentStack,
      fatal: true,
      boundary: 'ErrorBoundary',
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-red-600/20 border-2 border-red-600 p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-black uppercase mb-2">SYSTEM ERROR</h1>
              <p className="text-sm text-white/60 mb-6 uppercase tracking-wider font-mono">
                Something went wrong. We've logged the issue.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left mb-6 bg-black/50 p-4 border border-red-600/40 text-xs font-mono">
                  <summary className="cursor-pointer text-red-400 mb-2">Error Details</summary>
                  <pre className="text-white/80 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <Button
                onClick={this.handleReset}
                className="bg-white text-black hover:bg-red-600 hover:text-white font-black uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}