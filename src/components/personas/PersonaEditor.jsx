import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Save, Trash2, Clock, MapPin, Eye, EyeOff, Users, Search, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { cn } from '@/lib/utils';

// Popular cities with coordinates for quick selection
const POPULAR_CITIES = [
  { name: 'London', lat: 51.5074, lng: -0.1278, country: 'UK' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'US' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'FR' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, country: 'DE' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, country: 'NL' },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734, country: 'ES' },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, country: 'US' },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'US' },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, country: 'US' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'AU' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'JP' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, country: 'CA' },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426, country: 'UK' },
  { name: 'Brighton', lat: 50.8225, lng: -0.1372, country: 'UK' },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, country: 'AU' },
];

// System profile types
const PROFILE_TYPES = [
  { key: 'TRAVEL', label: 'Travel', icon: '✈️', description: 'For when you are traveling' },
  { key: 'WEEKEND', label: 'Weekend', icon: '🌙', description: 'Weekend persona' },
  { key: 'CUSTOM', label: 'Custom', icon: '🎭', description: 'Create your own type' },
];

const INHERIT_MODES = [
  { value: 'FULL_INHERIT', label: 'Inherit All', description: 'Use all fields from main profile' },
  { value: 'OVERRIDE_FIELDS', label: 'Selective Override', description: 'Override specific fields' },
  { value: 'OVERRIDE_ALL', label: 'Independent', description: 'Treat as separate profile' },
];

/**
 * LocationOverrideSection - City search with autocomplete
 */
