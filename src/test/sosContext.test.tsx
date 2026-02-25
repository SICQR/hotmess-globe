/**
 * sosContext.test.tsx
 *
 * Tests for SOSContext / SOSProvider / useSOSContext.
 * Verifies the state machine: triggerSOS() → sosActive=true, clearSOS() → false.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SOSProvider, useSOSContext } from '@/contexts/SOSContext';

// ---------------------------------------------------------------------------
// Test harness component — reads context and exposes buttons to trigger/clear
// ---------------------------------------------------------------------------
function SOSConsumer() {
  const { sosActive, triggerSOS, clearSOS } = useSOSContext();
  return (
    <div>
      <span data-testid="sos-status">{sosActive ? 'active' : 'inactive'}</span>
      <button onClick={triggerSOS} data-testid="trigger">Trigger SOS</button>
      <button onClick={clearSOS} data-testid="clear">Clear SOS</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SOSContext', () => {
  it('starts with sosActive = false', () => {
    render(
      <SOSProvider>
        <SOSConsumer />
      </SOSProvider>,
    );
    expect(screen.getByTestId('sos-status').textContent).toBe('inactive');
  });

  it('triggerSOS() sets sosActive to true', async () => {
    const user = userEvent.setup();
    render(
      <SOSProvider>
        <SOSConsumer />
      </SOSProvider>,
    );

    await user.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('sos-status').textContent).toBe('active');
  });

  it('clearSOS() resets sosActive to false', async () => {
    const user = userEvent.setup();
    render(
      <SOSProvider>
        <SOSConsumer />
      </SOSProvider>,
    );

    await user.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('sos-status').textContent).toBe('active');

    await user.click(screen.getByTestId('clear'));
    expect(screen.getByTestId('sos-status').textContent).toBe('inactive');
  });

  it('multiple trigger calls do not break state', async () => {
    const user = userEvent.setup();
    render(
      <SOSProvider>
        <SOSConsumer />
      </SOSProvider>,
    );

    await user.click(screen.getByTestId('trigger'));
    await user.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('sos-status').textContent).toBe('active');
  });

  it('children receive context values', () => {
    let capturedContext: ReturnType<typeof useSOSContext> | null = null;

    function Capture() {
      capturedContext = useSOSContext();
      return null;
    }

    render(
      <SOSProvider>
        <Capture />
      </SOSProvider>,
    );

    expect(capturedContext).not.toBeNull();
    expect(typeof capturedContext!.triggerSOS).toBe('function');
    expect(typeof capturedContext!.clearSOS).toBe('function');
    expect(capturedContext!.sosActive).toBe(false);
  });

  it('useSOSContext outside provider returns default falsy values (no crash)', () => {
    // The context has a default value with sosActive=false and noop functions.
    function Orphan() {
      const ctx = useSOSContext();
      return <span data-testid="orphan">{String(ctx.sosActive)}</span>;
    }
    render(<Orphan />);
    expect(screen.getByTestId('orphan').textContent).toBe('false');
  });
});
