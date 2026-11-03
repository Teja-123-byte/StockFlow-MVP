import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const signup = mode === 'signup';
  const { login, signup: doSignup } = useAuth();
  const [f, setF] = useState({ organizationName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (signup && f.password !== f.confirmPassword) return setError('Passwords don’t match.');
    setBusy(true);
    try {
      await (signup ? doSignup(f) : login(f));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>StockFlow</h1>
        <p className="sub">{signup ? 'Create your workspace' : 'Sign in to your workspace'}</p>
        {error && <div className="err">{error}</div>}
        {signup && (
          <div className="f"><label htmlFor="organization-name">Organization name</label><input id="organization-name" value={f.organizationName} onChange={set('organizationName')} placeholder="My Test Store" minLength="2" maxLength="100" required autoFocus /></div>
        )}
        <div className="f"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" required autoFocus={!signup} /></div>
        <div className="f"><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" value={f.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required /></div>
        {signup && (
          <div className="f"><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" type="password" value={f.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" minLength="8" required /></div>
        )}
        <button className="pri full" disabled={busy}>{signup ? 'Create account' : 'Sign in'}</button>
        <div className="sw">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create account'}</Link>
        </div>
      </form>
    </div>
  );
}
