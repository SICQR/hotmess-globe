/**
 * React Query configuration and optimizations
 */

// Default query options for better performance
export const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: 1,
};

// Entity-specific configurations
export const queryConfigs = {
  users: {
    staleTime: 10 * 60 * 1000, // 10 minutes - users don't change often
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  
  products: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  
  messages: {
    staleTime: 10 * 1000, // 10 seconds - need fresh messages
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Poll every 30s
  },
  
  beacons: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  
  staticData: {
    staleTime: 60 * 60 * 1000, // 1 hour - very static
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Query key factories for consistent caching
export const queryKeys = {
  users: {
    all: ['users'],
    detail: (email) => ['users', email],
    tags: (email) => ['user-tags', email],
    tribes: (email) => ['user-tribes', email],
  },
  
  products: {
    all: ['products'],
    detail: (id) => ['products', id],
    byCategory: (category) => ['products', 'category', category],
    active: ['products', 'active'],
  },
  
  messages: {
    threads: (userEmail) => ['chat-threads', userEmail],
    messages: (threadId) => ['messages', threadId],
  },
  
  beacons: {
    all: ['beacons'],
    detail: (id) => ['beacons', id],
    byCity: (city) => ['beacons', 'city', city],
    active: ['beacons', 'active'],
  },
};

// Prefetch strategies
export const prefetchStrategies = {
  // Prefetch user details when hovering over card
  userCard: (queryClient, email) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(email),
      queryFn: () => fetch(`/api/users/${email}`).then(r => r.json()),
      staleTime: queryConfigs.users.staleTime,
    });
  },
  
  // Prefetch next page of results
  pagination: (queryClient, queryKey, fetchFn, nextPage) => {
    queryClient.prefetchQuery({
      queryKey: [...queryKey, nextPage],
      queryFn: () => fetchFn(nextPage),
      staleTime: 2 * 60 * 1000, // 2 minutes for pagination
    });
  },
};