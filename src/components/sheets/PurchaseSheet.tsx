/**
 * PurchaseSheet — Purchase Confirmation Modal
 * 
 * Slides up from bottom, confirms order, unified dark/gold theme.
 */

import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface PurchaseSheetProps {
  onClose: () => void;
  productName?: string;
  orderId?: string;
}

export default function PurchaseSheet({ 
  onClose, 
  productName = 'Fire Leather Harness',
  orderId 
}: PurchaseSheetProps) {
  const navigate = useNavigate();

  const handleBackToMarket = () => {
    onClose();
    navigate('/market');
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/80"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 50, damping: 18 }}
        className="fixed inset-x-0 bottom-0 z-50 bg-darkest rounded-t-sheet shadow-gold border-t border-borderGlow p-7"
        style={{ minHeight: '33vh' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-muted hover:text-gold transition-colors"
        >
          <FaTimes className="text-xl" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center gap-4 mt-4">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <FaCheckCircle className="text-gold text-5xl drop-shadow-[0_0_20px_#FFB80066]" />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="font-bold text-light text-xl">Purchase Complete!</div>
            <div className="text-muted mt-2 text-base">
              Your order for the <span className="text-gold">{productName}</span> is confirmed.
            </div>
            {orderId && (
              <div className="text-muted text-sm mt-2">
                Order ID: <span className="text-light font-mono">{orderId}</span>
              </div>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3 w-full max-w-xs mt-4"
          >
            <button
              onClick={handleBackToMarket}
              className="w-full bg-gold text-dark rounded-full px-8 py-3 shadow-gold font-bold hover:shadow-[0_0_24px_#FFC94088] transition-shadow"
            >
              Back to Market
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-transparent border border-gold text-gold rounded-full px-8 py-3 font-bold hover:bg-gold/10 transition-colors"
            >
              View Orders
            </button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
