import { Navigate } from 'react-router-dom';

// Legacy page - redirects to consolidated radio show route
export default function DialADaddy() {
  return <Navigate to="/music/shows/dial-a-daddy" replace />;
}
