import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth.js';

export function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}
