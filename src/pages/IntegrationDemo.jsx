/**
 * HotMess OS Integration Demo Page
 * 
 * Demonstrates the complete HotMess OS Integration with:
 * - Telegram Auth
 * - Real-time Globe Data
 * - Radio BPM Sync
 * - Presence Tracking
 * - Unified Vault
 */

import React from 'react';
import HotMessOSIntegration from '@/components/integration/HotMessOSIntegration';
import { VaultProvider } from '@/contexts/VaultContext';

export default function IntegrationDemo() {
  return (
    <VaultProvider>
      <HotMessOSIntegration />
    </VaultProvider>
  );
}
