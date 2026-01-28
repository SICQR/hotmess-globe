import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, MapPin, Send } from 'lucide-react';
import { useState } from 'react';

export default {
  title: 'Safety/PanicButton',
  parameters: {
    layout: 'fullscreen',
  },
};

// Isolated panic button (without actual functionality for Storybook)
const PanicButtonDemo = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const handlePanic = () => {
    setSendingAlerts(true);
    // Simulate sending alerts
    setTimeout(() => {
      setSendingAlerts(false);
      setShowConfirm(false);
      alert('Demo: In production, this would send SOS alerts and redirect to Google');
    }, 2000);
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        PANIC
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-black border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Panic
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 space-y-3">
              <p className="font-bold text-white">This will:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-400" />
                  Send SOS alerts to all trusted contacts
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  Share your real-time location
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Clear all data and exit immediately
                </li>
              </ul>
              <p className="text-red-400 text-xs mt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePanic}
              disabled={sendingAlerts}
              className="bg-red-500 hover:bg-red-600 text-white font-black"
            >
              {sendingAlerts ? 'SENDING ALERTS...' : 'ACTIVATE SOS'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Default view with panic button in corner
export const Default = () => (
  <div className="min-h-screen bg-black p-6">
    <h1 className="text-white text-2xl font-bold mb-4">App Content</h1>
    <p className="text-white/70">
      The panic button is always visible in the bottom right corner of the screen.
      Click it to see the emergency confirmation dialog.
    </p>
    <PanicButtonDemo />
  </div>
);

// Just the button (isolated)
export const ButtonOnly = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <Button
      variant="ghost"
      size="sm"
      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
    >
      <AlertTriangle className="w-4 h-4 mr-2" />
      PANIC
    </Button>
  </div>
);

// Confirmation dialog (open state)
export const ConfirmationDialog = () => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <AlertDialog open={true}>
      <AlertDialogContent className="bg-black border-red-500">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Panic
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/80 space-y-3">
            <p className="font-bold text-white">This will:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Send className="w-4 h-4 text-red-400" />
                Send SOS alerts to all trusted contacts
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                Share your real-time location
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Clear all data and exit immediately
              </li>
            </ul>
            <p className="text-red-400 text-xs mt-2">This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/10 border-white/20">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white font-black">
            ACTIVATE SOS
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

// Loading state
export const LoadingState = () => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <AlertDialog open={true}>
      <AlertDialogContent className="bg-black border-red-500">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Panic
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/80">
            Sending alerts to your trusted contacts...
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/10 border-white/20" disabled>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="bg-red-500 text-white font-black" disabled>
            <span className="animate-pulse">SENDING ALERTS...</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

// Button variants for different contexts
export const ButtonVariants = () => (
  <div className="min-h-screen bg-black p-6 space-y-8">
    <h2 className="text-white text-xl font-bold">Panic Button Variants</h2>
    
    <div className="space-y-4">
      <h3 className="text-white/70 text-sm font-medium">Small (Default)</h3>
      <Button
        variant="ghost"
        size="sm"
        className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        PANIC
      </Button>
    </div>

    <div className="space-y-4">
      <h3 className="text-white/70 text-sm font-medium">Large</h3>
      <Button
        variant="ghost"
        size="lg"
        className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        EMERGENCY PANIC
      </Button>
    </div>

    <div className="space-y-4">
      <h3 className="text-white/70 text-sm font-medium">Icon Only</h3>
      <Button
        variant="ghost"
        size="icon"
        className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500 rounded-full"
      >
        <AlertTriangle className="w-5 h-5" />
      </Button>
    </div>

    <div className="space-y-4">
      <h3 className="text-white/70 text-sm font-medium">Solid (High Visibility)</h3>
      <Button
        size="lg"
        className="bg-red-500 hover:bg-red-600 text-white font-black"
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        SOS EMERGENCY
      </Button>
    </div>
  </div>
);
