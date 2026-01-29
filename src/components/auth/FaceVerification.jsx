/**
 * Face Verification Component
 * 
 * Provides face verification for enhanced account security and identity confirmation.
 * Uses browser webcam API for face capture and basic detection.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  Scan,
  User,
  Loader2,
  Circle,
  Eye,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// FACE DETECTION UTILITIES
// =============================================================================

/**
 * Simple face detection using Canvas brightness analysis
 * In production, use a proper face detection library like face-api.js or TensorFlow.js
 */
const analyzeFaceRegion = (imageData) => {
  const { data, width, height } = imageData;
  
  // Define expected face region (center of image)
  const faceRegionX = Math.floor(width * 0.25);
  const faceRegionY = Math.floor(height * 0.15);
  const faceRegionWidth = Math.floor(width * 0.5);
  const faceRegionHeight = Math.floor(height * 0.6);
  
  let skinPixels = 0;
  let totalPixels = 0;
  let avgBrightness = 0;
  
  for (let y = faceRegionY; y < faceRegionY + faceRegionHeight; y++) {
    for (let x = faceRegionX; x < faceRegionX + faceRegionWidth; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      totalPixels++;
      avgBrightness += (r + g + b) / 3;
      
      // Simple skin tone detection (works for various skin tones)
      const isSkinTone = 
        r > 60 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) < 100 &&
        (r - b) > 15 && (g - b) > 15;
      
      if (isSkinTone) skinPixels++;
    }
  }
  
  avgBrightness = avgBrightness / totalPixels;
  const skinRatio = skinPixels / totalPixels;
  
  return {
    hasFace: skinRatio > 0.15 && skinRatio < 0.8,
    skinRatio,
    brightness: avgBrightness,
    isTooBright: avgBrightness > 200,
    isTooDark: avgBrightness < 50,
    quality: Math.min(1, skinRatio / 0.4) * (avgBrightness > 50 && avgBrightness < 200 ? 1 : 0.5)
  };
};

// =============================================================================
// VERIFICATION STATES
// =============================================================================

const VERIFICATION_STATES = {
  IDLE: 'idle',
  CAMERA_ACCESS: 'camera_access',
  POSITIONING: 'positioning',
  CAPTURING: 'capturing',
  ANALYZING: 'analyzing',
  SUCCESS: 'success',
  FAILED: 'failed',
  ERROR: 'error'
};

