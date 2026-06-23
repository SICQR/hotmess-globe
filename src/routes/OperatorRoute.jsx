/**
 * OperatorRoute — access gate + role flag for the operator cockpit (/operator).
 *
 * Reads the membership tier from the existing useUserContext hook (no new hook).
 * Access is limited to operators: tier `venue` OR `promoter`. Everyone else is
 * redirected to home. The derived role flag ('venue' | 'promoter') is passed
 * into OperatorPanel so the panel can adapt its tabs.
 */
import { Navigate } from 'react-router-dom';
import { useUserContext } from '@/hooks/useUserContext';
import OperatorPanel from '@/pages/OperatorPanel';

export default function OperatorRoute() {
  const { isVenue, isPromoter, tier, isLoading } = useUserContext();

  // Wait for tier resolution before deciding access (avoids a redirect flash).
  if (isLoading) return null;

  const isOperator = isVenue || isPromoter;
  if (!isOperator) return <Navigate to="/" replace />;

  // Derive the role flag from tier. Venue is the superset (also passes
  // isPromoter), so venue wins when both are true.
  const role = isVenue || String(tier).toLowerCase() === 'venue' ? 'venue' : 'promoter';

  return <OperatorPanel role={role} />;
}
