import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  Phone, 
  AlertTriangle, 
  Heart,
  Users,
  Clock,
  EyeOff,
  Lock,
  CheckCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const SAFETY_FEATURES = [
  {
    id: 'panic',
    icon: AlertTriangle,
    title: 'PANIC BUTTON',
    tagline: 'One tap to safety',
    color: '#FF0000',
    description: 'When you need help immediately, our Panic Button sends instant SOS alerts to all your trusted contacts with your real-time location. It also clears your app data and redirects to a neutral page.',
    benefits: [
      'Instant SOS to all trusted contacts',
      'Automatic location sharing',
      'Clear browsing history & data',
      'Redirect to neutral website',
      'Works even without internet (SMS fallback)',
    ],
    howItWorks: [
      { step: 1, title: 'Tap Panic Button', desc: 'Located in bottom-right corner of every screen' },
      { step: 2, title: 'Confirm Action', desc: 'Quick confirmation to prevent accidental triggers' },
      { step: 3, title: 'Alerts Sent', desc: 'Your trusted contacts receive your location instantly' },
      { step: 4, title: 'Safe Exit', desc: 'App clears data and redirects to Google' },
    ],
  },
  {
    id: 'fake-call',
    icon: Phone,
    title: 'FAKE CALL GENERATOR',
    tagline: 'Your escape route',
    color: '#00D9FF',
    description: 'Need an excuse to leave? Generate a realistic incoming call with customizable caller name and timing. Perfect for escaping awkward or uncomfortable situations.',
    benefits: [
      'Realistic incoming call simulation',
      'Customizable caller name',
      'Adjustable delay (5s to 5min)',
      'Vibration patterns',
      'Full-screen call UI',
    ],
    howItWorks: [
      { step: 1, title: 'Set Caller Name', desc: 'Choose who appears to be calling' },
      { step: 2, title: 'Choose Delay', desc: 'Set when the call should come in' },
      { step: 3, title: 'Activate', desc: 'Press start and put phone away' },
      { step: 4, title: 'Receive Call', desc: 'Get a realistic incoming call notification' },
    ],
  },
  {
    id: 'location',
    icon: MapPin,
    title: 'LIVE LOCATION SHARING',
    tagline: 'Let friends watch over you',
    color: '#39FF14',
    description: 'Share your real-time location with trusted contacts for a set duration. They can track where you are until you end the share or the timer expires.',
    benefits: [
      'Real-time GPS tracking',
      'Choose duration (15min to 8hrs)',
      'Select specific trusted contacts',
      'Auto-expires for privacy',
      'End share anytime',
    ],
    howItWorks: [
      { step: 1, title: 'Select Contacts', desc: 'Choose who can see your location' },
      { step: 2, title: 'Set Duration', desc: 'Pick how long to share (15min-8hrs)' },
      { step: 3, title: 'Start Sharing', desc: 'Your location updates in real-time' },
      { step: 4, title: 'Auto-End', desc: 'Sharing stops when timer expires' },
    ],
  },
  {
    id: 'aftercare',
    icon: Heart,
    title: 'AFTERCARE NUDGE',
    tagline: 'We check in on you',
    color: '#C8962C',
    description: 'After meetups or when you end a safety check-in, we gently ask how you\'re doing. Quick responses connect you to resources if needed.',
    benefits: [
      'Post-meetup wellness checks',
      '"You good?" quick responses',
      'Connect to support resources',
      'Non-intrusive prompts',
      'Community care culture',
    ],
    howItWorks: [
      { step: 1, title: 'Trigger Event', desc: 'After safety check-in ends or meetup' },
      { step: 2, title: 'Gentle Prompt', desc: '"You good?" appears on screen' },
      { step: 3, title: 'Quick Response', desc: 'All good / Need a minute / Get help' },
      { step: 4, title: 'Support', desc: 'Resources provided if needed' },
    ],
  },
  {
    id: 'trusted-contacts',
    icon: Users,
    title: 'TRUSTED CONTACTS',
    tagline: 'Your safety network',
    color: '#B026FF',
    description: 'Build your safety network with trusted contacts who receive your emergency alerts and can track your location when you share it.',
    benefits: [
      'Add unlimited contacts',
      'Manage permissions per contact',
      'Quick-add from phone contacts',
      'Remove anytime',
      'They don\'t need the app',
    ],
    howItWorks: [
      { step: 1, title: 'Add Contacts', desc: 'Enter phone numbers of trusted people' },
      { step: 2, title: 'Set Permissions', desc: 'Choose what they can access' },
      { step: 3, title: 'They Receive', desc: 'Alerts via SMS, no app needed' },
      { step: 4, title: 'Manage', desc: 'Update or remove contacts anytime' },
    ],
  },
  {
    id: 'check-in',
    icon: Clock,
    title: 'SAFETY CHECK-IN TIMER',
    tagline: 'Timed safety net',
    color: '#FFEB3B',
    description: 'Set a timer for your outing. If you don\'t check in before it expires, your trusted contacts are automatically alerted.',
    benefits: [
      'Customizable duration',
      'Reminder notifications',
      'Auto-alert if missed',
      'Easy check-in to reset',
      'Peace of mind for you & contacts',
    ],
    howItWorks: [
      { step: 1, title: 'Set Timer', desc: 'Choose duration for your outing' },
      { step: 2, title: 'Go Out', desc: 'Live your life, we\'ve got you' },
      { step: 3, title: 'Get Reminded', desc: 'Notification before timer ends' },
      { step: 4, title: 'Check In', desc: 'Tap to confirm you\'re okay' },
    ],
  },
];

