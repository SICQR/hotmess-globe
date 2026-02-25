import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Calendar, Edit, Trash2, Eye, Users, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fromUTC } from '../components/utils/dateUtils';

export default function MyEvents() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: myEvents = [] } = useQuery({
    queryKey: ['my-events', currentUser?.email],
    queryFn: () => base44.entities.Beacon.filter({
      created_by: currentUser.email,
      kind: 'event',
    }, '-created_date'),
    enabled: !!currentUser
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['all-rsvps-my-events'],
    queryFn: () => base44.entities.EventRSVP.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Beacon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-events']);
      toast.success('Event deleted');
    }
  });

  const draftEvents = myEvents.filter(e => e.status === 'draft');
  const publishedEvents = myEvents.filter(e => e.status === 'published');
  const archivedEvents = myEvents.filter(e => e.status === 'archived');

  const getEventRsvps = (eventId) => {
    return allRsvps.filter(r => r.event_id === eventId);
  };

  const EventCard = ({ event }) => {
    const rsvps = getEventRsvps(event.id);
    const attendees = rsvps.filter(r => r.status === 'going').length;
    const interested = rsvps.filter(r => r.status === 'interested').length;
    const revenue = (event.tickets_sold || 0) * (event.ticket_price_xp || 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          {event.image_url && (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-24 h-24 rounded-lg object-cover"
            />
          )}
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold mb-1">{event.title}</h3>
                {event.venue_name && (
                  <p className="text-sm text-white/60">{event.venue_name}</p>
                )}
              </div>
              <Badge variant={event.status === 'published' ? 'default' : 'outline'}>
                {event.status}
              </Badge>
            </div>

            {event.event_date && (
              <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                <Calendar className="w-4 h-4" />
                {format(fromUTC(event.event_date), 'MMM d, yyyy • h:mm a')}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white/5 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-xs text-white/60">Going</span>
                </div>
                <div className="text-xl font-black">{attendees}</div>
              </div>

              <div className="bg-white/5 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-[#B026FF]" />
                  <span className="text-xs text-white/60">Interested</span>
                </div>
                <div className="text-xl font-black">{interested}</div>
              </div>

              {event.ticket_price_xp && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart className="w-4 h-4 text-[#FFEB3B]" />
                    <span className="text-xs text-white/60">Revenue</span>
                  </div>
                  <div className="text-xl font-black text-[#FFEB3B]">{revenue.toLocaleString()}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                <Button variant="outline" size="sm" className="border-white/20">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </Link>
              <Link to={createPageUrl(`EditBeacon?id=${event.id}`)}>
                <Button variant="outline" size="sm" className="border-white/20">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this event?')) {
                    deleteMutation.mutate(event.id);
                  }
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase mb-2">MY EVENTS</h1>
            <p className="text-white/60 uppercase text-sm">Manage your events</p>
          </div>
          <Link to={createPageUrl('CreateBeacon')}>
            <Button className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black">
              <Plus className="w-4 h-4 mr-2" />
              CREATE EVENT
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="published">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="published">
              Published ({publishedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts ({draftEvents.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({archivedEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published">
            {publishedEvents.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/40 mb-4">No published events</p>
                <Link to={createPageUrl('CreateBeacon')}>
                  <Button className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black">
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {publishedEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts">
            {draftEvents.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                No draft events
              </div>
            ) : (
              <div className="space-y-4">
                {draftEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedEvents.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                No archived events
              </div>
            ) : (
              <div className="space-y-4">
                {archivedEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}