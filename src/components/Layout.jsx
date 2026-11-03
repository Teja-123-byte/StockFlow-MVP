import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    setLogoutError('');
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard" aria-label="StockFlow dashboard">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>StockFlow</span>
        </NavLink>
        <div className="workspace">
          <span className="workspace-label">WORKSPACE</span>
          <strong title={user.orgName}>{user.orgName}</strong>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavLink className="nav-link" to="/dashboard"><span className="nav-mark" aria-hidden="true">01</span>Dashboard</NavLink>
          <NavLink className="nav-link" to="/products"><span className="nav-mark" aria-hidden="true">02</span>Products</NavLink>
          <NavLink className="nav-link" to="/settings"><span className="nav-mark" aria-hidden="true">03</span>Settings</NavLink>
        </nav>
        <div className="sidebar-footer">
          {logoutError && <div className="logout-error" role="alert">{logoutError}</div>}
          <button className="logout-button" onClick={signOut} disabled={loggingOut}>
            {loggingOut ? 'Signing out...' : 'Log out'}
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span className="topbar-org">{user.orgName}</span>
          <span className="topbar-email">{user.email}</span>
          <div className="mobile-logout-group">
            <button className="mobile-logout" onClick={signOut} disabled={loggingOut}>
              {loggingOut ? 'Signing out...' : 'Log out'}
            </button>
            {logoutError && <span className="logout-error" role="alert">{logoutError}</span>}
          </div>
        </header>
        <main className="main-content">
          <div className="page-shell"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
