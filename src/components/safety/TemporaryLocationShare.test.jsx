import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemporaryLocationShare, { useTemporaryLocationShare } from './TemporaryLocationShare';
import { renderHook } from '@testing-library/react';

// Mock dependencies
vi.mock('@/components/utils/supabaseClient', () => ({
  base44: {
    auth: {
      updateMe: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/utils/geolocation', () => ({
  safeGetViewerLatLng: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('TemporaryLocationShare', () => {
  const mockUser = {
    email: 'test@example.com',
    full_name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Full card mode', () => {
    it('should render initial state correctly', () => {
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      expect(screen.getByText('SHARE LOCATION')).toBeInTheDocument();
      expect(screen.getByText(/Temporarily share your location/)).toBeInTheDocument();
      expect(screen.getByText('Start Sharing')).toBeInTheDocument();
    });

    it('should show duration picker when Start Sharing is clicked', () => {
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      fireEvent.click(screen.getByText('Start Sharing'));
      
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('1 hour')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });

    it('should hide duration picker when Cancel is clicked', () => {
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      fireEvent.click(screen.getByText('Start Sharing'));
      expect(screen.getByText('15 min')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('15 min')).not.toBeInTheDocument();
    });

    it('should start sharing when duration is selected', async () => {
      const { safeGetViewerLatLng } = await import('@/utils/geolocation');
      safeGetViewerLatLng.mockResolvedValue({ lat: 51.5, lng: -0.1 });

      const { base44 } = await import('@/components/utils/supabaseClient');
      const { toast } = await import('sonner');
      
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      fireEvent.click(screen.getByText('Start Sharing'));
      fireEvent.click(screen.getByText('15 min'));
      
      await waitFor(() => {
        expect(base44.auth.updateMe).toHaveBeenCalledWith(
          expect.objectContaining({
            temp_location_sharing: true,
          })
        );
      });
      
      expect(toast.success).toHaveBeenCalledWith('Sharing location for 15 minutes');
    });

    it('should show error when location is unavailable', async () => {
      const { safeGetViewerLatLng } = await import('@/utils/geolocation');
      safeGetViewerLatLng.mockResolvedValue(null);

      const { toast } = await import('sonner');
      
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      fireEvent.click(screen.getByText('Start Sharing'));
      fireEvent.click(screen.getByText('15 min'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Could not get your location. Please enable location services.'
        );
      });
    });

    it('should disable Start Sharing button when no user', () => {
      render(<TemporaryLocationShare currentUser={null} />);
      
      expect(screen.getByText('Start Sharing')).toBeDisabled();
    });

    it('should display active state when sharing', async () => {
      // Set up localStorage to simulate active sharing
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      localStorage.setItem('hm_temp_location_share', JSON.stringify({ expiresAt }));
      
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      expect(screen.getByText('SHARING LOCATION')).toBeInTheDocument();
      expect(screen.getByText('Stop Sharing')).toBeInTheDocument();
    });

    it('should stop sharing when Stop button clicked', async () => {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      localStorage.setItem('hm_temp_location_share', JSON.stringify({ expiresAt }));
      
      const { base44 } = await import('@/components/utils/supabaseClient');
      const { toast } = await import('sonner');
      
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      fireEvent.click(screen.getByText('Stop Sharing'));
      
      await waitFor(() => {
        expect(base44.auth.updateMe).toHaveBeenCalledWith(
          expect.objectContaining({
            temp_location_sharing: false,
          })
        );
      });
      
      expect(toast.info).toHaveBeenCalledWith('Location sharing stopped');
    });

    it('should display countdown timer', () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      localStorage.setItem('hm_temp_location_share', JSON.stringify({ expiresAt }));
      
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      // Should show approximately 10:00 remaining (may vary slightly)
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    it('should show privacy note', () => {
      render(<TemporaryLocationShare currentUser={mockUser} />);
      
      expect(screen.getByText(/500m privacy grid/)).toBeInTheDocument();
    });
  });

  describe('Compact mode', () => {
    it('should render compact button', () => {
      render(<TemporaryLocationShare currentUser={mockUser} compact />);
      
      expect(screen.getByLabelText('Share location temporarily')).toBeInTheDocument();
    });

    it('should show countdown badge when active in compact mode', () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      localStorage.setItem('hm_temp_location_share', JSON.stringify({ expiresAt }));
      
      render(<TemporaryLocationShare currentUser={mockUser} compact />);
      
      // Should have the pulsing active style
      expect(screen.getByLabelText('Stop sharing location')).toBeInTheDocument();
    });

    it('should show duration picker dropdown in compact mode', () => {
      render(<TemporaryLocationShare currentUser={mockUser} compact />);
      
      fireEvent.click(screen.getByLabelText('Share location temporarily'));
      
      expect(screen.getByText('Share for:')).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
    });
  });
});

describe('useTemporaryLocationShare hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return isSharing: false when no active share', () => {
    const { result } = renderHook(() => useTemporaryLocationShare());
    
    expect(result.current.isSharing).toBe(false);
    expect(result.current.expiresAt).toBeNull();
  });

  it('should return isSharing: true when share is active', () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    localStorage.setItem('hm_temp_location_share', JSON.stringify({ 
      expiresAt: expiresAt.toISOString() 
    }));
    
    const { result } = renderHook(() => useTemporaryLocationShare());
    
    expect(result.current.isSharing).toBe(true);
    expect(result.current.expiresAt).toEqual(expiresAt);
  });

  it('should return isSharing: false when share has expired', () => {
    const expiresAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    localStorage.setItem('hm_temp_location_share', JSON.stringify({ 
      expiresAt: expiresAt.toISOString() 
    }));
    
    const { result } = renderHook(() => useTemporaryLocationShare());
    
    expect(result.current.isSharing).toBe(false);
  });
});
