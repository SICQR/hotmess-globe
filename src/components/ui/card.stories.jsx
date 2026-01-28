import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

export default {
  title: 'UI/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component: 'A card component for containing related content and actions.',
      },
    },
  },
};

// Basic card
export const Default = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content area. This is where your main content goes.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Cancel</Button>
        <Button variant="hot" className="ml-2">Submit</Button>
      </CardFooter>
    </Card>
  ),
};

// Event card example
export const EventCard = {
  render: () => (
    <Card className="w-[350px] bg-black text-white border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#FF1493] font-black uppercase tracking-wider">Tonight</span>
          <span className="text-xs text-white/60">9:00 PM</span>
        </div>
        <CardTitle className="text-white">Underground Rave</CardTitle>
        <CardDescription className="text-white/60">Warehouse District, London</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-white/80">
          <span className="px-2 py-1 bg-white/10 rounded text-xs">Techno</span>
          <span className="px-2 py-1 bg-white/10 rounded text-xs">House</span>
          <span className="px-2 py-1 bg-white/10 rounded text-xs">18+</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-[#39FF14] font-bold">Free Entry</span>
        <Button variant="cyan" size="sm">RSVP</Button>
      </CardFooter>
    </Card>
  ),
};

// Profile card example
export const ProfileCard = {
  render: () => (
    <Card className="w-[300px] bg-black text-white border-white/10 overflow-hidden">
      <div className="aspect-square bg-gradient-to-br from-[#FF1493] to-[#B026FF]" />
      <CardHeader>
        <CardTitle className="text-white">Alex Thompson</CardTitle>
        <CardDescription className="text-white/60">DJ / Producer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-white">1.2k</div>
            <div className="text-xs text-white/40">Followers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">340</div>
            <div className="text-xs text-white/40">Following</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">28</div>
            <div className="text-xs text-white/40">Events</div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="hot" className="w-full">Follow</Button>
      </CardFooter>
    </Card>
  ),
};

// Product card example
export const ProductCard = {
  render: () => (
    <Card className="w-[280px] bg-black text-white border-white/10 overflow-hidden">
      <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        <span className="text-4xl">👕</span>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base">Limited Edition Hoodie</CardTitle>
        <CardDescription className="text-white/60 text-sm">HOTMESS x Artist Collab</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-[#39FF14]">£75.00</span>
          <span className="text-xs text-white/40 line-through">£95.00</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="cyan" className="w-full">Add to Cart</Button>
      </CardFooter>
    </Card>
  ),
};

// Stats card example
export const StatsCard = {
  render: () => (
    <Card className="w-[200px] bg-black text-white border-white/10">
      <CardHeader className="pb-2">
        <CardDescription className="text-white/40 text-xs uppercase tracking-wider">Total Revenue</CardDescription>
        <CardTitle className="text-2xl text-[#39FF14]">£12,450</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[#39FF14]">↑ 12%</span>
          <span className="text-white/40">vs last month</span>
        </div>
      </CardContent>
    </Card>
  ),
};

// Card grid example
export const CardGrid = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-black text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-[#FF1493]">24</div>
        </CardContent>
      </Card>
      <Card className="bg-black text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Followers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-[#00D9FF]">1.4k</div>
        </CardContent>
      </Card>
      <Card className="bg-black text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-[#39FF14]">£890</div>
        </CardContent>
      </Card>
      <Card className="bg-black text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-[#FFEB3B]">4.8</div>
        </CardContent>
      </Card>
    </div>
  ),
};
