import { CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

// Enhanced toast (XP display removed)
export function toastWithXP(message, xpAmount) {
  return sonnerToast.success(message);
}

// Achievement unlock toast
export function toastAchievement(achievementName) {
  return sonnerToast.success(
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-[#39FF14]" />
      <div>
        <p className="font-bold">Achievement Unlocked!</p>
        <p className="text-sm text-white/60">{achievementName}</p>
      </div>
    </div>,
    {
      duration: 5000,
    }
  );
}

// Level up toast (level display removed)
export function toastLevelUp(newLevel) {
  return sonnerToast.success('Keep going!', { duration: 3000 });
}

// Match toast
export function toastNewMatch(userName) {
  return sonnerToast.success(
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 text-[#C8962C]" />
      <div>
        <p className="font-bold">New Match!</p>
        <p className="text-sm text-white/60">You matched with {userName}</p>
      </div>
    </div>,
    {
      duration: 5000,
    }
  );
}

// Event reminder toast
export function toastEventReminder(eventName, timeUntil) {
  return sonnerToast.info(
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-[#00D9FF]" />
      <div>
        <p className="font-bold">{eventName}</p>
        <p className="text-sm text-white/60">Starts in {timeUntil}</p>
      </div>
    </div>,
    {
      duration: 10000,
    }
  );
}

// Friend activity toast
export function toastFriendActivity(friendName, activity) {
  return sonnerToast.info(
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-[#00D9FF]" />
      <div>
        <p className="text-sm">{friendName} {activity}</p>
      </div>
    </div>,
    {
      duration: 4000,
    }
  );
}

// Export enhanced toast functions
export const enhancedToast = {
  xp: toastWithXP,
  achievement: toastAchievement,
  levelUp: toastLevelUp,
  match: toastNewMatch,
  eventReminder: toastEventReminder,
  friendActivity: toastFriendActivity,
};

export default enhancedToast;
