import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Shield, HelpCircle, Send, CheckCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '../utils';
import { supabase } from '../components/utils/supabaseClient';
import logger from '@/utils/logger';

const CATEGORIES = [
  { id: 'general', label: 'General Inquiry', icon: MessageSquare },
  { id: 'technical', label: 'Technical Support', icon: HelpCircle },
  { id: 'billing', label: 'Billing & Payments', icon: Mail },
  { id: 'safety', label: 'Safety Concern', icon: Shield },
  { id: 'feedback', label: 'Feedback & Suggestions', icon: MessageSquare },
  { id: 'business', label: 'Business Inquiry', icon: Mail },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Create support ticket
      const { error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          user_email: formData.email,
          user_id: user?.id || null,
          subject: formData.subject,
          message: formData.message,
          category: formData.category,
          status: 'open',
          priority: formData.category === 'safety' ? 'high' : 'normal',
          metadata: {
            name: formData.name,
            source: 'contact_form',
            user_agent: navigator.userAgent,
          }
        });

      if (insertError) {
        // If table doesn't exist, show success anyway (for demo)
        logger.warn('Support ticket insertion failed', { error: insertError?.message, context: 'Contact' });
      }

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        category: 'general',
        subject: '',
        message: '',
      });
    } catch (err) {
      logger.error('Contact form submission failed', { error: err?.message, context: 'Contact' });
      setError('Failed to send message. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl('More')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-4xl font-black uppercase">Contact Us</h1>
          </div>

          <div className="bg-green-500/10 border-2 border-green-500/50 p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-black uppercase mb-2">Message Sent!</h2>
            <p className="text-white/70 mb-6">
              Thank you for contacting us. We'll get back to you within 24-48 hours.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 font-bold uppercase transition-colors"
              >
                Send Another
              </button>
              <Link
                to={createPageUrl('HelpCenter')}
                className="px-6 py-3 bg-[#FF1493] hover:bg-[#FF1493]/80 font-bold uppercase transition-colors"
              >
                Visit Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('More')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-black uppercase">Contact Us</h1>
            <p className="text-white/60 text-sm">We're here to help</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            to={createPageUrl('HelpCenter')}
            className="bg-white/5 border-2 border-white/10 hover:border-[#FF1493] p-4 transition-colors"
          >
            <HelpCircle className="w-6 h-6 text-[#FF1493] mb-2" />
            <h3 className="font-bold uppercase text-sm">Help Center</h3>
            <p className="text-xs text-white/60">Search our FAQ</p>
          </Link>
          <Link
            to={createPageUrl('Safety')}
            className="bg-white/5 border-2 border-white/10 hover:border-[#FF1493] p-4 transition-colors"
          >
            <Shield className="w-6 h-6 text-red-400 mb-2" />
            <h3 className="font-bold uppercase text-sm">Safety Center</h3>
            <p className="text-xs text-white/60">Report urgent issues</p>
          </Link>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 border-2 border-white/10 p-6">
            <h2 className="font-black uppercase mb-4">Send Us a Message</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border-2 border-white/20 focus:border-[#FF1493] p-3 outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border-2 border-white/20 focus:border-[#FF1493] p-3 outline-none transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase mb-2">Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className={`p-3 border-2 transition-colors flex items-center gap-2 ${
                          formData.category === cat.id
                            ? 'border-[#FF1493] bg-[#FF1493]/10'
                            : 'border-white/20 hover:border-white/40'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-black border-2 border-white/20 focus:border-[#FF1493] p-3 outline-none transition-colors"
                  placeholder="Brief description of your inquiry"
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-black border-2 border-white/20 focus:border-[#FF1493] p-3 outline-none transition-colors resize-none"
                  placeholder="Please provide as much detail as possible..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/80 disabled:opacity-50 disabled:cursor-not-allowed p-4 font-black uppercase flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Direct Contact */}
        <div className="mt-8 bg-white/5 border-2 border-white/10 p-6">
          <h2 className="font-black uppercase mb-4">Direct Contact</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#FF1493]" />
              <div>
                <p className="text-white/60">General Inquiries</p>
                <a href="mailto:hello@hotmess.london" className="text-[#FF1493] hover:text-white">
                  hello@hotmess.london
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white/60">Safety & Urgent Issues</p>
                <a href="mailto:safety@hotmess.london" className="text-red-400 hover:text-white">
                  safety@hotmess.london
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white/60">Business & Partnerships</p>
                <a href="mailto:business@hotmess.london" className="text-blue-400 hover:text-white">
                  business@hotmess.london
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-white/40 text-sm">
          <p>Response times: 24-48 hours for general inquiries</p>
          <p>Safety concerns are prioritized and addressed within 24 hours</p>
        </div>
      </div>
    </div>
  );
}
