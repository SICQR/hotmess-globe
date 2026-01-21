import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';

const DISABLE_SESSION_KEY = 'hm:disable_activity_tracking';

const isMissingTableError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'PGRST205' || code === '42P01') return true;
  return message.includes('schema cache') || message.includes('could not find the table') || message.includes('does not exist');
};

const isMissingColumnError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'PGRST204' || code === '42703') return true;
  return (message.includes('could not find') && message.includes('column')) || message.includes('column') && message.includes('does not exist');
};

const getMissingColumnName = (error) => {
  const message = String(error?.message || '');

  let match = message.match(/Could not find the '([^']+)' column/i);
  if (match?.[1]) return match[1];

  match = message.match(/column\s+[^.]+\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (match?.[1]) return match[1];

  return null;
};

const isAuthOrPermissionError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const status = Number(error?.status || 0);
  if (status === 401 || status === 403) return true;
  // Postgres insufficient_privilege
  if (code === '42501') return true;
  return false;
};

const safeTrimLower = (value) => String(value || '').trim().toLowerCase();

class ActivityTracker {
  constructor() {
    this.enabled = localStorage.getItem('activity_visibility') !== 'false';
    this.recentActivities = [];
    this.maxAge = 60000; // 1 minute
    this._writeDisabled = sessionStorage.getItem(DISABLE_SESSION_KEY) === '1';
    this._lastAttemptAt = 0;
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
    if (this._writeDisabled) return;

    // Avoid spamming the DB when a component is noisy (e.g. rapid hover/mousemove).
    const now = Date.now();
    if (now - this._lastAttemptAt < 750) return;
    this._lastAttemptAt = now;

    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;
      
      const user = await base44.auth.me();
      const email = safeTrimLower(user?.email);
      if (!email) return;

      // Best-effort schema compatibility:
      // - some DBs have action_type; others have activity_type
      // - some DBs may not have details/location/visible
      const basePayload = {
        user_email: email,
        details: details || {},
        location: location || null,
        visible: true,
      };

      const variants = [
        { ...basePayload, action_type: actionType },
        { ...basePayload, activity_type: actionType },
      ];

      const tables = ['UserActivity', 'user_activities'];

      for (const variant of variants) {
        let payload = { ...variant };

        for (let stripAttempt = 0; stripAttempt < 6; stripAttempt += 1) {
          let lastError = null;

          for (let t = 0; t < tables.length; t += 1) {
            const table = tables[t];
            const { error } = await supabase.from(table).insert(payload);
            if (!error) return;
            lastError = error;

            if (isMissingTableError(error)) {
              continue;
            }

            if (isMissingColumnError(error)) {
              const missing = getMissingColumnName(error);
              if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
                delete payload[missing];
                // Retry immediately with stripped payload (same table loop will restart next iteration).
                lastError = null;
                break;
              }
            }

            // Other errors: do not keep retrying.
            if (isAuthOrPermissionError(error)) {
              this._writeDisabled = true;
              sessionStorage.setItem(DISABLE_SESSION_KEY, '1');
              return;
            }

            // If we reach here, it's a real error and retries won't help.
            return;
          }

          // If we broke out to strip a missing column, try again.
          if (lastError === null) continue;

          // Missing table across both candidates -> disable for this session.
          if (lastError && isMissingTableError(lastError)) {
            this._writeDisabled = true;
            sessionStorage.setItem(DISABLE_SESSION_KEY, '1');
            return;
          }

          // Missing column but we couldn't strip it -> give up quietly.
          if (lastError && isMissingColumnError(lastError)) return;

          return;
        }
      }
    } catch (error) {
      // Avoid noisy console spam; activity tracking is non-critical.
      // If this starts erroring, disable it for this browser session.
      this._writeDisabled = true;
      sessionStorage.setItem(DISABLE_SESSION_KEY, '1');
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