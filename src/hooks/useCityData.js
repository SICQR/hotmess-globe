/**
 * City Data Hook
 * Fetches weather and transit data for a city
 */

import { useQuery } from '@tanstack/react-query';

/**
 * Fetch current weather for a location
 */
export function useWeather(location, options = {}) {
  const { enabled = true, refetchInterval = 30 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['weather', location],
    queryFn: async () => {
      if (!location) return null;

      const params = new URLSearchParams();
      if (typeof location === 'string') {
        params.set('city', location);
      } else if (location.lat && location.lon) {
        params.set('lat', location.lat);
        params.set('lon', location.lon);
      }

      const response = await fetch(`/api/weather/current?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather');
      }
      return response.json();
    },
    enabled: enabled && !!location,
    refetchInterval,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch transit status for a city
 */
export function useTransitStatus(city = 'london', options = {}) {
  const { enabled = true, refetchInterval = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ['transit', city],
    queryFn: async () => {
      const response = await fetch(`/api/transit/status?city=${encodeURIComponent(city)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transit status');
      }
      return response.json();
    },
    enabled,
    refetchInterval,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Combined city data hook
 */
export function useCityData(city, options = {}) {
  const weather = useWeather(city, { 
    enabled: options.enabled !== false,
    refetchInterval: options.weatherRefetchInterval,
  });
  
  const transit = useTransitStatus(city, { 
    enabled: options.enabled !== false,
    refetchInterval: options.transitRefetchInterval,
  });

  return {
    weather: weather.data,
    transit: transit.data,
    isLoading: weather.isLoading || transit.isLoading,
    error: weather.error || transit.error,
    refetch: () => {
      weather.refetch();
      transit.refetch();
    },
  };
}

/**
 * Get weather emoji based on condition
 */
export function getWeatherEmoji(iconCode) {
  if (!iconCode) return '🌡️';
  
  const emojiMap = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };

  return emojiMap[iconCode] || '🌡️';
}

/**
 * Get transit severity color
 */
export function getTransitSeverityColor(severity) {
  const colors = {
    good: '#39FF14',
    minor: '#FFEB3B',
    major: '#FF6B35',
    severe: '#FF073A',
    info: '#00D9FF',
  };
  return colors[severity] || '#666';
}

export default useCityData;
