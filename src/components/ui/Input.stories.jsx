import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Search, Mail, Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
};

// Default input
export const Default = {
  args: {
    placeholder: 'Enter text...',
  },
};

// With label
export const WithLabel = () => (
  <div className="grid w-full max-w-sm gap-1.5">
    <Label htmlFor="email">Email</Label>
    <Input type="email" id="email" placeholder="Enter your email" />
  </div>
);

// All input types
export const AllTypes = () => (
  <div className="grid w-full max-w-sm gap-4">
    <div className="grid gap-1.5">
      <Label htmlFor="text">Text</Label>
      <Input type="text" id="text" placeholder="Enter text" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Enter email" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="password">Password</Label>
      <Input type="password" id="password" placeholder="Enter password" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="number">Number</Label>
      <Input type="number" id="number" placeholder="Enter number" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="tel">Phone</Label>
      <Input type="tel" id="tel" placeholder="+44 7700 900000" />
    </div>
  </div>
);

// With icon
export const WithIcon = () => (
  <div className="grid w-full max-w-sm gap-4">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-10" placeholder="Search events..." />
    </div>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-10" type="email" placeholder="Email address" />
    </div>
  </div>
);

// Password with toggle
export const PasswordToggle = () => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="password-toggle">Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 pr-10"
          type={showPassword ? 'text' : 'password'}
          id="password-toggle"
          placeholder="Enter password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

// Disabled state
export const Disabled = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    value: 'Cannot edit this',
  },
};

// With error
export const WithError = () => (
  <div className="grid w-full max-w-sm gap-1.5">
    <Label htmlFor="error-input" className="text-destructive">Email</Label>
    <Input
      type="email"
      id="error-input"
      placeholder="Enter email"
      className="border-destructive focus-visible:ring-destructive"
      defaultValue="invalid-email"
    />
    <p className="text-sm text-destructive">Please enter a valid email address</p>
  </div>
);

// File input
export const FileInput = () => (
  <div className="grid w-full max-w-sm gap-1.5">
    <Label htmlFor="picture">Picture</Label>
    <Input id="picture" type="file" />
  </div>
);

// Form example
export const FormExample = () => (
  <form className="grid w-full max-w-sm gap-4">
    <div className="grid gap-1.5">
      <Label htmlFor="form-name">Name</Label>
      <Input type="text" id="form-name" placeholder="Your name" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="form-email">Email</Label>
      <Input type="email" id="form-email" placeholder="you@example.com" />
    </div>
    <div className="grid gap-1.5">
      <Label htmlFor="form-password">Password</Label>
      <Input type="password" id="form-password" placeholder="••••••••" />
    </div>
    <Button type="submit" variant="hot" className="w-full">
      Sign Up
    </Button>
  </form>
);
