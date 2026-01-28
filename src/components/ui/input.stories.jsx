import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Search, Mail, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
import { useState } from 'react';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component: 'A text input component for forms and data entry.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date'],
      description: 'The type of input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
};

// Default input
export const Default = {
  args: {
    placeholder: 'Enter text...',
    type: 'text',
  },
};

// With label
export const WithLabel = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email" className="text-white">Email</Label>
      <Input 
        id="email" 
        type="email" 
        placeholder="your@email.com" 
        className="bg-black border-white/20 text-white"
      />
    </div>
  ),
};

// Input types
export const InputTypes = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="space-y-2">
        <Label className="text-white">Text</Label>
        <Input type="text" placeholder="Enter text" className="bg-black border-white/20 text-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-white">Email</Label>
        <Input type="email" placeholder="your@email.com" className="bg-black border-white/20 text-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-white">Password</Label>
        <Input type="password" placeholder="••••••••" className="bg-black border-white/20 text-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-white">Number</Label>
        <Input type="number" placeholder="0" className="bg-black border-white/20 text-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-white">Date</Label>
        <Input type="date" className="bg-black border-white/20 text-white" />
      </div>
    </div>
  ),
};

// With icon
export const WithIcon = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          type="search" 
          placeholder="Search..." 
          className="pl-10 bg-black border-white/20 text-white"
        />
      </div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          type="email" 
          placeholder="Email address" 
          className="pl-10 bg-black border-white/20 text-white"
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          type="password" 
          placeholder="Password" 
          className="pl-10 bg-black border-white/20 text-white"
        />
      </div>
    </div>
  ),
};

// Password with toggle
export const PasswordWithToggle = {
  render: function PasswordToggle() {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
      <div className="space-y-2 w-[300px]">
        <Label className="text-white">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            type={showPassword ? 'text' : 'password'} 
            placeholder="Enter password" 
            className="pl-10 pr-10 bg-black border-white/20 text-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  },
};

// Disabled state
export const Disabled = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <Input 
        placeholder="Disabled input" 
        disabled 
        className="bg-black border-white/20 text-white"
      />
      <Input 
        value="Disabled with value" 
        disabled 
        className="bg-black border-white/20 text-white"
      />
    </div>
  ),
};

// With validation states
export const ValidationStates = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="space-y-2">
        <Label className="text-white">Valid</Label>
        <Input 
          value="valid@email.com"
          className="bg-black border-[#39FF14] text-white focus-visible:ring-[#39FF14]"
        />
        <p className="text-xs text-[#39FF14]">Email is valid</p>
      </div>
      <div className="space-y-2">
        <Label className="text-white">Error</Label>
        <Input 
          value="invalid-email"
          className="bg-black border-red-500 text-white focus-visible:ring-red-500"
        />
        <p className="text-xs text-red-500">Please enter a valid email address</p>
      </div>
    </div>
  ),
};

// Search input with button
export const SearchWithButton = {
  render: () => (
    <div className="flex w-[400px]">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          type="search" 
          placeholder="Search events, people, products..." 
          className="pl-10 rounded-r-none bg-black border-white/20 text-white"
        />
      </div>
      <Button variant="hot" className="rounded-l-none">
        Search
      </Button>
    </div>
  ),
};

// Form example
export const LoginForm = {
  render: () => (
    <div className="space-y-4 w-[320px] p-6 bg-black border border-white/10 rounded-lg">
      <h2 className="text-xl font-black text-white uppercase tracking-wider">Sign In</h2>
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-white/80">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            id="login-email"
            type="email" 
            placeholder="your@email.com" 
            className="pl-10 bg-black border-white/20 text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-white/80">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            id="login-password"
            type="password" 
            placeholder="••••••••" 
            className="pl-10 bg-black border-white/20 text-white"
          />
        </div>
      </div>
      <Button variant="hot" className="w-full">
        Sign In
      </Button>
      <p className="text-center text-xs text-white/40">
        Don't have an account? <a href="#" className="text-[#00D9FF]">Sign up</a>
      </p>
    </div>
  ),
};
