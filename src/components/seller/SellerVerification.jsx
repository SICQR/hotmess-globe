import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Upload,
  FileText,
  Camera,
  Building2,
  BadgeCheck,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const VERIFICATION_STEPS = [
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Verify your identity with a government-issued ID',
    icon: FileText,
    required: true,
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    description: 'Take a photo holding your ID',
    icon: Camera,
    required: true,
  },
  {
    id: 'business',
    title: 'Business Details',
    description: 'Optional: Add business registration',
    icon: Building2,
    required: false,
  },
];

const STATUS_CONFIG = {
  not_started: { 
    color: '#666', 
    label: 'Not Started', 
    icon: Clock 
  },
  pending: { 
    color: '#FFEB3B', 
    label: 'Under Review', 
    icon: Clock 
  },
  approved: { 
    color: '#39FF14', 
    label: 'Verified', 
    icon: CheckCircle2 
  },
  rejected: { 
    color: '#FF073A', 
    label: 'Rejected', 
    icon: AlertCircle 
  },
};

export default function SellerVerification({ sellerEmail, currentStatus = 'not_started' }) {
  const [activeStep, setActiveStep] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    idFront: '',
    idBack: '',
    selfieWithId: '',
    businessName: '',
    businessRegistration: '',
    additionalNotes: '',
  });
  const queryClient = useQueryClient();

  const { data: verificationRequest } = useQuery({
    queryKey: ['seller-verification', sellerEmail],
    queryFn: async () => {
      const requests = await base44.entities.SellerVerification?.filter({ 
        seller_email: sellerEmail 
      });
      return requests?.[0] || null;
    },
    enabled: !!sellerEmail,
  });

  const status = verificationRequest?.status || currentStatus;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.idFront || !formData.selfieWithId) {
        throw new Error('Please upload ID photo and selfie with ID');
      }

      // Create or update verification request
      const verificationData = {
        seller_email: sellerEmail,
        status: 'pending',
        id_front_url: formData.idFront,
        id_back_url: formData.idBack,
        selfie_url: formData.selfieWithId,
        business_name: formData.businessName,
        business_registration: formData.businessRegistration,
        additional_notes: formData.additionalNotes,
        submitted_at: new Date().toISOString(),
      };

      if (verificationRequest?.id) {
        await base44.entities.SellerVerification.update(verificationRequest.id, verificationData);
      } else {
        await base44.entities.SellerVerification.create(verificationData);
      }

      // Create notification for admins
      await base44.entities.Notification.create({
        user_email: 'admin@hotmess.london',
        type: 'verification',
        title: 'New Seller Verification Request',
        message: `${sellerEmail} submitted verification documents`,
        link: 'AdminVerification',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-verification']);
      toast.success('Verification submitted! We\'ll review within 24-48 hours.');
      setActiveStep(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit verification');
    },
  });

  if (status === 'approved') {
    return (
      <div className="bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border-2 border-[#39FF14] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#39FF14] rounded-full flex items-center justify-center">
            <BadgeCheck className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              Verified Seller
              <BadgeCheck className="w-5 h-5 text-[#39FF14]" />
            </h3>
            <p className="text-white/60 text-sm">
              Your account has been verified. Buyers see this badge on your profile and products.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-2xl font-black text-[#39FF14]">✓</p>
            <p className="text-xs text-white/60">Identity Verified</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-2xl font-black text-[#39FF14]">✓</p>
            <p className="text-xs text-white/60">Higher Visibility</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-2xl font-black text-[#39FF14]">✓</p>
            <p className="text-xs text-white/60">Buyer Trust</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border-2 border-[#FFEB3B] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#FFEB3B] rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-black animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black">Verification Pending</h3>
            <p className="text-white/60 text-sm">
              We're reviewing your documents. This usually takes 24-48 hours.
            </p>
          </div>
        </div>

        <div className="mt-4 bg-black/30 rounded-lg p-4">
          <p className="text-xs text-white/60 mb-2">Submitted documents:</p>
          <div className="flex gap-2">
            {verificationRequest?.id_front_url && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">ID Front ✓</span>
            )}
            {verificationRequest?.id_back_url && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">ID Back ✓</span>
            )}
            {verificationRequest?.selfie_url && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">Selfie ✓</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="bg-gradient-to-br from-[#FF073A]/20 to-[#FF6B35]/20 border-2 border-[#FF073A] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#FF073A] rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black">Verification Rejected</h3>
            <p className="text-white/60 text-sm">
              {verificationRequest?.rejection_reason || 'Your verification was not approved. Please try again with clearer documents.'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setActiveStep('identity')}
          className="mt-4 bg-white text-black hover:bg-white/90 font-bold"
        >
          Submit Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#00D9FF]/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#00D9FF]" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black mb-1">Get Verified</h3>
            <p className="text-white/60 text-sm">
              Verified sellers get a badge, higher search ranking, and more buyer trust.
              The process takes about 5 minutes.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {VERIFICATION_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = step.id === 'identity' 
              ? !!formData.idFront 
              : step.id === 'selfie'
                ? !!formData.selfieWithId
                : !!formData.businessName;

            return (
              <motion.button
                key={step.id}
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                  activeStep === step.id
                    ? 'border-[#E62020] bg-[#E62020]/10'
                    : isComplete
                      ? 'border-[#39FF14] bg-[#39FF14]/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isComplete ? 'bg-[#39FF14]' : 'bg-white/10'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-black" />
                    ) : (
                      <Icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{step.title}</span>
                      {step.required && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#E62020] text-black rounded font-bold">
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60">{step.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Active Step Form */}
      {activeStep && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold uppercase text-sm">
              {VERIFICATION_STEPS.find(s => s.id === activeStep)?.title}
            </h4>
            <button onClick={() => setActiveStep(null)} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeStep === 'identity' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Upload clear photos of your government-issued ID (passport, driver's license, or national ID card).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-white/60 mb-2 block">ID Front *</Label>
                  <div 
                    className="h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors overflow-hidden"
                    onClick={() => document.getElementById('id-front').click()}
                  >
                    {formData.idFront ? (
                      <img src={formData.idFront} alt="ID Front" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-white/40 mb-1" />
                        <span className="text-xs text-white/40">Upload</span>
                      </>
                    )}
                  </div>
                  <input
                    id="id-front"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'idFront')}
                    className="hidden"
                  />
                </div>

                <div>
                  <Label className="text-xs text-white/60 mb-2 block">ID Back (optional)</Label>
                  <div 
                    className="h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors overflow-hidden"
                    onClick={() => document.getElementById('id-back').click()}
                  >
                    {formData.idBack ? (
                      <img src={formData.idBack} alt="ID Back" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-white/40 mb-1" />
                        <span className="text-xs text-white/40">Upload</span>
                      </>
                    )}
                  </div>
                  <input
                    id="id-back"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'idBack')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 'selfie' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Take a clear selfie holding your ID next to your face. Make sure both your face and ID are visible.
              </p>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Selfie with ID *</Label>
                <div 
                  className="h-48 bg-white/5 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors overflow-hidden"
                  onClick={() => document.getElementById('selfie-id').click()}
                >
                  {formData.selfieWithId ? (
                    <img src={formData.selfieWithId} alt="Selfie with ID" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-white/40 mb-2" />
                      <span className="text-sm text-white/40">Upload selfie with ID</span>
                    </>
                  )}
                </div>
                <input
                  id="selfie-id"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'selfieWithId')}
                  className="hidden"
                />
              </div>

              <div className="bg-[#FFEB3B]/10 border border-[#FFEB3B]/30 rounded-lg p-3">
                <p className="text-xs text-[#FFEB3B]">
                  <strong>Tips:</strong> Good lighting, face clearly visible, ID text readable
                </p>
              </div>
            </div>
          )}

          {activeStep === 'business' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Optional: Add your business details for a business verified badge.
              </p>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Business Name</Label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Your Business Ltd."
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Registration Number</Label>
                <Input
                  value={formData.businessRegistration}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessRegistration: e.target.value }))}
                  placeholder="Company number or VAT ID"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Additional Notes</Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any additional information..."
                  rows={3}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Submit Button */}
      {(formData.idFront && formData.selfieWithId) && (
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || uploading}
          className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black py-6"
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
        </Button>
      )}
    </div>
  );
}
