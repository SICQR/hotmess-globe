/**
 * HOTMESS Globe Zoom Choreography
 * 
 * Gesture -> Result mapping (deterministic)
 * 
 * | Gesture              | Result                           |
 * |---------------------|----------------------------------|
 * | Open app            | World glow + subtle sparkles     |
 * | Pinch in            | City emerges with warmth         |
 * | Dwell (700ms)       | Zones texture in                 |
 * | Pinch further       | Street silhouettes               |
 * | Tap pulse           | Context card                     |
 * | Long-press          | Mode switch                      |
 * 
 * No labels unless intent is clear.
 * No jump cuts. Everything eases.
 */

// Zoom state machine
export const ZOOM_STATES = {
  WORLD: 'world',
  CITY_APPROACHING: 'city_approaching', // Transition state
  CITY: 'city',
  DISTRICT_APPROACHING: 'district_approaching',
  DISTRICT: 'district',
  STREET_APPROACHING: 'street_approaching',
  STREET: 'street',
  INTIMATE: 'intimate', // Max zoom
};

// Transition thresholds
export const ZOOM_THRESHOLDS = {
  WORLD_TO_CITY: 3,
  CITY_TO_DISTRICT: 8,
  DISTRICT_TO_STREET: 12,
  STREET_TO_INTIMATE: 16,
};

// Dwell detection
export const DWELL_CONFIG = {
  threshold: 700, // ms before dwell triggers
  tolerance: 50,  // pixels of movement allowed during dwell
};

// Gesture types
export const GESTURES = {
  PINCH_IN: 'pinch_in',
  PINCH_OUT: 'pinch_out',
  TAP: 'tap',
  LONG_PRESS: 'long_press',
  DWELL: 'dwell',
  PAN: 'pan',
};

// Visual states for each zoom level
export const VISUAL_STATES = {
  [ZOOM_STATES.WORLD]: {
    glow: true,
    sparkles: true,
    cities: 'dots',
    zones: false,
    labels: false,
    heat: 'country',
    transition: { duration: 800, easing: 'ease-out' },
  },
  [ZOOM_STATES.CITY_APPROACHING]: {
    glow: true,
    sparkles: 'fading',
    cities: 'emerging',
    zones: false,
    labels: false,
    heat: 'blending',
    transition: { duration: 400, easing: 'ease-in-out' },
  },
  [ZOOM_STATES.CITY]: {
    glow: false,
    sparkles: false,
    cities: 'full',
    zones: 'dots',
    labels: 'city_only',
    heat: 'city',
    transition: { duration: 600, easing: 'ease-out' },
  },
  [ZOOM_STATES.DISTRICT_APPROACHING]: {
    glow: false,
    sparkles: false,
    cities: 'fading',
    zones: 'emerging',
    labels: 'city_only',
    heat: 'blending',
    transition: { duration: 400, easing: 'ease-in-out' },
  },
  [ZOOM_STATES.DISTRICT]: {
    glow: false,
    sparkles: false,
    cities: false,
    zones: 'full',
    labels: 'zone_names',
    heat: 'zone',
    transition: { duration: 600, easing: 'ease-out' },
  },
  [ZOOM_STATES.STREET_APPROACHING]: {
    glow: false,
    sparkles: false,
    cities: false,
    zones: 'textured',
    labels: 'zone_names',
    heat: 'detailed',
    transition: { duration: 400, easing: 'ease-in-out' },
  },
  [ZOOM_STATES.STREET]: {
    glow: false,
    sparkles: 'discovery', // Safe discovery sparkles
    cities: false,
    zones: 'silhouettes',
    labels: 'on_intent', // Only show labels when user shows intent
    heat: 'street',
    transition: { duration: 500, easing: 'ease-out' },
  },
  [ZOOM_STATES.INTIMATE]: {
    glow: false,
    sparkles: 'prominent',
    cities: false,
    zones: 'silhouettes',
    labels: 'on_tap',
    heat: 'sparkle_only', // No detailed heat at max zoom - safety
    transition: { duration: 400, easing: 'ease-out' },
  },
};

/**
 * Choreography controller class
 */
export class ZoomChoreographer {
  constructor(options = {}) {
    this.currentState = ZOOM_STATES.WORLD;
    this.currentZoom = 0;
    this.dwellTimer = null;
    this.dwellStart = null;
    this.lastPosition = null;
    this.listeners = new Set();
    this.transitioning = false;
    this.onStateChange = options.onStateChange || (() => {});
    this.onGesture = options.onGesture || (() => {});
  }

  /**
   * Update zoom level - handles state transitions
   */
  setZoom(zoom, animate = true) {
    const prevZoom = this.currentZoom;
    const prevState = this.currentState;
    this.currentZoom = zoom;

    const newState = this.calculateState(zoom, prevZoom);
    
    if (newState !== prevState) {
      this.transitionTo(newState, animate);
    }
  }

