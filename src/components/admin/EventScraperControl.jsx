import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Admin control panel for manual event scraping
 */
export default function EventScraperControl() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState('London, Manchester, Brighton');

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Note: This requires backend functions to be enabled
      const cityList = cities.split(',').map(c => c.trim());
      
      const response = await base44.functions.scrapeEvents({
        cities: cityList,
        daysAhead: 14
      });
      
      setResult(response);
      
      if (response.success) {
        toast.success(`Scraped events: ${response.results.created} created, ${response.results.updated} updated`);
      } else {
        toast.error('Scraping failed: ' + response.error);
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Backend functions not enabled. Enable in Settings > Backend Functions');
      setResult({ 
        success: false, 
        error: 'Backend functions required. Enable in app settings.',
        needsBackendFunctions: true 
      });
    } finally {
      setLoading(false);
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
                      Enable backend functions in Settings → Backend Functions to use the event scraper.
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
            For automatic daily updates, schedule the <code className="bg-white/10 px-1 rounded">scheduleEventScraper</code> function:
          </p>
          <ol className="list-decimal list-inside text-white/60 space-y-1">
            <li>Go to Dashboard → Functions</li>
            <li>Find <code className="bg-white/10 px-1 rounded">scheduleEventScraper</code></li>
            <li>Click "Schedule"</li>
            <li>Set to run daily at 3 AM UTC</li>
          </ol>
        </div>
      </div>
    </div>
  );
}