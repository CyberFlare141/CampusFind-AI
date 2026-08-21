import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { LostItemsPage } from '../pages/LostItems/LostItemsPage';
import { FoundItemsPage } from '../pages/FoundItems/FoundItemsPage';
import { ClaimsPage } from '../pages/Claims/ClaimsPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lost-items" element={<LostItemsPage />} />
          <Route path="/found-items" element={<FoundItemsPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
