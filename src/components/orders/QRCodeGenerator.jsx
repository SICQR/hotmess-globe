import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function QRCodeGenerator({ orderId, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!orderId || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Generate simple QR-like pattern based on order ID
    const cellSize = size / 25;
    const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    ctx.fillStyle = '#FFFFFF';
    
    // Create pattern based on order ID hash
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        const shouldFill = ((x * 31 + y * 17 + hash) % 3) === 0;
        if (shouldFill) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add corner markers
    const markerSize = cellSize * 7;
    ctx.fillStyle = '#FF1493';
    
    // Top-left
    ctx.fillRect(0, 0, markerSize, cellSize);
    ctx.fillRect(0, 0, cellSize, markerSize);
    ctx.fillRect(markerSize - cellSize, 0, cellSize, markerSize);
    ctx.fillRect(0, markerSize - cellSize, markerSize, cellSize);

    // Top-right
    ctx.fillRect(size - markerSize, 0, markerSize, cellSize);
    ctx.fillRect(size - cellSize, 0, cellSize, markerSize);
    ctx.fillRect(size - markerSize, 0, cellSize, markerSize);
    ctx.fillRect(size - markerSize, markerSize - cellSize, markerSize, cellSize);

    // Bottom-left
    ctx.fillRect(0, size - markerSize, markerSize, cellSize);
    ctx.fillRect(0, size - markerSize, cellSize, markerSize);
    ctx.fillRect(markerSize - cellSize, size - markerSize, cellSize, markerSize);
    ctx.fillRect(0, size - cellSize, markerSize, cellSize);

  }, [orderId, size]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${orderId.slice(0, 8)}-qr.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 border-4 border-[#FF1493]">
        <canvas ref={canvasRef} className="block" />
      </div>
      <div className="text-center">
        <p className="text-xs text-white/40 uppercase mb-2 font-mono">Order ID: {orderId.slice(0, 12)}...</p>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download QR Code
        </Button>
      </div>
    </div>
  );
}