import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Layout from './components/Layout';
import { PageLoading } from './components/Ui';

// Public / auth pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerificationPendingPage = lazy(() => import('./pages/VerificationPendingPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Core user pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Items
const LostItemsListPage = lazy(() => import('./pages/LostItems/LostItemsListPage'));
const LostItemFormPage = lazy(() => import('./pages/LostItems/LostItemFormPage'));
const LostItemDetailPage = lazy(() => import('./pages/LostItems/LostItemDetailPage'));

const FoundItemsListPage = lazy(() => import('./pages/FoundItems/FoundItemsListPage'));
const FoundItemFormPage = lazy(() => import('./pages/FoundItems/FoundItemFormPage'));
const FoundItemDetailPage = lazy(() => import('./pages/FoundItems/FoundItemDetailPage'));
const ReportEditPage = lazy(() => import('./pages/ReportEditPage'));

// Claims & Search
const MyClaimsPage = lazy(() => import('./pages/Claims/MyClaimsPage'));
const ClaimChatPage = lazy(() => import('./pages/Claims/ClaimChatPage'));
const SemanticSearchPage = lazy(() => import('./pages/Search/SemanticSearchPage'));
const MyMatchesPage = lazy(() => import('./pages/Matches/MyMatchesPage'));
const OwnershipVerificationPage = lazy(() => import('./pages/Matches/OwnershipVerificationPage'));

// Security & Administration
const SecurityOverviewPage = lazy(() => import('./pages/Security/SecurityOverviewPage'));
const SecurityClaimsPage = lazy(() => import('./pages/Security/SecurityClaimsPage'));
const SecurityMatchesPage = lazy(() => import('./pages/Security/SecurityMatchesPage'));
const SecurityLoginHistoryPage = lazy(() => import('./pages/Security/SecurityLoginHistoryPage'));
const SecurityOwnershipReviewsPage = lazy(() => import('./pages/Security/SecurityOwnershipReviewsPage'));
const SecurityOfficerRequestPage = lazy(() => import('./pages/SecurityOfficerRequestPage'));
const AdminSecurityOfficerRequestsPage = lazy(() => import('./pages/AdminSecurityOfficerRequestsPage'));
const CampusFindAssistantPage = lazy(() => import('./pages/CampusFindAssistantPage'));
const ReputationHistoryPage = lazy(() => import('./pages/ReputationHistoryPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const VisualSearchPage = lazy(() => import('./pages/Search/VisualSearchPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoading />}>
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
              <Route path="/notifications" element={<NotificationsPage />} />
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
              <Route path="/visual-search" element={<VisualSearchPage />} />
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
