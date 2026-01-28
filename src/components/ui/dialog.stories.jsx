import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

export default {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component: 'A modal dialog component for displaying content that requires user attention.',
      },
    },
  },
};

// Basic dialog
export const Default = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="hot">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription className="text-white/60">
            This is a description of the dialog content.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-white/80">Your dialog content goes here.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/20">Cancel</Button>
          </DialogClose>
          <Button variant="hot">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Form dialog
export const FormDialog = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="cyan">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-white/20 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription className="text-white/60">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-white/80">
              Name
            </Label>
            <Input
              id="name"
              defaultValue="Alex Thompson"
              className="col-span-3 bg-black border-white/20 text-white"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right text-white/80">
              Username
            </Label>
            <Input
              id="username"
              defaultValue="@alexthompson"
              className="col-span-3 bg-black border-white/20 text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="hot">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Confirmation dialog
export const ConfirmationDialog = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-red-500/40 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Are you sure you want to delete your account? This action cannot be undone.
            All your data will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/20">Cancel</Button>
          </DialogClose>
          <Button variant="destructive">Yes, delete my account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Success dialog
export const SuccessDialog = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="glass">Show Success</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-[#39FF14]/40 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#39FF14]">
            <Check className="w-5 h-5" />
            Success!
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Your order has been placed successfully. You will receive a confirmation email shortly.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#39FF14]/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-[#39FF14]" />
          </div>
          <p className="text-white/80">Order #HM-2024-0001</p>
        </div>
        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button variant="cyan">View Order</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Info dialog
export const InfoDialog = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20">
          <Info className="w-4 h-4 mr-2" />
          Learn More
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-[#00D9FF]/40 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#00D9FF]">
            <Info className="w-5 h-5" />
            About HOTMESS
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-white/80">
            HOTMESS is the ultimate nightlife companion app for discovering events,
            connecting with people, and exploring the underground scene.
          </p>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#39FF14]" />
              Discover local events and parties
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#39FF14]" />
              Connect with like-minded people
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#39FF14]" />
              Shop exclusive merchandise
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#39FF14]" />
              Stay safe with built-in safety features
            </li>
          </ul>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="glass">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Large dialog
export const LargeDialog = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="hot">View Terms</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-white/20 text-white sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription className="text-white/60">
            Last updated: January 2026
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[400px] py-4 pr-4 space-y-4">
          <h3 className="text-white font-bold">1. Acceptance of Terms</h3>
          <p className="text-white/60 text-sm">
            By accessing or using HOTMESS, you agree to be bound by these Terms of Service.
            If you disagree with any part of the terms, you may not access the service.
          </p>
          <h3 className="text-white font-bold">2. User Accounts</h3>
          <p className="text-white/60 text-sm">
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </p>
          <h3 className="text-white font-bold">3. Privacy</h3>
          <p className="text-white/60 text-sm">
            Your privacy is important to us. Please review our Privacy Policy to understand
            how we collect and use your information.
          </p>
          <h3 className="text-white font-bold">4. Content</h3>
          <p className="text-white/60 text-sm">
            Users are responsible for the content they post. We reserve the right to remove
            content that violates our community guidelines.
          </p>
          <h3 className="text-white font-bold">5. Safety</h3>
          <p className="text-white/60 text-sm">
            We take safety seriously. Please use our safety features responsibly and report
            any concerning behavior to our team.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/20">Decline</Button>
          </DialogClose>
          <Button variant="hot">Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
