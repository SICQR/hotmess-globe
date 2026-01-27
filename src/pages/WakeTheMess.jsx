import { Navigate } from 'react-router-dom';

// Legacy page - redirects to consolidated radio show route
export default function WakeTheMess() {
  return <Navigate to="/music/shows/wake-the-mess" replace />;
}
