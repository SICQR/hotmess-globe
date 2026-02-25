import React from 'react';
import { Home, Globe, Radio, Users, ShoppingBag, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function OSHud({ user, onModuleChange }) {
  const location = useLocation();
  const currentPath = location?.pathname || '/';


  const modules = [
    { id: 'home', icon: Home, label: 'HOME', path: '/' },
    { id: 'pulse', icon: Globe, label: 'PULSE', path: '/pulse' },
    { id: 'social', icon: Users, label: 'SOCIAL', path: '/social' },
    { id: 'market', icon: ShoppingBag, label: 'MARKET', path: '/market' },
    { id: 'music', icon: Radio, label: 'MUSIC', path: '/music' },
    { id: 'more', icon: Menu, label: 'MORE', path: '/more' },
  ];

  return (
    <>
      {/* Top HUD */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-[#C8962C]/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-black tracking-tighter text-white">
              HOTMESS<span className="text-[#C8962C]">OS</span>
            </div>
          </div>
          
        </div>
      </div>

      {/* Bottom Module Switcher */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t-2 border-[#C8962C]">
        <div className="max-w-4xl mx-auto px-2 py-3 flex items-center justify-around">
          {modules.map(({ id, icon: Icon, label, path }) => {
            const isActive =
              path === '/'
                ? currentPath === '/'
                : currentPath === path || currentPath.startsWith(`${path}/`);
            
            return (
              <Link
                key={id}
                to={createPageUrl(path)}
                onClick={() => onModuleChange?.(id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-[#C8962C] text-black' 
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