import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Calendar, Check, X, MapPin, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Event Curation Queue
 * Review and approve/reject scraped events before they go live
 */
export default function EventCurationQueue() {
  const [statusFilter, setStatusFilter] = useState('draft');
  const queryClient = useQueryClient();

  // Fetch events by status
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-events', statusFilter],
    queryFn: async () => {
      const query = supabase
        .from('beacons')
        .select('*')
        .eq('kind', 'event')
        .order('created_date', { ascending: false })
        .limit(50);
      
      if (statusFilter !== 'all') {
        query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000
  });

  // Approve event mutation
  const approveMutation = useMutation({
    mutationFn: async (eventId) => {
      const { error } = await supabase
        .from('beacons')
        .update({ status: 'published', updated_date: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-events']);
      toast.success('Event approved and published');
    },
    onError: (err) => {
      toast.error(`Failed to approve: ${err.message}`);
    }
  });

  // Reject event mutation
  const rejectMutation = useMutation({
    mutationFn: async (eventId) => {
      const { error } = await supabase
        .from('beacons')
        .update({ status: 'rejected', active: false, updated_date: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-events']);
      toast.success('Event rejected');
    },
    onError: (err) => {
      toast.error(`Failed to reject: ${err.message}`);
    }
  });

  const statusCounts = {
    draft: events.filter(e => e.status === 'draft').length,
    published: events.filter(e => e.status === 'published').length,
    rejected: events.filter(e => e.status === 'rejected').length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Published</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-white/10 text-white/60">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#00D9FF]" />
          <h3 className="text-lg font-black uppercase">Event Curation</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          className="text-white/60 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['draft', 'published', 'rejected', 'all'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? 'bg-[#00D9FF] text-black' : 'text-white/60'}
          >
            {status === 'draft' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && statusCounts[status] > 0 && (
              <span className="ml-1 text-xs">({statusCounts[status]})</span>
            )}
          </Button>
        ))}
      </div>

      {/* Event list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No events to review</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(event.status)}
                      <span className="text-xs text-white/40">
                        {event.created_date && format(new Date(event.created_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <h4 className="font-bold text-white truncate">{event.title || 'Untitled Event'}</h4>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                      {event.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.city}
                        </span>
                      )}
                      {event.venue_name && (
                        <span className="truncate max-w-[150px]">{event.venue_name}</span>
                      )}
                      {event.event_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.event_date), 'MMM d @ h:mm a')}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-xs text-white/40 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {event.status === 'draft' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(event.id)}
                        disabled={approveMutation.isPending}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectMutation.mutate(event.id)}
                        disabled={rejectMutation.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
        <p>
          {events.length} events shown • 
          {statusFilter === 'draft' && ` ${events.length} awaiting review`}
          {statusFilter === 'published' && ` ${events.length} live`}
          {statusFilter === 'rejected' && ` ${events.length} rejected`}
        </p>
      </div>
    </div>
  );
}
