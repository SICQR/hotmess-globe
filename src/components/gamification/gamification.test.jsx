import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import XPGainAnimation from '@/components/gamification/XPGainAnimation';
import LevelUpModal from '@/components/gamification/LevelUpModal';
import AchievementUnlockModal from '@/components/gamification/AchievementUnlockModal';
import AchievementProgress from '@/components/gamification/AchievementProgress';

// Mock canvas-confetti to avoid canvas issues in tests
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

describe('Gamification Components', () => {
  describe('XPGainAnimation', () => {
    it('renders with amount', () => {
      const { container } = render(<XPGainAnimation amount={50} />);
      expect(container.textContent).toContain('50 XP');
    });

    it('calls onComplete after animation', () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      render(<XPGainAnimation amount={50} onComplete={onComplete} />);
      
      vi.advanceTimersByTime(2000);
      expect(onComplete).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('LevelUpModal', () => {
    it('renders when open', () => {
      render(
        <LevelUpModal 
          isOpen={true} 
          onClose={() => {}} 
          level={5}
          rewards={['New badge', 'Extra XP']}
        />
      );
      
      expect(screen.getByText(/LEVEL UP/i)).toBeInTheDocument();
      expect(screen.getByText(/LEVEL 5/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <LevelUpModal 
          isOpen={false} 
          onClose={() => {}} 
          level={5}
        />
      );
      
      expect(screen.queryByText(/LEVEL UP/i)).not.toBeInTheDocument();
    });
  });

  describe('AchievementUnlockModal', () => {
    const mockAchievement = {
      title: 'First Check-in',
      description: 'Check in to your first venue',
      reward_xp: 100
    };

    it('renders achievement details', () => {
      render(
        <AchievementUnlockModal 
          isOpen={true} 
          onClose={() => {}} 
          achievement={mockAchievement}
          rarity="rare"
        />
      );
      
      expect(screen.getByText('First Check-in')).toBeInTheDocument();
      expect(screen.getByText(/Check in to your first venue/i)).toBeInTheDocument();
      expect(screen.getByText(/100 XP/i)).toBeInTheDocument();
    });

    it('shows correct rarity label', () => {
      render(
        <AchievementUnlockModal 
          isOpen={true} 
          onClose={() => {}} 
          achievement={mockAchievement}
          rarity="legendary"
        />
      );
      
      expect(screen.getByText('Legendary')).toBeInTheDocument();
    });
  });

  describe('AchievementProgress', () => {
    const mockAchievement = {
      title: 'Social Butterfly',
      description: 'Connect with 10 users',
      reward_xp: 200
    };

    it('renders progress bar for incomplete achievement', () => {
      render(
        <AchievementProgress 
          achievement={mockAchievement}
          currentProgress={7}
          maxProgress={10}
          isCompleted={false}
        />
      );
      
      expect(screen.getByText('Social Butterfly')).toBeInTheDocument();
      expect(screen.getByText(/7 \/ 10/i)).toBeInTheDocument();
      expect(screen.getByText(/70%/i)).toBeInTheDocument();
    });

    it('shows completed state', () => {
      render(
        <AchievementProgress 
          achievement={mockAchievement}
          currentProgress={10}
          maxProgress={10}
          isCompleted={true}
        />
      );
      
      expect(screen.getByText(/COMPLETED/i)).toBeInTheDocument();
    });

    it('shows locked state', () => {
      render(
        <AchievementProgress 
          achievement={mockAchievement}
          currentProgress={0}
          maxProgress={10}
          isLocked={true}
        />
      );
      
      expect(screen.getByText(/LOCKED/i)).toBeInTheDocument();
    });
  });
});
