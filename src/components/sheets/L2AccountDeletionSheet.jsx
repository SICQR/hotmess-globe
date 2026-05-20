/**
 * L2AccountDeletionSheet — renders the AccountDeletion page inside a sheet.
 *
 * 2026-05-20: Settings rows previously navigated to standalone /AccountDeletion
 * etc. Those pages throw inside the <Layout> wrapper → PageErrorBoundary
 * redirects to Home ("crashes back to home"). Rendering the page component
 * bare inside a sheet bypasses Layout + that error boundary entirely. The page
 * brings its own header/back affordance.
 */
import AccountDeletion from '@/pages/AccountDeletion';

export default function L2AccountDeletionSheet() {
  return (
    <div className="h-full overflow-y-auto">
      <AccountDeletion />
    </div>
  );
}
