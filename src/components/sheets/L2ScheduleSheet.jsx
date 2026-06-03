/**
 * L2ScheduleSheet — Radio / event schedule
 * Shows upcoming radio shows and live events.
 */

import { useState, useEffect } from 'react';
import { Radio, Calendar, Clock, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { format, isToday, isTomorrow } from 'date-fns';
import { RADIO_SHOWS } from '@/lib/data/radioShows';
// Phil 2026-06-03 — local SHOWS array deleted; single source of truth lives
// in @/lib/data/radioShows (D53 §1.4). Adding/editing shows happens there.

export default function L2ScheduleSheet() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('radio');
  const { openSheet, closeSheet } = useSheet();
  const navigate = useNavigate();
  // closeSheet is called before navigate so the schedule sheet doesn't
  // briefly cover the show page. The route change would also unmount, but
  // explicit close keeps the transition clean.
  const handleShowTap = (showId) => {
    try { closeSheet?.(); } catch (_) { /* non-fatal */ }
    navigate(`/music/shows/${showId}`);
  };

  useEffect(() => {
    supabase
      .from('beacons')
      .select('id, title, event_title, starts_at, venue_name, image_url')
      .eq('kind', 'event')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20)
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  function formatDate(d) {
    const date = new Date(d);
    if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow · ${format(date, 'h:mm a')}`;
    return format(date, 'EEE d MMM · h:mm a');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/8 px-4 gap-6 flex-shrink-0">
        {[
          { id: 'radio', label: 'Radio Shows', icon: Radio },
          { id: 'events', label: 'Events', icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`py-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border-b-2 -mb-px transition-colors ${
              tab === id ? 'text-[#C8962C] border-[#C8962C]' : 'text-white/40 border-transparent'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'radio' && (
          <div className="divide-y divide-white/5">
            {RADIO_SHOWS.map(show => (
              <button
                key={show.id}
                onClick={() => handleShowTap(show.id)}
                className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-white/5 transition-colors"
                aria-label={`Open show: ${show.name}`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0 text-xl">
                  <span aria-hidden>{show.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{show.name}</p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">{show.host}</p>
                  <p className="text-[#C8962C] text-[10px] mt-0.5 font-semibold truncate">
                    {show.time}
                  </p>
                </div>
                {/* Coming Soon atmospheric pill — D55 register, replaces
                    the external Play link that was a dead-end out of the app
                    and lied about which show was playing. */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border flex-shrink-0"
                  style={{
                    background: 'rgba(200,150,44,0.08)',
                    borderColor: 'rgba(200,150,44,0.35)',
                    color: '#C8962C',
                  }}
                >
                  Soon
                </span>
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {tab === 'events' && (
          loading
            ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" /></div>
            : events.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Calendar className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-white/50 font-bold text-sm">No upcoming events</p>
                </div>
              )
              : (
                <div className="divide-y divide-white/5">
                  {events.map(e => (
                    <button
                      key={e.id}
                      onClick={() => openSheet('event', { id: e.id })}
                      className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                        {e.image_url
                          ? <img src={e.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-white/20" />
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{e.title || e.event_title}</p>
                        <p className="text-[#C8962C] text-xs mt-0.5">{formatDate(e.starts_at)}</p>
                        {e.venue_name && <p className="text-white/40 text-[10px] mt-0.5 truncate">{e.venue_name}</p>}
                      </div>
                      <Clock className="w-4 h-4 text-white/20 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )
        )}
      </div>
    </div>
  );
}
