import { Button } from './button';
import { Heart, Mail, Search, Plus, ArrowRight, Loader2 } from 'lucide-react';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A flexible button component with multiple variants and sizes.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'hot', 'cyan', 'glass', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (using Radix Slot)',
    },
  },
};

// Default button
export const Default = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
};

// Hot variant (primary brand color)
export const Hot = {
  args: {
    children: 'Hot Button',
    variant: 'hot',
  },
};

// Cyan variant
export const Cyan = {
  args: {
    children: 'Cyan Button',
    variant: 'cyan',
  },
};

// Glass variant (transparent with border)
export const Glass = {
  args: {
    children: 'Glass Button',
    variant: 'glass',
  },
};

// Destructive variant
export const Destructive = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

// Outline variant
export const Outline = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

// Secondary variant
export const Secondary = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

// Ghost variant
export const Ghost = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

// Link variant
export const Link = {
  args: {
    children: 'Link Style',
    variant: 'link',
  },
};

// All sizes
export const Sizes = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon"><Heart className="w-4 h-4" /></Button>
    </div>
  ),
};

// All variants showcase
export const AllVariants = {
  render: () => (
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
  ),
};

// With icons
export const WithIcons = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="hot">
        <Mail className="w-4 h-4 mr-2" />
        Send Message
      </Button>
      <Button variant="cyan">
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
      <Button variant="glass">
        <Plus className="w-4 h-4 mr-2" />
        Add New
      </Button>
      <Button variant="outline">
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  ),
};

// Loading state
export const Loading = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
      <Button variant="hot" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Processing...
      </Button>
    </div>
  ),
};

// Disabled state
export const Disabled = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>Disabled Default</Button>
      <Button variant="hot" disabled>Disabled Hot</Button>
      <Button variant="cyan" disabled>Disabled Cyan</Button>
      <Button variant="glass" disabled>Disabled Glass</Button>
    </div>
  ),
};

// Icon buttons
export const IconButtons = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="icon" variant="ghost">
        <Heart className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="outline">
        <Mail className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="hot">
        <Plus className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="cyan">
        <Search className="w-4 h-4" />
      </Button>
    </div>
  ),
};
