import { Navigate, useLocation } from 'react-router-dom';
import { getAccount, isLoggedIn } from '../lib/auth.js';

export function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const mustChangePassword = Boolean(getAccount()?.mustChangePassword);
  if (mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }
  return children;
}
