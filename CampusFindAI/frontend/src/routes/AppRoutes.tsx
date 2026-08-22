import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { LostItemsPage } from '../pages/LostItems/LostItemsPage';
import { FoundItemsPage } from '../pages/FoundItems/FoundItemsPage';
import { ClaimsPage } from '../pages/Claims/ClaimsPage';
import { SecurityDashboardPage } from '../pages/Security/SecurityDashboardPage';
import { PendingClaimsPage } from '../pages/Security/PendingClaimsPage';
import { ClaimReviewPage } from '../pages/Security/ClaimReviewPage';
import { SuggestedMatchesPage } from '../pages/Security/SuggestedMatchesPage';
import { LoginConfirmationPage } from '../pages/Security/LoginConfirmationPage';
import { LoginHistoryPage } from '../pages/Security/LoginHistoryPage';

const SECURITY_ROLES = ['SecurityOfficer', 'Administrator'];

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

        <Route element={<ProtectedRoute roles={SECURITY_ROLES} />}>
          <Route path="/security" element={<SecurityDashboardPage />} />
          <Route path="/security/claims" element={<PendingClaimsPage />} />
          <Route path="/security/claims/:id" element={<ClaimReviewPage />} />
          <Route path="/security/matches" element={<SuggestedMatchesPage />} />
          <Route
            path="/security/login-confirmation"
            element={<LoginConfirmationPage />}
          />
          <Route
            path="/security/login-history"
            element={<LoginHistoryPage />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
