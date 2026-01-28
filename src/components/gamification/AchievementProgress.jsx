import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, CheckCircle2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    gradient: 'from-gray-400 to-gray-600',
    border: 'border-gray-500',
    label: 'Common',
  },
  rare: {
    color: '#3B82F6',
    gradient: 'from-blue-400 to-blue-600',
    border: 'border-blue-500',
    label: 'Rare',
  },
  epic: {
    color: '#A855F7',
    gradient: 'from-purple-400 to-purple-600',
    border: 'border-purple-500',
    label: 'Epic',
  },
  legendary: {
    color: '#F59E0B',
    gradient: 'from-amber-400 to-orange-500',
    border: 'border-amber-500',
    label: 'Legendary',
  },
};

// Single achievement progress card
export function AchievementProgressCard({ 
  achievement, 
  current = 0, 
  total = 1, 
  isUnlocked = false,
  className,
}) {
  const progress = Math.min((current / total) * 100, 100);
  const rarity = achievement?.rarity || 'common';
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative bg-white/5 border-2 p-4 transition-all hover:bg-white/10",
        isUnlocked ? config.border : "border-white/10",
        className
      )}
    >
      {/* Badge */}
      <div className="flex items-start gap-4">
        <div 
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0",
            isUnlocked 
              ? `bg-gradient-to-br ${config.gradient} border-white` 
              : "bg-white/5 border-white/20"
          )}
        >
          {isUnlocked ? (
            <Trophy className="w-7 h-7 text-white" />
          ) : (
            <Lock className="w-6 h-6 text-white/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title and rarity */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-black text-sm uppercase truncate",
              isUnlocked ? "text-white" : "text-white/60"
            )}>
              {achievement?.title || 'Achievement'}
            </h3>
            {isUnlocked && (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-white/40 mb-3 line-clamp-2">
            {achievement?.description || 'Complete this challenge to unlock.'}
          </p>

          {/* Progress bar */}
          {!isUnlocked && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">{current} / {total}</span>
                <span className="text-white/40">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn("h-full rounded-full bg-gradient-to-r", config.gradient)}
                />
              </div>
            </div>
          )}

          {/* Unlocked state */}
          {isUnlocked && (
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                }}
              >
                {config.label}
              </span>
              {achievement?.xp_reward && (
                <span className="text-xs text-[#FFEB3B] font-bold">
                  +{achievement.xp_reward} XP
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Achievement progress list with categories
export function AchievementProgressList({ 
  achievements = [], 
  userAchievements = [],
  showLocked = true,
  className,
}) {
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
    return 0;
  });

  const displayAchievements = showLocked 
    ? sortedAchievements 
    : sortedAchievements.filter(a => unlockedIds.has(a.id));

  return (
    <div className={cn("grid gap-3", className)}>
      {displayAchievements.map((achievement, idx) => {
        const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
        const isUnlocked = !!userAchievement;
        
        return (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <AchievementProgressCard
              achievement={achievement}
              current={userAchievement?.progress || 0}
              total={achievement.target || 1}
              isUnlocked={isUnlocked}
            />
          </motion.div>
        );
      })}
      
      {displayAchievements.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No achievements to display</p>
        </div>
      )}
    </div>
  );
}

// Achievement categories with filtering
export function AchievementCategories({
  achievements = [],
  userAchievements = [],
  className,
}) {
  const [activeCategory, setActiveCategory] = React.useState('all');
  
  // Group achievements by category
  const categories = React.useMemo(() => {
    const cats = { all: [] };
    achievements.forEach(a => {
      const cat = a.category || 'general';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(a);
      cats.all.push(a);
    });
    return cats;
  }, [achievements]);

  const categoryLabels = {
    all: 'All',
    social: 'Social',
    exploration: 'Exploration',
    marketplace: 'Marketplace',
    events: 'Events',
    general: 'General',
  };

  // Calculate completion per category
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const getCompletion = (catAchievements) => {
    const unlocked = catAchievements.filter(a => unlockedIds.has(a.id)).length;
    return { unlocked, total: catAchievements.length };
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {Object.entries(categories).map(([key, catAchievements]) => {
          const { unlocked, total } = getCompletion(catAchievements);
          const isActive = activeCategory === key;
          
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-2",
                isActive 
                  ? "bg-[#FF1493] text-black border-[#FF1493]" 
                  : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
              )}
            >
              <span>{categoryLabels[key] || key}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px]",
                isActive ? "bg-black/20" : "bg-white/10"
              )}>
                {unlocked}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Achievement list */}
      <AchievementProgressList
        achievements={categories[activeCategory] || []}
        userAchievements={userAchievements}
        showLocked
      />
    </div>
  );
}

// Compact achievement badge for profiles
export function AchievementBadge({ 
  achievement, 
  size = 'md',
  showTooltip = true,
  className,
}) {
  const rarity = achievement?.rarity || 'common';
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={cn("relative group", className)}
      title={showTooltip ? `${achievement?.title}: ${achievement?.description}` : undefined}
    >
      <div 
        className={cn(
          "rounded-full flex items-center justify-center border-2",
          `bg-gradient-to-br ${config.gradient}`,
          sizes[size]
        )}
        style={{ borderColor: config.color }}
      >
        {achievement?.icon ? (
          <img 
            src={achievement.icon} 
            alt={achievement.title}
            className={cn("object-contain", iconSizes[size])}
          />
        ) : (
          <Trophy className={cn("text-white", iconSizes[size])} />
        )}
      </div>

      {/* Rarity indicator */}
      {rarity === 'legendary' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1 -right-1"
        >
          <Star className="w-3 h-3 fill-[#FFEB3B] text-[#FFEB3B]" />
        </motion.div>
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border-2 border-white rounded-none text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="font-bold">{achievement?.title}</div>
          <div className="text-white/60 text-[10px]">{config.label}</div>
        </div>
      )}
    </motion.div>
  );
}

export default AchievementProgress;

// Default export for convenience
export function AchievementProgress({ 
  achievements = [], 
  userAchievements = [],
  variant = 'list', // 'list', 'categories', 'badges'
  className,
}) {
  if (variant === 'categories') {
    return (
      <AchievementCategories
        achievements={achievements}
        userAchievements={userAchievements}
        className={className}
      />
    );
  }

  if (variant === 'badges') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {userAchievements.map((ua) => {
          const achievement = achievements.find(a => a.id === ua.achievement_id);
          if (!achievement) return null;
          return (
            <AchievementBadge 
              key={ua.id} 
              achievement={achievement} 
            />
          );
        })}
      </div>
    );
  }

  return (
    <AchievementProgressList
      achievements={achievements}
      userAchievements={userAchievements}
      className={className}
    />
  );
}
