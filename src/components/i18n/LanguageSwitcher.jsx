import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SUPPORTED_LANGUAGES, 
  getPreferredLanguage, 
  setLanguage,
  loadTranslations 
} from '@/i18n/config';

/**
 * Language Switcher Component
 * 
 * Provides a dropdown or button group to switch languages
 * 
 * @param {Object} props
 * @param {'dropdown' | 'buttons' | 'flags' | 'list' | 'compact'} props.variant - Display variant
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showLabel - Show language label (default true)
 * @param {boolean} props.showFlag - Show language flag emoji (default true)
 * @param {function} props.onChange - Optional callback when language changes
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  className,
  showLabel = true,
  showFlag = true,
  onChange,
}) {
  const [lang, setLang] = useState(getPreferredLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLanguage(lang);
  }, []);

  const handleChange = async (newLang) => {
    setIsLoading(true);
    setLang(newLang);
    setLanguage(newLang);
    await loadTranslations(newLang);
    setIsLoading(false);
    setIsOpen(false);
    onChange?.(newLang);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  if (variant === 'buttons') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <Button
            key={language.code}
            variant={lang === language.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleChange(language.code)}
            disabled={isLoading}
            className={cn(
              'min-w-[80px]',
              lang === language.code && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
          >
            {showFlag && <span className="mr-1">{language.flag}</span>}
            {showLabel ? language.nativeName : language.code.toUpperCase()}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'flags') {
    return (
      <div className={cn('flex gap-1', className)}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <Button
            key={language.code}
            variant="ghost"
            size="icon"
            onClick={() => handleChange(language.code)}
            disabled={isLoading}
            className={cn(
              'text-xl',
              lang === language.code && 'ring-2 ring-primary ring-offset-1 ring-offset-background rounded-full'
            )}
            title={language.name}
          >
            {language.flag}
            {lang === language.code && (
              <Check className="absolute bottom-0 right-0 h-3 w-3 text-primary bg-background rounded-full" />
            )}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
          Language
        </label>
        {SUPPORTED_LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => handleChange(language.code)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
              language.code === lang
                ? 'bg-[#FF1493]/20 border border-[#FF1493]/40'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            )}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{language.flag}</span>
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-white/40 text-sm">({language.name})</span>
            </span>
            {language.code === lang && (
              <Check className="w-5 h-5 text-[#39FF14]" />
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn('text-white/60 hover:text-white', className)}
            disabled={isLoading}
          >
            <Globe className="w-4 h-4 mr-1" />
            {lang.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-black border-white/20 min-w-[150px]">
          {SUPPORTED_LANGUAGES.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleChange(language.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{language.flag}</span>
                <span>{language.nativeName}</span>
              </span>
              {language.code === lang && (
                <Check className="w-4 h-4 text-[#39FF14]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default: Select dropdown
  return (
    <Select value={lang} onValueChange={handleChange} disabled={isLoading}>
      <SelectTrigger className={cn('w-[180px]', className)}>
        <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue>
          {showFlag && <span className="mr-1">{currentLanguage.flag}</span>}
          {showLabel ? currentLanguage.nativeName : currentLanguage.code.toUpperCase()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <div className="flex items-center gap-2">
              {showFlag && <span>{language.flag}</span>}
              <span>{language.nativeName}</span>
              {lang === language.code && <Check className="ml-auto h-4 w-4" />}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Compact Language Switcher
 * A smaller version for use in navigation bars
 */
export function CompactLanguageSwitcher({ className, onChange }) {
  const [lang, setLang] = useState(getPreferredLanguage);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (newLang) => {
    setIsLoading(true);
    setLang(newLang);
    setLanguage(newLang);
    await loadTranslations(newLang);
    setIsLoading(false);
    onChange?.(newLang);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <Select value={lang} onValueChange={handleChange} disabled={isLoading}>
      <SelectTrigger className={cn('w-auto gap-1 border-none bg-transparent px-2', className)}>
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-xs font-medium uppercase">{lang}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.nativeName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

export default LanguageSwitcher;
