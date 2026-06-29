/**
 * L2DoorScannerSheet — Venue door scanner
 *
 * Opened from L2BeaconSheet "Door Mode" button (event kind, owner only).
 *
 * Flow:
 *   1. Verify caller is beacon owner (guards against direct URL manipulation)
 *   2. Open device camera via getUserMedia + BarcodeDetector API
 *   3. On scan: call validate_ticket_qr RPC
 *   4. Display scoped result — tier_at_purchase, first_visit, plus_one, age_verified, scan status
 *   5. Fallback: manual token input if camera unavailable
 *
 * Scoped visibility contract (LIFECYCLE_SPEC §2.3):
 *   Venue sees ONLY: tier_at_purchase, first_visit, plus_one (bool), age_verified (bool), ticket_state
 *   Venue does NOT see: display_name, email, bio, full profile, location history
 *
 * Design tokens: #050507 bg, #C8962C gold, Oswald headings, Barlow body
 * No light mode. No gamification.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, CameraOff, Loader2, CheckCircle, XCircle, AlertTriangle,
  ScanLine, RefreshCw, Keyboard, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#050507',
  card:    '#111116',
  surface: '#1C1C1E',
  gold:    '#C8962C',
  green:   '#22C55E',
  red:     '#EF4444',
  amber:   '#F59E0B',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.12)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCAN RESULT DISPLAY
// ─────────────────────────────────────────────────────────────────────────────
function ScanResult({ result, onClear }) {
  if (!result) return null;

  const isValid   = result.valid === true;
  const isError   = result.error_code != null;
  const isScanned = result.ticket_state === 'scanned' && !result.just_scanned;

  const headerColor = isValid && !isError ? T.green
    : result.error_code === 'ALREADY_SCANNED' ? T.amber
    : T.red;

  const headerLabel = isValid && !isError
    ? 'ADMIT'
    : result.error_code === 'ALREADY_SCANNED'
      ? 'ALREADY SCANNED'
      : result.error_code === 'TICKET_NOT_FOUND'
        ? 'NOT A HOTMESS TICKET'
        : result.error_code === 'WRONG_EVENT'
          ? 'WRONG EVENT'
          : result.error_code === 'TICKET_VOID'
            ? 'TICKET VOID'
            : result.error_code === 'AGE_NOT_VERIFIED'
              ? 'AGE UNVERIFIED'
              : 'DENIED';

  const HeaderIcon = isValid && !isError ? CheckCircle
    : result.error_code === 'ALREADY_SCANNED' ? AlertTriangle
    : XCircle;

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-8 gap-5">

      {/* Result header */}
      <div
        className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-8"
        style={{ backgroundColor: `${headerColor}15`, border: `1px solid ${headerColor}40` }}
      >
        <HeaderIcon style={{ color: headerColor, width: 48, height: 48 }} strokeWidth={2} />
        <p
          className="font-black text-3xl tracking-[0.1em]"
          style={{ fontFamily: 'Oswald, sans-serif', color: headerColor }}
        >
          {headerLabel}
        </p>
      </div>

      {/* Scoped member info */}
      {isValid && (
        <div
          className="w-full rounded-2xl p-4 border border-white/8"
          style={{ backgroundColor: T.card }}
        >
          <p className="text-white/30 text-[10px] uppercase tracking-widest font-black mb-3">
            Ticket info
          </p>

          <div className="space-y-3">
            {/* Tier */}
            {result.tier_at_purchase && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">Tier</span>
                <span
                  className="text-xs font-black uppercase px-2 py-0.5 rounded-full"
                  style={{ color: T.gold, backgroundColor: `${T.gold}15` }}
                >
                  {result.tier_at_purchase}
                </span>
              </div>
            )}

            {/* First visit */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">First time here</span>
              <span
                className="text-xs font-black"
                style={{ color: result.first_visit ? T.gold : T.muted }}
              >
                {result.first_visit ? 'Yes ✦' : 'No'}
              </span>
            </div>

            {/* Plus one */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Plus one</span>
              <span
                className="text-xs font-black"
                style={{ color: result.plus_one_of ? T.gold : T.muted }}
              >
                {result.plus_one_of ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Age verified */}
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Age verified</span>
              <span
                className="flex items-center gap-1 text-xs font-black"
                style={{ color: result.age_verified ? T.green : T.red }}
              >
                {result.age_verified
                  ? <><CheckCircle className="w-3 h-3" /> Verified</>
                  : <><XCircle className="w-3 h-3" /> Not verified</>
                }
              </span>
            </div>

            {/* Ticket type */}
            {result.ticket_type && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">Type</span>
                <span className="text-white/60 text-xs font-semibold capitalize">
                  {result.ticket_type.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Already scanned warning */}
          {isScanned && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400 text-[11px] leading-relaxed">
                  This ticket was already scanned.
                  {result.scanned_at ? ` Scanned ${new Date(result.scanned_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Age not verified block */}
          {!result.age_verified && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <div className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
                <p className="text-[11px] leading-relaxed" style={{ color: T.red }}>
                  OSA: This person has not completed age verification. Venue must verify ID at door.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error detail */}
      {!isValid && (
        <div
          className="w-full rounded-2xl p-4 border"
          style={{ backgroundColor: `${T.red}08`, borderColor: `${T.red}30` }}
        >
          <p className="text-white/60 text-sm leading-relaxed">
            {result.error_code === 'TICKET_NOT_FOUND'  && "This isn't a HOTMESS ticket. If they booked on Outsavvy, check the Outsavvy app or guest list. Otherwise the code may be invalid or voided."}
            {result.error_code === 'WRONG_EVENT'        && 'This ticket is for a different event. Cannot admit.'}
            {result.error_code === 'TICKET_VOID'        && 'This ticket has been voided (refunded, transferred, or expired).'}
            {result.error_code === 'ALREADY_SCANNED'    && 'Ticket was already scanned. Check for duplicates.'}
            {result.error_code === 'AGE_NOT_VERIFIED'   && 'Member has not completed OSA age verification. Manual ID check required.'}
            {!result.error_code && (result.message || 'Validation failed. Do not admit.')}
          </p>
        </div>
      )}

      {/* Scan next */}
      <button
        onClick={onClear}
        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={{ backgroundColor: T.surface, color: T.white, border: `1px solid ${T.dim}` }}
      >
        <ScanLine className="w-4 h-4" />
        Scan next ticket
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL INPUT FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
function ManualInput({ onResult, scanning }) {
  const [token, setToken] = useState('');

  const handleSubmit = () => {
    if (!token.trim() || token.length !== 32) return;
    onResult(token.trim());
    setToken('');
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/40 text-xs text-center leading-relaxed">
        Enter the 32-character hex token shown below the QR code on the member's ticket
      </p>
      <div className="flex gap-2">
        <input
          value={token}
          onChange={e => setToken(e.target.value.toLowerCase().replace(/[^a-f0-9]/g, ''))}
          placeholder="32-char hex token..."
          maxLength={32}
          className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm font-mono focus:outline-none focus:border-[#C8962C]/60"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button
          onClick={handleSubmit}
          disabled={token.length !== 32 || scanning}
          className="px-4 py-3 rounded-xl text-xs font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          style={{ backgroundColor: T.gold, color: '#000' }}
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-white/20 text-[10px] text-center">{token.length}/32</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA SCANNER
// ─────────────────────────────────────────────────────────────────────────────
function CameraScanner({ beaconId, onToken }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef    = useRef(null);
  const [cameraState, setCameraState] = useState('requesting'); // requesting|active|denied|unsupported
  const [scanLine, setScanLine]       = useState(0); // animated scan line position (0..1)

  // Animate scan line
  useEffect(() => {
    let dir = 1, pos = 0;
    const tick = () => {
      pos += dir * 0.008;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      setScanLine(pos);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState('requesting');
    try {
      // Fast native path where available (Android/Chrome/desktop); otherwise the
      // scan loop falls back to @zxing/browser, which works on iOS Safari too.
      if ('BarcodeDetector' in window) {
        try { detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] }); }
        catch { detectorRef.current = null; }
      } else {
        detectorRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else {
        setCameraState('unsupported');
      }
    }
  }, []);

  // Scan loop — runs when camera is active.
  // BarcodeDetector (native) where available; @zxing/browser otherwise (iOS).
  useEffect(() => {
    if (cameraState !== 'active') return;
    let alive = true;
    let zxingControls = null;

    // Ticket QR encodes a 32-char hex token (possibly prefixed).
    const handleRaw = (raw) => {
      const match = String(raw || '').match(/([a-f0-9]{32})/i);
      if (match) { onToken(match[1].toLowerCase()); return true; }
      return false;
    };

    if (detectorRef.current) {
      const scan = async () => {
        if (!alive || !videoRef.current || videoRef.current.readyState < 2) {
          setTimeout(scan, 200); return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0 && handleRaw(codes[0].rawValue)) return; // parent resets after validation
        } catch { /* ignore */ }
        if (alive) setTimeout(scan, 300);
      };
      scan();
    } else {
      // Cross-browser fallback (iOS Safari has no BarcodeDetector).
      import('@zxing/browser').then(({ BrowserQRCodeReader }) => {
        if (!alive || !videoRef.current) return;
        const reader = new BrowserQRCodeReader();
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (!alive || !result) return;
          if (handleRaw(result.getText()) && zxingControls) { try { zxingControls.stop(); } catch { /* */ } }
        }).then((controls) => {
          zxingControls = controls;
          if (!alive) { try { controls.stop(); } catch { /* */ } }
        }).catch(() => { /* decode setup failed — manual input still available */ });
      });
    }

    return () => { alive = false; if (zxingControls) { try { zxingControls.stop(); } catch { /* */ } } };
  }, [cameraState, onToken]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [startCamera]);

  if (cameraState === 'requesting') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.gold }} />
        <p className="text-white/40 text-sm">Requesting camera access...</p>
      </div>
    );
  }

  if (cameraState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
        <CameraOff className="w-10 h-10 text-white/20" />
        <p className="text-white/60 font-bold text-sm">Camera access denied</p>
        <p className="text-white/30 text-xs leading-relaxed">
          Allow camera in your browser settings, or use the manual token input below.
        </p>
        <button
          onClick={startCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          style={{ backgroundColor: T.surface, color: T.muted, border: `1px solid ${T.dim}` }}
        >
          <RefreshCw className="w-4 h-4" /> Retry camera
        </button>
      </div>
    );
  }

  if (cameraState === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
        <Camera className="w-10 h-10 text-white/20" />
        <p className="text-white/50 text-sm font-bold">Camera scanning not supported</p>
        <p className="text-white/30 text-xs">Use manual token input below.</p>
      </div>
    );
  }

  // Active camera view
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '1/1' }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
      />
      {/* Dark overlay with transparent centre square */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-[10%] bg-black/60" />
        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-black/60" />
        {/* Left bar */}
        <div className="absolute top-[10%] bottom-[10%] left-0 w-[10%] bg-black/60" />
        {/* Right bar */}
        <div className="absolute top-[10%] bottom-[10%] right-0 w-[10%] bg-black/60" />

        {/* Corner brackets */}
        {[
          'top-[10%] left-[10%] border-t-2 border-l-2',
          'top-[10%] right-[10%] border-t-2 border-r-2',
          'bottom-[10%] left-[10%] border-b-2 border-l-2',
          'bottom-[10%] right-[10%] border-b-2 border-r-2',
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-6 h-6 ${cls}`}
            style={{ borderColor: T.gold }}
          />
        ))}

        {/* Animated scan line */}
        <div
          className="absolute left-[10%] right-[10%] h-0.5 opacity-70 transition-none"
          style={{
            top: `calc(10% + ${scanLine * 80}%)`,
            background: `linear-gradient(to right, transparent, ${T.gold}, transparent)`,
            boxShadow: `0 0 8px ${T.gold}`,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DOOR SCANNER SHEET
// ─────────────────────────────────────────────────────────────────────────────
export default function L2DoorScannerSheet({ beaconId }) {
  const [authState, setAuthState]   = useState('checking'); // checking|authorized|denied
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning]     = useState(false);
  const [inputMode, setInputMode]   = useState('camera'); // camera|manual
  const [scanCount, setScanCount]   = useState(0); // tracks successful admits this session
  const pendingTokenRef             = useRef(null);

  // ── Auth check: caller must be beacon owner ──────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAuthState('denied'); return; }

        const { data: beacon } = await supabase
          .from('beacons')
          .select('owner_id')
          .eq('id', beaconId)
          .single();

        if (!beacon || beacon.owner_id !== user.id) {
          // Check if user has venue/promoter tier as a fallback
          const { data: profile } = await supabase
            .from('profiles')
            .select('memberships(tier, status)')
            .eq('id', user.id)
            .single();

          const activeMs = profile?.memberships?.find(m => m.status === 'active');
          const tier     = activeMs?.tier ?? 'mess';
          const allowedTiers = ['venue', 'promoter', 'connected'];
          if (!allowedTiers.includes(tier)) {
            setAuthState('denied');
            return;
          }
        }
        setAuthState('authorized');
      } catch {
        setAuthState('denied');
      }
    };
    if (beaconId) check();
    else setAuthState('denied');
  }, [beaconId]);

  // ── Token handler — called from camera or manual input ───────────────────
  const handleToken = useCallback(async (token) => {
    if (scanning || pendingTokenRef.current === token) return;
    pendingTokenRef.current = token;
    setScanning(true);

    try {
      const { data, error } = await supabase.rpc('validate_ticket_qr', {
        qr_token: token,
        p_beacon_id: beaconId,
      });

      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setScanResult(result || { valid: false, error_code: 'TICKET_NOT_FOUND' });

      // Increment session admit counter on success
      if (result?.valid && !result?.error_code) {
        setScanCount(c => c + 1);
      }
    } catch (err) {
      console.error('[DoorScanner] RPC error:', err);
      setScanResult({ valid: false, error_code: null, message: err.message || 'Validation failed' });
    } finally {
      setScanning(false);
      pendingTokenRef.current = null;
    }
  }, [beaconId, scanning]);

  const clearResult = useCallback(() => {
    setScanResult(null);
  }, []);

  // ── Auth states ──────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div className="flex items-center justify-center h-48 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.gold }} />
        <p className="text-white/40 text-sm">Verifying access...</p>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-4">
        <XCircle className="w-12 h-12" style={{ color: T.red }} />
        <div>
          <p className="text-white font-black text-lg">Access Denied</p>
          <p className="text-white/40 text-sm mt-1">
            Door Mode is only available to the event owner or venue/promoter tier members.
          </p>
        </div>
      </div>
    );
  }

  // ── Show scan result ──────────────────────────────────────────────────────
  if (scanResult) {
    return <ScanResult result={scanResult} onClear={clearResult} />;
  }

  // ── Scanner UI ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-white font-black text-xl"
              style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}
            >
              DOOR MODE
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              {scanning ? 'Validating...' : 'Scan or enter ticket QR'}
            </p>
          </div>
          {/* Session counter */}
          {scanCount > 0 && (
            <div
              className="flex flex-col items-center px-3 py-2 rounded-xl"
              style={{ backgroundColor: `${T.green}15`, border: `1px solid ${T.green}30` }}
            >
              <span className="font-black text-lg leading-none" style={{ color: T.green }}>
                {scanCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: `${T.green}90` }}>
                admitted
              </span>
            </div>
          )}
        </div>

        {/* Input mode toggle */}
        <div className="flex gap-2 mt-3">
          {[
            { id: 'camera', icon: Camera, label: 'Camera' },
            { id: 'manual', icon: Keyboard, label: 'Manual' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setInputMode(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: inputMode === id ? T.gold : T.surface,
                color: inputMode === id ? '#000' : T.muted,
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera or manual */}
      <div className="flex-1 overflow-hidden px-4">
        {inputMode === 'camera' ? (
          <div className="h-full flex flex-col gap-4 py-2">
            <CameraScanner beaconId={beaconId} onToken={handleToken} />
            {scanning && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.gold }} />
                <p className="text-white/40 text-sm">Validating ticket...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4">
            <ManualInput beaconId={beaconId} onResult={handleToken} scanning={scanning} />
          </div>
        )}
      </div>

      {/* Scope reminder footer */}
      <div className="px-4 py-3 border-t border-white/6">
        <p className="text-white/20 text-[10px] text-center leading-relaxed">
          You see: tier · first visit · plus one status · age verification only.
          Member identity is not disclosed.
        </p>
      </div>
    </div>
  );
}