  /**
   * Calculate state from zoom level
   */
  calculateState(zoom, prevZoom) {
    const isZoomingIn = zoom > prevZoom;
    
    // Check approach states
    if (isZoomingIn) {
      if (zoom >= ZOOM_THRESHOLDS.WORLD_TO_CITY - 0.5 && zoom < ZOOM_THRESHOLDS.WORLD_TO_CITY) {
        return ZOOM_STATES.CITY_APPROACHING;
      }
      if (zoom >= ZOOM_THRESHOLDS.CITY_TO_DISTRICT - 0.5 && zoom < ZOOM_THRESHOLDS.CITY_TO_DISTRICT) {
        return ZOOM_STATES.DISTRICT_APPROACHING;
      }
      if (zoom >= ZOOM_THRESHOLDS.DISTRICT_TO_STREET - 0.5 && zoom < ZOOM_THRESHOLDS.DISTRICT_TO_STREET) {
        return ZOOM_STATES.STREET_APPROACHING;
      }
    }

    // Main states
    if (zoom < ZOOM_THRESHOLDS.WORLD_TO_CITY) return ZOOM_STATES.WORLD;
    if (zoom < ZOOM_THRESHOLDS.CITY_TO_DISTRICT) return ZOOM_STATES.CITY;
    if (zoom < ZOOM_THRESHOLDS.DISTRICT_TO_STREET) return ZOOM_STATES.DISTRICT;
    if (zoom < ZOOM_THRESHOLDS.STREET_TO_INTIMATE) return ZOOM_STATES.STREET;
    return ZOOM_STATES.INTIMATE;
  }

  /**
   * Handle state transition with animation
   */
  transitionTo(newState, animate = true) {
    if (this.transitioning) return;
    
    const prevState = this.currentState;
    const visualState = VISUAL_STATES[newState];
    
    this.transitioning = true;
    this.currentState = newState;

    // Emit state change
    this.onStateChange({
      from: prevState,
      to: newState,
      visual: visualState,
      animate,
      duration: animate ? visualState.transition.duration : 0,
      easing: visualState.transition.easing,
    });

    if (animate) {
      setTimeout(() => {
        this.transitioning = false;
      }, visualState.transition.duration);
    } else {
      this.transitioning = false;
    }
  }

  /**
   * Handle tap gesture
   */
  handleTap(position, target) {
    this.onGesture({
      type: GESTURES.TAP,
      position,
      target,
      action: target?.type === 'pulse' ? 'show_context_card' : 'select',
    });
  }

  /**
   * Handle long press gesture - mode switch
   */
  handleLongPress(position) {
    this.onGesture({
      type: GESTURES.LONG_PRESS,
      position,
      action: 'mode_switch',
      modes: ['explore', 'now', 'radio'],
    });
  }

  /**
   * Start dwell detection
   */
  startDwell(position) {
    this.cancelDwell();
    this.dwellStart = Date.now();
    this.lastPosition = position;
    
    this.dwellTimer = setTimeout(() => {
      this.onGesture({
        type: GESTURES.DWELL,
        position: this.lastPosition,
        action: 'texture_zones',
        duration: DWELL_CONFIG.threshold,
      });
    }, DWELL_CONFIG.threshold);
  }

  /**
   * Update dwell position - cancel if moved too far
   */
  updateDwell(position) {
    if (!this.lastPosition) return;
    
    const dx = position.x - this.lastPosition.x;
    const dy = position.y - this.lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > DWELL_CONFIG.tolerance) {
      this.cancelDwell();
    }
  }

  /**
   * Cancel dwell detection
   */
  cancelDwell() {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
    this.dwellStart = null;
    this.lastPosition = null;
  }

  /**
   * Get current visual configuration
   */
  getVisualConfig() {
    return VISUAL_STATES[this.currentState];
  }

  /**
   * Check if labels should show
   */
  shouldShowLabels(intentType) {
    const config = this.getVisualConfig();
    
    switch (config.labels) {
      case 'city_only':
        return intentType === 'city';
      case 'zone_names':
        return ['city', 'zone'].includes(intentType);
      case 'on_intent':
        return intentType !== null;
      case 'on_tap':
        return intentType === 'tap';
      default:
        return false;
    }
  }

  /**
   * Destroy choreographer
   */
  destroy() {
    this.cancelDwell();
    this.listeners.clear();
  }
}

/**
 * Create choreographer instance with React integration
 */
export function createChoreographer(options) {
  return new ZoomChoreographer(options);
}

/**
 * Ease functions
 */
export const EASINGS = {
  'ease-out': t => 1 - Math.pow(1 - t, 3),
  'ease-in': t => t * t * t,
  'ease-in-out': t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'linear': t => t,
};

/**
 * Interpolate between visual states
 */
export function interpolateStates(from, to, progress, easing = 'ease-out') {
  const t = EASINGS[easing](progress);
  
  return {
    glow: progress < 0.5 ? from.glow : to.glow,
    sparkles: progress < 0.3 ? from.sparkles : to.sparkles,
    cities: progress < 0.5 ? from.cities : to.cities,
    zones: progress < 0.7 ? from.zones : to.zones,
    labels: to.labels, // Labels snap
    heat: progress < 0.5 ? from.heat : to.heat,
    progress: t,
  };
}
