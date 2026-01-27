import { Badge } from './badge';

export default {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'ledHot',
        'ledLive',
        'ledSolidHot',
        'ledSolidLive',
        'secondary',
        'destructive',
        'outline',
        'online',
        'offline',
        'away',
        'busy',
      ],
    },
    withDot: {
      control: 'boolean',
    },
  },
};

export const Default = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const LEDHot = {
  args: {
    children: 'Hot',
    variant: 'ledHot',
  },
};

export const LEDLive = {
  args: {
    children: 'Live',
    variant: 'ledLive',
  },
};

export const LEDSolidHot = {
  args: {
    children: 'Featured',
    variant: 'ledSolidHot',
  },
};

export const LEDSolidLive = {
  args: {
    children: 'Online Now',
    variant: 'ledSolidLive',
  },
};

export const WithDot = {
  args: {
    children: 'Live Now',
    variant: 'ledLive',
    withDot: true,
  },
};

export const Online = {
  args: {
    children: 'Online',
    variant: 'online',
    withDot: true,
  },
};

export const Offline = {
  args: {
    children: 'Offline',
    variant: 'offline',
  },
};

export const Away = {
  args: {
    children: 'Away',
    variant: 'away',
  },
};

export const Busy = {
  args: {
    children: 'Busy',
    variant: 'busy',
  },
};

export const Destructive = {
  args: {
    children: 'Warning',
    variant: 'destructive',
  },
};

// All variants
export const AllVariants = {
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">LED Variants</p>
        <div className="flex flex-wrap gap-3">
          <Badge variant="ledHot">LED Hot</Badge>
          <Badge variant="ledLive">LED Live</Badge>
          <Badge variant="ledSolidHot">LED Solid Hot</Badge>
          <Badge variant="ledSolidLive">LED Solid Live</Badge>
        </div>
      </div>
      
      <div>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">With Dot Indicator</p>
        <div className="flex flex-wrap gap-3">
          <Badge variant="ledLive" withDot>Live Now</Badge>
          <Badge variant="ledHot" withDot>Hot</Badge>
          <Badge variant="online" withDot>Online</Badge>
        </div>
      </div>
      
      <div>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Status Variants</p>
        <div className="flex flex-wrap gap-3">
          <Badge variant="online">Online</Badge>
          <Badge variant="offline">Offline</Badge>
          <Badge variant="away">Away</Badge>
          <Badge variant="busy">Busy</Badge>
        </div>
      </div>
      
      <div>
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Standard Variants</p>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>
    </div>
  ),
};
