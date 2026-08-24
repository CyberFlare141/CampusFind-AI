import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const securityRoles = ['SecurityOfficer', 'Administrator'];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSecurity = user && securityRoles.includes(user.role);

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/dashboard">CampusFind <span>AI</span></NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/lost-items">Lost items</NavLink>
          <NavLink to="/found-items">Found items</NavLink>
          <NavLink to="/claims">Claims</NavLink>
          {isSecurity && <NavLink to="/security">Security</NavLink>}
        </nav>
        <div className="account-menu">
          <span className="account-email" title={user?.email}>{user?.email}</span>
          <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
        </div>
      </header>
      <div className="page-container"><Outlet /></div>
    </div>
  );
}
