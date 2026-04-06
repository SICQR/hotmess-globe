/**
 * L2PrivacySheet — Privacy & Data Settings
 *
 * Wraps PrivacySettingsPanel (controls) + DataPrivacyHub (GDPR rights).
 * Two-tab layout: Controls | Data & Rights
 */

import { useState } from 'react';
import { Shield, Database } from 'lucide-react';
import PrivacySettingsPanel from '@/components/privacy/PrivacySettingsPanel';
import DataPrivacyHub from '@/components/privacy/DataPrivacyHub';

const AMBER = '#C8962C';

export default function L2PrivacySheet() {
  const [tab, setTab] = useState('controls');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2" style={{ background: 'rgba(5,5,7,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex gap-2">
          {[
            { id: 'controls', label: 'Controls', icon: Shield },
            { id: 'data', label: 'Data & Rights', icon: Database },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
              style={{
                background: tab === id ? `${AMBER}20` : 'rgba(255,255,255,0.04)',
                color: tab === id ? AMBER : 'rgba(255,255,255,0.4)',
                border: `1px solid ${tab === id ? `${AMBER}40` : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        {tab === 'controls' ? <PrivacySettingsPanel /> : <DataPrivacyHub />}
      </div>
    </div>
  );
}
