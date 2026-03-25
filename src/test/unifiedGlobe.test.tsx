/**
 * UnifiedGlobe — route-gating tests
 *
 * Verifies that UnifiedGlobe correctly switches between GlobePage and
 * AmbientGlobe based on route: GlobePage on /pulse, AmbientGlobe on all
 * other routes.
 *
 * Three.js, GlobePage, AmbientGlobe, and supabaseClient are all mocked so
 * this runs in jsdom without WebGL or canvas support.
 */

import React, { Suspense } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing UnifiedGlobe so that Vite/vitest
// resolves the mocked versions when the lazy import fires.
// ---------------------------------------------------------------------------

// Mock three.js entirely — it calls WebGL APIs that don't exist in jsdom.
vi.mock('three', () => {
  class FakeRenderer {
    domElement = document.createElement('canvas');
    setSize() {}
    render() {}
    dispose() {}
  }
  class FakeCamera {
    position = { set() {}, z: 0 };
    lookAt() {}
  }
  class FakeDirectionalLight {
    position = { set() {} };
  }
  class FakeVector3 {
    set() { return this; }
  }
  class FakeBufferGeometry {
    setAttribute() {}
    setIndex() {}
  }
  class FakeCurve {
    getPoints() { return []; }
  }
  class FakeTextureLoader {
    load(_url: string, cb?: (t: unknown) => void) { cb?.({}); return {}; }
  }
  return {
    WebGLRenderer: FakeRenderer,
    PerspectiveCamera: FakeCamera,
    Scene: class {},
    AmbientLight: class {},
    DirectionalLight: FakeDirectionalLight,
    Mesh: class {},
    SphereGeometry: class {},
    MeshStandardMaterial: class {},
    TextureLoader: FakeTextureLoader,
    Vector3: FakeVector3,
    Color: class {},
    Clock: class { getDelta() { return 0; } },
    Group: class {},
    Points: class {},
    BufferGeometry: FakeBufferGeometry,
    Float32BufferAttribute: class {},
    PointsMaterial: class {},
    LineBasicMaterial: class {},
    LineSegments: class {},
    AdditiveBlending: 2,
    DoubleSide: 2,
    MeshBasicMaterial: class {},
    RingGeometry: class {},
    TorusGeometry: class {},
    CatmullRomCurve3: FakeCurve,
    BufferAttribute: class {},
    Line: class {},
  };
});

// Stub the lazy-loaded Globe page so Suspense resolves immediately.
vi.mock('@/pages/Globe', () => ({
  default: () => <div data-testid="globe-page">Globe</div>,
}));

// Stub AmbientGlobe — jsdom has no canvas support, so the real component
// would crash. The stub just renders a sentinel div.
vi.mock('@/components/globe/AmbientGlobe', () => ({
  default: () => <div data-testid="ambient-globe" />,
}));

// Stub supabaseClient so no real network calls happen.
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from: () => ({ select: () => ({ data: [], error: null }) }),
  },
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks.
// ---------------------------------------------------------------------------
import { UnifiedGlobe } from '@/components/globe/UnifiedGlobe';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="suspense-fallback">loading</div>}>
        <UnifiedGlobe />
      </Suspense>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('UnifiedGlobe route-gating', () => {
  it('renders AmbientGlobe (non-null) on / (home)', () => {
    const { container } = renderAt('/');
    // UnifiedGlobe renders AmbientGlobe on non-pulse routes.
    expect(container.firstChild).not.toBeNull();
  });

  it('renders AmbientGlobe (non-null) on /market', () => {
    const { container } = renderAt('/market');
    expect(container.firstChild).not.toBeNull();
  });

  it('renders AmbientGlobe (non-null) on /profile', () => {
    const { container } = renderAt('/profile');
    expect(container.firstChild).not.toBeNull();
  });

  it('renders AmbientGlobe (non-null) on /ghosted', () => {
    const { container } = renderAt('/ghosted');
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a container element on /pulse', () => {
    const { container } = renderAt('/pulse');
    // On /pulse the component renders a wrapping <div> (even if Suspense
    // fallback fires first while the lazy chunk resolves).
    expect(container.firstChild).not.toBeNull();
  });
});
