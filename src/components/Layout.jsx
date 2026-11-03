import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="top">
        <div className="shell">
          <span className="brand">StockFlow</span>
          <nav>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
          <span className="org">{user.orgName}</span>
          <button className="sm" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <div className="shell"><Outlet /></div>
      </main>
    </>
  );
}
