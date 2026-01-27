/**
 * TicketListingForm - Form for sellers to list tickets for resale
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Upload, 
  Info, 
  AlertTriangle,
  Check,
  ChevronDown,
  Image,
  FileText,
  Shield,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import TicketVerification from './TicketVerification';

const TICKET_TYPES = [
  { value: 'general_admission', label: 'General Admission' },
  { value: 'vip', label: 'VIP' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'table', label: 'Table Booking' },
  { value: 'backstage', label: 'Backstage' },
  { value: 'premium', label: 'Premium' },
  { value: 'other', label: 'Other' },
];

const TICKET_SOURCES = [
  { value: 'resident_advisor', label: 'Resident Advisor' },
  { value: 'dice', label: 'DICE' },
  { value: 'eventbrite', label: 'Eventbrite' },
  { value: 'skiddle', label: 'Skiddle' },
  { value: 'fatsoma', label: 'Fatsoma' },
  { value: 'venue_direct', label: 'Venue Direct' },
  { value: 'promoter', label: 'Promoter' },
  { value: 'other', label: 'Other' },
];

const TRANSFER_METHODS = [
  { value: 'email_transfer', label: 'Email Transfer', description: 'Transfer via ticketing platform email' },
  { value: 'app_transfer', label: 'App Transfer', description: 'Transfer within ticketing app' },
  { value: 'name_change', label: 'Name Change', description: 'Change name on ticket with venue' },
  { value: 'pdf_send', label: 'PDF Send', description: 'Send PDF ticket directly' },
  { value: 'physical_handover', label: 'Physical Handover', description: 'Meet in person (least secure)' },
];

const MAX_MARKUP = 50; // 50% maximum markup

export default function TicketListingForm({ event = null, onSuccess, onCancel }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [sellerVerification, setSellerVerification] = useState(null);
  const [createdListing, setCreatedListing] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  
  const [formData, setFormData] = useState({
    // Event details
    event_id: event?.id || '',
    event_name: event?.title || '',
    event_venue: event?.venue || '',
    event_date: event?.event_date || '',
    event_city: event?.city || '',
    event_address: event?.address || '',
    
    // Ticket details
    ticket_type: 'general_admission',
    ticket_quantity: 1,
    original_price_gbp: '',
    asking_price_gbp: '',
    
    // Proof
    ticket_proof_url: '',
    ticket_confirmation_code: '',
    ticket_source: 'other',
    original_purchaser_name: '',
    
    // Additional info
    description: '',
    reason_for_selling: '',
    transfer_method: 'email_transfer',
    transfer_instructions: '',
  });

  const [errors, setErrors] = useState({});
  const [pricingInfo, setPricingInfo] = useState(null);

  // Fetch seller verification on mount
  useEffect(() => {
    fetchSellerVerification();
  }, []);

  const fetchSellerVerification = async () => {
    try {
      const res = await fetch('/api/ticket-reseller/seller/verification', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellerVerification(data);
      }
    } catch (error) {
      console.error('Failed to fetch seller verification:', error);
    }
  };

  // Calculate pricing when prices change
  useEffect(() => {
    const original = parseFloat(formData.original_price_gbp) || 0;
    const asking = parseFloat(formData.asking_price_gbp) || 0;
    
    if (original > 0 && asking > 0) {
      const markup = ((asking - original) / original) * 100;
      const platformFee = asking * 0.10;
      const buyerProtection = asking * 0.025;
      const buyerTotal = asking + platformFee + buyerProtection;
      const sellerReceives = asking - platformFee;
      
      setPricingInfo({
        markup: markup.toFixed(1),
        isOverLimit: markup > MAX_MARKUP,
        maxAllowedPrice: (original * (1 + MAX_MARKUP / 100)).toFixed(2),
        platformFee: platformFee.toFixed(2),
        buyerProtection: buyerProtection.toFixed(2),
        buyerTotal: buyerTotal.toFixed(2),
        sellerReceives: sellerReceives.toFixed(2),
      });
    } else {
      setPricingInfo(null);
    }
  }, [formData.original_price_gbp, formData.asking_price_gbp]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (stepNum) => {
    const newErrors = {};
    
    if (stepNum === 1) {
      if (!formData.event_name.trim()) newErrors.event_name = 'Event name is required';
      if (!formData.event_venue.trim()) newErrors.event_venue = 'Venue is required';
      if (!formData.event_date) newErrors.event_date = 'Event date is required';
      
      // Check if event is in the future
      if (formData.event_date && new Date(formData.event_date) < new Date()) {
        newErrors.event_date = 'Event must be in the future';
      }
    }
    
    if (stepNum === 2) {
      if (!formData.original_price_gbp || parseFloat(formData.original_price_gbp) <= 0) {
        newErrors.original_price_gbp = 'Original price is required';
      }
      if (!formData.asking_price_gbp || parseFloat(formData.asking_price_gbp) <= 0) {
        newErrors.asking_price_gbp = 'Asking price is required';
      }
      if (pricingInfo?.isOverLimit) {
        newErrors.asking_price_gbp = `Maximum allowed price is £${pricingInfo.maxAllowedPrice}`;
      }
      if (sellerVerification && parseFloat(formData.asking_price_gbp) > sellerVerification.maxTicketValue) {
        newErrors.asking_price_gbp = `Your verification level limits tickets to £${sellerVerification.maxTicketValue}`;
      }
    }
    
    if (stepNum === 3) {
      if (!formData.transfer_method) {
        newErrors.transfer_method = 'Transfer method is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/ticket-reseller/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          ticket_quantity: parseInt(formData.ticket_quantity),
          original_price_gbp: parseFloat(formData.original_price_gbp),
          asking_price_gbp: parseFloat(formData.asking_price_gbp),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create listing');
      }
      
      toast.success(data.message || 'Listing created! Now verify your ticket.');
      setCreatedListing(data.listing);
      setStep(4); // Move to verification step
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationComplete = (result) => {
    toast.success('Verification submitted! Your listing will go live once approved.');
    onSuccess?.(createdListing);
  };

  const handleSkipVerification = () => {
    toast.info('Listing created but will have limited visibility until verified.');
    onSuccess?.(createdListing);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="w-5 h-5 text-pink-500" />
        Event Details
      </h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Event Name *
        </label>
        <input
          type="text"
          name="event_name"
          value={formData.event_name}
          onChange={handleChange}
          placeholder="e.g., Fabric Friday Night"
          className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
            errors.event_name ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.event_name && (
          <p className="text-red-400 text-sm mt-1">{errors.event_name}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Venue *
        </label>
        <input
          type="text"
          name="event_venue"
          value={formData.event_venue}
          onChange={handleChange}
          placeholder="e.g., Fabric London"
          className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
            errors.event_venue ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.event_venue && (
          <p className="text-red-400 text-sm mt-1">{errors.event_venue}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Event Date *
          </label>
          <input
            type="datetime-local"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
              errors.event_date ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.event_date && (
            <p className="text-red-400 text-sm mt-1">{errors.event_date}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            City
          </label>
          <input
            type="text"
            name="event_city"
            value={formData.event_city}
            onChange={handleChange}
            placeholder="e.g., London"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Ticket className="w-5 h-5 text-pink-500" />
        Ticket Details
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ticket Type
          </label>
          <select
            name="ticket_type"
            value={formData.ticket_type}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            {TICKET_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Quantity
          </label>
          <input
            type="number"
            name="ticket_quantity"
            value={formData.ticket_quantity}
            onChange={handleChange}
            min="1"
            max="10"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Original Price (£) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
            <input
              type="number"
              name="original_price_gbp"
              value={formData.original_price_gbp}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-pink-500 ${
                errors.original_price_gbp ? 'border-red-500' : 'border-gray-700'
              }`}
            />
          </div>
          {errors.original_price_gbp && (
            <p className="text-red-400 text-sm mt-1">{errors.original_price_gbp}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Asking Price (£) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
            <input
              type="number"
              name="asking_price_gbp"
              value={formData.asking_price_gbp}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-pink-500 ${
                errors.asking_price_gbp ? 'border-red-500' : 'border-gray-700'
              }`}
            />
          </div>
          {errors.asking_price_gbp && (
            <p className="text-red-400 text-sm mt-1">{errors.asking_price_gbp}</p>
          )}
        </div>
      </div>
      
      {/* Pricing Info */}
      {pricingInfo && (
        <div className={`p-4 rounded-lg ${pricingInfo.isOverLimit ? 'bg-red-900/30 border border-red-500' : 'bg-gray-800/50'}`}>
          <div className="flex items-start gap-2 mb-3">
            {pricingInfo.isOverLimit ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <div>
              <p className={`font-medium ${pricingInfo.isOverLimit ? 'text-red-400' : 'text-white'}`}>
                {pricingInfo.isOverLimit 
                  ? `Price markup exceeds ${MAX_MARKUP}% limit`
                  : `${pricingInfo.markup}% markup`
                }
              </p>
              {pricingInfo.isOverLimit && (
                <p className="text-sm text-gray-400">
                  Maximum allowed: £{pricingInfo.maxAllowedPrice}
                </p>
              )}
            </div>
          </div>
          
          {!pricingInfo.isOverLimit && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Buyer pays:</div>
              <div className="text-white font-medium">£{pricingInfo.buyerTotal}</div>
              <div className="text-gray-400">Platform fee (10%):</div>
              <div className="text-gray-300">-£{pricingInfo.platformFee}</div>
              <div className="text-gray-400">You receive:</div>
              <div className="text-green-400 font-medium">£{pricingInfo.sellerReceives}</div>
            </div>
          )}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Where did you buy the ticket?
        </label>
        <select
          name="ticket_source"
          value={formData.ticket_source}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
        >
          {TICKET_SOURCES.map(source => (
            <option key={source.value} value={source.value}>{source.label}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Booking Reference (Optional)
        </label>
        <input
          type="text"
          name="ticket_confirmation_code"
          value={formData.ticket_confirmation_code}
          onChange={handleChange}
          placeholder="Your booking confirmation code"
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
        />
        <p className="text-xs text-gray-500 mt-1">This is kept private and only shown to verified buyers</p>
      </div>
    </div>
  );

  // Step 4: Verification (after listing created)
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold">Listing Created!</h3>
        <p className="text-gray-400 text-sm mt-2">
          Now verify your ticket to get the "Verified" badge and increase buyer trust
        </p>
      </div>

      {/* Why Verify */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
        <h4 className="font-semibold text-cyan-400 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5" />
          Why Verify Your Ticket?
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span><strong>3x more likely</strong> to sell</span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Trusted "Verified" badge displayed</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-purple-400" />
            <span>Priority placement in search results</span>
          </li>
          <li className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span>Faster payout after sale</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setShowVerification(true)}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <ShieldCheck className="w-5 h-5" />
          Verify My Ticket
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={handleSkipVerification}
          className="w-full py-3 border border-gray-600 text-gray-400 rounded-xl hover:bg-gray-800 transition-colors text-sm"
        >
          Skip for now (listing will have limited visibility)
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Verification usually takes 2-24 hours. You'll be notified when approved.
      </p>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5 text-pink-500" />
        Transfer & Verification
      </h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How will you transfer the ticket? *
        </label>
        <div className="space-y-2">
          {TRANSFER_METHODS.map(method => (
            <label
              key={method.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.transfer_method === method.value
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="transfer_method"
                value={method.value}
                checked={formData.transfer_method === method.value}
                onChange={handleChange}
                className="mt-1 accent-pink-500"
              />
              <div>
                <p className="font-medium text-white">{method.label}</p>
                <p className="text-sm text-gray-400">{method.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.transfer_method && (
          <p className="text-red-400 text-sm mt-1">{errors.transfer_method}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Transfer Instructions (Optional)
        </label>
        <textarea
          name="transfer_instructions"
          value={formData.transfer_instructions}
          onChange={handleChange}
          placeholder="Any specific instructions for the buyer..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Why are you selling? (Optional)
        </label>
        <textarea
          name="reason_for_selling"
          value={formData.reason_for_selling}
          onChange={handleChange}
          placeholder="e.g., Can't make it anymore, double booked..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Additional Description (Optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Any other details about the ticket..."
          rows={2}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
        />
      </div>
      
      {/* Safety Notice */}
      <div className="p-4 rounded-lg bg-cyan-900/30 border border-cyan-500/50">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-cyan-400">Buyer Protection</p>
            <p className="text-sm text-gray-300 mt-1">
              All purchases are protected by our escrow system. Payment is held until the buyer confirms receipt of a valid ticket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Show verification modal if triggered
  if (showVerification && createdListing) {
    return (
      <TicketVerification
        listingId={createdListing.id}
        onComplete={handleVerificationComplete}
        onCancel={() => setShowVerification(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-lg mx-auto"
    >
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s === 4 ? <ShieldCheck className="w-4 h-4" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-16 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation - Only show for steps 1-3 */}
        {step < 4 && (
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            
            {onCancel && step === 1 && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || pricingInfo?.isOverLimit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create & Verify Ticket'}
              </button>
            )}
          </div>
        )}
      </form>
      
      {/* Seller Limits Info */}
      {sellerVerification && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800/50 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>Active listings:</span>
            <span>{sellerVerification.activeListings} / {sellerVerification.maxActiveListings}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400 mt-1">
            <span>Max ticket value:</span>
            <span>£{sellerVerification.maxTicketValue}</span>
          </div>
          {!sellerVerification.verified && (
            <p className="text-cyan-400 text-xs mt-2">
              Verify your account to increase limits
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
