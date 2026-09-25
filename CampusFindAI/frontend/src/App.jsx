import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerificationPendingPage from './pages/VerificationPendingPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

import LostItemsListPage from './pages/LostItems/LostItemsListPage';
import LostItemFormPage from './pages/LostItems/LostItemFormPage';
import LostItemDetailPage from './pages/LostItems/LostItemDetailPage';

import FoundItemsListPage from './pages/FoundItems/FoundItemsListPage';
import FoundItemFormPage from './pages/FoundItems/FoundItemFormPage';
import FoundItemDetailPage from './pages/FoundItems/FoundItemDetailPage';
import ReportEditPage from './pages/ReportEditPage';

import MyClaimsPage from './pages/Claims/MyClaimsPage';
import ClaimChatPage from './pages/Claims/ClaimChatPage';
import SemanticSearchPage from './pages/Search/SemanticSearchPage';
import MyMatchesPage from './pages/Matches/MyMatchesPage';
import OwnershipVerificationPage from './pages/Matches/OwnershipVerificationPage';

import SecurityOverviewPage from './pages/Security/SecurityOverviewPage';
import SecurityClaimsPage from './pages/Security/SecurityClaimsPage';
import SecurityMatchesPage from './pages/Security/SecurityMatchesPage';
import SecurityLoginHistoryPage from './pages/Security/SecurityLoginHistoryPage';
import SecurityOwnershipReviewsPage from './pages/Security/SecurityOwnershipReviewsPage';
import SecurityOfficerRequestPage from './pages/SecurityOfficerRequestPage';
import AdminSecurityOfficerRequestsPage from './pages/AdminSecurityOfficerRequestsPage';
import CampusFindAssistantPage from './pages/CampusFindAssistantPage';
import CampusMapPage from './pages/CampusMapPage';
import ReputationHistoryPage from './pages/ReputationHistoryPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / auth routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/verification-pending"
            element={
              <PublicOnlyRoute>
                <VerificationPendingPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <PublicOnlyRoute>
                <VerifyEmailPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute>
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Authenticated app shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/campus-map" element={<CampusMapPage />} />
            <Route path="/reputation" element={<ReputationHistoryPage />} />

            <Route path="/lost-items" element={<LostItemsListPage />} />
            <Route path="/lost-items/new" element={<LostItemFormPage />} />
            <Route path="/lost-items/:id/edit" element={<ReportEditPage type="lost" />} />
            <Route path="/lost-items/:id" element={<LostItemDetailPage />} />

            <Route path="/found-items" element={<FoundItemsListPage />} />
            <Route path="/found-items/new" element={<FoundItemFormPage />} />
            <Route path="/found-items/:id/edit" element={<ReportEditPage type="found" />} />
            <Route path="/found-items/:id" element={<FoundItemDetailPage />} />

            <Route path="/my-claims" element={<MyClaimsPage />} />
            <Route path="/claims/:claimId/chat" element={<ClaimChatPage />} />
            <Route path="/my-matches" element={<MyMatchesPage />} />
            <Route path="/matches/:matchId/verify" element={<OwnershipVerificationPage />} />
            <Route path="/search" element={<SemanticSearchPage />} />
            <Route path="/assistant" element={<CampusFindAssistantPage />} />
            <Route path="/security-officer-request" element={<SecurityOfficerRequestPage />} />
          </Route>

          {/* Security Office (role-protected) */}
          <Route
            element={
              <ProtectedRoute requireOfficer>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/security" element={<SecurityOverviewPage />} />
            <Route path="/security/claims" element={<SecurityClaimsPage />} />
            <Route path="/security/matches" element={<SecurityMatchesPage />} />
            <Route path="/security/login-history" element={<SecurityLoginHistoryPage />} />
            <Route path="/security/ownership-verifications" element={<SecurityOwnershipReviewsPage />} />
          </Route>

          <Route element={<ProtectedRoute requireAdministrator><Layout /></ProtectedRoute>}>
            <Route path="/admin/security-officer-requests" element={<AdminSecurityOfficerRequestsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
