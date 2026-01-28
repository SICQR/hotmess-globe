import { Button } from './button';
import { Mail, ChevronRight, Loader2 } from 'lucide-react';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'hot', 'cyan', 'glass', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
    asChild: {
      control: 'boolean',
    },
  },
};

// Default button
export const Default = {
  args: {
    children: 'Button',
  },
};

// All variants showcase
export const AllVariants = () => (
  <div className="flex flex-wrap gap-4">
    <Button variant="default">Default</Button>
    <Button variant="hot">Hot</Button>
    <Button variant="cyan">Cyan</Button>
    <Button variant="glass">Glass</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
);
AllVariants.storyName = 'All Variants';

// Hot variant (HOTMESS brand)
export const Hot = {
  args: {
    variant: 'hot',
    children: 'Hot Button',
  },
};

// Cyan variant
export const Cyan = {
  args: {
    variant: 'cyan',
    children: 'Cyan Button',
  },
};

// Glass variant (glassmorphism)
export const Glass = {
  args: {
    variant: 'glass',
    children: 'Glass Button',
  },
};

// Destructive variant
export const Destructive = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

// Outline variant
export const Outline = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

// Ghost variant
export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

// All sizes
export const AllSizes = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="xl">Extra Large</Button>
    <Button size="icon">
      <Mail className="h-4 w-4" />
    </Button>
  </div>
);
AllSizes.storyName = 'All Sizes';

// With icon
export const WithIcon = () => (
  <div className="flex flex-wrap gap-4">
    <Button>
      <Mail className="mr-2 h-4 w-4" />
      Login with Email
    </Button>
    <Button variant="hot">
      Continue
      <ChevronRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
);

// Loading state
export const Loading = () => (
  <Button disabled>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Please wait
  </Button>
);

// Disabled state
export const Disabled = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

// Full width
export const FullWidth = () => (
  <div className="w-full max-w-md">
    <Button className="w-full" variant="hot" size="xl">
      Get Started
    </Button>
  </div>
);