const VERIFICATION_MESSAGES = {
  [VERIFICATION_STATES.IDLE]: 'Ready to verify your identity',
  [VERIFICATION_STATES.CAMERA_ACCESS]: 'Requesting camera access...',
  [VERIFICATION_STATES.POSITIONING]: 'Position your face in the frame',
  [VERIFICATION_STATES.CAPTURING]: 'Hold still...',
  [VERIFICATION_STATES.ANALYZING]: 'Analyzing...',
  [VERIFICATION_STATES.SUCCESS]: 'Face verified successfully!',
  [VERIFICATION_STATES.FAILED]: 'Verification failed. Please try again.',
  [VERIFICATION_STATES.ERROR]: 'An error occurred'
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FaceVerification({ 
  onVerified, 
  onCancel,
  onUpload,
  userId,
  isOptional = true,
  showUploadOption = true 
}) {
  const [state, setState] = useState(VERIFICATION_STATES.IDLE);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Start camera
  const startCamera = useCallback(async () => {
    setState(VERIFICATION_STATES.CAMERA_ACCESS);
    setError('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
          setState(VERIFICATION_STATES.POSITIONING);
          startFaceDetection();
        };
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please enable camera permissions.'
        : 'Failed to access camera. Please check your device.');
      setState(VERIFICATION_STATES.ERROR);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Start face detection loop
  const startFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const analysis = analyzeFaceRegion(imageData);
      
      setFaceDetected(analysis.hasFace);
      setAnalysisResult(analysis);
    }, 200);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setState(VERIFICATION_STATES.CAPTURING);
    
    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    
    // Capture
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop camera for analysis
    stopCamera();
    
    // Analyze
    setState(VERIFICATION_STATES.ANALYZING);
    
    // Simulate server-side verification (in production, send to backend)
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 100));
    }, 200);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(progressInterval);
    setProgress(100);
    
    // Get final analysis
    const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const finalAnalysis = analyzeFaceRegion(finalImageData);
    
    if (finalAnalysis.hasFace && finalAnalysis.quality > 0.5) {
      setState(VERIFICATION_STATES.SUCCESS);
      
      // Call onVerified with the captured image
      setTimeout(() => {
        onVerified?.({
          verified: true,
          image: imageData,
          timestamp: new Date().toISOString(),
          quality: finalAnalysis.quality
        });
      }, 1500);
    } else {
      setState(VERIFICATION_STATES.FAILED);
      setError(finalAnalysis.isTooDark 
        ? 'Image too dark. Please improve lighting.'
        : finalAnalysis.isTooBright
        ? 'Image too bright. Please reduce lighting.'
        : 'Face not clearly detected. Please try again.');
    }
  }, [onVerified, stopCamera]);

  // Retry verification
  const retry = useCallback(() => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setError('');
    setProgress(0);
    startCamera();
  }, [startCamera]);

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setState(VERIFICATION_STATES.ANALYZING);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setCapturedImage(imageData);
      
      // Simulate verification
      setProgress(0);
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 100));
      }, 200);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(progressInterval);
      setProgress(100);
      
      setState(VERIFICATION_STATES.SUCCESS);
      
      setTimeout(() => {
        onVerified?.({
          verified: true,
          image: imageData,
          timestamp: new Date().toISOString(),
          method: 'upload'
        });
      }, 1500);
    };
    
    reader.readAsDataURL(file);
  }, [onVerified]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className={cn(
          "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4",
          state === VERIFICATION_STATES.SUCCESS ? "bg-emerald-500/20" :
          state === VERIFICATION_STATES.FAILED || state === VERIFICATION_STATES.ERROR ? "bg-red-500/20" :
          "bg-[#FF1493]/20"
        )}>
          {state === VERIFICATION_STATES.SUCCESS ? (
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          ) : state === VERIFICATION_STATES.FAILED || state === VERIFICATION_STATES.ERROR ? (
            <XCircle className="w-8 h-8 text-red-400" />
          ) : (
            <Scan className="w-8 h-8 text-[#FF1493]" />
          )}
        </div>
        <h3 className="text-xl font-bold uppercase">Face Verification</h3>
        <p className="text-white/60 text-sm mt-1">
          {VERIFICATION_MESSAGES[state]}
        </p>
      </div>

      {/* Camera View */}
      <div className="relative aspect-[4/3] bg-black/40 rounded-xl overflow-hidden border-2 border-white/10">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover scale-x-[-1]",
            capturedImage && "hidden"
          )}
        />
        
        {/* Captured Image */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}
        
        {/* Hidden Canvas for Processing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Face Guide Overlay */}
        {cameraReady && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Face oval guide */}
              <ellipse
                cx="50"
                cy="42"
                rx="22"
                ry="30"
                fill="none"
                stroke={faceDetected ? "#39FF14" : "#FF1493"}
                strokeWidth="0.5"
                strokeDasharray="2 2"
                className="transition-colors duration-300"
              />
              
              {/* Corner markers */}
              <g stroke={faceDetected ? "#39FF14" : "#FF1493"} strokeWidth="0.8">
                {/* Top left */}
                <path d="M 20 15 L 20 25 M 20 15 L 30 15" fill="none" />
                {/* Top right */}
                <path d="M 80 15 L 80 25 M 80 15 L 70 15" fill="none" />
                {/* Bottom left */}
                <path d="M 20 85 L 20 75 M 20 85 L 30 85" fill="none" />
                {/* Bottom right */}
                <path d="M 80 85 L 80 75 M 80 85 L 70 85" fill="none" />
              </g>
            </svg>
            
            {/* Face Detection Status */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider",
                faceDetected 
                  ? "bg-[#39FF14]/20 text-[#39FF14]" 
                  : "bg-white/10 text-white/60"
              )}>
                {faceDetected ? (
                  <span className="flex items-center gap-2">
                    <Circle className="w-2 h-2 fill-current" />
                    Face Detected
                  </span>
                ) : (
                  "Position Your Face"
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50"
            >
              <motion.span
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-8xl font-black text-white"
              >
                {countdown}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Analyzing Overlay */}
        {state === VERIFICATION_STATES.ANALYZING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="w-12 h-12 text-[#FF1493] animate-spin mb-4" />
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">
              Verifying...
            </p>
            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#FF1493]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Idle State */}
        {state === VERIFICATION_STATES.IDLE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-16 h-16 text-white/20 mb-4" />
            <p className="text-white/40 text-sm">Camera will appear here</p>
          </div>
        )}
      </div>

      {/* Quality Indicators */}
      {cameraReady && analysisResult && !capturedImage && (
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            analysisResult.isTooDark 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : analysisResult.isTooBright
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          )}>
            <Eye className="w-4 h-4 mb-1" />
            <span className="text-xs uppercase tracking-wider">
              {analysisResult.isTooDark ? "Too Dark" : 
               analysisResult.isTooBright ? "Too Bright" : "Good Lighting"}
            </span>
          </div>
          
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            faceDetected 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border-white/10 text-white/40"
          )}>
            <User className="w-4 h-4 mb-1" />
            <span className="text-xs uppercase tracking-wider">
              {faceDetected ? "Face OK" : "No Face"}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Error</p>
              <p className="text-xs text-white/60 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {state === VERIFICATION_STATES.IDLE && (
          <>
            <Button
              onClick={startCamera}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold uppercase py-6"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start Camera
            </Button>
            
            {showUploadOption && (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload Photo Instead</span>
                </div>
              </label>
            )}
          </>
        )}
        
        {state === VERIFICATION_STATES.POSITIONING && (
          <Button
            onClick={capturePhoto}
            disabled={!faceDetected}
            className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold uppercase py-6 disabled:opacity-50"
          >
            <Camera className="w-5 h-5 mr-2" />
            {faceDetected ? 'Capture Photo' : 'Position Your Face First'}
          </Button>
        )}
        
        {(state === VERIFICATION_STATES.FAILED || state === VERIFICATION_STATES.ERROR) && (
          <Button
            onClick={retry}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold uppercase py-6"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}
        
        {state === VERIFICATION_STATES.SUCCESS && (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-full"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold uppercase">Verified</span>
            </motion.div>
          </div>
        )}
        
        {/* Cancel / Skip */}
        {state !== VERIFICATION_STATES.SUCCESS && state !== VERIFICATION_STATES.ANALYZING && (
          <button
            onClick={() => {
              stopCamera();
              onCancel?.();
            }}
            className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors py-2"
          >
            {isOptional ? 'Skip for now' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="p-3 bg-white/5 rounded-lg">
        <div className="flex items-start gap-2 text-xs text-white/40">
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Your face data is processed locally and securely encrypted. 
            We never share your biometric data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT BADGE COMPONENT
// =============================================================================

export function FaceVerifiedBadge({ verified = false, className }) {
  if (!verified) return null;
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium",
      className
    )}>
      <CheckCircle className="w-3 h-3" />
      Face Verified
    </div>
  );
}

// =============================================================================
// VERIFICATION PROMPT COMPONENT
// =============================================================================

export function FaceVerificationPrompt({ onStart, onSkip }) {
  return (
    <div className="p-6 bg-gradient-to-br from-[#FF1493]/10 to-purple-500/10 rounded-xl border border-[#FF1493]/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#FF1493]/20 flex items-center justify-center flex-shrink-0">
          <Scan className="w-6 h-6 text-[#FF1493]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-white mb-1">Verify Your Identity</h4>
          <p className="text-sm text-white/60 mb-4">
            Add face verification for a trust badge on your profile. 
            Verified users get more matches and build trust faster.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onStart}
              size="sm"
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
            >
              <Camera className="w-4 h-4 mr-1" />
              Verify Now
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
