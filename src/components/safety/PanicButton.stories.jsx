import React, { useState } from 'react';
import { AlertTriangle, MapPin, Send } from 'lucide-react';
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

// Simplified PanicButton for Storybook (no API dependencies)
function PanicButtonDemo({ showTooltip: initialTooltip = false, isFirstVisit: initialFirstVisit = false }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(initialFirstVisit);
  const [showTooltip, setShowTooltip] = useState(initialTooltip);

  const dismissFirstVisit = () => {
    setIsFirstVisit(false);
    setShowTooltip(false);
  };

  return (
    <>
      {/* First-visit tooltip */}
      {showTooltip && (
        <div 
          className="absolute bottom-16 right-4 z-50 bg-black border-2 border-red-500 p-3 max-w-[200px]"
          onClick={dismissFirstVisit}
        >
          <p className="text-xs text-white font-bold mb-1">Safety First</p>
          <p className="text-[10px] text-white/70">
            This panic button sends SOS alerts to your trusted contacts and exits immediately.
          </p>
          <button 
            onClick={dismissFirstVisit}
            className="text-[10px] text-red-400 mt-2 uppercase tracking-wider"
          >
            Got it
          </button>
        </div>
      )}

      <Button
        onClick={() => {
          dismissFirstVisit();
          setShowConfirm(true);
        }}
        variant="ghost"
        size="sm"
        className={`
          bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500
          ${isFirstVisit ? 'animate-pulse ring-2 ring-red-500 ring-offset-2 ring-offset-black' : ''}
        `}
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
              onClick={() => alert('SOS would be triggered in production')}
              className="bg-red-500 hover:bg-red-600 text-white font-black"
            >
              ACTIVATE SOS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default {
  title: 'Safety/PanicButton',
  component: PanicButtonDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    showTooltip: {
      control: 'boolean',
      description: 'Show the first-visit tooltip',
    },
    isFirstVisit: {
      control: 'boolean',
      description: 'Show the pulsing animation',
    },
  },
};

export const Default = {
  args: {
    showTooltip: false,
    isFirstVisit: false,
  },
};

export const FirstVisitPulsing = {
  args: {
    showTooltip: false,
    isFirstVisit: true,
  },
};

export const WithTooltip = {
  args: {
    showTooltip: true,
    isFirstVisit: true,
  },
};

// Positioned example
export const PositionedExample = {
  render: () => (
    <div className="relative w-[400px] h-[300px] bg-black border-2 border-white/20 p-4">
      <p className="text-white/60 text-sm mb-4">
        The panic button is typically fixed to the bottom-right corner of the screen.
      </p>
      <div className="absolute bottom-4 right-4">
        <PanicButtonDemo />
      </div>
    </div>
  ),
};

// First visit flow
export const FirstVisitFlow = {
  render: () => (
    <div className="relative w-[400px] h-[300px] bg-black border-2 border-white/20 p-4">
      <p className="text-white/60 text-sm mb-4">
        On first visit, the button pulses and shows an explanatory tooltip.
      </p>
      <div className="absolute bottom-4 right-4">
        <PanicButtonDemo showTooltip={true} isFirstVisit={true} />
      </div>
    </div>
  ),
};
