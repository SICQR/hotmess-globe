/**
 * L2CommunityGuidelinesSheet — renders the CommunityGuidelines page inside a
 * sheet (bypasses the Layout-wrapper crash that bounced /CommunityGuidelines
 * to Home). 2026-05-20.
 */
import CommunityGuidelines from '@/pages/CommunityGuidelines';

export default function L2CommunityGuidelinesSheet() {
  return (
    <div className="h-full overflow-y-auto">
      <CommunityGuidelines />
    </div>
  );
}
