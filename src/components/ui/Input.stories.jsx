import { Input } from './input';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    error: {
      control: 'boolean',
    },
  },
};

export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const Email = {
  args: {
    type: 'email',
    placeholder: 'email@example.com',
  },
};

export const Password = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Search = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

export const WithValue = {
  args: {
    defaultValue: 'Sample input value',
  },
};

export const Disabled = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithError = {
  args: {
    placeholder: 'Invalid input',
    error: true,
    defaultValue: 'invalid@',
  },
};

// Form example
export const FormExample = {
  render: () => (
    <div className="flex flex-col gap-4 w-[300px] p-6">
      <div>
        <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Username</label>
        <Input placeholder="Enter username" />
      </div>
      <div>
        <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Email</label>
        <Input type="email" placeholder="email@example.com" />
      </div>
      <div>
        <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Password</label>
        <Input type="password" placeholder="••••••••" />
      </div>
      <div>
        <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Invalid Field</label>
        <Input error placeholder="This field has an error" />
        <p className="text-red-500 text-xs mt-1 uppercase tracking-wider">Required field</p>
      </div>
    </div>
  ),
};
