/**
 * HOTMESS v6 — Care Settings
 * Spec: DEV_BRIEF_support-proximity.docx §5
 *
 * Entry point: Settings > Care
 * Default: OFF
 * Behind flag: v6_support_proximity_ui
 *
 * UI CONSTRAINTS — from spec:
 * - Toggle: "Notify me about nearby support meetings" | Default: OFF
 * - Sub-option (visible when enabled): Detail level generic | detailed
 * - DO NOT add to: chat, meet flow, Globe, discovery, push settings, any AI surface
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useV6Flag } from '@/hooks/useV6Flag';
import { getSupportPreferences, setSupportEnabled, setSupportDetailLevel } from '@/lib/v6/supportProximity';

export default function CareSettings() {
  const { user } = useAuth();
  const flagOn = useV6Flag('v6_support_proximity_ui');

  const [enabled, setEnabled] = useState(false);
  const [detailLevel, setDetailLevel] = useState('generic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id || !flagOn) return;
    getSupportPreferences(user.id).then(prefs => {
      if (prefs?.support) {
        setEnabled(prefs.support.support_notifications_enabled ?? false);
        setDetailLevel(prefs.support.support_detail_level ?? 'generic');
      }
      setLoading(false);
    });
  }, [user?.id, flagOn]);

  // Flag off → render nothing (spec: "If not explicitly enabled it does not exist")
  if (!flagOn) return null;
  if (loading) return null;

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    await setSupportEnabled(user.id, next);
    setSaving(false);
  };

  const handleDetailLevel = async (level) => {
    setDetailLevel(level);
    setSaving(true);
    await setSupportDetailLevel(user.id, level);
    setSaving(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <p style={styles.sectionLabel}>SUPPORT</p>

        {/* Primary toggle */}
        <div style={styles.row}>
          <div style={styles.rowText}>
            <span style={styles.rowTitle}>Nearby support</span>
            <span style={styles.rowSub}>
              Get a quiet notification when a support meeting is nearby
            </span>
          </div>
          <button
            style={{ ...styles.toggle, ...(enabled ? styles.toggleOn : styles.toggleOff) }}
            onClick={handleToggle}
            disabled={saving}
            aria-label="Toggle nearby support notifications"
          >
            <div style={{ ...styles.toggleKnob, ...(enabled ? styles.knobOn : styles.knobOff) }} />
          </button>
        </div>

        {/* Detail level — only shown when enabled */}
        {enabled && (
          <div style={styles.subOption}>
            <p style={styles.subLabel}>Notification detail</p>
            <div style={styles.radioGroup}>
              <button
                style={{ ...styles.radioOption, ...(detailLevel === 'generic' ? styles.radioSelected : {}) }}
                onClick={() => handleDetailLevel('generic')}
                disabled={saving}
              >
                <div style={styles.radioIndicator}>
                  {detailLevel === 'generic' && <div style={styles.radioDot} />}
                </div>
                <div>
                  <span style={styles.radioTitle}>General</span>
                  <span style={styles.radioExample}>"Support nearby tonight · 10 min away"</span>
                </div>
              </button>

              <button
                style={{ ...styles.radioOption, ...(detailLevel === 'detailed' ? styles.radioSelected : {}) }}
                onClick={() => handleDetailLevel('detailed')}
                disabled={saving}
              >
                <div style={styles.radioIndicator}>
                  {detailLevel === 'detailed' && <div style={styles.radioDot} />}
                </div>
                <div>
                  <span style={styles.radioTitle}>Specific</span>
                  <span style={styles.radioExample}>"AA / NA meeting nearby · 10 min away"</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles — HOTMESS brand: dark bg, gold accent, no light mode ───────────────
const styles = {
  container: {
    background: '#050507',
    color: '#FFFFFF',
    padding: '0 16px',
  },
  section: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#666',
    textTransform: 'uppercase',
    margin: '0 0 16px 0',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 0',
    borderBottom: '1px solid #111',
  },
  rowText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: '#FFFFFF',
  },
  rowSub: {
    fontSize: 13,
    color: '#666',
    lineHeight: 1.4,
  },
  toggle: {
    position: 'relative',
    width: 44,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
    padding: 0,
  },
  toggleOn:  { background: '#C8962C' },
  toggleOff: { background: '#333' },
  toggleKnob: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#FFFFFF',
    transition: 'left 0.2s',
  },
  knobOn:  { left: 21 },
  knobOff: { left: 3 },
  subOption: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  radioOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    background: '#0E0E10',
    border: '1px solid #1A1A1C',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
  },
  radioSelected: {
    borderColor: '#C8962C',
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid #444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#C8962C',
  },
  radioTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#FFF',
    marginBottom: 2,
  },
  radioExample: {
    display: 'block',
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
};
