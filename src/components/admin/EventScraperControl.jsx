import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/components/utils/supabaseClient';
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Clock, History } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Scrape Run History Panel
 */
function ScrapeRunHistory({ onRefresh }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_scraper_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setRuns(data || []);
    } catch (err) {
      console.error('Failed to fetch scrape runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [onRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'partial': return 'text-yellow-500 bg-yellow-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'running': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-white/50 bg-white/5';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-6 text-white/40 text-sm">
        No scrape runs yet. Run your first scrape above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div 
          key={run.id} 
          className="bg-white/5 rounded-lg p-3 border border-white/10"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(run.status)}`}>
                {run.status}
              </span>
              <span className="text-xs text-white/40">{run.mode}</span>
            </div>
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(run.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span>✅ {run.events_created || 0} created</span>
            <span>🔄 {run.events_updated || 0} updated</span>
            {run.error_count > 0 && (
              <span className="text-red-400">⚠️ {run.error_count} errors</span>
            )}
          </div>
          {run.initiator && (
            <div className="mt-1 text-xs text-white/30">
              By: {run.initiator}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Admin control panel for manual event scraping
 */
export default function EventScraperControl() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState('London, Manchester, Brighton');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const cityList = cities.split(',').map(c => c.trim());

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      
      const resp = await fetch('/api/events/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cities: cityList,
          daysAhead: 14,
        }),
      });

      const response = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Preserve structured error details from the server for display.
        setResult(response || { success: false, error: 'Scrape request failed' });
        const msg = response?.error || response?.message || 'Scrape request failed';
        toast.error(msg);
        return;
      }
      
      setResult(response);
      
      if (response.success) {
        toast.success(`Scraped events: ${response.results.created} created, ${response.results.updated} updated`);
      } else {
        toast.error('Scraping failed: ' + response.error);
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error(error?.message || 'Event scraper request failed');
      setResult({ 
        success: false, 
        error: error?.message || 'Request failed',
        needsBackendFunctions: false 
      });
    } finally {
      setLoading(false);
      setHistoryRefresh(prev => prev + 1);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-5 h-5 text-[#00D9FF]" />
        <h3 className="text-lg font-black uppercase">Event Scraper</h3>
      </div>

      <p className="text-sm text-white/60 mb-4">
        Automatically scrape LGBT nightlife events from the web and add them to the platform.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
            Cities (comma-separated)
          </label>
          <Input
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="London, Manchester, Brighton"
            className="bg-white/5 border-white/20 text-white"
          />
        </div>

        <Button
          onClick={handleScrape}
          disabled={loading}
          className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Scrape Events Now
            </>
          )}
        </Button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-4 ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">
                  {result.success ? 'Scraping Complete' : 'Scraping Failed'}
                </p>
                {result.results && (
                  <div className="text-xs text-white/80 space-y-1">
                    <p>✅ Created: {result.results.created} events</p>
                    <p>🔄 Updated: {result.results.updated} events</p>
                    {result.results.errors.length > 0 && (
                      <p>⚠️ Errors: {result.results.errors.length}</p>
                    )}
                  </div>
                )}
                {result.error && (
                  <p className="text-xs text-red-400 mt-2">{result.error}</p>
                )}
                {result.needsBackendFunctions && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                    <p className="font-bold text-yellow-500 mb-1">⚡ Backend Functions Required</p>
                    <p className="text-white/70">
                      This requires the Vercel API endpoint and Supabase server env vars to be configured.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs">
          <p className="font-bold text-blue-400 mb-2">📅 Scheduled Scraping</p>
          <p className="text-white/70 mb-2">
            For automatic daily updates, schedule a Vercel Cron job to hit the scrape endpoint:
          </p>
          <ol className="list-decimal list-inside text-white/60 space-y-1">
            <li>Configure Vercel Cron to hit <code className="bg-white/10 px-1 rounded">/api/events/cron</code></li>
            <li>Set it to run daily at 3 AM UTC</li>
            <li>Set <code className="bg-white/10 px-1 rounded">EVENT_SCRAPER_SOURCES_JSON</code> (JSON feeds) OR <code className="bg-white/10 px-1 rounded">OPENAI_API_KEY</code> (LLM) in Vercel env</li>
          </ol>
        </div>

        {/* Scrape Run History */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-[#00D9FF]" />
            <h4 className="text-sm font-bold uppercase">Recent Runs</h4>
          </div>
          <ScrapeRunHistory onRefresh={historyRefresh} />
        </div>
      </div>
    </div>
  );
}