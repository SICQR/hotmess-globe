/**
 * ID Verification Flow
 * 
 * Multi-step verification process:
 * 1. Selfie capture
 * 2. ID document upload
 * 3. Liveness check
 * 4. Verification status
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  CheckCircle,
  Shield,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Loader2,
  Fingerprint,
  ScanFace,
  CreditCard,
  BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'intro', title: 'Get Verified', icon: Shield },
  { id: 'selfie', title: 'Take Selfie', icon: Camera },
  { id: 'document', title: 'Upload ID', icon: CreditCard },
  { id: 'liveness', title: 'Liveness Check', icon: ScanFace },
  { id: 'processing', title: 'Processing', icon: Loader2 },
  { id: 'complete', title: 'Complete', icon: BadgeCheck },
];

export function IDVerificationFlow({ 
  onComplete, 
  onCancel,
  currentUser 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selfieImage, setSelfieImage] = useState(null);
  const [documentImage, setDocumentImage] = useState(null);
  const [livenessComplete, setLivenessComplete] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const step = STEPS[currentStep];

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      return imageData;
    }
    return null;
  }, []);

  // Handle selfie capture
  const handleCaptureSelfie = () => {
    const image = capturePhoto();
    if (image) {
      setSelfieImage(image);
      stopCamera();
      setCurrentStep(2); // Move to document upload
    }
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocumentImage(e.target?.result);
        setCurrentStep(3); // Move to liveness
      };
      reader.readAsDataURL(file);
    }
  };

  // Liveness check simulation
  const handleLivenessCheck = async () => {
    setIsProcessing(true);
    
    // Simulate liveness check with face tracking
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setLivenessComplete(true);
    setIsProcessing(false);
    setCurrentStep(4); // Move to processing
  };

  // Process verification
  const processVerification = async () => {
    setIsProcessing(true);
    
    try {
      // In production, this would call a verification API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      setCurrentStep(5);
      onComplete?.({
        selfie: selfieImage,
        document: documentImage,
        verified: true,
      });
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step.id) {
      case 'intro':
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 mx-auto rounded-full bg-[#FF1493]/20 flex items-center justify-center"
            >
              <Shield className="w-12 h-12 text-[#FF1493]" />
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-black mb-2">Get Verified</h2>
              <p className="text-white/60">
                Verified users get 3x more matches and access to exclusive features.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <Camera className="w-5 h-5 text-[#00D9FF]" />
                <div>
                  <div className="font-medium">Take a selfie</div>
                  <div className="text-xs text-white/50">We'll match it with your ID</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#00D9FF]" />
                <div>
                  <div className="font-medium">Upload ID document</div>
                  <div className="text-xs text-white/50">Passport, driving license, or ID card</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <ScanFace className="w-5 h-5 text-[#00D9FF]" />
                <div>
                  <div className="font-medium">Quick liveness check</div>
                  <div className="text-xs text-white/50">Prove you're a real person</div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => {
                  setCurrentStep(1);
                  startCamera();
                }}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black py-6"
              >
                Start Verification
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <p className="text-[10px] text-white/30 px-4">
              Your data is encrypted and handled in accordance with GDPR. 
              We delete verification images after processing.
            </p>
          </div>
        );

      case 'selfie':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">Take a Selfie</h3>
              <p className="text-sm text-white/60">Position your face in the frame</p>
            </div>

            <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 border-2 border-dashed border-white/40 rounded-[50%]" />
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  stopCamera();
                  setCurrentStep(0);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCaptureSelfie}
                className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">Upload ID Document</h3>
              <p className="text-sm text-white/60">
                Take a clear photo of your ID
              </p>
            </div>

            {/* Selfie preview */}
            {selfieImage && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm">Selfie captured</span>
              </div>
            )}

            {/* Upload area */}
            <label className="block cursor-pointer">
              <div className="aspect-[3/2] bg-white/5 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-white/40 transition-colors">
                <Upload className="w-10 h-10 text-white/40 mb-3" />
                <span className="text-sm text-white/60">
                  Tap to upload ID photo
                </span>
                <span className="text-xs text-white/40 mt-1">
                  Passport, Driving License, or ID Card
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </label>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep(1);
                startCamera();
              }}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Selfie
            </Button>
          </div>
        );

      case 'liveness':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">Liveness Check</h3>
              <p className="text-sm text-white/60">
                Follow the instructions to prove you're real
              </p>
            </div>

            <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center">
              {isProcessing ? (
                <div className="text-center">
                  <Loader2 className="w-16 h-16 text-[#00D9FF] animate-spin mx-auto mb-4" />
                  <p className="text-white/60">Analyzing...</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <ScanFace className="w-16 h-16 text-[#00D9FF] mx-auto mb-4" />
                  <p className="text-white/70 mb-4">
                    Look at the camera and slowly turn your head left and right
                  </p>
                  <Button
                    onClick={handleLivenessCheck}
                    className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-bold"
                  >
                    Start Check
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-12 space-y-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Fingerprint className="w-20 h-20 text-[#FF1493] mx-auto" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold mb-2">Verifying Your Identity</h3>
              <p className="text-white/60">This usually takes less than a minute...</p>
            </div>
            <div className="w-48 h-1 mx-auto bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="h-full w-1/3 bg-[#FF1493] rounded-full"
              />
            </div>
            {!isProcessing && (
              <Button onClick={processVerification} className="mt-4">
                Complete Verification
              </Button>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12 space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <BadgeCheck className="w-12 h-12 text-green-400" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-black mb-2 text-green-400">
                Verification Complete!
              </h3>
              <p className="text-white/60">
                Your profile now shows the verified badge.
              </p>
            </div>
            <div className="space-y-2 text-sm text-white/50">
              <p>✓ Your trust score increased by 30 points</p>
              <p>✓ You're now eligible for premium features</p>
              <p>✓ Your profile stands out in discovery</p>
            </div>
            <Button
              onClick={() => onComplete?.({ verified: true })}
              className="bg-green-500 hover:bg-green-600 text-black font-bold"
            >
              Done
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Progress indicator */}
      {currentStep > 0 && currentStep < 5 && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.slice(1, 5).map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i + 1 <= currentStep ? 'bg-[#FF1493]' : 'bg-white/20'
              )}
            />
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Cancel button */}
      {currentStep > 0 && currentStep < 5 && (
        <button
          onClick={() => {
            stopCamera();
            onCancel?.();
          }}
          className="w-full mt-4 text-center text-sm text-white/40 hover:text-white"
        >
          Cancel verification
        </button>
      )}
    </div>
  );
}

export default IDVerificationFlow;
