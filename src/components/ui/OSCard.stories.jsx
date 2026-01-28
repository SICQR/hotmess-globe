import OSCard, { OSCardImage, OSCardBadge } from './OSCard';
import { Button } from './button';

export default {
  title: 'UI/OSCard',
  component: OSCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    locked: {
      control: 'boolean',
    },
    grayscaleImage: {
      control: 'boolean',
    },
    hoverGlow: {
      control: 'boolean',
    },
    xpRequired: {
      control: 'number',
    },
  },
};

// Default OSCard
export const Default = () => (
  <OSCard className="w-[300px] p-4">
    <h3 className="text-white font-black text-lg uppercase">OS Card Title</h3>
    <p className="text-white/70 text-sm mt-2">
      This is the default OS card with the HOTMESS design system.
    </p>
  </OSCard>
);

// With image
export const WithImage = () => (
  <OSCard
    className="w-[300px]"
    imageSrc="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
    imageAlt="Club interior"
  >
    <div className="p-4">
      <h3 className="text-white font-black text-lg uppercase">Event Name</h3>
      <p className="text-white/70 text-sm mt-1">Saturday @ Fabric</p>
    </div>
  </OSCard>
);

// Locked card
export const Locked = () => (
  <OSCard
    className="w-[300px]"
    imageSrc="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
    imageAlt="Locked content"
    locked={true}
    xpRequired={500}
  >
    <div className="p-4">
      <h3 className="text-white font-black text-lg uppercase">VIP Access</h3>
      <p className="text-white/70 text-sm mt-1">Exclusive content</p>
    </div>
  </OSCard>
);

// Without grayscale
export const NoGrayscale = () => (
  <OSCard
    className="w-[300px]"
    imageSrc="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
    imageAlt="Club interior"
    grayscaleImage={false}
  >
    <div className="p-4">
      <h3 className="text-white font-black text-lg uppercase">Full Color</h3>
      <p className="text-white/70 text-sm mt-1">No grayscale effect</p>
    </div>
  </OSCard>
);

// Without hover glow
export const NoHoverGlow = () => (
  <OSCard className="w-[300px] p-4" hoverGlow={false}>
    <h3 className="text-white font-black text-lg uppercase">No Glow</h3>
    <p className="text-white/70 text-sm mt-2">
      This card doesn&apos;t have the pink glow effect on hover.
    </p>
  </OSCard>
);

// Clickable card
export const Clickable = () => (
  <OSCard
    className="w-[300px]"
    imageSrc="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
    imageAlt="Clickable event"
    onClick={() => alert('Card clicked!')}
  >
    <div className="p-4">
      <h3 className="text-white font-black text-lg uppercase">Click Me</h3>
      <p className="text-white/70 text-sm mt-1">Interactive card</p>
    </div>
  </OSCard>
);

// With badge
export const WithBadge = () => (
  <OSCard className="w-[300px]">
    <div className="relative">
      <OSCardImage
        src="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
        alt="Event"
        className="aspect-video"
      />
      <div className="absolute top-2 left-2">
        <OSCardBadge color="#FF1493">Live Now</OSCardBadge>
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-white font-black text-lg uppercase">Hot Event</h3>
      <p className="text-white/70 text-sm mt-1">Currently streaming</p>
    </div>
  </OSCard>
);

// Badge colors
export const BadgeColors = () => (
  <div className="flex flex-wrap gap-2">
    <OSCardBadge color="#FF1493">Hot Pink</OSCardBadge>
    <OSCardBadge color="#00D9FF">Cyan</OSCardBadge>
    <OSCardBadge color="#FFEB3B">Yellow</OSCardBadge>
    <OSCardBadge color="#4CAF50">Green</OSCardBadge>
    <OSCardBadge color="#9C27B0">Purple</OSCardBadge>
  </div>
);

// Event card complete
export const EventCard = () => (
  <OSCard className="w-[320px]">
    <div className="relative">
      <OSCardImage
        src="https://images.unsplash.com/photo-1571266028243-d220c6d3ca5e?w=400"
        alt="Event"
        className="aspect-video"
      />
      <div className="absolute top-2 left-2 flex gap-1">
        <OSCardBadge color="#FF1493">Sold Out</OSCardBadge>
      </div>
      <div className="absolute top-2 right-2">
        <OSCardBadge color="#00D9FF">18+</OSCardBadge>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-black text-lg uppercase">Underground Techno</h3>
          <p className="text-white/50 text-xs mt-1">SAT 28 JAN • 11PM - 6AM</p>
        </div>
      </div>
      <p className="text-white/70 text-sm mt-2">Fabric London</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[#FFEB3B] font-bold">£25</span>
        <Button variant="hot" size="sm">Get Tickets</Button>
      </div>
    </div>
  </OSCard>
);

// Profile card
export const ProfileCard = () => (
  <OSCard className="w-[280px]">
    <div className="relative">
      <OSCardImage
        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
        alt="Profile"
        className="aspect-square"
      />
      <div className="absolute bottom-2 left-2">
        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-white font-black text-lg uppercase">Sarah M.</h3>
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-white/50 text-xs mt-1">London • 2.3 km away</p>
      <div className="flex flex-wrap gap-1 mt-3">
        <OSCardBadge color="#FF1493" className="text-[8px]">Techno</OSCardBadge>
        <OSCardBadge color="#00D9FF" className="text-[8px]">House</OSCardBadge>
      </div>
    </div>
  </OSCard>
);

// Card grid
export const CardGrid = () => (
  <div className="grid grid-cols-2 gap-4 max-w-2xl">
    <OSCard className="p-4">
      <h4 className="text-[#FF1493] font-black text-xs uppercase tracking-wider">Events</h4>
      <p className="text-white font-black text-3xl mt-1">12</p>
      <p className="text-white/50 text-xs mt-1">This month</p>
    </OSCard>
    <OSCard className="p-4">
      <h4 className="text-[#00D9FF] font-black text-xs uppercase tracking-wider">Connections</h4>
      <p className="text-white font-black text-3xl mt-1">89</p>
      <p className="text-white/50 text-xs mt-1">New this week</p>
    </OSCard>
    <OSCard className="p-4">
      <h4 className="text-[#FFEB3B] font-black text-xs uppercase tracking-wider">XP Points</h4>
      <p className="text-white font-black text-3xl mt-1">2,450</p>
      <p className="text-white/50 text-xs mt-1">Level 5</p>
    </OSCard>
    <OSCard className="p-4">
      <h4 className="text-[#4CAF50] font-black text-xs uppercase tracking-wider">Reputation</h4>
      <p className="text-white font-black text-3xl mt-1">98%</p>
      <p className="text-white/50 text-xs mt-1">Trust score</p>
    </OSCard>
  </div>
);
