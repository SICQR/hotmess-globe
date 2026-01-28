import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SUPPORTED_LANGUAGES,
  getPreferredLanguage,
  setLanguage,
} from '@/i18n/config';

/**
 * Language Switcher Component
 * Allows users to change the app's language
 */
export default function LanguageSwitcher({ 
  variant = 'default', 
  showLabel = true,
  onLanguageChange 
}) {
  const [currentLang, setCurrentLang] = useState(getPreferredLanguage());
  
  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setCurrentLang(langCode);
    onLanguageChange?.(langCode);
    
    // Reload the page to apply translations
    // In a real app with a translation library like react-i18next,
    // this would trigger a re-render instead
    window.location.reload();
  };
  
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);
  
  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors">
            <span className="text-lg">{currentLanguage?.flag}</span>
            <ChevronDown className="w-4 h-4 text-white/40" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-black border-white/20">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </div>
              {currentLang === lang.code && (
                <Check className="w-4 h-4 text-[#39FF14]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Globe className="w-4 h-4 mr-2" />
          {showLabel && (
            <>
              <span className="text-lg mr-2">{currentLanguage?.flag}</span>
              <span>{currentLanguage?.nativeName}</span>
            </>
          )}
          {!showLabel && (
            <span className="text-lg">{currentLanguage?.flag}</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-black border-white/20 min-w-[200px]"
        align="end"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-white/60">{lang.name}</div>
              </div>
            </div>
            {currentLang === lang.code && (
              <Check className="w-4 h-4 text-[#39FF14]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Language Settings Row
 * For use in settings pages
 */
export function LanguageSettingsRow() {
  const [currentLang, setCurrentLang] = useState(getPreferredLanguage());
  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);
  
  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setCurrentLang(langCode);
    window.location.reload();
  };
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#00D9FF]" />
          </div>
          <div>
            <div className="font-semibold">Language</div>
            <div className="text-sm text-white/60">{currentLanguage?.name}</div>
          </div>
        </div>
        
        <LanguageSwitcher variant="minimal" />
      </div>
      
      {/* Language List (alternative to dropdown) */}
      <div className="mt-4 pt-4 border-t border-white/10 hidden">
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                currentLang === lang.code
                  ? 'bg-[#E62020]/20 border border-[#E62020]'
                  : 'bg-white/5 border border-white/10 hover:border-white/30'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="text-left">
                <div className="font-medium text-sm">{lang.nativeName}</div>
                <div className="text-xs text-white/60">{lang.name}</div>
              </div>
              {currentLang === lang.code && (
                <Check className="w-4 h-4 text-[#39FF14] ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
