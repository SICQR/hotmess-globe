import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Language Switcher Component
 * 
 * Provides a dropdown or button group to switch languages
 * 
 * @param {Object} props
 * @param {'dropdown' | 'buttons' | 'flags'} props.variant - Display variant
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showLabel - Show language label (default true)
 * @param {boolean} props.showFlag - Show language flag emoji (default true)
 * @param {function} props.onChange - Optional callback when language changes
 * 
 * @example
 * // Dropdown (default)
 * <LanguageSwitcher />
 * 
 * // Button group
 * <LanguageSwitcher variant="buttons" />
 * 
 * // Flags only
 * <LanguageSwitcher variant="flags" showLabel={false} />
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  className,
  showLabel = true,
  showFlag = true,
  onChange,
}) {
  const { lang, setLang, supportedLanguages, isLoading } = useTranslation();

  const handleChange = (newLang) => {
    setLang(newLang);
    onChange?.(newLang);
  };

  const currentLanguage = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];

  if (variant === 'buttons') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {supportedLanguages.map((language) => (
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
        {supportedLanguages.map((language) => (
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

  // Default: dropdown
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
        {supportedLanguages.map((language) => (
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
 * 
 * A smaller version for use in navigation bars
 */
export function CompactLanguageSwitcher({ className, onChange }) {
  const { lang, setLang, supportedLanguages, isLoading } = useTranslation();

  const handleChange = (newLang) => {
    setLang(newLang);
    onChange?.(newLang);
  };

  const currentLanguage = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];

  return (
    <Select value={lang} onValueChange={handleChange} disabled={isLoading}>
      <SelectTrigger className={cn('w-auto gap-1 border-none bg-transparent px-2', className)}>
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-xs font-medium uppercase">{lang}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {supportedLanguages.map((language) => (
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

export default LanguageSwitcher;
