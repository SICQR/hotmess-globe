import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

export default {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'hot', 'live', 'glass', 'elevated'],
    },
  },
};

export const Default = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">Card content with some text explaining the feature or information.</p>
      </CardContent>
      <CardFooter>
        <Button variant="luxPrimary" size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: 'default',
  },
};

export const Hot = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Hot Card</CardTitle>
        <CardDescription>With LED glow effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">This card has the hot pink LED glow border for emphasis.</p>
      </CardContent>
      <CardFooter>
        <Button variant="ledSolidHot" size="sm">Go Live</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: 'hot',
  },
};

export const Live = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Live Card</CardTitle>
        <CardDescription>Active status indicator</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">This card indicates live/active status with green LED glow.</p>
      </CardContent>
      <CardFooter>
        <Button variant="ledLive" size="sm">View Live</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: 'live',
  },
};

export const Glass = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Glass Card</CardTitle>
        <CardDescription>Frosted glass effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">Transparent card with backdrop blur for layered UI.</p>
      </CardContent>
      <CardFooter>
        <Button variant="glass" size="sm">Learn More</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: 'glass',
  },
};

export const Elevated = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Elevated Card</CardTitle>
        <CardDescription>White border for prominence</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/70">High contrast card for important information.</p>
      </CardContent>
      <CardFooter>
        <Button variant="ledSolidWhite" size="sm">Get Started</Button>
      </CardFooter>
    </Card>
  ),
  args: {
    variant: 'elevated',
  },
};

// All variants
export const AllVariants = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 p-6 max-w-[800px]">
      <Card variant="default" className="p-4">
        <CardTitle className="text-sm mb-2">Default</CardTitle>
        <p className="text-xs text-white/60">Standard card with subtle border</p>
      </Card>
      <Card variant="hot" className="p-4">
        <CardTitle className="text-sm mb-2">Hot</CardTitle>
        <p className="text-xs text-white/60">Pink LED glow border</p>
      </Card>
      <Card variant="live" className="p-4">
        <CardTitle className="text-sm mb-2">Live</CardTitle>
        <p className="text-xs text-white/60">Green LED glow border</p>
      </Card>
      <Card variant="glass" className="p-4">
        <CardTitle className="text-sm mb-2">Glass</CardTitle>
        <p className="text-xs text-white/60">Frosted glass backdrop</p>
      </Card>
      <Card variant="elevated" className="p-4 col-span-2">
        <CardTitle className="text-sm mb-2">Elevated</CardTitle>
        <p className="text-xs text-white/60">White border for high contrast</p>
      </Card>
    </div>
  ),
};
