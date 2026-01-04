import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { PAGINATION, QUERY_CONFIG } from '../components/utils/constants';
import { Users, Zap, Heart, Filter } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DiscoveryCard from '../components/discovery/DiscoveryCard';
import FiltersDrawer from '../components/discovery/FiltersDrawer';
import RightNowModal from '../components/discovery/RightNowModal';
import TutorialTooltip from '../components/tutorial/TutorialTooltip';
import { valuesToSearchParams, searchParamsToValues, applyLocalFilters } from '../components/discovery/queryBuilder';
import { useTaxonomy } from '../components/taxonomy/useTaxonomy';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import { debounce } from 'lodash';
import { generateMatchExplanations, promoteTopMatches } from '../components/discovery/AIMatchmaker';

export default function Connect() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [lane, setLane] = useState('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [showRightNow, setShowRightNow] = useState(false);
  const [page, setPage] = useState(1);
  const { cfg, idx } = useTaxonomy();
  const [aiMatchExplanations, setAiMatchExplanations] = useState({});

  // Use global cached users - MUST be before any conditional returns
  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers();

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags'],
    queryFn: () => base44.entities.UserTag.list(),
    enabled: !!currentUser
  });

  const { data: userTribes = [] } = useQuery({
    queryKey: ['user-tribes'],
    queryFn: () => base44.entities.UserTribe.list(),
    enabled: !!currentUser
  });

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-status'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true }),
    enabled: !!currentUser,
    refetchInterval: QUERY_CONFIG.REFETCH_INTERVAL_MEDIUM
  });

  // Build defaults from taxonomy config
  const defaults = useMemo(() => {
    if (!cfg || !cfg.filters) return {};
    const d = {};
    if (cfg.filters.quickToggles) {
      for (const t of cfg.filters.quickToggles) d[t.id] = t.default;
    }
    if (cfg.filters.groups) {
      for (const g of cfg.filters.groups) {
        for (const f of g.fields) {
          d[f.id] = typeof f.default !== "undefined" ? f.default : null;
        }
      }
    }
    return d;
  }, [cfg]);

  // Initialize filters from URL params
  const [filters, setFilters] = useState({});

  // Apply query builder filters with memoization and debouncing for performance
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  const debouncedSetFilters = useMemo(
    () => debounce((newFilters) => setDebouncedFilters(newFilters), 150),
    []
  );

  // Initialize filters when cfg is ready
  useEffect(() => {
    if (cfg && Object.keys(filters).length === 0) {
      const sp = new URLSearchParams(window.location.search);
      setFilters(searchParamsToValues(sp, defaults));
    }
  }, [cfg, defaults, filters]);

  useEffect(() => {
    if (currentUser) {
      setLane(currentUser.discovery_lane || 'browse');
    }
  }, [currentUser]);

  useEffect(() => {
    debouncedSetFilters(filters);
  }, [filters, debouncedSetFilters]);

  // ALL hooks must be called before conditional returns
  const currentUserTags = useMemo(() => {
    if (!currentUser) return [];
    return userTags.filter(t => t.user_email === currentUser.email);
  }, [currentUser, userTags]);

  // Build profile objects for filtering
  const profiles = useMemo(() => {
    if (!currentUser) return [];
    // Include current user in Right Now lane, exclude elsewhere
    return allUsers
      .filter(u => {
        if (u.email === currentUser.email) {
          // Show self only if Right Now active
          const isLive = rightNowStatuses.some(s => 
            s.user_email === u.email && 
            s.active && 
            new Date(s.expires_at) > new Date()
          );
          return isLive && lane === 'right_now';
        }
        return true;
      })
      .map(u => {
        const uTags = userTags.filter(t => t.user_email === u.email);
        const uTribes = userTribes.filter(t => t.user_email === u.email);
        
        return {
          ...u,
          onlineNow: u.activity_status === 'online' || u.activity_status === 'at_event',
          rightNow: rightNowStatuses.some(s => 
            s.user_email === u.email && 
            s.active && 
            new Date(s.expires_at) > new Date()
          ),
          hasFace: !!u.avatar_url,
          age: u.age || 25,
          tribes: uTribes.map(t => t.tribe_id),
          tags: uTags.map(t => t.tag_id),
          distanceKm: u.city === currentUser.city ? 5 : 50, // Mock distance
        };
      });
  }, [allUsers, currentUser, userTags, userTribes, rightNowStatuses]);

  // Apply lane filter - with memoization
  const laneFiltered = useMemo(() => {
    if (lane === 'right_now') {
      return profiles.filter(p => p.rightNow);
    }
    return profiles;
  }, [profiles, lane]);

  const filteredUsers = useMemo(() => {
    if (!laneFiltered || laneFiltered.length === 0) return [];
    return applyLocalFilters(laneFiltered, debouncedFilters, { taxonomyIndex: idx || null });
  }, [laneFiltered, debouncedFilters, idx]);

  // Generate AI match explanations for top 6 users
  useEffect(() => {
    if (!currentUser || filteredUsers.length === 0) return;

    const topUsers = filteredUsers.slice(0, 6).map(p => allUsers.find(u => u.email === p.email)).filter(Boolean);
    generateMatchExplanations(currentUser, topUsers).then(explanations => {
      setAiMatchExplanations(explanations);
    });
  }, [currentUser?.email, filteredUsers.slice(0, 6).map(u => u.email).join(',')]);

  // Promote top AI matches
  const reorderedUsers = useMemo(() => {
    return promoteTopMatches(filteredUsers, aiMatchExplanations);
  }, [filteredUsers, aiMatchExplanations]);

  // Memoize pagination calculations
  const totalPages = useMemo(() => Math.ceil(reorderedUsers.length / PAGINATION.ITEMS_PER_PAGE), [reorderedUsers.length]);
  const paginatedUsers = useMemo(() => 
    reorderedUsers.slice((page - 1) * PAGINATION.ITEMS_PER_PAGE, page * PAGINATION.ITEMS_PER_PAGE),
    [reorderedUsers, page]
  );

  // Map to full user objects - memoized
  const displayUsers = useMemo(() => 
    paginatedUsers.map(p => allUsers.find(u => u.email === p.email)).filter(Boolean),
    [paginatedUsers, allUsers]
  );

  // Early return AFTER all hooks
  if (userLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FF1493] border-t-transparent rounded-full animate-spin" />
          <div className="text-white/60 text-sm uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40">Not authenticated</div>
      </div>
    );
  }

  // Handle filter apply
  const handleFiltersApply = (values) => {
    setFilters(values);
    setPage(1);
    
    // Sync to URL
    const sp = valuesToSearchParams(values);
    const nextUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  };



  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-[#FF1493]" />
              <div>
                <h1 className="text-4xl font-black uppercase">CONNECT</h1>
                <p className="text-xs text-white/40 uppercase tracking-wider">Discovery</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="border-white/20 text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                onClick={() => setShowRightNow(true)}
                className={`font-black border-2 border-white ${
                  rightNowStatuses.some(s => s.user_email === currentUser.email && s.active && new Date(s.expires_at) > new Date())
                    ? 'bg-[#39FF14] text-black animate-pulse'
                    : 'bg-[#FF1493] text-black'
                }`}
              >
                <Zap className="w-4 h-4 mr-2" />
                {rightNowStatuses.some(s => s.user_email === currentUser.email && s.active && new Date(s.expires_at) > new Date())
                  ? 'You\'re Live'
                  : 'Go Right Now'
                }
              </Button>
            </div>
          </div>

          {/* Lanes */}
          <Tabs value={lane} onValueChange={setLane}>
            <TabsList className="bg-white/5 border-2 border-white/10 w-full">
              <TabsTrigger value="right_now" className="flex-1 data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Zap className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Right Now</span>
                  <span className="text-[10px] opacity-60">Available now. Auto-expires.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="browse" className="flex-1 data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Users className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Browse</span>
                  <span className="text-[10px] opacity-60">Scroll, vibe, chat.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex-1 data-[state=active]:bg-[#B026FF] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Heart className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Dates</span>
                  <span className="text-[10px] opacity-60">Slower burn. Better outcomes.</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-4 text-sm text-white/60">
          {reorderedUsers.length} {reorderedUsers.length === 1 ? 'result' : 'results'}
          {Object.keys(aiMatchExplanations).length > 0 && (
            <span className="ml-2 text-[#00D9FF]">• Top {Object.keys(aiMatchExplanations).length} AI matches promoted</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayUsers.map((user, idx) => {
            const userTagsData = userTags.filter(t => t.user_email === user.email);
            const userTribesData = userTribes.filter(t => t.user_email === user.email);
            return (
              <DiscoveryCard
                key={user.email}
                user={user}
                userTags={userTagsData}
                userTribes={userTribesData}
                currentUserTags={currentUserTags}
                index={idx}
                aiMatchExplanation={aiMatchExplanations[user.id]}
              />
            );
          })}
          {reorderedUsers.length === 0 && (
            <div className="col-span-full text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-2">
                {lane === 'right_now' ? 'Nobody live right now.' : 'No matches found.'}
              </p>
              <p className="text-sm text-white/30">
                {lane === 'right_now' ? 'Try Browse—then go Right Now when you\'re ready.' : 'Adjust your filters or try a different lane.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && reorderedUsers.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="border-white/20"
            >
              Previous
            </Button>
            <span className="text-sm text-white/60">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              className="border-white/20"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <RightNowModal
        isOpen={showRightNow}
        onClose={() => setShowRightNow(false)}
        currentUser={currentUser}
      />

      <FiltersDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        laneId={lane}
        initialValues={filters}
        onApply={handleFiltersApply}
      />

      <TutorialTooltip page="connect" />
    </div>
  );
}