import schedule from './radioSchedule.js';

/**
 * Get next episode for a show
 * @param {string} showId - Show identifier
 * @returns {Object} Next episode with date, time, and duration
 */
export function getNextEpisode(showId) {
  const show = schedule.shows.find(s => s.id === showId);
  if (!show) return null;

  const now = new Date();
  const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  
  let nextEpisode = null;
  let minDiff = Infinity;

  // Check next 14 days
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(londonTime);
    checkDate.setDate(checkDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();

    show.schedule.forEach(slot => {
      if (slot.day === dayOfWeek) {
        const [hours, minutes] = slot.start.split(':');
        const episodeTime = new Date(checkDate);
        episodeTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const diff = episodeTime - londonTime;
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          nextEpisode = {
            date: episodeTime,
            startTime: slot.start,
            duration: slot.duration
          };
        }
      }
    });
  }

  return nextEpisode;
}

/**
 * Format day names for schedule display
 * @param {Array} schedule - Show schedule array
 * @returns {string} Formatted schedule string
 */
export function formatSchedule(showSchedule) {
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const grouped = {};

  showSchedule.forEach(slot => {
    const key = slot.start;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(dayMap[slot.day]);
  });

  return Object.entries(grouped)
    .map(([time, days]) => {
      if (days.length === 5 && days.includes('Mon') && days.includes('Fri')) {
        return `Mon–Fri ${time}`;
      }
      return `${days.join(', ')} ${time}`;
    })
    .join(' • ');
}

/**
 * Generate .ics file content for calendar download
 * @param {Object} show - Show object
 * @param {Object} episode - Episode object with date
 * @returns {string} .ics file content
 */
export function generateICS(show, episode) {
  const start = new Date(episode.date);
  const end = new Date(start.getTime() + episode.duration * 60000);

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${show.id}-${start.getTime()}@hotmess.radio`;
  const description = `${show.tagline}\\n\\nListen Live: https://hotmess.fm/radio\\n\\nConsent and respect are non-negotiable. Aftercare is real. If you need support, land in Care.`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HOTMESS//Radio//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${show.title}
DESCRIPTION:${description}
LOCATION:https://hotmess.fm/radio
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

/**
 * Download .ics file
 * @param {string} content - .ics file content
 * @param {string} filename - File name
 */
export function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}