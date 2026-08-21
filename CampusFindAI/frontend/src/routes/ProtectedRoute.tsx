import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  roles?: string[];
};

export function ProtectedRoute({ roles: _roles }: ProtectedRouteProps) {
  const { token } = useAuth();

  // Role-based checks will be added here as authorization rules mature.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
