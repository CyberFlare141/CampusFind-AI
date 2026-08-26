import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ClipboardCheck, FilePlus2, LayoutDashboard, LogOut, Search, ShieldCheck, Sparkles } from 'lucide-react';

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
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard"><span className="brand-mark"><ShieldCheck size={18} /></span><span>CampusFind <b>AI</b></span></NavLink>
        <p className="nav-label">Workspace</p>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/dashboard"><LayoutDashboard size={17} />Dashboard</NavLink>
          <NavLink to="/lost-items"><FilePlus2 size={17} />Lost items</NavLink>
          <NavLink to="/found-items"><Search size={17} />Found items</NavLink>
          <NavLink to="/claims"><ClipboardCheck size={17} />Claims</NavLink>
          {user?.role === 'Student' && <NavLink to="/security-officer-access"><ShieldCheck size={17} />Request officer access</NavLink>}
          {isSecurity && <><p className="nav-label nav-label-spaced">Operations</p><NavLink to="/security"><ShieldCheck size={17} />Security console</NavLink></>}
          {user?.role === 'Administrator' && <NavLink to="/admin/security-officer-requests"><ClipboardCheck size={17} />Officer requests</NavLink>}
        </nav>
        <div className="sidebar-footer"><div className="status-dot"><span />Systems operational</div><button className="logout-button" type="button" onClick={signOut}><LogOut size={16} />Log out</button></div>
      </aside>
      <div className="app-main">
        <header className="topbar"><div><p className="topbar-kicker">CAMPUS OPERATIONS</p><p className="topbar-title">{isSecurity ? 'Security Operations' : 'Community workspace'}</p></div><div className="topbar-actions"><button className="icon-button" type="button" aria-label="AI assistant"><Sparkles size={18} /></button><button className="icon-button" type="button" aria-label="Notifications"><Bell size={18} /></button><div className="profile"><span className="avatar">{user?.email?.charAt(0).toUpperCase()}</span><span className="profile-copy"><strong>{user?.role ?? 'Member'}</strong><small>{user?.email}</small></span></div></div></header>
        <div className="page-container"><Outlet /></div>
      </div>
    </div>
  );
}
