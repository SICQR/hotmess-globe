const schedule = {
  "timezone": "Europe/London",
  "shows": [
    {
      "id": "wake-the-mess",
      "title": "Wake the Mess",
      "slug": "wake-the-mess",
      "tagline": "Morning menace. Clean intentions.",
      "description": "Wake it up. Mess it up. Start your day with intention and a little chaos.",
      "schedule": [
        { "day": 1, "start": "09:00", "duration": 60 },
        { "day": 2, "start": "09:00", "duration": 60 },
        { "day": 3, "start": "09:00", "duration": 60 },
        { "day": 4, "start": "09:00", "duration": 60 },
        { "day": 5, "start": "09:00", "duration": 60 }
      ],
      "stingers": [
        "Wake it up. Mess it up.",
        "Coffee in one hand. Chaos in the other.",
        "Morning menace — with manners."
      ],
      "vo": "This is Wake the Mess. Breathe. Stretch. Choose your trouble."
    },
    {
      "id": "dial-a-daddy",
      "title": "Dial-A-Daddy",
      "slug": "dial-a-daddy",
      "tagline": "Call in. Say it. Mean it.",
      "description": "Ring ring. Be brave. Say it clean. Say it dirty. Say it true.",
      "schedule": [
        { "day": 1, "start": "19:00", "duration": 60 },
        { "day": 3, "start": "19:00", "duration": 60 },
        { "day": 5, "start": "19:00", "duration": 60 }
      ],
      "stingers": [
        "Ring ring. Be brave.",
        "Say it clean. Say it dirty. Say it true.",
        "Daddy's listening."
      ],
      "vo": "Dial-A-Daddy. Consent first. Then we play."
    },
    {
      "id": "hand-n-hand",
      "title": "Hand N Hand",
      "slug": "hand-n-hand",
      "tagline": "Hand N Hand is the only place to land.",
      "description": "Hands open. Heart steady. Come down gentle. Stay human.",
      "schedule": [
        { "day": 0, "start": "20:00", "duration": 120 }
      ],
      "stingers": [
        "Hands open. Heart steady.",
        "The only place to land.",
        "Soft doesn't mean weak."
      ],
      "vo": "Hand N Hand — come down gentle. Stay human."
    }
  ]
};

export { schedule };

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