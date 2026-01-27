import { Navigate } from 'react-router-dom';

// Legacy page - redirects to consolidated radio show route
export default function HandNHand() {
  return <Navigate to="/music/shows/hand-n-hand" replace />;
}
