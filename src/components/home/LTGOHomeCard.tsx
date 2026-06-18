/**
 * LTGOHomeCard
 *
 * Shows a count of nearby LTGO signals on the home screen.
 * Dark card, violet accent. No identity revealed.
 * "X people looking to go out tonight" → "Open in Ghosted"
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';

const VIOLET = '#BF5AF2';
const MUTED = '#8E8E93';

export default function LTGOHomeCard() {
  const navigate = useNavigate();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count: c, error } = await supabase
          .from('person_signals_public')
          .select('id', { count: 'exact', head: true })
          .eq('signal_type', 'looking_to_go_out')
          .eq('state', 'active');
        if (!cancelled && !error) setCount(c ?? 0);
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Don't render if no one is out or still loading
  if (loading || count === null || count === 0) return null;

  return (
    <motion.section
      className="px-5 pb-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="rounded-2xl px-4 py-4 flex items-center justify-between"
        style={{
          background: '#130D18',
          border: `1px solid ${VIOLET}33`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Diamond icon */}
          <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: `${VIOLET}18` }}>
            <svg width="20" height="20" viewBox="-10 -10 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <circle cx="0" cy="0" r="9" fill={`${VIOLET}18`} />
              <rect x="-6" y="-6" width="12" height="12" rx="1.5" fill={VIOLET} transform="rotate(45)" />
              <rect x="-3" y="-3" width="6" height="6" rx="1" fill="rgba(0,0,0,0.3)" transform="rotate(45)" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium leading-tight">
              {count === 1 ? '1 person' : `${count} people`} looking to go out tonight
            </p>
            <p className="text-[11px] truncate" style={{ color: MUTED }}>Anonymous · London</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/ghosted')}
          className="h-9 px-4 rounded-full text-xs font-medium flex-shrink-0 ml-3"
          style={{ background: `${VIOLET}22`, color: VIOLET, border: `1px solid ${VIOLET}44` }}
          aria-label="Open Ghosted to see who is looking to go out"
        >
          Ghosted
        </motion.button>
      </div>
    </motion.section>
  );
}
