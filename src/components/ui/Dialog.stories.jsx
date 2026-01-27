import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';

export default {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="luxPrimary">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Dialog Title</DialogTitle>
          <DialogDescription className="text-white/60">
            This is a description of what the dialog is about.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-white/80">Dialog content goes here. You can add any components or text.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="luxPrimary">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Confirmation = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Item</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-red-500">
        <DialogHeader>
          <DialogTitle className="text-red-500">Confirm Deletion</DialogTitle>
          <DialogDescription className="text-white/60">
            Are you sure you want to delete this item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ledPrimary">Create New</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-[#E62020]">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Item</DialogTitle>
          <DialogDescription className="text-white/60">
            Fill out the form below to create a new item.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Name</label>
            <input 
              className="flex h-12 w-full border-2 border-white/30 bg-transparent px-4 py-3 font-mono text-sm text-white uppercase tracking-wider placeholder:text-white/30 focus:border-[#E62020] focus:outline-none"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Description</label>
            <textarea 
              className="flex w-full border-2 border-white/30 bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#E62020] focus:outline-none min-h-[100px]"
              placeholder="Enter description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button variant="luxSolid">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const LEDLive = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ledLive">Go Live</Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-[#39FF14] shadow-[0_0_30px_rgba(57,255,20,0.4)]">
        <DialogHeader>
          <DialogTitle className="text-[#39FF14]">You're About to Go Live</DialogTitle>
          <DialogDescription className="text-white/60">
            Your status will be visible to others in your area. You can stop at any time.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center gap-3 p-4 bg-[#39FF14]/10 border-2 border-[#39FF14]/30">
            <div className="w-3 h-3 bg-[#39FF14] animate-pulse" />
            <span className="text-white font-mono text-sm uppercase">Broadcasting your presence</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost">Maybe Later</Button>
          <Button variant="ledSolidLive">Go Live Now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
