import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function GlobePerformanceMonitor({ visible = false }) {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(0);
  
  useEffect(() => {
    if (!visible) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = lastTime;
    
    const measurePerformance = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      frameCount++;
      
      // Update FPS every second
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        setFrameTime(deltaTime);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measurePerformance);
    };
    
    const rafId = requestAnimationFrame(measurePerformance);
    
    return () => cancelAnimationFrame(rafId);
  }, [visible]);
  
  if (!visible) return null;
  
  const getPerformanceColor = () => {
    if (fps >= 50) return '#39FF14';
    if (fps >= 30) return '#FFEB3B';
    return '#FF1493';
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 border-2 border-white backdrop-blur-xl p-3 z-[999]">
      <div className="flex items-center gap-3">
        <Activity className="w-4 h-4" style={{ color: getPerformanceColor() }} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">FPS</span>
            <span className="text-sm font-black font-mono" style={{ color: getPerformanceColor() }}>
              {fps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Frame</span>
            <span className="text-xs text-white/60 font-mono">
              {frameTime.toFixed(1)}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}