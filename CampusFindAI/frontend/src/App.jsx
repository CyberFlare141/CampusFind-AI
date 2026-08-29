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

import MyClaimsPage from './pages/Claims/MyClaimsPage';

import SecurityOverviewPage from './pages/Security/SecurityOverviewPage';
import SecurityClaimsPage from './pages/Security/SecurityClaimsPage';
import SecurityMatchesPage from './pages/Security/SecurityMatchesPage';
import SecurityLoginHistoryPage from './pages/Security/SecurityLoginHistoryPage';

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
            <Route path="/lost-items/:id" element={<LostItemDetailPage />} />

            <Route path="/found-items" element={<FoundItemsListPage />} />
            <Route path="/found-items/new" element={<FoundItemFormPage />} />
            <Route path="/found-items/:id" element={<FoundItemDetailPage />} />

            <Route path="/my-claims" element={<MyClaimsPage />} />
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
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