function LocationOverrideSection({ enabled, onEnabledChange, selectedCity, onCitySelect, error }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch cities from database
  const { data: dbCities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => base44.entities.City.list(),
  });

  // Combine database cities with popular cities (deduplicated)
  const allCities = useMemo(() => {
    const cityMap = new Map();
    
    // Add popular cities first
    POPULAR_CITIES.forEach(city => {
      cityMap.set(city.name.toLowerCase(), city);
    });
    
    // Add database cities (may override popular ones with more accurate data)
    dbCities.forEach(city => {
      if (city.name && city.lat && city.lng) {
        cityMap.set(city.name.toLowerCase(), {
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          country: city.country || '',
        });
      }
    });
    
    return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCities]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show popular cities when no search
      return POPULAR_CITIES.slice(0, 8);
    }
    
    const query = searchQuery.toLowerCase();
    return allCities
      .filter(city => 
        city.name.toLowerCase().includes(query) ||
        (city.country && city.country.toLowerCase().includes(query))
      )
      .slice(0, 10);
  }, [searchQuery, allCities]);

  const handleSelectCity = (city) => {
    onCitySelect(city);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onCitySelect(null);
    setSearchQuery('');
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 mb-3">
        <MapPin className="w-4 h-4" />
        Location Override
      </label>
      
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 mb-3">
        <div>
          <div className="text-white font-bold">Use Different Location</div>
          <div className="text-xs text-white/50">Show a different location for this persona</div>
        </div>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            enabled ? 'bg-cyan-500' : 'bg-white/20'
          )}
        >
          <span className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            enabled ? 'left-7' : 'left-1'
          )} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
          {/* Selected City Display */}
          {selectedCity?.name && (
            <div className="flex items-center justify-between p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-bold">{selectedCity.name}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          )}

          {/* City Search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs text-white/60 mb-2">
              {selectedCity?.name ? 'Change Location' : 'Search for a City'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type a city name..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
              {citiesLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-black/95 border border-white/20 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {filteredCities.length === 0 ? (
                  <div className="p-4 text-center text-white/50 text-sm">
                    No cities found. Try a different search.
                  </div>
                ) : (
                  <>
                    {!searchQuery.trim() && (
                      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                        Popular Cities
                      </div>
                    )}
                    {filteredCities.map((city, idx) => (
                      <button
                        key={`${city.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left',
                          selectedCity?.name === city.name && 'bg-cyan-500/20'
                        )}
                      >
                        <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{city.name}</div>
                          {city.country && (
                            <div className="text-xs text-white/40">{city.country}</div>
                          )}
                        </div>
                        {selectedCity?.name === city.name && (
                          <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Pick Buttons */}
          {!selectedCity?.name && !searchQuery && (
            <div>
              <label className="block text-xs text-white/40 mb-2">Quick Pick</label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.slice(0, 6).map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="px-3 py-1.5 bg-white/5 border border-white/20 rounded-full text-xs text-white/70 hover:bg-white/10 hover:border-white/30 transition-colors"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PersonaEditor - Full editor for creating/editing a persona
 */
export default function PersonaEditor({
  profile = null,
  onSave,
  onDelete,
  onClose,
}) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isNew = !profile?.id;

  // Form state
  const [formData, setFormData] = useState({
    type_key: profile?.type_key || 'CUSTOM',
    type_label: profile?.type_label || '',
    active: profile?.active ?? false,
    expires_at: profile?.expires_at ? new Date(profile.expires_at).toISOString().slice(0, 16) : '',
    inherit_mode: profile?.inherit_mode || 'FULL_INHERIT',
    override_location_enabled: profile?.override_location_enabled ?? false,
    override_location_lat: profile?.override_location_lat || '',
    override_location_lng: profile?.override_location_lng || '',
    override_location_label: profile?.override_location_label || '',
  });

  const [overrides, setOverrides] = useState({
    bio: '',
    display_name: '',
    headline: '',
  });

  const [errors, setErrors] = useState({});

  // Update type_label when type_key changes
  useEffect(() => {
    if (formData.type_key !== 'CUSTOM' && !formData.type_label) {
      const typeInfo = PROFILE_TYPES.find((t) => t.key === formData.type_key);
      if (typeInfo) {
        setFormData((prev) => ({ ...prev, type_label: typeInfo.label }));
      }
    }
  }, [formData.type_key]);

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const accessToken = (await base44.auth.me())?.access_token || 
        (await supabase.auth.getSession())?.data?.session?.access_token;

      if (isNew) {
        const response = await fetch('/api/personas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create profile');
        }
        return response.json();
      } else {
        const response = await fetch(`/api/personas/${profile.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update profile');
        }
        return response.json();
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['user-profiles']);
      onSave?.(result.profile);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const accessToken = (await base44.auth.me())?.access_token || 
        (await supabase.auth.getSession())?.data?.session?.access_token;

      const response = await fetch(`/api/personas/${profile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-profiles']);
      onDelete?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    if (!formData.type_label?.trim()) {
      newErrors.type_label = 'Label is required';
    }
    if (formData.type_label?.length > 50) {
      newErrors.type_label = 'Label must be 50 characters or less';
    }
    if (formData.expires_at) {
      const expiry = new Date(formData.expires_at);
      if (expiry <= new Date()) {
        newErrors.expires_at = 'Expiry must be in the future';
      }
    }
    if (formData.override_location_enabled) {
      if (!formData.override_location_lat || !formData.override_location_lng) {
        newErrors.location = 'Location coordinates required when override is enabled';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare data
    const submitData = {
      ...formData,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      override_location_lat: formData.override_location_lat ? parseFloat(formData.override_location_lat) : null,
      override_location_lng: formData.override_location_lng ? parseFloat(formData.override_location_lng) : null,
    };

    // Include overrides if in override mode
    if (formData.inherit_mode !== 'FULL_INHERIT') {
      submitData.overrides_json = overrides;
    }

    saveMutation.mutate(submitData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this persona? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-white/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            {isNew ? 'Create Persona' : 'Edit Persona'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-3">
              Persona Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PROFILE_TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => updateField('type_key', type.key)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    formData.type_key === type.key
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-white/20 hover:border-white/40'
                  )}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="mt-2 text-white font-bold">{type.label}</div>
                  <div className="text-xs text-white/50">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Type Label (for custom) */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Display Label
            </label>
            <input
              type="text"
              value={formData.type_label}
              onChange={(e) => updateField('type_label', e.target.value)}
              placeholder="e.g., Weekend Mode, Travel Profile..."
              maxLength={50}
              className={cn(
                'w-full px-4 py-3 bg-white/5 border rounded-lg text-white',
                'placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400',
                errors.type_label ? 'border-red-500' : 'border-white/20'
              )}
            />
            {errors.type_label && (
              <p className="mt-1 text-xs text-red-400">{errors.type_label}</p>
            )}
            <p className="mt-1 text-xs text-white/40">{formData.type_label?.length || 0}/50 characters</p>
          </div>

          {/* Activation */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              {formData.active ? (
                <Eye className="w-5 h-5 text-green-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-white/40" />
              )}
              <div>
                <div className="text-white font-bold">Active</div>
                <div className="text-xs text-white/50">Make this persona visible to others</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateField('active', !formData.active)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                formData.active ? 'bg-green-500' : 'bg-white/20'
              )}
            >
              <span className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                formData.active ? 'left-7' : 'left-1'
              )} />
            </button>
          </div>

          {/* Expiry */}
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 mb-2">
              <Clock className="w-4 h-4" />
              Auto-Expire (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => updateField('expires_at', e.target.value)}
              className={cn(
                'w-full px-4 py-3 bg-white/5 border rounded-lg text-white',
                'focus:outline-none focus:ring-2 focus:ring-cyan-400',
                errors.expires_at ? 'border-red-500' : 'border-white/20'
              )}
            />
            {errors.expires_at && (
              <p className="mt-1 text-xs text-red-400">{errors.expires_at}</p>
            )}
            <p className="mt-1 text-xs text-white/40">
              Profile will automatically deactivate at this time
            </p>
          </div>

          {/* Inherit Mode */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-3">
              Content Inheritance
            </label>
            <div className="space-y-2">
              {INHERIT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => updateField('inherit_mode', mode.value)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4',
                    formData.inherit_mode === mode.value
                      ? 'border-cyan-400 bg-cyan-400/10'
                      : 'border-white/20 hover:border-white/40'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    formData.inherit_mode === mode.value
                      ? 'border-cyan-400'
                      : 'border-white/40'
                  )}>
                    {formData.inherit_mode === mode.value && (
                      <div className="w-3 h-3 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-bold">{mode.label}</div>
                    <div className="text-xs text-white/50">{mode.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Location Override */}
          <LocationOverrideSection
            enabled={formData.override_location_enabled}
            onEnabledChange={(val) => updateField('override_location_enabled', val)}
            selectedCity={{
              name: formData.override_location_label,
              lat: formData.override_location_lat,
              lng: formData.override_location_lng,
            }}
            onCitySelect={(city) => {
              updateField('override_location_label', city?.name || '');
              updateField('override_location_lat', city?.lat || '');
              updateField('override_location_lng', city?.lng || '');
            }}
            error={errors.location}
          />

          {/* Error Display */}
          {(saveMutation.error || deleteMutation.error) && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">
                {saveMutation.error?.message || deleteMutation.error?.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {!isNew && profile?.kind !== 'MAIN' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-white/60"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="cyan"
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
