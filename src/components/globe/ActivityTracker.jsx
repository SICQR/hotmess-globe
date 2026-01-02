import { base44 } from '@/api/base44Client';

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
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;
      
      const user = await base44.auth.me();
      await base44.entities.UserActivity.create({
        user_email: user.email,
        action_type: actionType,
        details: details || {},
        location: location || null,
        visible: true
      });
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }

  pruneOldActivities(activities) {
    const now = Date.now();
    return activities.filter(activity => {
      const age = now - new Date(activity.created_date).getTime();
      return age < this.maxAge;
    });
  }
}

export const activityTracker = new ActivityTracker();