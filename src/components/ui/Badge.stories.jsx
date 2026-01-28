import { Badge } from './badge';

export default {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

// Default badge
export const Default = {
  args: {
    children: 'Badge',
  },
};

// All variants
export const AllVariants = () => (
  <div className="flex flex-wrap gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
);

// Status badges
export const StatusBadges = () => (
  <div className="flex flex-wrap gap-2">
    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Online</Badge>
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Away</Badge>
    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Busy</Badge>
    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Offline</Badge>
  </div>
);

// Event status
export const EventStatus = () => (
  <div className="flex flex-wrap gap-2">
    <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">Live Now</Badge>
    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Upcoming</Badge>
    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Sold Out</Badge>
    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Free Entry</Badge>
  </div>
);

// Category badges
export const CategoryBadges = () => (
  <div className="flex flex-wrap gap-2">
    <Badge variant="outline">House</Badge>
    <Badge variant="outline">Techno</Badge>
    <Badge variant="outline">Drum & Bass</Badge>
    <Badge variant="outline">UK Garage</Badge>
    <Badge variant="outline">Afrobeats</Badge>
  </div>
);

// With count
export const WithCount = () => (
  <div className="flex flex-wrap gap-4">
    <div className="flex items-center gap-2">
      <span>Messages</span>
      <Badge variant="destructive">5</Badge>
    </div>
    <div className="flex items-center gap-2">
      <span>Notifications</span>
      <Badge className="bg-pink-500 text-white">12</Badge>
    </div>
    <div className="flex items-center gap-2">
      <span>Cart</span>
      <Badge variant="secondary">3</Badge>
    </div>
  </div>
);

// Trust & verification badges
export const TrustBadges = () => (
  <div className="flex flex-wrap gap-2">
    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </Badge>
    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Top Rated
    </Badge>
    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
      </svg>
      Premium
    </Badge>
  </div>
);

// In context (product card)
export const InContext = () => (
  <div className="bg-card rounded-lg p-4 w-[300px] border">
    <div className="flex items-start justify-between mb-3">
      <h3 className="font-semibold">Underground Techno Night</h3>
      <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50 text-xs">Live</Badge>
    </div>
    <p className="text-sm text-muted-foreground mb-3">Fabric London • Tonight 11PM</p>
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline" className="text-xs">Techno</Badge>
      <Badge variant="outline" className="text-xs">House</Badge>
      <Badge variant="outline" className="text-xs">18+</Badge>
    </div>
  </div>
);
