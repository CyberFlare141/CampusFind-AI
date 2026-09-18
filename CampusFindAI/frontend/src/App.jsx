import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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

            <Route path="/lost-items" element={<LostItemsListPage />} />
            <Route path="/lost-items/new" element={<LostItemFormPage />} />
            <Route path="/lost-items/:id/edit" element={<ReportEditPage type="lost" />} />
            <Route path="/lost-items/:id" element={<LostItemDetailPage />} />

            <Route path="/found-items" element={<FoundItemsListPage />} />
            <Route path="/found-items/new" element={<FoundItemFormPage />} />
            <Route path="/found-items/:id/edit" element={<ReportEditPage type="found" />} />
            <Route path="/found-items/:id" element={<FoundItemDetailPage />} />

            <Route path="/my-claims" element={<MyClaimsPage />} />
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
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
