/**
 * BrandBackground
 * Reusable full-screen black bg with the three animated brand blobs.
 * Used by AgeGate, ConsentForm, OnboardingGate, HotmessSplash.
 */
export default function BrandBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-25 animate-pulse"
        style={{ background: '#C8962C' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ background: '#B026FF', animationDelay: '1.2s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-10 animate-pulse"
        style={{ background: '#00D9FF', animationDelay: '2.4s' }}
      />
    </div>
  );
}
