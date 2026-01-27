/**
 * VerificationFlow - Multi-step verification wizard
 * 
 * Steps: Phone SMS → Live Selfie → Optional ID
 * Chrome Luxury Brutalist design with progress tracking
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Camera, CreditCard, Check, ChevronRight, 
  Shield, AlertTriangle, RefreshCw, X
} from 'lucide-react';
import { LuxModal } from '../lux/LuxModal';

// Step configurations
const STEPS = [
  {
    id: 'phone',
    title: 'Phone Verification',
    description: 'Verify your phone number via SMS',
    icon: Phone,
    points: 10,
    required: true,
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    description: 'Take a live selfie to prove you are real',
    icon: Camera,
    points: 15,
    required: true,
  },
  {
    id: 'id',
    title: 'ID Verification',
    description: 'Optional: Verify your identity with a government ID',
    icon: CreditCard,
    points: 10,
    required: false,
  },
];

export function VerificationFlow({ 
  isOpen, 
  onClose, 
  onComplete,
  initialStep = 'phone',
  completedSteps = [],
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completed, setCompleted] = useState(completedSteps);
  const [error, setError] = useState(null);

  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const totalPoints = STEPS.reduce((acc, s) => completed.includes(s.id) ? acc + s.points : acc, 0);

  const handleStepComplete = (stepId) => {
    setCompleted(prev => [...prev, stepId]);
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    } else {
      onComplete?.(completed);
    }
  };

  const handleSkip = () => {
    const step = STEPS[currentIndex];
    if (!step.required) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex].id);
      } else {
        onComplete?.(completed);
      }
    }
  };

  return (
    <LuxModal isOpen={isOpen} onClose={onClose} title="Account Verification" size="default">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60 font-mono">
            Step {currentIndex + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-mono">
            <span className="text-[#E62020]">+{totalPoints}</span>
            <span className="text-white/40"> trust points</span>
          </span>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-[#E62020]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
            style={{ boxShadow: '0 0 10px #E62020' }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-4 mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completed.includes(step.id);
          const isCurrent = step.id === currentStep;
          
          return (
            <div key={step.id} className="flex items-center">
              <motion.div
                className={`
                  w-12 h-12 flex items-center justify-center border-2
                  ${isCompleted 
                    ? 'border-green-500 bg-green-500/20' 
                    : isCurrent 
                      ? 'border-[#E62020] bg-[#E62020]/20' 
                      : 'border-white/20 bg-white/5'
                  }
                `}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <Icon className={`w-6 h-6 ${isCurrent ? 'text-[#E62020]' : 'text-white/40'}`} />
                )}
              </motion.div>
              {index < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-white/20'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 'phone' && (
            <PhoneVerificationStep 
              onComplete={() => handleStepComplete('phone')}
              onError={setError}
            />
          )}
          {currentStep === 'selfie' && (
            <SelfieVerificationStep 
              onComplete={() => handleStepComplete('selfie')}
              onError={setError}
            />
          )}
          {currentStep === 'id' && (
            <IDVerificationStep 
              onComplete={() => handleStepComplete('id')}
              onSkip={handleSkip}
              onError={setError}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-500/20 border border-red-500/50 flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </LuxModal>
  );
}

// Phone Verification Step
function PhoneVerificationStep({ onComplete, onError }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      onError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // API call to send SMS
      const res = await fetch('/api/verification/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) throw new Error('Failed to send code');

      setCodeSent(true);
      setCountdown(60);
      
      // Countdown timer
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      onError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verification/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) throw new Error('Invalid code');

      onComplete();
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Phone className="w-16 h-16 mx-auto text-[#E62020] mb-4" />
        <h3 className="text-xl font-bold tracking-wider mb-2">PHONE VERIFICATION</h3>
        <p className="text-white/60 text-sm">
          We&apos;ll send you a 6-digit code to verify your phone
        </p>
      </div>

      {!codeSent ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2 font-mono">PHONE NUMBER</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-black border-2 border-white/20 p-4 text-white font-mono
                         focus:border-[#E62020] focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleSendCode}
            disabled={loading}
            className="w-full bg-[#E62020] text-white py-4 font-bold tracking-wider
                       hover:bg-[#ff2424] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
            style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                SEND CODE <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2 font-mono">VERIFICATION CODE</label>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={code[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newCode = code.split('');
                    newCode[i] = val;
                    setCode(newCode.join(''));
                    // Auto-focus next input
                    if (val && e.target.nextSibling) {
                      e.target.nextSibling.focus();
                    }
                  }}
                  className="w-12 h-14 bg-black border-2 border-white/20 text-center text-2xl font-mono
                             focus:border-[#E62020] focus:outline-none transition-colors"
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            className="w-full bg-[#E62020] text-white py-4 font-bold tracking-wider
                       hover:bg-[#ff2424] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
            style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                VERIFY <Check className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            onClick={handleSendCode}
            disabled={countdown > 0 || loading}
            className="w-full text-white/60 py-2 text-sm hover:text-white disabled:opacity-50"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </button>
        </div>
      )}
    </div>
  );
}

// Selfie Verification Step
function SelfieVerificationStep({ onComplete, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('Position your face in the frame');
  const [step, setStep] = useState(0); // 0: setup, 1: blink, 2: turn, 3: capture

  const instructions = [
    'Position your face in the frame',
    'Now blink twice',
    'Turn your head slowly to the right',
    'Great! Hold still...',
  ];

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      onError('Camera access denied. Please enable camera access.');
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setPhoto(imageData);
    stopCamera();
  };

  const handleVerify = async () => {
    if (!photo) return;

    setLoading(true);
    try {
      const res = await fetch('/api/verification/verify-selfie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo }),
      });

      if (!res.ok) throw new Error('Verification failed. Please try again.');

      onComplete();
    } catch (err) {
      onError(err.message);
      setPhoto(null);
      startCamera();
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setStep(0);
    startCamera();
  };

  // Progress through liveness steps
  const progressStep = () => {
    if (step < 3) {
      setStep(s => s + 1);
      setInstruction(instructions[step + 1]);
    }
    if (step === 2) {
      setTimeout(capturePhoto, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Camera className="w-16 h-16 mx-auto text-[#E62020] mb-4" />
        <h3 className="text-xl font-bold tracking-wider mb-2">SELFIE VERIFICATION</h3>
        <p className="text-white/60 text-sm">
          Take a live selfie to prove you&apos;re real
        </p>
      </div>

      <div className="relative aspect-[4/3] bg-black border-2 border-white/20 overflow-hidden">
        {!photo ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            
            {/* Face Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-48 h-64 border-2 border-dashed border-[#E62020]/50 rounded-[50%]"
                style={{ boxShadow: '0 0 40px rgba(230, 32, 32, 0.2) inset' }}
              />
            </div>

            {/* Instruction Banner */}
            <motion.div
              key={step}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-4 left-4 right-4 bg-black/80 border border-white/20 p-3 text-center"
            >
              <span className="text-sm font-mono">{instruction}</span>
            </motion.div>

            {!stream && (
              <button
                onClick={startCamera}
                className="absolute inset-0 flex items-center justify-center bg-black/60"
              >
                <span className="bg-[#E62020] px-6 py-3 font-bold tracking-wider">
                  START CAMERA
                </span>
              </button>
            )}
          </>
        ) : (
          <img 
            src={photo} 
            alt="Captured selfie" 
            className="w-full h-full object-cover transform -scale-x-100"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!photo && stream && (
        <button
          onClick={progressStep}
          className="w-full bg-[#E62020] text-white py-4 font-bold tracking-wider
                     hover:bg-[#ff2424] transition-all"
          style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
        >
          {step < 3 ? 'NEXT' : 'CAPTURING...'}
        </button>
      )}

      {photo && (
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 border-2 border-white/20 text-white py-4 font-bold tracking-wider
                       hover:border-white/40 transition-all"
          >
            RETAKE
          </button>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex-1 bg-[#E62020] text-white py-4 font-bold tracking-wider
                       hover:bg-[#ff2424] disabled:opacity-50 transition-all
                       flex items-center justify-center gap-2"
            style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                VERIFY <Check className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ID Verification Step
function IDVerificationStep({ onComplete, onSkip, onError }) {
  const [idType, setIdType] = useState(null);
  const [frontImage, setFrontImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const idTypes = [
    { id: 'passport', label: 'Passport' },
    { id: 'drivers_license', label: "Driver's License" },
    { id: 'national_id', label: 'National ID Card' },
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onError('File too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setFrontImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!idType || !frontImage) {
      onError('Please select ID type and upload an image');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verification/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_type: idType, front_image: frontImage }),
      });

      if (!res.ok) throw new Error('ID verification failed');

      onComplete();
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="w-16 h-16 mx-auto text-[#E5A820] mb-4" />
        <h3 className="text-xl font-bold tracking-wider mb-2">ID VERIFICATION</h3>
        <p className="text-white/60 text-sm">
          Optional: Upload a government ID for extra trust
        </p>
        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-[#E5A820]/20 border border-[#E5A820]/50">
          <Shield className="w-4 h-4 text-[#E5A820]" />
          <span className="text-xs text-[#E5A820] font-mono">+10 TRUST POINTS</span>
        </div>
      </div>

      {/* ID Type Selection */}
      <div className="space-y-2">
        <label className="block text-sm text-white/60 font-mono">SELECT ID TYPE</label>
        <div className="grid grid-cols-3 gap-2">
          {idTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setIdType(type.id)}
              className={`
                p-3 border-2 text-center text-sm transition-all
                ${idType === type.id 
                  ? 'border-[#E5A820] bg-[#E5A820]/20 text-white' 
                  : 'border-white/20 text-white/60 hover:border-white/40'
                }
              `}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`
          aspect-[3/2] border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-3 transition-all
          ${frontImage 
            ? 'border-green-500 bg-green-500/10' 
            : 'border-white/20 hover:border-white/40'
          }
        `}
      >
        {frontImage ? (
          <img src={frontImage} alt="ID" className="max-h-full max-w-full object-contain p-4" />
        ) : (
          <>
            <CreditCard className="w-12 h-12 text-white/40" />
            <span className="text-white/60 text-sm">Click to upload ID photo</span>
            <span className="text-white/40 text-xs">PNG, JPG up to 10MB</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 border-2 border-white/20 text-white/60 py-4 font-bold tracking-wider
                     hover:border-white/40 hover:text-white transition-all"
        >
          SKIP FOR NOW
        </button>
        <button
          onClick={handleVerify}
          disabled={loading || !idType || !frontImage}
          className="flex-1 bg-[#E5A820] text-black py-4 font-bold tracking-wider
                     hover:bg-[#f5b830] disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              VERIFY ID <Check className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default VerificationFlow;
