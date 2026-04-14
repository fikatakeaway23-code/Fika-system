import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth.js';

// Public pages
import { LandingPage }   from './pages/public/LandingPage.jsx';
import { MenuPage }      from './pages/public/MenuPage.jsx';
import { CorporatePage } from './pages/public/CorporatePage.jsx';
import { AboutPage }     from './pages/public/AboutPage.jsx';

// Auth
import { LoginPage } from './pages/staff/LoginPage.jsx';

// Staff dashboard
import { DashboardLayout }   from './pages/staff/DashboardLayout.jsx';
import { OverviewPage }      from './pages/staff/OverviewPage.jsx';
import { ShiftsPage }        from './pages/staff/ShiftsPage.jsx';
import { FinancePage }       from './pages/staff/FinancePage.jsx';
import { MonthlyReportPage } from './pages/staff/MonthlyReportPage.jsx';
import { ExpensesPage }      from './pages/staff/ExpensesPage.jsx';
import { MembershipsPage }      from './pages/staff/MembershipsPage.jsx';
import { HRPage }               from './pages/staff/HRPage.jsx';
import { MenuManagementPage }   from './pages/staff/MenuManagementPage.jsx';
import { AnnouncementsPage }    from './pages/staff/AnnouncementsPage.jsx';
import { EquipmentPage }        from './pages/staff/EquipmentPage.jsx';
import { TargetsPage }          from './pages/staff/TargetsPage.jsx';
import { SuppliersPage }        from './pages/staff/SuppliersPage.jsx';
import { InventoryPage }        from './pages/staff/InventoryPage.jsx';
import { WastePage }            from './pages/staff/WastePage.jsx';
import { SchedulePage }         from './pages/staff/SchedulePage.jsx';

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/staff/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"           element={<LandingPage />} />
        <Route path="/menu"       element={<MenuPage />} />
        <Route path="/corporate"  element={<CorporatePage />} />
        <Route path="/about"      element={<AboutPage />} />

        {/* Staff auth */}
        <Route path="/staff/login" element={<LoginPage />} />

        {/* Staff dashboard — protected */}
        <Route path="/staff" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index                element={<OverviewPage />} />
          <Route path="shifts"        element={<ShiftsPage />} />
          <Route path="finance"       element={<FinancePage />} />
          <Route path="reports"       element={<MonthlyReportPage />} />
          <Route path="expenses"      element={<ExpensesPage />} />
          <Route path="memberships"   element={<MembershipsPage />} />
          <Route path="hr"            element={<HRPage />} />
          <Route path="menu"          element={<MenuManagementPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="equipment"     element={<EquipmentPage />} />
          <Route path="targets"       element={<TargetsPage />} />
          <Route path="suppliers"     element={<SuppliersPage />} />
          <Route path="inventory"     element={<InventoryPage />} />
          <Route path="waste"         element={<WastePage />} />
          <Route path="schedule"      element={<SchedulePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
