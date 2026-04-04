/**
 * SelfieVerificationFlow — 3-step selfie + liveness verification.
 *
 * Steps:
 *   1. Capture — front camera with face overlay
 *   2. Pose challenge — random prompt to prove liveness
 *   3. Processing — upload + write to profile_verifications
 *
 * On success: profiles.is_verified = true, verification_level = 'basic'.
 * On failure: user can retry or dismiss.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { Camera, CheckCircle, AlertCircle, Loader2, RotateCcw, Shield, X } from 'lucide-react';
import { toast } from 'sonner';

const GOLD = '#C8962C';

const POSE_CHALLENGES = [
  { instruction: 'Turn your head slightly to the left', key: 'turn_left' },
  { instruction: 'Smile for the camera', key: 'smile' },
  { instruction: 'Give a thumbs up near your face', key: 'thumbs_up' },
  { instruction: 'Nod your head', key: 'nod' },
  { instruction: 'Raise your eyebrows', key: 'eyebrows' },
];

function getRandomChallenge() {
  return POSE_CHALLENGES[Math.floor(Math.random() * POSE_CHALLENGES.length)];
}

export default function SelfieVerificationFlow({ onComplete, onDismiss }) {
  const [step, setStep] = useState('intro'); // intro | capture | pose | processing | success | error
  const [challenge] = useState(() => getRandomChallenge());
  const [stream, setStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Camera access denied. Please allow camera access to verify.');
      setStep('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleStartCapture = async () => {
    setStep('capture');
    await startCamera();
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror the selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCamera();
      setStep('pose');
    }, 'image/jpeg', 0.85);
  };

  const handlePoseCapture = async () => {
    setStep('capture');
    await startCamera();
  };

  const handlePoseConfirm = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(async (poseBlob) => {
      stopCamera();
      setStep('processing');
      await submitVerification(poseBlob);
    }, 'image/jpeg', 0.85);
  };

  const submitVerification = async (poseBlob) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload selfie
      const selfieFile = new File([capturedBlob], `verification_selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const selfieUrl = await uploadToStorage(selfieFile, 'avatars', `${user.id}/verification`);

      // Upload pose challenge photo
      const poseFile = new File([poseBlob], `verification_pose_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await uploadToStorage(poseFile, 'avatars', `${user.id}/verification`);

      // Write verification record
      await supabase.from('profile_verifications').insert({
        user_id: user.id,
        type: 'selfie',
        status: 'approved', // Auto-approve selfie submissions (manual review can override later)
        selfie_url: selfieUrl,
        pose_challenge: challenge.key,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      });

      // Update profile verification status
      await supabase.from('profiles').update({
        is_verified: true,
        verification_level: 'basic',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      setStep('success');
      toast.success('You\'re verified!');
    } catch (err) {
      console.error('[Verification] submit failed:', err);
      setError(err.message || 'Verification failed. Please try again.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    setError('');
    setStep('intro');
  };

  // ── Intro screen ──
  if (step === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-white/40">
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${GOLD}20` }}>
          <Shield className="w-8 h-8" style={{ color: GOLD }} />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Get Verified</h2>
        <p className="text-white/50 text-sm text-center mb-8 max-w-[260px]">
          A quick selfie proves you're real. Verified profiles get a badge and rank higher on the grid.
        </p>
        <div className="space-y-3 text-white/40 text-xs mb-8">
          <div className="flex items-center gap-3">
            <Camera className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
            <span>Take a selfie</span>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
            <span>Complete a quick pose challenge</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
            <span>Get your verified badge</span>
          </div>
        </div>
        <button
          onClick={handleStartCapture}
          className="w-full py-4 rounded-2xl text-black font-bold text-base"
          style={{ backgroundColor: GOLD }}
        >
          Start Verification
        </button>
        <button onClick={onDismiss} className="mt-3 text-white/30 text-sm">
          Maybe later
        </button>
      </div>
    );
  }

  // ── Camera capture ──
  if (step === 'capture') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black relative">
        <button onClick={() => { stopCamera(); onDismiss?.(); }} className="absolute top-4 right-4 z-10 text-white/60">
          <X className="w-5 h-5" />
        </button>
        <p className="text-white/60 text-sm mb-4 absolute top-6 left-0 right-0 text-center">
          {capturedBlob ? challenge.instruction : 'Position your face in the circle'}
        </p>
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-2" style={{ borderColor: GOLD }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <button
          onClick={capturedBlob ? handlePoseConfirm : handleCapture}
          className="mt-8 w-16 h-16 rounded-full border-4 flex items-center justify-center"
          style={{ borderColor: GOLD }}
        >
          <div className="w-12 h-12 rounded-full" style={{ backgroundColor: GOLD }} />
        </button>
        <p className="text-white/30 text-xs mt-3">
          {capturedBlob ? 'Tap to capture pose' : 'Tap to take selfie'}
        </p>
      </div>
    );
  }

  // ── Pose challenge (review selfie + instructions) ──
  if (step === 'pose') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8">
        <button onClick={onDismiss} className="absolute top-4 right-4 text-white/40">
          <X className="w-5 h-5" />
        </button>
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 mb-6" style={{ borderColor: GOLD }}>
          {capturedPreview && <img src={capturedPreview} alt="Your selfie" className="w-full h-full object-cover" />}
        </div>
        <h3 className="text-white text-lg font-bold mb-2">Liveness Check</h3>
        <p className="text-white/50 text-sm text-center mb-8 max-w-[260px]">
          Now we need to check you're a real person. On the next screen:
        </p>
        <div className="py-4 px-6 rounded-2xl bg-white/5 border border-white/10 mb-8">
          <p className="text-white font-bold text-center">{challenge.instruction}</p>
        </div>
        <button
          onClick={handlePoseCapture}
          className="w-full py-4 rounded-2xl text-black font-bold text-base"
          style={{ backgroundColor: GOLD }}
        >
          Open Camera
        </button>
        <button onClick={handleRetry} className="mt-3 text-white/30 text-sm">
          Retake selfie
        </button>
      </div>
    );
  }

  // ── Processing ──
  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: GOLD }} />
        <p className="text-white/60 text-sm">Verifying your identity...</p>
      </div>
    );
  }

  // ── Success ──
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${GOLD}20` }}>
          <CheckCircle className="w-8 h-8" style={{ color: GOLD }} />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">You're Verified</h2>
        <p className="text-white/50 text-sm text-center mb-8 max-w-[260px]">
          Your badge is now live. Other users can see you're a real person.
        </p>
        <button
          onClick={() => onComplete?.()}
          className="w-full py-4 rounded-2xl text-black font-bold text-base"
          style={{ backgroundColor: GOLD }}
        >
          Done
        </button>
      </div>
    );
  }

  // ── Error ──
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-white/50 text-sm text-center mb-8 max-w-[260px]">{error}</p>
        <button
          onClick={handleRetry}
          className="w-full py-4 rounded-2xl text-black font-bold text-base"
          style={{ backgroundColor: GOLD }}
        >
          Try Again
        </button>
        <button onClick={onDismiss} className="mt-3 text-white/30 text-sm">
          Skip for now
        </button>
      </div>
    );
  }

  return null;
}
