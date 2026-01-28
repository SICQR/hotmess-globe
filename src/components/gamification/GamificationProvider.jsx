import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AchievementUnlockModal from './AchievementUnlockModal';
import LevelUpModal from './LevelUpModal';
import { XPGainContainer } from './XPGainAnimation';

const GamificationContext = createContext(null);

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

// Safe hook that doesn't throw if not within provider
export function useGamificationSafe() {
  return useContext(GamificationContext);
}

export function GamificationProvider({ children, currentUser }) {
  const queryClient = useQueryClient();
  
  // XP gain notifications
  const [xpNotifications, setXpNotifications] = useState([]);
  
  // Achievement unlock modal
  const [achievementModal, setAchievementModal] = useState({
    isOpen: false,
    achievement: null,
  });
  
  // Level up modal
  const [levelUpModal, setLevelUpModal] = useState({
    isOpen: false,
    newLevel: 1,
    previousLevel: 1,
    currentXP: 0,
  });

  // Achievement queue for multiple achievements
  const [achievementQueue, setAchievementQueue] = useState([]);

  // Process achievement queue
  useEffect(() => {
    if (!achievementModal.isOpen && achievementQueue.length > 0) {
      const [nextAchievement, ...rest] = achievementQueue;
      setAchievementQueue(rest);
      setAchievementModal({
        isOpen: true,
        achievement: nextAchievement,
      });
    }
  }, [achievementModal.isOpen, achievementQueue]);

  // Show XP gain animation
  const showXPGain = useCallback((amount, position = null) => {
    if (!amount || amount <= 0) return;
    
    const id = Date.now() + Math.random();
    const notification = { 
      id, 
      amount, 
      position: position || { y: window.innerHeight * 0.3 },
    };
    
    setXpNotifications(prev => [...prev, notification]);
  }, []);

  // Remove XP notification
  const removeXPNotification = useCallback((id) => {
    setXpNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Show achievement unlock
  const showAchievementUnlock = useCallback((achievement) => {
    if (!achievement) return;
    
    // If modal is already open, queue this achievement
    if (achievementModal.isOpen) {
      setAchievementQueue(prev => [...prev, achievement]);
    } else {
      setAchievementModal({
        isOpen: true,
        achievement,
      });
    }
  }, [achievementModal.isOpen]);

  // Close achievement modal
  const closeAchievementModal = useCallback(() => {
    setAchievementModal({ isOpen: false, achievement: null });
  }, []);

  // Show level up celebration
  const showLevelUp = useCallback((newLevel, previousLevel, currentXP) => {
    setLevelUpModal({
      isOpen: true,
      newLevel,
      previousLevel,
      currentXP,
    });
  }, []);

  // Close level up modal
  const closeLevelUpModal = useCallback(() => {
    setLevelUpModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Award XP with all animations
  const awardXP = useCallback(async (amount, options = {}) => {
    if (!currentUser || !amount || amount <= 0) return;

    const { 
      position = null, 
      showAnimation = true,
    } = options;

    // Calculate level change
    const previousXP = currentUser.xp || 0;
    const newXP = previousXP + amount;
    const previousLevel = Math.floor(previousXP / 1000) + 1;
    const newLevel = Math.floor(newXP / 1000) + 1;

    // Show XP gain animation
    if (showAnimation) {
      showXPGain(amount, position);
    }

    // Check for level up
    if (newLevel > previousLevel) {
      // Delay level up modal slightly so XP animation plays first
      setTimeout(() => {
        showLevelUp(newLevel, previousLevel, newXP);
      }, 500);
    }

    // Invalidate user queries to refresh XP
    queryClient.invalidateQueries(['current-user']);
    
    return { previousXP, newXP, previousLevel, newLevel, leveledUp: newLevel > previousLevel };
  }, [currentUser, showXPGain, showLevelUp, queryClient]);

  // Batch award achievements
  const awardAchievements = useCallback((achievements) => {
    if (!Array.isArray(achievements) || achievements.length === 0) return;
    
    achievements.forEach((achievement, index) => {
      setTimeout(() => {
        showAchievementUnlock(achievement);
      }, index * 1000); // Stagger if multiple
    });
  }, [showAchievementUnlock]);

  const value = {
    // XP
    showXPGain,
    awardXP,
    xpNotifications,
    
    // Achievements
    showAchievementUnlock,
    awardAchievements,
    
    // Level up
    showLevelUp,
    
    // User data
    currentUser,
    currentLevel: currentUser ? Math.floor((currentUser.xp || 0) / 1000) + 1 : 1,
    currentXP: currentUser?.xp || 0,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
      
      {/* XP Gain Animations */}
      <XPGainContainer 
        notifications={xpNotifications} 
        onRemove={removeXPNotification} 
      />
      
      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        isOpen={achievementModal.isOpen}
        onClose={closeAchievementModal}
        achievement={achievementModal.achievement}
      />
      
      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={levelUpModal.isOpen}
        onClose={closeLevelUpModal}
        newLevel={levelUpModal.newLevel}
        previousLevel={levelUpModal.previousLevel}
        currentXP={levelUpModal.currentXP}
      />
    </GamificationContext.Provider>
  );
}

export default GamificationProvider;
