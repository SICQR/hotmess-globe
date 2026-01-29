import OSCard, { OSCardImage, OSCardBadge } from './OSCard';
import { Button } from './button';
import { Lock, Star, Zap, MapPin } from 'lucide-react';

export default {
  title: 'UI/OSCard',
  component: OSCard,
  parameters: {
    docs: {
      description: {
        component: 'The signature HOTMESS OS-style card with grayscale images, hover effects, and optional locked states.',
      },
    },
    backgrounds: {
      default: 'dark',
    },
  },
  argTypes: {
    locked: {
      control: 'boolean',
      description: 'Whether the card is locked',
    },
    xpRequired: {
      control: 'number',
      description: 'XP required to unlock (shown when locked)',
    },
    grayscaleImage: {
      control: 'boolean',
      description: 'Whether to show image in grayscale',
    },
    hoverGlow: {
      control: 'boolean',
      description: 'Whether to show glow effect on hover',
    },
  },
};

// Default card
export const Default = {
  render: () => (
    <OSCard className="w-[300px]">
      <OSCardImage 
        src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400"
        alt="Event"
        className="aspect-video"
      />
      <div className="p-4">
        <h3 className="text-white font-black text-lg uppercase tracking-wider">Underground Rave</h3>
        <p className="text-white/60 text-sm mt-1">Warehouse District, London</p>
        <div className="flex items-center gap-2 mt-3">
          <OSCardBadge color="#FF1493">Tonight</OSCardBadge>
          <OSCardBadge color="#00D9FF">Techno</OSCardBadge>
        </div>
      </div>
    </OSCard>
  ),
};

// Locked card
export const Locked = {
  args: {
    locked: true,
    xpRequired: 500,
  },
  render: (args) => (
    <OSCard {...args} className="w-[300px]">
      <OSCardImage 
        src="https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400"
        alt="VIP Event"
        className="aspect-video"
        locked={args.locked}
      />
      <div className="p-4">
        <h3 className="text-white font-black text-lg uppercase tracking-wider">VIP After Party</h3>
        <p className="text-white/60 text-sm mt-1">Exclusive venue • Members only</p>
        <div className="flex items-center gap-2 mt-3">
          <Lock className="w-4 h-4 text-[#FFEB3B]" />
          <span className="text-[#FFEB3B] text-xs font-bold">Unlock at Level 5</span>
        </div>
      </div>
    </OSCard>
  ),
};

// Profile card variant
export const ProfileVariant = {
  render: () => (
    <OSCard className="w-[280px] group">
      <OSCardImage 
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
        alt="DJ Profile"
        className="aspect-square"
      />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-lg">DJ Vortex</h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#FFEB3B]" />
            <span className="text-white text-sm">4.8</span>
          </div>
        </div>
        <p className="text-white/60 text-sm mt-1">Techno / House</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[#39FF14] text-xs font-bold">LVL 12</span>
          <span className="text-white/40 text-xs">• 2.4k followers</span>
        </div>
        <Button variant="hot" className="w-full mt-4">
          Follow
        </Button>
      </div>
    </OSCard>
  ),
};

// Event card with price
export const EventWithPrice = {
  render: () => (
    <OSCard className="w-[320px]" onClick={() => console.log('Card clicked')}>
      <OSCardImage 
        src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"
        alt="Music Festival"
        className="aspect-[4/3]"
      />
      <div className="absolute top-3 left-3 flex gap-2">
        <OSCardBadge color="#FF1493">FEATURED</OSCardBadge>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white font-black text-lg uppercase tracking-wider">Neon Dreams Festival</h3>
            <div className="flex items-center gap-1 mt-1 text-white/60 text-sm">
              <MapPin className="w-3 h-3" />
              <span>Victoria Park</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[#39FF14] font-black text-lg">£45</span>
            <p className="text-white/40 text-xs line-through">£60</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <OSCardBadge color="#00D9FF">Saturday</OSCardBadge>
          <OSCardBadge color="#B026FF">18+</OSCardBadge>
          <span className="text-white/40 text-xs ml-auto">120 attending</span>
        </div>
        <Button variant="cyan" className="w-full mt-4">
          Get Tickets
        </Button>
      </div>
    </OSCard>
  ),
};

// Product card variant
export const ProductVariant = {
  render: () => (
    <OSCard className="w-[260px]">
      <OSCardImage 
        src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400"
        alt="Hoodie"
        className="aspect-square bg-gray-900"
        grayscale={false}
      />
      <div className="absolute top-3 right-3">
        <OSCardBadge color="#39FF14">NEW</OSCardBadge>
      </div>
      <div className="p-4">
        <h3 className="text-white font-black text-base uppercase tracking-wider">HOTMESS Hoodie</h3>
        <p className="text-white/60 text-sm mt-1">Limited Edition • Black</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[#39FF14] font-black text-xl">£75</span>
          <Button variant="hot" size="sm">Add to Cart</Button>
        </div>
      </div>
    </OSCard>
  ),
};

// Achievement card
export const AchievementCard = {
  render: () => (
    <OSCard className="w-[200px]" hoverGlow={true}>
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-white font-black text-sm uppercase tracking-wider">First Event</h3>
        <p className="text-white/40 text-xs mt-1">Attended your first event</p>
        <div className="mt-3">
          <span className="text-[#FFEB3B] font-black text-sm">+100 XP</span>
        </div>
      </div>
    </OSCard>
  ),
};

// Card grid
export const CardGrid = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <OSCard className="w-full">
        <OSCardImage 
          src="https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400"
          alt="Event 1"
          className="aspect-video"
        />
        <div className="p-3">
          <h3 className="text-white font-black text-sm uppercase">Club Night</h3>
          <p className="text-white/60 text-xs">Tonight • 10PM</p>
        </div>
      </OSCard>
      <OSCard className="w-full">
        <OSCardImage 
          src="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400"
          alt="Event 2"
          className="aspect-video"
        />
        <div className="p-3">
          <h3 className="text-white font-black text-sm uppercase">Rooftop Party</h3>
          <p className="text-white/60 text-xs">Tomorrow • 8PM</p>
        </div>
      </OSCard>
      <OSCard className="w-full">
        <OSCardImage 
          src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"
          alt="Event 3"
          className="aspect-video"
        />
        <div className="p-3">
          <h3 className="text-white font-black text-sm uppercase">Live Set</h3>
          <p className="text-white/60 text-xs">Friday • 11PM</p>
        </div>
      </OSCard>
    </div>
  ),
};

// No hover effects
export const StaticCard = {
  args: {
    hoverGlow: false,
    grayscaleImage: false,
  },
  render: (args) => (
    <OSCard {...args} className="w-[300px]">
      <OSCardImage 
        src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400"
        alt="Static event"
        className="aspect-video"
        grayscale={args.grayscaleImage}
      />
      <div className="p-4">
        <h3 className="text-white font-black text-lg uppercase tracking-wider">Static Card</h3>
        <p className="text-white/60 text-sm mt-1">No hover effects applied</p>
      </div>
    </OSCard>
  ),
};
