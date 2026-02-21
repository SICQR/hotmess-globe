/**
 * Voice Note Recording Component
 * 
 * Allows users to record, preview, and send voice messages
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  Play,
  Pause,
  Send,
  Trash2,
  X,
  Loader2,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// AUDIO UTILITIES
// =============================================================================

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Simple waveform visualization
const generateWaveformBars = (analyserNode, dataArray, barCount = 32) => {
  if (!analyserNode || !dataArray) return Array(barCount).fill(0.1);
  
  analyserNode.getByteFrequencyData(dataArray);
  
  const bars = [];
  const step = Math.floor(dataArray.length / barCount);
  
  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step] / 255;
    bars.push(Math.max(0.1, value));
  }
  
  return bars;
};

// =============================================================================
// WAVEFORM VISUALIZER
// =============================================================================

function WaveformVisualizer({ bars, isPlaying, color = '#FF1493' }) {
  return (
    <div className="flex items-center gap-[2px] h-10">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            height: `${height * 40}px`,
            opacity: isPlaying ? 0.8 + (height * 0.2) : 0.4,
          }}
          transition={{
            duration: 0.1,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function VoiceNote({
  onSend,
  onCancel,
  maxDuration = 60,
  className
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [waveformBars, setWaveformBars] = useState(Array(32).fill(0.1));
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update waveform during recording
  const updateWaveform = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      const bars = generateWaveformBars(analyserRef.current, dataArrayRef.current);
      setWaveformBars(bars);
    }
    if (recording) {
      animationRef.current = requestAnimationFrame(updateWaveform);
    }
  }, [recording]);

  // Start recording
  const startRecording = async () => {
    setError('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      
      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Start waveform animation
      animationRef.current = requestAnimationFrame(updateWaveform);
      
    } catch (err) {
      console.error('Recording error:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Microphone access denied' 
        : 'Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    setRecording(false);
  };

  // Toggle playback
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // Handle audio events
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Delete recording
  const deleteRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setPlaybackTime(0);
    setPlaying(false);
    setWaveformBars(Array(32).fill(0.1));
  };

  // Send voice note
  const handleSend = async () => {
    if (!audioBlob) return;
    
    setSending(true);
    try {
      await onSend?.(audioBlob, duration);
      deleteRecording();
    } catch (err) {
      setError('Failed to send voice note');
    } finally {
      setSending(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    stopRecording();
    deleteRecording();
    onCancel?.();
  };

  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg p-4", className)}>
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Initial state - no recording */}
        {!recording && !audioBlob && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <Button
              onClick={startRecording}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
            >
              <Mic className="w-5 h-5 mr-2" />
              Record Voice Note
            </Button>
          </motion.div>
        )}

        {/* Recording state */}
        {recording && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Waveform */}
            <div className="flex items-center justify-center">
              <WaveformVisualizer bars={waveformBars} isPlaying={true} color="#FF1493" />
            </div>

            {/* Timer */}
            <div className="text-center">
              <span className="text-2xl font-mono text-[#FF1493]">
                {formatDuration(duration)}
              </span>
              <span className="text-white/40 text-sm ml-2">
                / {formatDuration(maxDuration)}
              </span>
            </div>

            {/* Recording indicator */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-white/60 uppercase tracking-wider">Recording</span>
            </div>

            {/* Stop button */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={stopRecording}
                className="bg-white/10 hover:bg-white/20"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Preview state */}
        {!recording && audioBlob && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Static waveform representation */}
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlayback}
                size="icon"
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black w-12 h-12 rounded-full"
              >
                {playing ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>

              <div className="flex-1">
                {/* Progress bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#FF1493]"
                    style={{ width: `${(playbackTime / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-white/40">
                  <span>{formatDuration(playbackTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={deleteRecording}
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// COMPACT VOICE NOTE BUTTON (for message input)
// =============================================================================

export function VoiceNoteButton({ onRecordingComplete, className }) {
  const [isRecording, setIsRecording] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowRecorder(true)}
        variant="ghost"
        size="icon"
        className={cn("text-white/60 hover:text-[#FF1493]", className)}
      >
        <Mic className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {showRecorder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-[80] p-4 bg-black border-t-2 border-[#FF1493]"
          >
            <VoiceNote
              onSend={async (blob, duration) => {
                await onRecordingComplete?.(blob, duration);
                setShowRecorder(false);
              }}
              onCancel={() => setShowRecorder(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// VOICE NOTE PLAYER (for displaying received voice notes)
// =============================================================================

export function VoiceNotePlayer({ audioUrl, duration, className }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-white/5 rounded-lg", className)}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
      />

      <Button
        onClick={togglePlay}
        size="icon"
        className="w-10 h-10 rounded-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </Button>

      <div className="flex-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF1493] transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/40">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration || 0)}</span>
        </div>
      </div>

      <Volume2 className="w-4 h-4 text-white/40" />
    </div>
  );
}
