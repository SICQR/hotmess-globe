/**
 * TicketVerification - Multi-step verification flow to prove ticket authenticity
 * Includes: proof uploads, confirmation details, and anti-fraud checks
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  FileText,
  QrCode,
  Mail,
  Shield,
  CheckCircle,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Image,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Info,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

const PROOF_TYPES = [
  {
    id: 'confirmation_email',
    label: 'Confirmation Email',
    description: 'Screenshot of your booking confirmation email',
    icon: Mail,
    required: true,
    tips: [
      'Include the order number/reference',
      'Show the event name and date',
      'Hide any sensitive payment info'
    ]
  },
  {
    id: 'ticket_screenshot',
    label: 'Ticket Screenshot',
    description: 'Screenshot of your actual ticket or e-ticket',
    icon: FileText,
    required: true,
    tips: [
      'Show the full ticket with event details',
      'Include any QR/barcode (we\'ll verify it)',
      'Don\'t crop important information'
    ]
  },
  {
    id: 'qr_code',
    label: 'QR Code Photo',
    description: 'Clear photo of the ticket QR code for verification',
    icon: QrCode,
    required: false,
    tips: [
      'Ensure QR code is sharp and readable',
      'Good lighting, no glare',
      'We\'ll verify this hasn\'t been listed elsewhere'
    ]
  },
  {
    id: 'purchase_receipt',
    label: 'Purchase Receipt',
    description: 'Receipt showing the original purchase amount',
    icon: FileText,
    required: false,
    tips: [
      'Shows original price paid',
      'Helps prove legitimacy',
      'Can hide card details'
    ]
  }
];

const VERIFICATION_LEVELS = {
  unverified: {
    label: 'Unverified',
    color: 'gray',
    description: 'No proof submitted'
  },
  pending: {
    label: 'Pending Review',
    color: 'yellow',
    description: 'Awaiting admin verification'
  },
  basic: {
    label: 'Basic Verified',
    color: 'blue',
    description: 'Confirmation email verified'
  },
  verified: {
    label: 'Verified',
    color: 'green',
    description: 'Ticket and seller verified'
  },
  premium: {
    label: 'Premium Verified',
    color: 'purple',
    description: 'Full verification + ID check'
  }
};

export default function TicketVerification({ 
  listingId, 
  onComplete, 
  onCancel,
  existingProofs = [] 
}) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState(existingProofs);
  const [confirmationDetails, setConfirmationDetails] = useState({
    order_reference: '',
    original_purchaser_email: '',
    ticketing_platform: '',
    ticket_transfer_code: ''
  });
  const [fraudCheckResult, setFraudCheckResult] = useState(null);
  const [showSensitive, setShowSensitive] = useState({});

  // Handle file upload
  const handleUpload = useCallback(async (proofType, file) => {
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image or PDF.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('proof_type', proofType);
      formData.append('listing_id', listingId);

      const res = await fetch('/api/ticket-reseller/verify/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setProofs(prev => [
        ...prev.filter(p => p.proof_type !== proofType),
        {
          proof_type: proofType,
          file_url: data.url,
          uploaded_at: new Date().toISOString(),
          status: 'pending'
        }
      ]);

      toast.success(`${PROOF_TYPES.find(p => p.id === proofType)?.label} uploaded!`);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }, [listingId, token]);

  // Run fraud check
  const runFraudCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ticket-reseller/verify/fraud-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: listingId,
          proofs,
          confirmation_details: confirmationDetails
        }),
      });

      const data = await res.json();
      setFraudCheckResult(data);

      if (data.passed) {
        toast.success('Verification checks passed!');
        setStep(3);
      } else {
        toast.error(data.message || 'Verification issues detected');
      }
    } catch (error) {
      toast.error('Failed to run verification checks');
    } finally {
      setLoading(false);
    }
  };

  // Submit verification for review
  const submitForReview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ticket-reseller/verify/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: listingId,
          proofs,
          confirmation_details: confirmationDetails,
          fraud_check_result: fraudCheckResult
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      toast.success('Verification submitted! Your listing will go live once approved.');
      onComplete?.(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const hasRequiredProofs = PROOF_TYPES
    .filter(p => p.required)
    .every(p => proofs.some(proof => proof.proof_type === p.id));

  // Step 1: Upload Proofs
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-xl font-bold">Verify Your Ticket</h3>
        <p className="text-gray-400 text-sm mt-2">
          Upload proof to show buyers your ticket is legitimate
        </p>
      </div>

      <div className="space-y-4">
        {PROOF_TYPES.map((proofType) => {
          const existingProof = proofs.find(p => p.proof_type === proofType.id);
          const Icon = proofType.icon;

          return (
            <div
              key={proofType.id}
              className={`border rounded-xl p-4 transition-colors ${
                existingProof 
                  ? 'border-green-500/50 bg-green-500/10' 
                  : proofType.required 
                  ? 'border-pink-500/50 bg-pink-500/5' 
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  existingProof ? 'bg-green-500/20' : 'bg-gray-700'
                }`}>
                  {existingProof ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <Icon className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{proofType.label}</h4>
                    {proofType.required && (
                      <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{proofType.description}</p>

                  {/* Tips */}
                  <div className="mt-2 space-y-1">
                    {proofType.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3 text-gray-600" />
                        {tip}
                      </div>
                    ))}
                  </div>

                  {/* Upload Button or Status */}
                  <div className="mt-3">
                    {existingProof ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Uploaded
                        </span>
                        <label className="text-sm text-gray-400 hover:text-white cursor-pointer">
                          Replace
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleUpload(proofType.id, e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload File</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleUpload(proofType.id, e.target.files?.[0])}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-cyan-400 py-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}
    </div>
  );

  // Step 2: Confirmation Details & Fraud Check
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold">Confirmation Details</h3>
        <p className="text-gray-400 text-sm mt-2">
          Provide details to help us verify your ticket
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Order Reference / Booking Number *
          </label>
          <input
            type="text"
            value={confirmationDetails.order_reference}
            onChange={(e) => setConfirmationDetails(prev => ({
              ...prev,
              order_reference: e.target.value
            }))}
            placeholder="e.g., ORD-12345678"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is kept private and used only for verification
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email Used for Purchase *
          </label>
          <div className="relative">
            <input
              type={showSensitive.email ? 'text' : 'password'}
              value={confirmationDetails.original_purchaser_email}
              onChange={(e) => setConfirmationDetails(prev => ({
                ...prev,
                original_purchaser_email: e.target.value
              }))}
              placeholder="your-email@example.com"
              className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSensitive(prev => ({ ...prev, email: !prev.email }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSensitive.email ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ticketing Platform *
          </label>
          <select
            value={confirmationDetails.ticketing_platform}
            onChange={(e) => setConfirmationDetails(prev => ({
              ...prev,
              ticketing_platform: e.target.value
            }))}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Select platform...</option>
            <option value="resident_advisor">Resident Advisor</option>
            <option value="dice">DICE</option>
            <option value="eventbrite">Eventbrite</option>
            <option value="skiddle">Skiddle</option>
            <option value="fatsoma">Fatsoma</option>
            <option value="ticketmaster">Ticketmaster</option>
            <option value="seetickets">See Tickets</option>
            <option value="venue_direct">Venue Website</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ticket Transfer Code (if available)
          </label>
          <div className="relative">
            <input
              type={showSensitive.transfer ? 'text' : 'password'}
              value={confirmationDetails.ticket_transfer_code}
              onChange={(e) => setConfirmationDetails(prev => ({
                ...prev,
                ticket_transfer_code: e.target.value
              }))}
              placeholder="Transfer or claim code"
              className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSensitive(prev => ({ ...prev, transfer: !prev.transfer }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showSensitive.transfer ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Only shared with buyer after purchase confirmation
          </p>
        </div>
      </div>

      {/* Fraud Check Results */}
      {fraudCheckResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            fraudCheckResult.passed
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {fraudCheckResult.passed ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            )}
            <div>
              <h4 className={`font-semibold ${
                fraudCheckResult.passed ? 'text-green-400' : 'text-red-400'
              }`}>
                {fraudCheckResult.passed ? 'Verification Passed' : 'Issues Detected'}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {fraudCheckResult.message}
              </p>
              {fraudCheckResult.warnings?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {fraudCheckResult.warnings.map((warning, idx) => (
                    <li key={idx} className="text-xs text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-400 font-medium">Why do we need this?</p>
            <p className="text-gray-300 mt-1">
              These details help us verify your ticket is genuine and hasn't been sold elsewhere.
              Your personal information is encrypted and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Review & Submit
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold">Ready for Review</h3>
        <p className="text-gray-400 text-sm mt-2">
          Your ticket will be reviewed by our team within 24 hours
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
        <h4 className="font-semibold text-gray-300">Verification Summary</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Proofs Uploaded</span>
            <span className="text-white">{proofs.length} files</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Order Reference</span>
            <span className="text-white font-mono">
              {confirmationDetails.order_reference ? '***' + confirmationDetails.order_reference.slice(-4) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Platform</span>
            <span className="text-white capitalize">
              {confirmationDetails.ticketing_platform?.replace('_', ' ') || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Fraud Check</span>
            <span className={fraudCheckResult?.passed ? 'text-green-400' : 'text-yellow-400'}>
              {fraudCheckResult?.passed ? 'Passed' : 'Pending Manual Review'}
            </span>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h4 className="font-semibold text-gray-300 mb-3">What happens next?</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-cyan-400 font-bold">1</span>
            </div>
            <div className="text-sm">
              <p className="text-white">Our team reviews your submission</p>
              <p className="text-gray-500">Usually within 2-24 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-cyan-400 font-bold">2</span>
            </div>
            <div className="text-sm">
              <p className="text-white">You'll get notified of the result</p>
              <p className="text-gray-500">Via email and in-app notification</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-cyan-400 font-bold">3</span>
            </div>
            <div className="text-sm">
              <p className="text-white">Your listing goes live with "Verified" badge</p>
              <p className="text-gray-500">Buyers will see it's been checked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700">
        <p className="text-xs text-gray-400">
          By submitting for verification, you confirm that:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-500">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-gray-600" />
            The ticket is genuine and hasn't been used
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-gray-600" />
            You have the right to sell this ticket
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-gray-600" />
            You haven't listed this ticket elsewhere
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-gray-600" />
            You agree to complete the transfer upon sale
          </li>
        </ul>
      </div>
    </div>
  );

  const canProceed = () => {
    switch (step) {
      case 1:
        return hasRequiredProofs;
      case 2:
        return confirmationDetails.order_reference && 
               confirmationDetails.original_purchaser_email &&
               confirmationDetails.ticketing_platform;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/95 backdrop-blur-xl rounded-2xl max-w-lg mx-auto overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verify Ticket</h2>
        {onCancel && (
          <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="px-6 py-4 bg-gray-800/30">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Upload Proofs' },
            { num: 2, label: 'Verify Details' },
            { num: 3, label: 'Submit' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                  s.num < step
                    ? 'bg-green-500 text-white'
                    : s.num === step
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {s.num < step ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-xs text-gray-500 mt-1 hidden sm:block">{s.label}</span>
              </div>
              {idx < 2 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 ${
                  s.num < step ? 'bg-green-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[60vh] overflow-y-auto">
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(prev => prev - 1)}
            className="flex-1 py-3 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 2 && !fraudCheckResult) {
                runFraudCheck();
              } else {
                setStep(prev => prev + 1);
              }
            }}
            disabled={!canProceed() || loading}
            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : step === 2 && !fraudCheckResult ? (
              <>
                Run Verification
                <Shield className="w-4 h-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={submitForReview}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Submit for Review
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Export verification levels for use elsewhere
export { VERIFICATION_LEVELS };
