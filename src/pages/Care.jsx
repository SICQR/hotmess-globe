import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Phone, Shield, Users, CheckCircle } from 'lucide-react';

const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', number: '999', description: 'Police, Fire, Ambulance' },
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF]/20 to-black" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Heart className="w-20 h-20 mx-auto mb-6 text-[#00D9FF]" />
            <h1 className="text-6xl md:text-8xl font-black italic mb-6">
              CARE<span className="text-[#00D9FF]">.</span>
            </h1>
            <p className="text-2xl uppercase tracking-wider text-white/80 mb-4">
              PREPARATION ISN'T PARANOIA
            </p>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Consent is non-negotiable. Aftercare is real. Community looks out for community.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        {/* Emergency Contacts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <Phone className="w-8 h-8 text-[#FF1493]" />
            <h2 className="text-4xl font-black italic">EMERGENCY CONTACTS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMERGENCY_CONTACTS.map((contact, idx) => (
              <motion.a
                key={idx}
                href={`tel:${contact.number}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border-2 border-white/10 hover:border-[#FF1493] p-6 rounded-xl transition-all group"
              >
                <h3 className="font-black text-xl mb-2 group-hover:text-[#FF1493] transition-colors">
                  {contact.name}
                </h3>
                <p className="text-[#00D9FF] font-mono text-2xl mb-2">{contact.number}</p>
                <p className="text-white/60 text-sm uppercase tracking-wide">{contact.description}</p>
              </motion.a>
            ))}
          </div>
        </motion.section>

        {/* Aftercare Checklist */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <CheckCircle className="w-8 h-8 text-[#39FF14]" />
            <h2 className="text-4xl font-black italic">BEFORE YOU GO OUT</h2>
          </div>
          <div className="bg-white/5 border-2 border-white/10 rounded-xl p-8">
            <div className="space-y-4">
              {AFTERCARE_CHECKLIST.map((item, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-lg transition-all ${
                    checkedItems.includes(idx)
                      ? 'bg-[#39FF14]/20 border-2 border-[#39FF14]'
                      : 'bg-white/5 border-2 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    checkedItems.includes(idx)
                      ? 'bg-[#39FF14] border-[#39FF14]'
                      : 'border-white/40'
                  }`}>
                    {checkedItems.includes(idx) && (
                      <CheckCircle className="w-4 h-4 text-black" />
                    )}
                  </div>
                  <span className={`text-lg ${checkedItems.includes(idx) ? 'font-black' : 'font-medium'}`}>
                    {item}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Community Resources */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-8">
            <Users className="w-8 h-8 text-[#B026FF]" />
            <h2 className="text-4xl font-black italic">COMMUNITY RESOURCES</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMMUNITY_RESOURCES.map((resource, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border-2 border-white/10 p-6 rounded-xl"
              >
                <h3 className="font-black text-xl mb-2">{resource.name}</h3>
                <a href={`tel:${resource.contact}`} className="text-[#B026FF] font-mono block mb-2">
                  {resource.contact}
                </a>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-white transition-colors underline"
                >
                  {resource.url}
                </a>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Safety Guidelines */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Shield className="w-8 h-8 text-[#FFEB3B]" />
            <h2 className="text-4xl font-black italic">CONSENT & BOUNDARIES</h2>
          </div>
          <div className="bg-[#FFEB3B]/10 border-2 border-[#FFEB3B] rounded-xl p-8">
            <div className="space-y-4 text-lg">
              <p className="font-bold">✓ Consent is continuous - you can change your mind</p>
              <p className="font-bold">✓ No means no, always</p>
              <p className="font-bold">✓ Clear communication before and during</p>
              <p className="font-bold">✓ Safe words are non-negotiable</p>
              <p className="font-bold">✓ If something feels wrong, it probably is</p>
              <p className="font-bold">✓ Never feel pressured - your safety comes first</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}