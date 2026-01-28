import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
import { Button } from './button';

export default {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
};

// Default card
export const Default = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>Card description goes here</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Card content goes here. This is where the main content of the card would be displayed.</p>
    </CardContent>
    <CardFooter>
      <Button>Action</Button>
    </CardFooter>
  </Card>
);

// Simple card
export const Simple = () => (
  <Card className="w-[350px] p-6">
    <p>A simple card with just content and padding.</p>
  </Card>
);

// Card with image
export const WithImage = () => (
  <Card className="w-[350px] overflow-hidden">
    <div className="aspect-video bg-gradient-to-br from-pink-500 to-purple-600" />
    <CardHeader>
      <CardTitle>Event Title</CardTitle>
      <CardDescription>Saturday, Jan 28 at 10:00 PM</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Join us for an unforgettable night of music and dancing.</p>
    </CardContent>
    <CardFooter className="flex justify-between">
      <span className="text-sm text-muted-foreground">From £15</span>
      <Button variant="hot">Get Tickets</Button>
    </CardFooter>
  </Card>
);

// Product card
export const ProductCard = () => (
  <Card className="w-[280px] overflow-hidden">
    <div className="aspect-square bg-gradient-to-br from-cyan-500 to-blue-600" />
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">HOTMESS Hoodie</CardTitle>
      <CardDescription>Limited Edition</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="text-xl font-bold">£89.00</p>
    </CardContent>
    <CardFooter>
      <Button className="w-full" variant="hot">Add to Cart</Button>
    </CardFooter>
  </Card>
);

// Stats card
export const StatsCard = () => (
  <Card className="w-[200px]">
    <CardHeader className="pb-2">
      <CardDescription>Total Revenue</CardDescription>
      <CardTitle className="text-3xl">£45,231</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-xs text-green-500">+20.1% from last month</p>
    </CardContent>
  </Card>
);

// Card grid
export const CardGrid = () => (
  <div className="grid grid-cols-2 gap-4 max-w-2xl">
    <Card className="p-4">
      <CardTitle className="text-lg mb-2">Events</CardTitle>
      <p className="text-3xl font-bold">12</p>
      <p className="text-sm text-muted-foreground">This month</p>
    </Card>
    <Card className="p-4">
      <CardTitle className="text-lg mb-2">Followers</CardTitle>
      <p className="text-3xl font-bold">1,234</p>
      <p className="text-sm text-muted-foreground">+56 this week</p>
    </Card>
    <Card className="p-4">
      <CardTitle className="text-lg mb-2">Messages</CardTitle>
      <p className="text-3xl font-bold">89</p>
      <p className="text-sm text-muted-foreground">5 unread</p>
    </Card>
    <Card className="p-4">
      <CardTitle className="text-lg mb-2">Sales</CardTitle>
      <p className="text-3xl font-bold">£2,450</p>
      <p className="text-sm text-muted-foreground">This week</p>
    </Card>
  </div>
);
