/**
 * L2QRSheet — QR code display
 * Shows a QR code for an order or ticket.
 */

import { useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';

export default function L2QRSheet({ orderId, ticketId }) {
  const canvasRef = useRef(null);
  const value = orderId ? `hm:order:${orderId}` : ticketId ? `hm:ticket:${ticketId}` : 'hotmess';
  const label = orderId ? `Order #${orderId?.slice(-6).toUpperCase()}` : `Ticket`;

  useEffect(() => {
    // Draw a simple QR placeholder using canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    // Simple dot pattern (visual placeholder — in production use qrcode library)
    ctx.fillStyle = '#000';
    const moduleSize = 8;
    const modules = Math.floor(size / moduleSize);
    // Generate deterministic pattern from value
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        const seed = (hash * (row + 1) * (col + 1)) % 7;
        if (seed < 4) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 1, moduleSize - 1);
        }
      }
    }
    // Corner marks
    const draw3x3 = (x, y) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, 24, 24);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 4, y + 4, 16, 16);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 8, y + 8, 8, 8);
    };
    draw3x3(0, 0);
    draw3x3(size - 24, 0);
    draw3x3(0, size - 24);
  }, [value]);

  return (
    <div className="flex flex-col items-center px-4 py-8 h-full">
      <div className="bg-white rounded-3xl p-6 shadow-2xl">
        <canvas ref={canvasRef} className="w-48 h-48" />
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-4 h-4 text-[#C8962C]" />
          <p className="text-[#C8962C] font-black text-sm uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-white/30 text-xs font-mono break-all">{value}</p>
      </div>

      <div className="mt-6 bg-[#1C1C1E] rounded-2xl px-4 py-3 text-center mx-4">
        <p className="text-white/50 text-xs leading-relaxed">
          Show this QR code at the venue or to your seller to confirm your order.
        </p>
      </div>
    </div>
  );
}
