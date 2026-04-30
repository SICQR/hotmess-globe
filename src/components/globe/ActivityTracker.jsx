import { supabase } from '@/components/utils/supabaseClient';

class ActivityTracker {
  constructor() {
    this.enabled = localStorage.getItem('activity_visibility') !== 'false';
    this.recentActivities = [];
    this.maxAge = 60000; // 1 minute
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('activity_visibility', enabled);
  }

  isEnabled() {
    return this.enabled;
  }

  async trackActivity(actionType, details, location) {
    if (!this.enabled) return;

    try {
      const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
      if (!isAuth) return;
      
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // user not found - return early or handle
      } else {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        const enrichedUser = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
        Object.assign(user, enrichedUser);
      }
      if (!user?.email) return;
      
      // UserActivity table may not exist - fail silently
      try {
        await supabase.from('user_activity').insert({
          user_email: user.email,
          action_type: actionType,
          details: details || {},
          location: location || null,
          visible: true
        });
      } catch {
        // silently fail if table doesn't exist
      }
    } catch {
      // Activity tracking is non-critical - fail silently
    }
  }

  pruneOldActivities(activities) {
    if (!Array.isArray(activities)) return [];
    const now = Date.now();
    return activities.filter(activity => {
      const age = now - new Date(activity.created_date).getTime();
      return age < this.maxAge;
    });
  }
}

export const activityTracker = new ActivityTracker();
