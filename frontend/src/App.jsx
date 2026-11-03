import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, authError, refreshSession } = useAuth();
  if (user === undefined && authError) {
    return (
      <div className="app-state" role="alert">
        <h1>StockFlow is unavailable</h1>
        <p>{authError}</p>
        <button className="pri" onClick={refreshSession}>Try again</button>
      </div>
    );
  }
  if (user === undefined) return <div className="app-state" role="status">Loading StockFlow...</div>;

  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
