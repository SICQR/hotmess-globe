/**
 * Weather API
 * Returns current weather data for a location
 * Uses OpenWeatherMap API
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory cache
const cache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon, city } = req.query;

  if (!lat && !lon && !city) {
    return res.status(400).json({ error: 'Provide lat/lon or city parameter' });
  }

  // Check cache
  const cacheKey = city || `${lat},${lon}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({
      ...cached.data,
      cached: true,
    });
  }

  // If no API key, return mock data
  if (!OPENWEATHER_API_KEY) {
    const mockData = getMockWeather(city || 'London');
    return res.status(200).json({
      ...mockData,
      mock: true,
    });
  }

  try {
    // Build API URL
    let url = 'https://api.openweathermap.org/data/2.5/weather?';
    if (city) {
      url += `q=${encodeURIComponent(city)}`;
    } else {
      url += `lat=${lat}&lon=${lon}`;
    }
    url += `&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Location not found' });
      }
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    const weather = {
      location: data.name,
      country: data.sys?.country,
      temperature: Math.round(data.main?.temp),
      feels_like: Math.round(data.main?.feels_like),
      humidity: data.main?.humidity,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      icon_url: `https://openweathermap.org/img/wn/${data.weather?.[0]?.icon}@2x.png`,
      wind_speed: data.wind?.speed,
      wind_direction: data.wind?.deg,
      clouds: data.clouds?.all,
      visibility: data.visibility,
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    cache.set(cacheKey, {
      data: weather,
      timestamp: Date.now(),
    });

    return res.status(200).json(weather);

  } catch (error) {
    console.error('[Weather] API error:', error);
    
    // Return mock data on error
    const mockData = getMockWeather(city || 'London');
    return res.status(200).json({
      ...mockData,
      error: 'Weather service unavailable',
      mock: true,
    });
  }
}

function getMockWeather(city) {
  const conditions = [
    { description: 'clear sky', icon: '01d', temp: 18 },
    { description: 'few clouds', icon: '02d', temp: 16 },
    { description: 'scattered clouds', icon: '03d', temp: 14 },
    { description: 'light rain', icon: '10d', temp: 12 },
    { description: 'overcast clouds', icon: '04d', temp: 15 },
  ];

  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    location: city,
    country: 'UK',
    temperature: condition.temp,
    feels_like: condition.temp - 2,
    humidity: 65 + Math.floor(Math.random() * 20),
    description: condition.description,
    icon: condition.icon,
    icon_url: `https://openweathermap.org/img/wn/${condition.icon}@2x.png`,
    wind_speed: 3 + Math.floor(Math.random() * 7),
    wind_direction: Math.floor(Math.random() * 360),
    clouds: Math.floor(Math.random() * 100),
    visibility: 10000,
    sunrise: new Date(new Date().setHours(6, 30, 0, 0)).toISOString(),
    sunset: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    timestamp: new Date().toISOString(),
  };
}
