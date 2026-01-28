import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  SUPPORTED_LANGUAGES, 
  getPreferredLanguage, 
  setLanguage,
  loadTranslations 
} from '@/i18n/config';

/**
 * Language Switcher Component
 * Allows users to change the application language
 */
export default function LanguageSwitcher({ 
  variant = 'dropdown', // 'dropdown' | 'list' | 'compact'
  onLanguageChange,
  className = '' 
}) {
  const [currentLanguage, setCurrentLanguage] = useState(getPreferredLanguage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Set initial language
    setLanguage(currentLanguage);
  }, []);

  const handleLanguageChange = async (langCode) => {
    setCurrentLanguage(langCode);
    setLanguage(langCode);
    
    // Preload translations
    await loadTranslations(langCode);
    
    // Callback for parent components
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
    
    // Optionally reload page to apply translations
    // window.location.reload();
    
    setIsOpen(false);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={`text-white/60 hover:text-white ${className}`}
          >
            <Globe className="w-4 h-4 mr-1" />
            {currentLang.code.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-black border-white/20 min-w-[150px]">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </span>
              {lang.code === currentLanguage && (
                <Check className="w-4 h-4 text-[#39FF14]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
          Language
        </label>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
              lang.code === currentLanguage
                ? 'bg-[#FF1493]/20 border border-[#FF1493]/40'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-white/40 text-sm">({lang.name})</span>
            </span>
            {lang.code === currentLanguage && (
              <Check className="w-5 h-5 text-[#39FF14]" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`border-white/20 text-white ${className}`}
        >
          <span className="text-lg mr-2">{currentLang.flag}</span>
          {currentLang.nativeName}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black border-white/20 min-w-[200px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer py-3"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <div>
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-white/40">{lang.name}</div>
              </div>
            </span>
            {lang.code === currentLanguage && (
              <Check className="w-4 h-4 text-[#39FF14]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Language Provider Hook
 * For use in components that need translation context
 */
export function useLanguage() {
  const [language, setLang] = useState(getPreferredLanguage());
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const loadLang = async () => {
      const trans = await loadTranslations(language);
      setTranslations(trans);
    };
    loadLang();
  }, [language]);

  const changeLanguage = async (langCode) => {
    setLanguage(langCode);
    setLang(langCode);
    const trans = await loadTranslations(langCode);
    setTranslations(trans);
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  };

  return {
    language,
    translations,
    changeLanguage,
    t,
  };
}