const FeatureSection = ({ feature, index }) => {
  const Icon = feature.icon;
  const isEven = index % 2 === 0;
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className="py-16 border-b border-white/10 last:border-b-0"
      id={feature.id}
    >
      <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12`}>
        {/* Content */}
        <div className="lg:w-1/2">
          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-14 h-14 flex items-center justify-center border-2"
              style={{ borderColor: feature.color, backgroundColor: `${feature.color}20` }}
            >
              <Icon className="w-7 h-7" style={{ color: feature.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">{feature.title}</h2>
              <p className="text-white/60 text-sm">{feature.tagline}</p>
            </div>
          </div>
          
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            {feature.description}
          </p>
          
          {/* Benefits */}
          <div className="space-y-3">
            {feature.benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: feature.color }} />
                <span className="text-white/80">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* How it Works */}
        <div className="lg:w-1/2">
          <div className="bg-white/5 border border-white/10 p-6">
            <h3 className="font-black uppercase text-sm tracking-wider mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: feature.color }} />
              How It Works
            </h3>
            <div className="space-y-6">
              {feature.howItWorks.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-4"
                >
                  <div 
                    className="w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ backgroundColor: feature.color, color: '#000' }}
                  >
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{step.title}</h4>
                    <p className="text-white/60 text-sm">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default function SafetyFeatures() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="SAFETY"
        title="Your Safety, Our Priority"
        subtitle="Industry-leading safety features designed by and for our community"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#C8962C]/30 via-black to-[#B026FF]/20 border-2 border-[#C8962C] p-8 md:p-12 mb-12"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8962C]/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#B026FF]/10 blur-3xl rounded-full" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-[#C8962C]" />
              <span className="text-[#C8962C] font-black uppercase tracking-wider">Safety First</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
              Going out should feel safe
            </h2>
            <p className="text-white/70 text-lg mb-6">
              We've built the most comprehensive safety toolkit in any social app. 
              From instant panic alerts to fake call generators, we've got your back.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/safety">
                <Button variant="hot" size="lg" className="font-black uppercase">
                  <Shield className="w-4 h-4 mr-2" />
                  Access Safety Hub
                </Button>
              </Link>
              <Link to="/more/care">
                <Button variant="outline" size="lg" className="font-black uppercase border-white/20">
                  <Heart className="w-4 h-4 mr-2" />
                  Care Resources
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Quick Access Nav */}
        <div className="mb-12 overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {SAFETY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <a
                  key={feature.id}
                  href={`#${feature.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-white/30 transition-all whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" style={{ color: feature.color }} />
                  <span className="text-sm font-bold">{feature.title}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Feature Sections */}
        {SAFETY_FEATURES.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        {/* Trust Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 pt-16 border-t border-white/10"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase mb-4">Built on Trust</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Your safety data is encrypted and never shared. We only use your location 
              when you explicitly share it with trusted contacts.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'End-to-End Encryption', desc: 'All safety data is encrypted' },
              { icon: EyeOff, title: 'Privacy by Default', desc: 'We never track without consent' },
              { icon: Shield, title: 'GDPR Compliant', desc: 'Full data control and export' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 p-6 text-center"
              >
                <item.icon className="w-8 h-8 text-[#00D9FF] mx-auto mb-4" />
                <h3 className="font-black uppercase mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <Shield className="w-16 h-16 text-[#C8962C] mx-auto mb-6" />
          <h2 className="text-4xl font-black uppercase mb-4">Stay Safe Out There</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Set up your safety features now and enjoy peace of mind on every night out.
          </p>
          <Link to="/safety">
            <Button variant="hot" size="xl" className="font-black uppercase">
              Set Up Safety Features
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </PageShell>
    </div>
  );
}
