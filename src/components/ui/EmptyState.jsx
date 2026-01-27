import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  headingLevel = 'h3'
}) {
  const Heading = headingLevel;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
      aria-label={title}
    >
      {Icon && (
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6" aria-hidden="true">
          <Icon className="w-10 h-10 text-white/20" />
        </div>
      )}
      <Heading className="text-xl font-black uppercase mb-2">{title}</Heading>
      <p className="text-white/60 mb-6 max-w-md">{description}</p>
      {action && actionLabel && (
        <Button onClick={action} className="bg-[#E62020] text-black font-black">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}