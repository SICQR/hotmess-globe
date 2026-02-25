import PanicButton from './PanicButton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, MapPin, Shield, Users } from 'lucide-react';

export default {
  title: 'Safety/PanicButton',
  component: PanicButton,
  parameters: {
    docs: {
      description: {
        component: `The Panic Button is a critical safety feature that allows users to quickly:
- Send SOS alerts to all trusted contacts
- Share their real-time location
- Clear all app data and exit immediately

This component demonstrates the safety-first approach of HOTMESS.`,
      },
    },
    backgrounds: {
      default: 'dark',
    },
  },
};

// Default panic button (fixed position)
export const Default = {
  render: () => (
    <div className="relative w-[400px] h-[300px] bg-black/50 rounded-lg border border-white/10">
      <p className="p-4 text-white/60 text-sm">
        The panic button appears in the bottom-right corner of the screen.
        Click it to see the confirmation dialog.
      </p>
      <PanicButton />
    </div>
  ),
};

// Safety features overview
export const SafetyFeaturesOverview = {
  render: () => (
    <div className="w-[500px] p-6 bg-black border border-white/10 rounded-lg space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-[#C8962C]" />
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Safety Features</h2>
          <p className="text-white/60 text-sm">HOTMESS prioritizes your safety</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-white font-bold">Panic Button</h3>
            <p className="text-white/60 text-sm">
              Instantly alert your trusted contacts and share your location.
              App data is cleared for your privacy.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-lg">
          <Users className="w-5 h-5 text-[#00D9FF] mt-0.5" />
          <div>
            <h3 className="text-white font-bold">Trusted Contacts</h3>
            <p className="text-white/60 text-sm">
              Add friends and family who will be notified in case of emergency.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#39FF14]/10 border border-[#39FF14]/40 rounded-lg">
          <MapPin className="w-5 h-5 text-[#39FF14] mt-0.5" />
          <div>
            <h3 className="text-white font-bold">Location Sharing</h3>
            <p className="text-white/60 text-sm">
              Temporarily share your live location with trusted contacts.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#B026FF]/10 border border-[#B026FF]/40 rounded-lg">
          <Phone className="w-5 h-5 text-[#B026FF] mt-0.5" />
          <div>
            <h3 className="text-white font-bold">Check-In System</h3>
            <p className="text-white/60 text-sm">
              Set a timer - if you don't check in, alerts are automatically sent.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Panic button states visualization
export const ButtonStates = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-white font-black uppercase tracking-wider">Button States</h3>
      
      <div className="flex flex-wrap gap-4">
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            PANIC
          </Button>
          <p className="text-white/40 text-xs mt-2">Normal</p>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="bg-red-500/30 border border-red-500/60 text-red-500"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            PANIC
          </Button>
          <p className="text-white/40 text-xs mt-2">Hover</p>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="bg-red-500 text-white animate-pulse"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            SENDING...
          </Button>
          <p className="text-white/40 text-xs mt-2">Sending Alerts</p>
        </div>
      </div>
    </div>
  ),
};

// Confirmation dialog mockup
export const ConfirmationDialogMockup = {
  render: () => (
    <div className="w-[400px] p-6 bg-black border-2 border-red-500 rounded-lg">
      <div className="flex items-center gap-2 text-red-500 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <h2 className="text-lg font-black">Emergency Panic</h2>
      </div>
      
      <p className="text-white font-bold mb-3">This will:</p>
      
      <ul className="space-y-2 text-white/80 text-sm mb-4">
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
          Send SOS alerts to all trusted contacts
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
          Share your real-time location
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
          Clear all data and exit immediately
        </li>
      </ul>
      
      <p className="text-red-400 text-xs mb-6">This action cannot be undone.</p>
      
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-white/20 text-white">
          Cancel
        </Button>
        <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black">
          ACTIVATE SOS
        </Button>
      </div>
    </div>
  ),
};

// Alert sent success state
export const AlertSentState = {
  render: () => (
    <div className="w-[400px] p-6 bg-black border-2 border-[#39FF14] rounded-lg text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#39FF14]/20 flex items-center justify-center">
        <Shield className="w-8 h-8 text-[#39FF14]" />
      </div>
      
      <h2 className="text-xl font-black text-[#39FF14] mb-2">Alerts Sent</h2>
      <p className="text-white/60 text-sm mb-4">
        SOS alerts have been sent to 3 trusted contacts.
        They have received your location.
      </p>
      
      <div className="p-3 bg-white/5 rounded-lg mb-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Location Shared</p>
        <p className="text-white text-sm">51.5074° N, 0.1278° W</p>
        <p className="text-white/60 text-xs">Central London</p>
      </div>
      
      <p className="text-white/40 text-xs">
        Redirecting to safe page in 3 seconds...
      </p>
    </div>
  ),
};
