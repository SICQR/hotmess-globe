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

export default {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
};

// Basic dialog
export const Basic = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dialog Title</DialogTitle>
        <DialogDescription>
          This is a basic dialog with a title and description.
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Dialog content goes here. You can add any content you need.
      </p>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button variant="hot">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Confirmation dialog
export const Confirmation = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="destructive">Delete Account</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you absolutely sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete your
          account and remove your data from our servers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button variant="destructive">Yes, delete my account</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Form dialog
export const FormDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="hot">Edit Profile</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogDescription>
          Make changes to your profile here. Click save when you&apos;re done.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue="John Doe" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" defaultValue="@johndoe" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Input id="bio" placeholder="Tell us about yourself" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button variant="hot">Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Event RSVP dialog
export const EventRSVP = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="hot">RSVP to Event</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Underground House Night</DialogTitle>
        <DialogDescription>
          Saturday, February 15 at 10:00 PM • Fabric London
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm">Ticket Type</span>
          <span className="font-medium">Early Bird</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm">Price</span>
          <span className="font-medium">£25.00</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Quantity</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">-</Button>
            <span className="w-8 text-center">1</span>
            <Button variant="outline" size="sm">+</Button>
          </div>
        </div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row">
        <DialogClose asChild>
          <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
        </DialogClose>
        <Button variant="hot" className="w-full sm:w-auto">
          Continue to Payment
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Share dialog
export const ShareDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Share</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share this event</DialogTitle>
        <DialogDescription>
          Invite your friends to join you at this event.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <div className="flex gap-2">
          <Input value="https://hotmess.app/events/123" readOnly />
          <Button variant="outline">Copy</Button>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// Alert dialog style
export const AlertStyle = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Show Alert</Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <DialogTitle className="text-center">Payment Successful!</DialogTitle>
        <DialogDescription className="text-center">
          Your order has been placed. You will receive a confirmation email shortly.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="justify-center">
        <DialogClose asChild>
          <Button variant="hot">View Order</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
