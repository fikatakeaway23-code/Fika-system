import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout }         from './components/Layout.jsx';
import { LoginPage }      from './pages/LoginPage.jsx';
import { DashboardPage }  from './pages/DashboardPage.jsx';
import { UsagePage }      from './pages/UsagePage.jsx';
import { ChartPage }      from './pages/ChartPage.jsx';
import { TopUpPage }      from './pages/TopUpPage.jsx';
import { ProfilePage }    from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index          element={<DashboardPage />} />
        <Route path="usage"   element={<UsagePage />} />
        <Route path="chart"   element={<ChartPage />} />
        <Route path="topup"   element={<TopUpPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
