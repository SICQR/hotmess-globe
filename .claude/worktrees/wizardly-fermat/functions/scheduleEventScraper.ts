import { base44 } from '@base44/sdk';

/**
 * Scheduled Event Scraper - Runs daily
 * Configure in Base44 dashboard: Functions > scheduleEventScraper > Schedule
 * Recommended: Run daily at 3 AM UTC
 */
export default async function scheduleEventScraper(request) {
  console.log('Starting scheduled event scraper...');
  
  // Cities to scrape
  const cities = ['London', 'Manchester', 'Brighton', 'Birmingham', 'Glasgow'];
  
  // Call the scraper function
  const result = await base44.asServiceRole.functions.scrapeEvents({
    cities,
    daysAhead: 14
  });
  
  // Log results
  console.log('Scraping complete:', result);
  
  // Clean up old events (past events older than 7 days)
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldEvents = await base44.asServiceRole.entities.Beacon.filter({
      kind: 'event'
    });
    
    let deleted = 0;
    for (const event of oldEvents) {
      if (event.event_date && new Date(event.event_date) < sevenDaysAgo) {
        await base44.asServiceRole.entities.Beacon.delete(event.id);
        deleted++;
      }
    }
    
    console.log(`Deleted ${deleted} old events`);
  } catch (err) {
    console.error('Failed to clean old events:', err);
  }
  
  return {
    success: true,
    message: 'Scheduled scraping completed',
    result
  };
}