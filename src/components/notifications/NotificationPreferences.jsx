import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  MessageSquare, 
  Calendar, 
  Users, 
  ShoppingBag, 
  AlertTriangle,
  Check,
  X,
  Volume2,
  VolumeX,
  Moon,
  Loader2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/components/utils/supabaseClient';

const PREFS_KEY = 'hotmess_notification_preferences';

// Map UI categories to API fields
const CATEGORY_TO_API_FIELD = {
  messages: 'message_updates',
  events: 'event_updates',
  social: null, // Always enabled - no opt-out
  marketplace: 'order_updates',
  safety: 'safety_updates',
};

const NOTIFICATION_CATEGORIES = [
  {
    id: 'messages',
    name: 'Messages',
    description: 'New messages and conversation updates',
    icon: MessageSquare,
    color: '#E62020',
    defaultEnabled: true,
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Event reminders, updates, and nearby events',
    icon: Calendar,
    color: '#00D9FF',
    defaultEnabled: true,
  },
  {
    id: 'social',
    name: 'Social',
    description: 'New followers, handshakes, and connections',
    icon: Users,
    color: '#B026FF',
    defaultEnabled: true,
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Order updates and new products',
    icon: ShoppingBag,
    color: '#39FF14',
    defaultEnabled: false,
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Safety alerts and check-in reminders',
    icon: AlertTriangle,
    color: '#FF6B6B',
    defaultEnabled: true,
  },
];

export default function NotificationPreferences() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    sendTestNotification 
  } = usePushNotifications();
  
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Default preferences
    return {
      categories: NOTIFICATION_CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = cat.defaultEnabled;
        return acc;
      }, {}),
      quietHours: {
        enabled: false,
        start: '23:00',
        end: '08:00',
      },
      sound: true,
      vibration: true,
    };
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Load preferences from API on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/notifications/preferences', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          const apiPrefs = data.preferences || data;
          
          // Map API format to UI format
          setPreferences(prev => ({
            ...prev,
            categories: {
              messages: apiPrefs.message_updates !== false,
              events: apiPrefs.event_updates !== false,
              social: true, // Always enabled
              marketplace: apiPrefs.order_updates !== false,
              safety: apiPrefs.safety_updates !== false,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, []);
  
  // Save preferences to API
  const savePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    
    // Save to API for server-side filtering
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Map UI format to API format
      const apiPayload = {
        push_enabled: isSubscribed,
        message_updates: newPrefs.categories.messages,
        event_updates: newPrefs.categories.events,
        order_updates: newPrefs.categories.marketplace,
        safety_updates: newPrefs.categories.safety,
        marketing_enabled: false, // Could be added as category later
      };

      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(apiPayload),
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };
  
  const toggleCategory = (categoryId) => {
    const newPrefs = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [categoryId]: !preferences.categories[categoryId],
      },
    };
    savePreferences(newPrefs);
  };
  
  const toggleQuietHours = () => {
    const newPrefs = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled: !preferences.quietHours.enabled,
      },
    };
    savePreferences(newPrefs);
  };
  
  const updateQuietHours = (field, value) => {
    const newPrefs = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value,
      },
    };
    savePreferences(newPrefs);
  };
  
  const handleEnableNotifications = async () => {
    setSaving(true);
    try {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Failed to enable notifications');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handleDisableNotifications = async () => {
    setSaving(true);
    try {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notifications disabled');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestNotification = async () => {
    const success = await sendTestNotification(
      'Test Notification',
      'This is a test notification from HOTMESS!'
    );
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Failed to send test notification');
    }
  };
  
  if (!isSupported) {
    return (
      <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <BellOff className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-yellow-500 mb-2">Push Notifications Not Supported</h3>
            <p className="text-sm text-white/80">
              Your browser doesn't support push notifications. Try using a modern browser 
              like Chrome, Firefox, or Safari, or install the HOTMESS app.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isSubscribed ? 'bg-[#39FF14]/20' : 'bg-white/10'
            }`}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-[#39FF14]" />
              ) : (
                <BellOff className="w-5 h-5 text-white/40" />
              )}
            </div>
            <div>
              <h3 className="font-bold">Push Notifications</h3>
              <p className="text-sm text-white/60">
                {isSubscribed ? 'Notifications are enabled' : 'Notifications are disabled'}
              </p>
            </div>
          </div>
          
          {isSubscribed ? (
            <Button
              onClick={handleDisableNotifications}
              disabled={saving}
              variant="outline"
              className="border-white/20 text-white"
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={handleEnableNotifications}
              disabled={saving}
              className="bg-[#E62020] hover:bg-[#E62020]/90 text-black"
            >
              Enable
            </Button>
          )}
        </div>
        
        {permission === 'denied' && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-sm">
            <p className="text-red-400">
              Notifications are blocked in your browser settings. 
              Please enable them in your browser's site settings.
            </p>
          </div>
        )}
        
        {isSubscribed && (
          <Button
            onClick={handleTestNotification}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white"
          >
            Send Test Notification
          </Button>
        )}
      </motion.div>
      
      {/* Category Preferences */}
      {isSubscribed && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="font-bold mb-4">Notification Categories</h3>
            <p className="text-sm text-white/60 mb-6">
              Choose which types of notifications you want to receive
            </p>
            
            <div className="space-y-4">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div 
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <category.icon 
                        className="w-5 h-5" 
                        style={{ color: category.color }} 
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-white/60">{category.description}</div>
                    </div>
                  </div>
                  
                  <Switch
                    checked={preferences.categories[category.id]}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
          
          {/* Quiet Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  preferences.quietHours.enabled ? 'bg-[#B026FF]/20' : 'bg-white/10'
                }`}>
                  <Moon className={`w-5 h-5 ${
                    preferences.quietHours.enabled ? 'text-[#B026FF]' : 'text-white/40'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold">Quiet Hours</h3>
                  <p className="text-sm text-white/60">
                    Mute notifications during specific hours
                  </p>
                </div>
              </div>
              
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={toggleQuietHours}
              />
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-black/50 rounded-lg">
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block">Start</label>
                  <Input
                    type="time"
                    value={preferences.quietHours.start}
                    onChange={(e) => updateQuietHours('start', e.target.value)}
                    className="bg-black border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase mb-2 block">End</label>
                  <Input
                    type="time"
                    value={preferences.quietHours.end}
                    onChange={(e) => updateQuietHours('end', e.target.value)}
                    className="bg-black border-white/20"
                  />
                </div>
              </div>
            )}
          </motion.div>
          
          {/* Sound & Vibration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="font-bold mb-4">Sound & Vibration</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {preferences.sound ? (
                    <Volume2 className="w-5 h-5 text-[#00D9FF]" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-white/40" />
                  )}
                  <span>Notification Sound</span>
                </div>
                <Switch
                  checked={preferences.sound}
                  onCheckedChange={(checked) => savePreferences({ ...preferences, sound: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{preferences.vibration ? '📳' : '📴'}</span>
                  <span>Vibration</span>
                </div>
                <Switch
                  checked={preferences.vibration}
                  onCheckedChange={(checked) => savePreferences({ ...preferences, vibration: checked })}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
