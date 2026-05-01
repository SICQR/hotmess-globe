/**
 * ConfirmModal — Multi-level confirmation for Night Operator Panel.
 * Level LOW   → fires on single tap, no modal.
 * Level MEDIUM → modal: description + Cancel / Confirm.
 * Level HIGH   → modal: description + risk + "Type CONFIRM" text input.
 *
 * No window.confirm() anywhere — ESLint rule enforced.
 *
 * Usage:
 *   const { prompt } = useConfirm();
 *   await prompt({ level: 'high', title: 'Kill Switch', risk: 'Disables Ghosted grid for this venue.' });
 *   // resolves true/false
 */
import { useState, useCallback, useRef, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const T = {
  black:  '#000',
  white:  '#fff',
  gold:   '#C8962C',
  red:    '#FF3B30',
  card:   '#0d0d0d',
  border: '#1a1a1a',
  muted:  'rgba(255,255,255,0.3)',
};

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const prompt = useCallback(({ level = 'medium', title, description, risk }) => {
    if (level === 'low') return Promise.resolve(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ level, title, description, risk });
    });
  }, []);

  const handleResolve = (value) => {
    setModal(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ prompt }}>
      {children}
      <AnimatePresence>
        {modal && (
          <ConfirmDialog
            modal={modal}
            onConfirm={() => handleResolve(true)}
            onCancel={() => handleResolve(false)}
          />
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ modal, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const isHigh = modal.level === 'high';
  const canConfirm = isHigh ? typed === 'CONFIRM' : true;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{
          background: T.card,
          border: `1px solid ${isHigh ? T.red : T.border}`,
          borderRadius: 12,
          padding: '28px 24px',
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Level badge */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            color: isHigh ? T.red : T.gold,
            textTransform: 'uppercase',
            background: isHigh ? 'rgba(255,59,48,0.12)' : 'rgba(200,150,44,0.12)',
            padding: '3px 8px', borderRadius: 4,
          }}>
            {isHigh ? '⚠ HIGH RISK' : 'CONFIRM'}
          </span>
        </div>

        {/* Title */}
        <p style={{ color: T.white, fontWeight: 700, fontSize: 18, margin: '0 0 10px' }}>
          {modal.title}
        </p>

        {/* Description */}
        {modal.description && (
          <p style={{ color: T.muted, fontSize: 14, margin: '0 0 12px', lineHeight: 1.5 }}>
            {modal.description}
          </p>
        )}

        {/* Risk statement (HIGH only) */}
        {isHigh && modal.risk && (
          <div style={{
            background: 'rgba(255,59,48,0.08)',
            border: '1px solid rgba(255,59,48,0.2)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          }}>
            <p style={{ color: '#FF6B6B', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {modal.risk}
            </p>
          </div>
        )}

        {/* CONFIRM text input (HIGH only) */}
        {isHigh && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: T.muted, fontSize: 12, margin: '0 0 8px', letterSpacing: 0.5 }}>
              Type CONFIRM to proceed
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder='CONFIRM'
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111', border: `1px solid ${typed === 'CONFIRM' ? T.red : T.border}`,
                borderRadius: 8, padding: '10px 12px',
                color: T.white, fontSize: 15, fontWeight: 600, letterSpacing: 2,
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0',
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.muted,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            style={{
              flex: 1, padding: '12px 0',
              background: canConfirm
                ? (isHigh ? T.red : T.gold)
                : 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 8,
              color: canConfirm ? T.black : T.muted,
              fontWeight: 700, fontSize: 14, cursor: canConfirm ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
