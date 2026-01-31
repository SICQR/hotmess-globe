import React from 'react';
import { motion } from 'framer-motion';

export default function CircularProgress({ 
  value = 0, 
  max = 100, 
  size = 60,
  strokeWidth = 4,
  color = '#FF1493',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showLabel = false,
  label,
  className = ''
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ 
            duration: 1,
            ease: 'easeInOut'
          }}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

// XP-specific circular progress
export function XPCircularProgress({ xp = 0, xpToNextLevel = 1000 }) {
  const level = Math.floor(xp / xpToNextLevel) + 1;
  const xpInLevel = xp % xpToNextLevel;
  
  return (
    <CircularProgress
      value={xpInLevel}
      max={xpToNextLevel}
      size={60}
      strokeWidth={5}
      color="#FFEB3B"
      showLabel={true}
      label={`${level}`}
      className="drop-shadow-[0_0_10px_rgba(255,235,59,0.3)]"
    />
  );
}
