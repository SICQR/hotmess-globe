import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Phone, Shield, Users, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', number: '999', description: 'Police, Fire, Ambulance', urgent: true },
  { name: 'Samaritans', number: '116 123', description: '24/7 emotional support' },
  { name: 'Rape Crisis', number: '0808 500 2222', description: 'Sexual violence support' },
  { name: 'National Domestic Abuse Helpline', number: '0808 2000 247', description: '24/7 freephone helpline' },
  { name: '56 Dean Street', number: '020 7437 7575', description: 'Sexual health clinic (London)' },
];

const AFTERCARE_CHECKLIST = [
  'Share your location with a trusted friend',
  'Set check-in times before and after',
  'Have emergency contacts saved',
  'Know your safe word/exit strategy',
  'Stay hydrated and eat beforehand',
  'Have backup transport plan',
  'Trust your instincts always',
];

const COMMUNITY_RESOURCES = [
  { name: 'Galop LGBT+ Helpline', contact: '0800 999 5428', url: 'https://galop.org.uk' },
  { name: 'Switchboard LGBT+', contact: '0300 330 0630', url: 'https://switchboard.lgbt' },
  { name: 'London Friend', contact: '020 7833 1674', url: 'https://londonfriend.org.uk' },
  { name: 'CliniQ', contact: '020 3315 6699', url: 'https://cliniq.org.uk' },
];

export default function Care() {
  const [checkedItems, setCheckedItems] = useState([]);

  const toggleCheck = (index) => {
    setCheckedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const progress = (checkedItems.length / AFTERCARE_CHECKLIST.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO - Full viewport red theme */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-red.jpg" 
            alt="Care" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/90 via-black/80 to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 text-center"
        >
          <Heart className="w-20 h-20 mx-auto mb-8 text-red-500" />
          
          <h1 className="text-[12vw] md:text-[8vw] font-black italic leading-[0.85] tracking-tighter mb-6">
            CARE<span className="text-red-500">.</span>
          </h1>
          
          <p className="text-2xl md:text-3xl uppercase tracking-wider text-white/80 mb-4">
            Preparation isn't paranoia
          </p>
          
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-12">
            Consent is non-negotiable. Aftercare is real. Community looks out for community. Landing matters as much as leaving.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a href="tel:999">
              <Button className="bg-red-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                <Phone className="w-6 h-6 mr-3" />
                EMERGENCY: 999
              </Button>
            </a>
            <a href="tel:116123">
              <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                <Heart className="w-5 h-5 mr-3" />
                SAMARITANS
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* 2. SOS STRIP */}
      <section className="py-4 px-6 bg-red-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 text-black">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-black uppercase">IF YOU'RE IN DANGER, CALL 999</span>
          </div>
          <span className="hidden md:inline">•</span>
          <span className="font-bold">You good? This page is always here.</span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-20">
        
        {/* 3. EMERGENCY CONTACTS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <Phone className="w-10 h-10 text-red-500" />
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic">EMERGENCY CONTACTS</h2>
              <p className="text-white/50">Tap to call. Save these numbers.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMERGENCY_CONTACTS.map((contact, idx) => (
              <motion.a
                key={idx}
                href={`tel:${contact.number.replace(/\s/g, '')}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`group p-6 rounded-xl border-2 transition-all ${
                  contact.urgent 
                    ? 'bg-red-500/20 border-red-500 hover:bg-red-500 hover:text-black' 
                    : 'bg-white/5 border-white/10 hover:border-red-500/50 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-xl mb-2 group-hover:text-current transition-colors">
                      {contact.name}
                    </h3>
                    <p className="text-3xl font-mono font-black text-red-400 group-hover:text-current mb-2">
                      {contact.number}
                    </p>
                    <p className="text-sm text-white/60 uppercase tracking-wide group-hover:text-current/70">
                      {contact.description}
                    </p>
                  </div>
                  <Phone className="w-8 h-8 text-red-500/50 group-hover:text-current" />
                </div>
              </motion.a>
            ))}
          </div>
        </motion.section>

        {/* 4. BEFORE YOU GO OUT - Checklist */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic">BEFORE YOU GO OUT</h2>
              <p className="text-white/50">Your safety checklist. Tap to check off.</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Progress</span>
              <span className="text-sm font-black text-green-400">{checkedItems.length}/{AFTERCARE_CHECKLIST.length}</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="space-y-4">
              {AFTERCARE_CHECKLIST.map((item, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`w-full text-left flex items-center gap-4 p-5 rounded-xl transition-all ${
                    checkedItems.includes(idx)
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : 'bg-white/5 border-2 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    checkedItems.includes(idx)
                      ? 'bg-green-500 border-green-500'
                      : 'border-white/40'
                  }`}>
                    {checkedItems.includes(idx) && (
                      <CheckCircle className="w-5 h-5 text-black" />
                    )}
                  </div>
                  <span className={`text-lg ${checkedItems.includes(idx) ? 'font-black text-green-400' : 'font-medium'}`}>
                    {item}
                  </span>
                </motion.button>
              ))}
            </div>
            
            {checkedItems.length === AFTERCARE_CHECKLIST.length && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-green-500/20 border border-green-500 rounded-xl text-center"
              >
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-xl font-black text-green-400">YOU'RE READY</p>
                <p className="text-white/60">Stay safe. Have fun. We've got you.</p>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* 5. COMMUNITY RESOURCES */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <Users className="w-10 h-10 text-pink-500" />
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic">COMMUNITY RESOURCES</h2>
              <p className="text-white/50">LGBT+ support organizations</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMMUNITY_RESOURCES.map((resource, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 hover:border-pink-500/50 rounded-xl p-6 transition-all"
              >
                <h3 className="font-black text-xl mb-3">{resource.name}</h3>
                <a 
                  href={`tel:${resource.contact.replace(/\s/g, '')}`} 
                  className="text-2xl font-mono text-pink-500 hover:text-purple-300 block mb-3"
                >
                  {resource.contact}
                </a>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  {resource.url}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 6. CONSENT & BOUNDARIES */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <Shield className="w-10 h-10 text-white" />
            <div>
              <h2 className="text-4xl md:text-5xl font-black italic">CONSENT & BOUNDARIES</h2>
              <p className="text-white/50">Non-negotiable. Always.</p>
            </div>
          </div>
          
          <div className="bg-white/5 border-2 border-white/20 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
              {[
                'Consent is continuous — you can change your mind',
                'No means no, always',
                'Clear communication before and during',
                'Safe words are non-negotiable',
                'If something feels wrong, it probably is',
                'Never feel pressured — your safety comes first'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                  <span className="font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 7. CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-16"
        >
          <Heart className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-3xl md:text-5xl font-black italic mb-6">
            YOU GOOD?
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            This page is always here. No judgment. No shame. Just support.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/">
              <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                BACK TO HOME
              </Button>
            </Link>
            <a href="tel:116123">
              <Button className="bg-red-500 hover:bg-white text-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                <Phone className="w-5 h-5 mr-3" />
                TALK TO SOMEONE
              </Button>
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
