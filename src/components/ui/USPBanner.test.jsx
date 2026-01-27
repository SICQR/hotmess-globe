import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import USPBanner, { RotatingUSPBanner } from './USPBanner';

// Wrapper for router context
const renderWithRouter = (component) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('USPBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render care-first banner correctly', () => {
    renderWithRouter(<USPBanner type="care-first" dismissable={false} />);
    
    expect(screen.getByText('CARE-FIRST PLATFORM')).toBeInTheDocument();
    expect(screen.getByText(/Consent is non-negotiable/)).toBeInTheDocument();
    expect(screen.getByText('View Safety Tools')).toBeInTheDocument();
  });

  it('should render privacy-grid banner correctly', () => {
    renderWithRouter(<USPBanner type="privacy-grid" dismissable={false} />);
    
    expect(screen.getByText('500M PRIVACY GRID')).toBeInTheDocument();
    expect(screen.getByText(/exact location is never shared/)).toBeInTheDocument();
  });

  it('should render right-now banner correctly', () => {
    renderWithRouter(<USPBanner type="right-now" dismissable={false} />);
    
    expect(screen.getByText('NO GHOST STATUS')).toBeInTheDocument();
    expect(screen.getByText(/auto-expires/)).toBeInTheDocument();
  });

  it('should render community banner correctly', () => {
    renderWithRouter(<USPBanner type="community" dismissable={false} />);
    
    expect(screen.getByText('QUEER-FIRST DESIGN')).toBeInTheDocument();
  });

  it('should render escrow banner correctly', () => {
    renderWithRouter(<USPBanner type="escrow" dismissable={false} />);
    
    expect(screen.getByText('PROTECTED COMMERCE')).toBeInTheDocument();
  });

  it('should render compact mode', () => {
    renderWithRouter(<USPBanner type="care-first" compact dismissable={false} />);
    
    expect(screen.getByText('CARE-FIRST PLATFORM')).toBeInTheDocument();
    // Compact mode has truncated description
    expect(screen.queryByText('View Safety Tools')).not.toBeInTheDocument();
  });

  it('should be dismissable when enabled', () => {
    renderWithRouter(<USPBanner type="care-first" dismissable={true} />);
    
    // Find and click dismiss button
    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);
    
    // Banner should be gone
    expect(screen.queryByText('CARE-FIRST PLATFORM')).not.toBeInTheDocument();
  });

  it('should persist dismissed state in localStorage', () => {
    renderWithRouter(<USPBanner type="privacy-grid" dismissable={true} />);
    
    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);
    
    // Check localStorage
    const dismissed = JSON.parse(localStorage.getItem('hm_usp_dismissed') || '[]');
    expect(dismissed).toContain('privacy-grid');
  });

  it('should not render if already dismissed', () => {
    // Pre-set dismissed state
    localStorage.setItem('hm_usp_dismissed', JSON.stringify(['care-first']));
    
    renderWithRouter(<USPBanner type="care-first" dismissable={true} />);
    
    expect(screen.queryByText('CARE-FIRST PLATFORM')).not.toBeInTheDocument();
  });

  it('should not render dismiss button when dismissable is false', () => {
    renderWithRouter(<USPBanner type="care-first" dismissable={false} />);
    
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });

  it('should return null for invalid type', () => {
    const { container } = renderWithRouter(<USPBanner type="invalid-type" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should have correct CTA link', () => {
    renderWithRouter(<USPBanner type="care-first" dismissable={false} />);
    
    const link = screen.getByText('View Safety Tools');
    expect(link).toHaveAttribute('href', expect.stringContaining('Safety'));
  });
});

describe('RotatingUSPBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render first banner initially', () => {
    renderWithRouter(
      <RotatingUSPBanner types={['care-first', 'privacy-grid']} interval={5000} />
    );
    
    expect(screen.getByText('CARE-FIRST PLATFORM')).toBeInTheDocument();
  });

  it('should rotate to next banner after interval', async () => {
    renderWithRouter(
      <RotatingUSPBanner types={['care-first', 'privacy-grid']} interval={3000} />
    );
    
    expect(screen.getByText('CARE-FIRST PLATFORM')).toBeInTheDocument();
    
    // Advance timers
    vi.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(screen.getByText('500M PRIVACY GRID')).toBeInTheDocument();
    });
  });

  it('should cycle back to first banner', async () => {
    renderWithRouter(
      <RotatingUSPBanner types={['care-first', 'privacy-grid']} interval={1000} />
    );
    
    // Advance through full cycle
    vi.advanceTimersByTime(1000); // To privacy-grid
    vi.advanceTimersByTime(1000); // Back to care-first
    
    await waitFor(() => {
      expect(screen.getByText('CARE-FIRST PLATFORM')).toBeInTheDocument();
    });
  });
});
