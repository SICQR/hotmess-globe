/**
 * L2VerificationSheet — Wraps SelfieVerificationFlow as a sheet.
 */
import { useSheet } from '@/contexts/SheetContext';
import SelfieVerificationFlow from '@/components/verification/SelfieVerificationFlow';

export default function L2VerificationSheet() {
  const { closeSheet } = useSheet();

  return (
    <SelfieVerificationFlow
      onComplete={() => closeSheet()}
      onDismiss={() => closeSheet()}
    />
  );
}
