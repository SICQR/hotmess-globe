import { Badge, badgeVariants } from './badge';
import { Check, X, Clock, Star, Zap, Shield, Music, Calendar } from 'lucide-react';

export default {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: 'A badge component for displaying status indicators, labels, and tags.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: 'The visual style variant of the badge',
    },
  },
};

// Default badge
export const Default = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

// Secondary badge
export const Secondary = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

// Destructive badge
export const Destructive = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

// Outline badge
export const Outline = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

// All variants
export const AllVariants = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

// Status badges
export const StatusBadges = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80">
        <Check className="w-3 h-3 mr-1" />
        Active
      </Badge>
      <Badge className="bg-[#FF1493] text-black hover:bg-[#FF1493]/80">
        <Zap className="w-3 h-3 mr-1" />
        Hot
      </Badge>
      <Badge className="bg-yellow-500 text-black hover:bg-yellow-500/80">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
      <Badge variant="destructive">
        <X className="w-3 h-3 mr-1" />
        Cancelled
      </Badge>
    </div>
  ),
};

// Profile badges
export const ProfileBadges = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/40">
        <Star className="w-3 h-3 mr-1" />
        Verified
      </Badge>
      <Badge className="bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40">
        <Music className="w-3 h-3 mr-1" />
        DJ
      </Badge>
      <Badge className="bg-[#B026FF]/20 text-[#B026FF] border border-[#B026FF]/40">
        <Calendar className="w-3 h-3 mr-1" />
        Organizer
      </Badge>
      <Badge className="bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    </div>
  ),
};

// Event category badges
export const EventCategories = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-black text-white border border-white/20">Techno</Badge>
      <Badge className="bg-black text-white border border-white/20">House</Badge>
      <Badge className="bg-black text-white border border-white/20">Drum & Bass</Badge>
      <Badge className="bg-black text-white border border-white/20">Garage</Badge>
      <Badge className="bg-black text-white border border-white/20">Jungle</Badge>
      <Badge className="bg-black text-white border border-white/20">Dubstep</Badge>
    </div>
  ),
};

// Price badges
export const PriceBadges = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-[#39FF14] text-black font-black">FREE</Badge>
      <Badge className="bg-white text-black font-bold">£10</Badge>
      <Badge className="bg-[#FF1493] text-black font-bold">£25 VIP</Badge>
      <Badge className="bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white font-bold">SOLD OUT</Badge>
    </div>
  ),
};

// Notification badges
export const NotificationBadges = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Music className="w-5 h-5 text-white" />
        </div>
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-[#FF1493] text-xs text-black font-bold">
          3
        </Badge>
      </div>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-[#00D9FF] text-xs text-black font-bold">
          12
        </Badge>
      </div>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-[#39FF14] text-xs text-black font-bold">
          1
        </Badge>
      </div>
    </div>
  ),
};

// With custom colors (HOTMESS brand)
export const BrandColors = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Badge className="bg-[#FF1493] text-black">Hot Pink</Badge>
        <Badge className="bg-[#00D9FF] text-black">Cyan</Badge>
        <Badge className="bg-[#39FF14] text-black">Neon Green</Badge>
        <Badge className="bg-[#B026FF] text-white">Purple</Badge>
        <Badge className="bg-[#FFEB3B] text-black">Yellow</Badge>
      </div>
      <div className="flex flex-wrap gap-4">
        <Badge className="bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/40">Hot Pink Light</Badge>
        <Badge className="bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40">Cyan Light</Badge>
        <Badge className="bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40">Neon Green Light</Badge>
        <Badge className="bg-[#B026FF]/20 text-[#B026FF] border border-[#B026FF]/40">Purple Light</Badge>
      </div>
    </div>
  ),
};

// Interactive badges
export const InteractiveBadges = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-white/5 text-white border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40 transition-colors">
        Techno
      </Badge>
      <Badge className="bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493] cursor-pointer">
        House ✓
      </Badge>
      <Badge className="bg-white/5 text-white border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40 transition-colors">
        Drum & Bass
      </Badge>
      <Badge className="bg-white/5 text-white border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40 transition-colors">
        Garage
      </Badge>
    </div>
  ),
};
