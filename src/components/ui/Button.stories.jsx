import { Button } from './button';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'luxPrimary',
        'luxSecondary',
        'luxTertiary',
        'luxSolid',
        'ledPrimary',
        'ledSecondary',
        'ledLive',
        'ledSolidHot',
        'ledSolidWhite',
        'hot',
        'cyan',
        'glass',
        'premium',
        'hotGradient',
        'cyanGradient',
        'hotGlow',
        'cyanGlow',
        'goldGlow',
        'ghostGradient',
        'outlineHot',
        'outlineCyan',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon', 'xs'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export const Default = {
  args: {
    children: 'Default Button',
    variant: 'default',
  },
};

export const LuxPrimary = {
  args: {
    children: 'Lux Primary',
    variant: 'luxPrimary',
  },
};

export const LuxSecondary = {
  args: {
    children: 'Lux Secondary',
    variant: 'luxSecondary',
  },
};

export const LuxSolid = {
  args: {
    children: 'Lux Solid',
    variant: 'luxSolid',
  },
};

export const LEDPrimary = {
  args: {
    children: 'LED Primary',
    variant: 'ledPrimary',
  },
};

export const LEDLive = {
  args: {
    children: 'LIVE',
    variant: 'ledLive',
  },
};

export const Glass = {
  args: {
    children: 'Glass Button',
    variant: 'glass',
  },
};

export const Premium = {
  args: {
    children: 'Upgrade Now',
    variant: 'premium',
  },
};

export const HotGlow = {
  args: {
    children: 'Hot Glow',
    variant: 'hotGlow',
  },
};

export const Destructive = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

export const Ghost = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

export const Link = {
  args: {
    children: 'Link Button',
    variant: 'link',
  },
};

export const Small = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Large = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const ExtraLarge = {
  args: {
    children: 'Extra Large',
    size: 'xl',
  },
};

export const Disabled = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

// All variants showcase
export const AllVariants = {
  render: () => (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-white/60 text-xs uppercase tracking-wider mb-2">LUX Brutalist Variants</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="luxPrimary">Lux Primary</Button>
        <Button variant="luxSecondary">Lux Secondary</Button>
        <Button variant="luxTertiary">Lux Tertiary</Button>
        <Button variant="luxSolid">Lux Solid</Button>
      </div>
      
      <div className="text-white/60 text-xs uppercase tracking-wider mt-4 mb-2">LED Variants</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ledPrimary">LED Primary</Button>
        <Button variant="ledSecondary">LED Secondary</Button>
        <Button variant="ledLive">LED Live</Button>
        <Button variant="ledSolidHot">LED Solid Hot</Button>
        <Button variant="ledSolidWhite">LED Solid White</Button>
      </div>
      
      <div className="text-white/60 text-xs uppercase tracking-wider mt-4 mb-2">Gradient Variants</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="premium">Premium</Button>
        <Button variant="hotGradient">Hot Gradient</Button>
        <Button variant="cyanGradient">Cyan Gradient</Button>
        <Button variant="ghostGradient">Ghost Gradient</Button>
      </div>
      
      <div className="text-white/60 text-xs uppercase tracking-wider mt-4 mb-2">Glow Variants</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="hotGlow">Hot Glow</Button>
        <Button variant="cyanGlow">Cyan Glow</Button>
        <Button variant="goldGlow">Gold Glow</Button>
      </div>
      
      <div className="text-white/60 text-xs uppercase tracking-wider mt-4 mb-2">Legacy/Standard</div>
      <div className="flex flex-wrap gap-3">
        <Button variant="default">Default</Button>
        <Button variant="hot">Hot</Button>
        <Button variant="cyan">Cyan</Button>
        <Button variant="glass">Glass</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
};

// Size showcase
export const AllSizes = {
  render: () => (
    <div className="flex items-end gap-4 p-6">
      <Button size="xs">XS</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};
