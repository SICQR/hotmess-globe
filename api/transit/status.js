/**
 * Transit Status API
 * Returns current transit/transport status for a city
 * Uses TfL API for London, can be extended for other cities
 */

const TFL_APP_ID = process.env.TFL_APP_ID;
const TFL_APP_KEY = process.env.TFL_APP_KEY;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
const cache = new Map();

// Line status mappings
const STATUS_SEVERITY = {
  0: { status: 'Special Service', severity: 'info' },
  1: { status: 'Closed', severity: 'severe' },
  2: { status: 'Suspended', severity: 'severe' },
  3: { status: 'Part Suspended', severity: 'major' },
  4: { status: 'Planned Closure', severity: 'info' },
  5: { status: 'Part Closure', severity: 'info' },
  6: { status: 'Severe Delays', severity: 'major' },
  7: { status: 'Reduced Service', severity: 'minor' },
  8: { status: 'Bus Service', severity: 'info' },
  9: { status: 'Minor Delays', severity: 'minor' },
  10: { status: 'Good Service', severity: 'good' },
  11: { status: 'Part Closed', severity: 'major' },
  12: { status: 'Exit Only', severity: 'info' },
  13: { status: 'No Step Free Access', severity: 'info' },
  14: { status: 'Change of Frequency', severity: 'minor' },
  15: { status: 'Diverted', severity: 'minor' },
  16: { status: 'Not Running', severity: 'severe' },
  17: { status: 'Issues Reported', severity: 'minor' },
  18: { status: 'No Issues', severity: 'good' },
  19: { status: 'Information', severity: 'info' },
  20: { status: 'Service Closed', severity: 'severe' },
};

// Line colors
const LINE_COLORS = {
  bakerloo: '#B36305',
  central: '#E32017',
  circle: '#FFD300',
  district: '#00782A',
  'hammersmith-city': '#F3A9BB',
  jubilee: '#A0A5A9',
  metropolitan: '#9B0056',
  northern: '#000000',
  piccadilly: '#003688',
  victoria: '#0098D4',
  'waterloo-city': '#95CDBA',
  dlr: '#00A4A7',
  'london-overground': '#EE7C0E',
  'elizabeth': '#6950A1',
  tram: '#84B817',
  'tfl-rail': '#0019A8',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city = 'london' } = req.query;

  // Check cache
  const cacheKey = `transit:${city.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({
      ...cached.data,
      cached: true,
    });
  }

  // Currently only support London
  if (city.toLowerCase() !== 'london') {
    return res.status(200).json({
      city,
      supported: false,
      message: 'Transit status currently only available for London',
      lines: [],
    });
  }

  try {
    // Fetch TfL tube status
    let url = 'https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status';
    if (TFL_APP_ID && TFL_APP_KEY) {
      url += `?app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    const lines = data.map((line) => {
      const status = line.lineStatuses?.[0];
      const severityInfo = STATUS_SEVERITY[status?.statusSeverity] || STATUS_SEVERITY[10];

      return {
        id: line.id,
        name: line.name,
        mode: line.modeName,
        color: LINE_COLORS[line.id] || '#666',
        status: severityInfo.status,
        severity: severityInfo.severity,
        reason: status?.reason || null,
        disruption: status?.disruption || null,
      };
    });

    // Calculate overall status
    const severities = lines.map(l => l.severity);
    let overallStatus = 'good';
    if (severities.includes('severe')) overallStatus = 'severe';
    else if (severities.includes('major')) overallStatus = 'major';
    else if (severities.includes('minor')) overallStatus = 'minor';

    const goodLines = lines.filter(l => l.severity === 'good').length;
    const totalLines = lines.length;

    const result = {
      city: 'London',
      supported: true,
      overall_status: overallStatus,
      summary: `${goodLines}/${totalLines} lines with good service`,
      lines,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('[Transit] API error:', error);
    
    // Return mock data on error
    return res.status(200).json(getMockTransit());
  }
}

function getMockTransit() {
  const lines = [
    { id: 'central', name: 'Central', mode: 'tube' },
    { id: 'northern', name: 'Northern', mode: 'tube' },
    { id: 'victoria', name: 'Victoria', mode: 'tube' },
    { id: 'jubilee', name: 'Jubilee', mode: 'tube' },
    { id: 'piccadilly', name: 'Piccadilly', mode: 'tube' },
    { id: 'district', name: 'District', mode: 'tube' },
    { id: 'circle', name: 'Circle', mode: 'tube' },
    { id: 'bakerloo', name: 'Bakerloo', mode: 'tube' },
    { id: 'metropolitan', name: 'Metropolitan', mode: 'tube' },
    { id: 'hammersmith-city', name: 'Hammersmith & City', mode: 'tube' },
    { id: 'waterloo-city', name: 'Waterloo & City', mode: 'tube' },
    { id: 'dlr', name: 'DLR', mode: 'dlr' },
    { id: 'london-overground', name: 'Overground', mode: 'overground' },
    { id: 'elizabeth', name: 'Elizabeth line', mode: 'elizabeth-line' },
  ].map(line => ({
    ...line,
    color: LINE_COLORS[line.id] || '#666',
    status: Math.random() > 0.9 ? 'Minor Delays' : 'Good Service',
    severity: Math.random() > 0.9 ? 'minor' : 'good',
    reason: null,
    disruption: null,
  }));

  const goodLines = lines.filter(l => l.severity === 'good').length;

  return {
    city: 'London',
    supported: true,
    overall_status: goodLines === lines.length ? 'good' : 'minor',
    summary: `${goodLines}/${lines.length} lines with good service`,
    lines,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}
