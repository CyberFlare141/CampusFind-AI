import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireOfficer = false }) {
  const { isAuthenticated, isOfficer } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireOfficer && !isOfficer) {
    return <Navigate to="/" replace />;
  }

  return children;
}
