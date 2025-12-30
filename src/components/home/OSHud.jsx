import React from 'react';
import { Globe, Radio, Flame, ShoppingBag, User, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function OSHud({ user, onModuleChange }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const level = user ? Math.floor((user.xp || 0) / 1000) + 1 : 1;
  const xpInLevel = user ? (user.xp || 0) % 1000 : 0;
  const xpProgress = (xpInLevel / 1000) * 100;

  const modules = [
    { id: 'pulse', icon: Globe, label: 'PULSE', path: '/' },
    { id: 'now', icon: Radio, label: 'NOW', path: '/right-now' },
    { id: 'connect', icon: Flame, label: 'CONNECT', path: '/network' },
    { id: 'market', icon: ShoppingBag, label: 'MARKET', path: '/marketplace' },
    { id: 'profile', icon: User, label: 'PROFILE', path: user ? `/profile?email=${user.email}` : '/settings' },
  ];

  return (
    <>
      {/* Top HUD */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-[#FF1493]/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-black tracking-tighter text-white">
              HOTMESS<span className="text-[#FF1493]">OS</span>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-white/40 font-mono uppercase tracking-wider">SWEAT EQUITY</div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-[#FFEB3B]" />
                  <span className="text-sm font-black text-[#FF1493] font-mono">{user.xp || 0} XP</span>
                  <span className="text-xs text-white/60">• LVL {level}</span>
                </div>
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF1493] to-[#FFEB3B] transition-all duration-300"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Module Switcher */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t-2 border-[#FF1493]">
        <div className="max-w-4xl mx-auto px-2 py-3 flex items-center justify-around">
          {modules.map(({ id, icon: Icon, label, path }) => {
            const isActive = id === 'pulse' 
              ? currentPath === '/' 
              : currentPath.includes(id) || currentPath.includes(path.split('?')[0]);
            
            return (
              <Link
                key={id}
                to={createPageUrl(path.startsWith('/') ? path.slice(1) : path)}
                onClick={() => onModuleChange?.(id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-[#FF1493] text-black' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={2.5} />
                <span className="text-[10px] font-black tracking-wider uppercase">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}