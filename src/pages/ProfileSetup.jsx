import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function ProfileSetup() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to consolidated Profile page
    navigate(createPageUrl('Profile'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
    </div>
  );
}