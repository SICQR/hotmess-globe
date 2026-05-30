import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * User Roles System
 * 
 * Roles are stackable capabilities:
 * - social: default for all users
 * - buyer: has made purchases or has cart items
 * - seller: has active products listed
 * - creator: explicit creator flag (content monetization)
 * - organiser: has created events/beacons
 */

export const ROLES = {
  SOCIAL: 'social',
  BUYER: 'buyer',
  SELLER: 'seller',
  CREATOR: 'creator',
  ORGANISER: 'organiser',
};

export const ROLE_CONFIG = {
  social: {
    label: 'Member',
    color: 'gray',
    icon: 'User',
    description: 'Standard member',
  },
  buyer: {
    label: 'Buyer',
    color: 'blue',
    icon: 'ShoppingBag',
    description: 'Active shopper',
  },
  seller: {
    label: 'Seller',
    color: 'green',
    icon: 'Store',
    description: 'Selling items',
  },
  creator: {
    label: 'Creator',
    color: 'purple',
    icon: 'Star',
    description: 'Content creator',
  },
  organiser: {
    label: 'Organiser',
    color: 'orange',
    icon: 'Calendar',
    description: 'Event organiser',
  },
};

/**
 * Fetch roles for a user
 */
async function fetchUserRoles(userId) {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .rpc('get_user_roles', { p_user_id: userId });
  
  if (error) {
    console.error('Error fetching user roles:', error);
    // Fallback: derive from profile data
    return [{ role: 'social', is_verified: false, source: 'fallback' }];
  }
  
  return data || [];
}

/**
 * Check if user has a specific role
 */
async function checkUserHasRole(userId, role) {
  if (!userId || !role) return false;
  
  const { data, error } = await supabase
    .rpc('user_has_role', { p_user_id: userId, p_role: role });
  
  if (error) {
    console.error('Error checking role:', error);
    return false;
  }
  
  return data === true;
}

/**
 * Hook: Get all roles for current user
 */
export function useUserRoles(userId) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => fetchUserRoles(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Check if current user has a specific role
 */
export function useHasRole(userId, role) {
  return useQuery({
    queryKey: ['user-has-role', userId, role],
    queryFn: () => checkUserHasRole(userId, role),
    enabled: !!userId && !!role,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Get primary display role (for badges)
 * Priority: creator > organiser > seller > buyer > social
 */
export function usePrimaryRole(userId) {
  const { data: roles, isLoading } = useUserRoles(userId);
  
  if (isLoading || !roles) {
    return { role: null, isLoading };
  }
  
  const roleSet = new Set(roles.map(r => r.role));
  
  // Priority order
  const priority = ['creator', 'organiser', 'seller', 'buyer', 'social'];
  
  for (const role of priority) {
    if (roleSet.has(role)) {
      return { 
        role, 
        config: ROLE_CONFIG[role],
        isVerified: roles.find(r => r.role === role)?.is_verified || false,
        isLoading: false 
      };
    }
  }
  
  return { role: 'social', config: ROLE_CONFIG.social, isVerified: false, isLoading: false };
}

/**
 * Hook: Grant role mutation
 */
export function useGrantRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role, grantedBy = null, verified = false }) => {
      const { data, error } = await supabase
        .rpc('grant_user_role', {
          p_user_id: userId,
          p_role: role,
          p_granted_by: grantedBy,
          p_verified: verified,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['user-roles', variables.userId]);
      queryClient.invalidateQueries(['user-has-role', variables.userId]);
    },
  });
}

/**
 * Hook: Revoke role mutation
 */
export function useRevokeRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }) => {
      const { data, error } = await supabase
        .rpc('revoke_user_role', {
          p_user_id: userId,
          p_role: role,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['user-roles', variables.userId]);
      queryClient.invalidateQueries(['user-has-role', variables.userId]);
    },
  });
}

/**
 * Utility: Get role badges for display
 */
export function getRoleBadges(roles) {
  if (!roles || !Array.isArray(roles)) return [];
  
  // Filter out 'social' as it's the default
  return roles
    .filter(r => r.role !== 'social')
    .map(r => ({
      ...r,
      config: ROLE_CONFIG[r.role],
    }))
    .sort((a, b) => {
      const priority = ['creator', 'organiser', 'seller', 'buyer'];
      return priority.indexOf(a.role) - priority.indexOf(b.role);
    });
}

export default useUserRoles;
