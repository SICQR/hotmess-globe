/**
 * L2ContactSheet — renders the Contact page inside a sheet (bypasses the
 * Layout-wrapper crash that bounced standalone /Contact to Home). 2026-05-20.
 */
import Contact from '@/pages/Contact';

export default function L2ContactSheet() {
  return (
    <div className="h-full overflow-y-auto">
      <Contact />
    </div>
  );
}
