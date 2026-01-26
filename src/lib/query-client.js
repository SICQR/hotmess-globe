import { QueryClient } from '@tanstack/react-query';
import { categorizeError, ErrorCategory, calculateBackoff } from '@/utils/errorHandler';

/**
 * Custom retry function with exponential backoff
 * Retries network and server errors, but not auth/permission errors
 */
function shouldRetry(failureCount, error) {
  // Max 3 retries
  if (failureCount >= 3) return false;
  
  const category = categorizeError(error);
  
  // Retry network and server errors
  const retryableCategories = [
    ErrorCategory.NETWORK,
    ErrorCategory.SERVER,
  ];
  
  return retryableCategories.includes(category);
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attemptIndex) {
  return calculateBackoff(attemptIndex, 1000, 30000);
}

/**
 * Global error handler for queries
 */
function onQueryError(error) {
  const category = categorizeError(error);
  
  // Log errors in development
  if (import.meta.env.DEV) {
    console.error('[Query Error]', {
      message: error.message,
      category,
      stack: error.stack,
    });
  }
  
  // Could trigger global notifications here if needed
}

/**
 * Global error handler for mutations
 */
function onMutationError(error) {
  const category = categorizeError(error);
  
  if (import.meta.env.DEV) {
    console.error('[Mutation Error]', {
      message: error.message,
      category,
      stack: error.stack,
    });
  }
}

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus to reduce API calls
      refetchOnWindowFocus: false,
      
      // Retry with exponential backoff for network/server errors
      retry: shouldRetry,
      retryDelay: getRetryDelay,
      
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      
      // Keep cached data for 30 minutes even when unused
      gcTime: 30 * 60 * 1000,
      
      // Don't refetch when reconnecting (prevents flood of requests)
      refetchOnReconnect: false,
      
      // Network mode - fetch when online, use cache when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once for network errors
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        const category = categorizeError(error);
        return category === ErrorCategory.NETWORK;
      },
      retryDelay: getRetryDelay,
      
      // Network mode
      networkMode: 'offlineFirst',
      
      // Global error handler
      onError: onMutationError,
    },
  },
});

// Subscribe to query cache events for global error handling
queryClientInstance.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.status === 'error') {
    onQueryError(event.query.state.error);
  }
});

export default queryClientInstance;