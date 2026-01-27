import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Heart, MapPin, Users, Calendar } from 'lucide-react';

/**
 * LUX BRUTALIST Call-to-Action Components
 * 
 * Strategic CTAs designed for conversion:
 * - Hero CTAs (primary actions)
 * - Contextual CTAs (inline prompts)
 * - Floating CTAs (persistent actions)
 * - Card CTAs (actionable content)
 */

/**
 * Hero CTA Block
 * Large, attention-grabbing primary action
 */
export function HeroCTA({
  headline,
  subheadline,
  primaryAction,
  secondaryAction,
  accentColor = '#FF1493',
  className = '',
}) {
  return (
    <div className={`relative border-2 border-white bg-black overflow-hidden ${className}`}>
      {/* LED glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor}40 0%, transparent 70%)`,
        }}
      />

      <div className="relative p-6 md:p-10">
        {/* Headline */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-[-0.02em] leading-[0.9] text-white mb-4">
          {headline}
        </h2>

        {/* Subheadline */}
        {subheadline && (
          <p className="font-mono text-sm md:text-base text-white/60 uppercase tracking-wider mb-8 max-w-lg">
            {subheadline}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          {primaryAction && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {primaryAction.href ? (
                <Link
                  to={primaryAction.href}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 font-mono text-sm uppercase tracking-wider font-bold transition-all"
                  style={{
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}20`,
                    boxShadow: `0 0 30px ${accentColor}50`,
                    color: 'white',
                  }}
                >
                  {primaryAction.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={primaryAction.onClick}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 font-mono text-sm uppercase tracking-wider font-bold transition-all"
                  style={{
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}20`,
                    boxShadow: `0 0 30px ${accentColor}50`,
                    color: 'white',
                  }}
                >
                  {primaryAction.label}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {secondaryAction && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {secondaryAction.href ? (
                <Link
                  to={secondaryAction.href}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white/30 text-white/70 font-mono text-sm uppercase tracking-wider hover:border-white hover:text-white transition-all"
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white/30 text-white/70 font-mono text-sm uppercase tracking-wider hover:border-white hover:text-white transition-all"
                >
                  {secondaryAction.label}
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Decorative corner */}
      <div 
        className="absolute top-0 right-0 w-20 h-20"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${accentColor}30 50%)`,
        }}
      />
    </div>
  );
}

/**
 * Quick Action Bar
 * Row of icon-based quick actions
 */
export function QuickActionBar({
  actions,
  className = '',
}) {
  const iconMap = {
    connect: Heart,
    discover: Zap,
    nearby: MapPin,
    social: Users,
    events: Calendar,
  };

  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 ${className}`}>
      {actions.map((action, index) => {
        const Icon = action.icon || iconMap[action.type] || Zap;
        
        return (
          <motion.div
            key={action.id || index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {action.href ? (
              <Link
                to={action.href}
                className={`
                  flex flex-col items-center gap-2 px-4 py-3 min-w-[80px]
                  border-2 font-mono text-[10px] uppercase tracking-wider
                  transition-all
                  ${action.active 
                    ? 'border-[#FF1493] bg-[#FF1493]/10 text-white shadow-[0_0_15px_rgba(255,20,147,0.4)]' 
                    : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{action.label}</span>
                {action.badge && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-[#FF1493] text-white"
                    style={{ boxShadow: '0 0 8px #FF1493' }}
                  >
                    {action.badge}
                  </span>
                )}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={`
                  relative flex flex-col items-center gap-2 px-4 py-3 min-w-[80px]
                  border-2 font-mono text-[10px] uppercase tracking-wider
                  transition-all
                  ${action.active 
                    ? 'border-[#FF1493] bg-[#FF1493]/10 text-white shadow-[0_0_15px_rgba(255,20,147,0.4)]' 
                    : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{action.label}</span>
                {action.badge && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[8px] font-bold bg-[#FF1493] text-white"
                    style={{ boxShadow: '0 0 8px #FF1493' }}
                  >
                    {action.badge}
                  </span>
                )}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Floating Action Button
 * Persistent action button that floats over content
 */
export function FloatingAction({
  icon: Icon = Zap,
  label,
  onClick,
  href,
  position = 'bottom-right', // 'bottom-right', 'bottom-center', 'bottom-left'
  color = '#FF1493',
  pulse = false,
  className = '',
}) {
  const positionClasses = {
    'bottom-right': 'bottom-24 right-4 lg:bottom-8 lg:right-8',
    'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8',
    'bottom-left': 'bottom-24 left-4 lg:bottom-8 lg:left-8',
  };

  const ButtonContent = () => (
    <>
      <Icon className="w-6 h-6" />
      {label && (
        <span className="font-mono text-xs uppercase tracking-wider font-bold">
          {label}
        </span>
      )}
    </>
  );

  const buttonStyles = {
    backgroundColor: color,
    boxShadow: `0 0 30px ${color}80`,
  };

  return (
    <motion.div
      className={`fixed z-[80] ${positionClasses[position]} ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {pulse && (
        <motion.div
          className="absolute inset-0 border-2"
          style={{ borderColor: color }}
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      
      {href ? (
        <Link
          to={href}
          className="flex items-center gap-3 px-6 py-4 border-2 border-transparent text-black font-bold transition-all"
          style={buttonStyles}
        >
          <ButtonContent />
        </Link>
      ) : (
        <button
          onClick={onClick}
          className="flex items-center gap-3 px-6 py-4 border-2 border-transparent text-black font-bold transition-all"
          style={buttonStyles}
        >
          <ButtonContent />
        </button>
      )}
    </motion.div>
  );
}

/**
 * Inline CTA
 * Contextual action embedded in content
 */
export function InlineCTA({
  text,
  action,
  variant = 'link', // 'link', 'button'
  color = '#FF1493',
}) {
  if (variant === 'link') {
    return action.href ? (
      <Link
        to={action.href}
        className="inline-flex items-center gap-1 font-mono text-sm uppercase tracking-wider font-bold transition-all hover:gap-2"
        style={{ color }}
      >
        {text}
        <ArrowRight className="w-3 h-3" />
      </Link>
    ) : (
      <button
        onClick={action.onClick}
        className="inline-flex items-center gap-1 font-mono text-sm uppercase tracking-wider font-bold transition-all hover:gap-2"
        style={{ color }}
      >
        {text}
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  }

  return action.href ? (
    <Link
      to={action.href}
      className="inline-flex items-center gap-2 px-4 py-2 border-2 font-mono text-xs uppercase tracking-wider font-bold transition-all hover:bg-white/5"
      style={{ borderColor: color, color }}
    >
      {text}
      <ArrowRight className="w-3 h-3" />
    </Link>
  ) : (
    <button
      onClick={action.onClick}
      className="inline-flex items-center gap-2 px-4 py-2 border-2 font-mono text-xs uppercase tracking-wider font-bold transition-all hover:bg-white/5"
      style={{ borderColor: color, color }}
    >
      {text}
      <ArrowRight className="w-3 h-3" />
    </button>
  );
}

/**
 * Banner CTA
 * Full-width promotional banner
 */
export function BannerCTA({
  message,
  action,
  variant = 'default', // 'default', 'urgent', 'success'
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const variantStyles = {
    default: {
      bg: '#FF1493',
      text: 'black',
    },
    urgent: {
      bg: '#FF3333',
      text: 'white',
    },
    success: {
      bg: '#39FF14',
      text: 'black',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className={`relative flex items-center justify-center gap-4 px-4 py-3 ${className}`}
      style={{ backgroundColor: styles.bg }}
    >
      <span 
        className="font-mono text-sm uppercase tracking-wider font-bold"
        style={{ color: styles.text }}
      >
        {message}
      </span>

      {action && (
        action.href ? (
          <Link
            to={action.href}
            className="px-4 py-1.5 border-2 font-mono text-xs uppercase tracking-wider font-bold transition-all hover:bg-white/20"
            style={{ borderColor: styles.text, color: styles.text }}
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-1.5 border-2 font-mono text-xs uppercase tracking-wider font-bold transition-all hover:bg-white/20"
            style={{ borderColor: styles.text, color: styles.text }}
          >
            {action.label}
          </button>
        )
      )}

      {dismissible && (
        <button
          onClick={onDismiss}
          className="absolute right-2 p-2 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: styles.text }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

export default HeroCTA;
