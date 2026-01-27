/**
 * Error Boundary Components
 * 
 * Graceful error handling with fallback UIs and error reporting.
 */

import React, { Component } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

// ============================================================================
// Error Boundary Class
// ============================================================================

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to analytics
    trackEvent('error', {
      error_type: 'react_error_boundary',
      error_message: error.message,
      error_stack: error.stack?.slice(0, 500),
      component_stack: errorInfo.componentStack?.slice(0, 500),
    });

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }

    // Report to error tracking service
    this.reportError(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const { eventId } = await response.json();
        this.setState({ eventId });
      }
    } catch {
      // Silently fail if error reporting fails
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, eventId } = this.state;
    const { children, fallback, level = 'page' } = this.props;

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback({ error, retry: this.handleRetry });
      }

      // Component-level error (minimal)
      if (level === 'component') {
        return (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400">Something went wrong</p>
            <button 
              onClick={this.handleRetry}
              className="text-xs text-red-300 underline mt-2"
            >
              Try again
            </button>
          </div>
        );
      }

      // Page-level error (full screen)
      return (
        <ErrorFallback 
          error={error}
          eventId={eventId}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Error Fallback UI
// ============================================================================

function ErrorFallback({ error, eventId, onRetry, onGoHome }) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black uppercase mb-4">
          Oops<span className="text-[#E62020]">.</span>
        </h1>
        <p className="text-white/60 mb-8">
          Something unexpected happened. We've been notified and are looking into it.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            onClick={onRetry}
            className="bg-[#E62020] text-black font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={onGoHome}
            variant="outline"
            className="border-white/20 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Event ID for support */}
        {eventId && (
          <p className="text-xs text-white/30 mb-4">
            Error ID: {eventId}
          </p>
        )}

        {/* Dev error details */}
        {isDev && error && (
          <details className="text-left bg-white/5 border border-white/10 p-4 mt-8">
            <summary className="text-sm text-white/60 cursor-pointer flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Error Details (dev only)
            </summary>
            <pre className="mt-4 text-xs text-red-400 overflow-auto max-h-48">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        {/* Support link */}
        <p className="text-xs text-white/40 mt-8">
          <a 
            href="mailto:support@hotmess.app" 
            className="flex items-center justify-center gap-1 hover:text-white/60"
          >
            <MessageCircle className="w-3 h-3" />
            Contact Support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Suspense Fallback
// ============================================================================

export function SuspenseFallback({ message = 'Loading...' }) {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#E62020] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-white/50">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Not Found Page
// ============================================================================

export function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        <h1 className="text-[20vw] font-black leading-none text-white/10">
          404
        </h1>
        <h2 className="text-3xl font-black uppercase -mt-8 mb-4">
          Page Not Found
        </h2>
        <p className="text-white/60 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/">
          <Button className="bg-[#E62020] text-black font-bold">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </a>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Offline Page
// ============================================================================

export function OfflinePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-8 bg-white/5 flex items-center justify-center rounded-full">
          <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        <h2 className="text-3xl font-black uppercase mb-4">
          You're Offline
        </h2>
        <p className="text-white/60 mb-8">
          Check your internet connection and try again.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-[#E62020] text-black font-bold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </motion.div>
    </div>
  );
}

export default ErrorBoundary;
