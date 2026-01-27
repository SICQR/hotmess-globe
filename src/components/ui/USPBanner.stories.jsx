import { MemoryRouter } from 'react-router-dom';
import USPBanner, { RotatingUSPBanner } from './USPBanner';

export default {
  title: 'UI/USPBanner',
  component: USPBanner,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['care-first', 'privacy-grid', 'right-now', 'community', 'escrow'],
    },
    dismissable: {
      control: 'boolean',
    },
    compact: {
      control: 'boolean',
    },
  },
};

export const CareFirst = {
  args: {
    type: 'care-first',
    dismissable: false,
  },
};

export const PrivacyGrid = {
  args: {
    type: 'privacy-grid',
    dismissable: false,
  },
};

export const RightNow = {
  args: {
    type: 'right-now',
    dismissable: false,
  },
};

export const Community = {
  args: {
    type: 'community',
    dismissable: false,
  },
};

export const Escrow = {
  args: {
    type: 'escrow',
    dismissable: false,
  },
};

export const Compact = {
  args: {
    type: 'care-first',
    compact: true,
    dismissable: false,
  },
};

export const Dismissable = {
  args: {
    type: 'privacy-grid',
    dismissable: true,
  },
};

// All types showcase
export const AllTypes = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 max-w-[600px]">
      <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Full Size Banners</p>
      <USPBanner type="care-first" dismissable={false} />
      <USPBanner type="privacy-grid" dismissable={false} />
      <USPBanner type="right-now" dismissable={false} />
      <USPBanner type="community" dismissable={false} />
      <USPBanner type="escrow" dismissable={false} />
    </div>
  ),
};

export const AllCompact = {
  render: () => (
    <div className="flex flex-col gap-3 p-4 max-w-[500px]">
      <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Compact Banners</p>
      <USPBanner type="care-first" compact dismissable={false} />
      <USPBanner type="privacy-grid" compact dismissable={false} />
      <USPBanner type="right-now" compact dismissable={false} />
      <USPBanner type="community" compact dismissable={false} />
      <USPBanner type="escrow" compact dismissable={false} />
    </div>
  ),
};

export const Rotating = {
  render: () => (
    <div className="p-4 max-w-[500px]">
      <p className="text-white/60 text-xs uppercase tracking-wider mb-4">
        Rotating Banner (changes every 3 seconds)
      </p>
      <RotatingUSPBanner 
        types={['care-first', 'privacy-grid', 'right-now', 'community', 'escrow']} 
        interval={3000} 
      />
    </div>
  ),
};
