import * as React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * PageHeader - Consistent page header with back button and title
 * 
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional subtitle text
 * @param {string} accentWord - Word to highlight in neon pink
 * @param {boolean} showBack - Show back button (default: false)
 * @param {Function} onBack - Custom back handler (default: navigate(-1))
 * @param {React.ReactNode} action - Right side action button/element
 * @param {React.ReactNode} badge - Badge to show next to title
 */
export function PageHeader({
  title,
  subtitle,
  accentWord,
  showBack = false,
  onBack,
  action,
  badge,
  className,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Split title to apply accent
  const renderTitle = () => {
    if (!accentWord) {
      return (
        <>
          {title}<span className="text-[#C8962C]">.</span>
        </>
      );
    }

    const parts = title.split(new RegExp(`(${accentWord})`, 'i'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === accentWord.toLowerCase() ? (
            <span key={i} className="text-[#C8962C]">{part}</span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
        <span className="text-[#C8962C]">.</span>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("mb-6 md:mb-8", className)}
    >
      {showBack && (
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 text-white/60 hover:text-white -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              {renderTitle()}
            </h1>
            {badge}
          </div>
          
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/60 text-sm uppercase tracking-wider mt-2"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {action && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {action}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default PageHeader;
