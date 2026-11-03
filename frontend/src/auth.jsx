import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading, null = signed out
  const [authError, setAuthError] = useState('');

  async function refreshSession() {
    try {
      setUser(await api.me());
      setAuthError('');
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setAuthError('');
      } else {
        setUser(undefined);
        setAuthError(error.message || 'Unable to connect to StockFlow.');
      }
    }
  }

  useEffect(() => {
    refreshSession();
  }, []);

  const value = {
    user,
    authError,
    refreshSession,
    login: async (b) => { const signedInUser = await api.login(b); setAuthError(''); setUser(signedInUser); },
    signup: async (b) => { const signedUpUser = await api.signup(b); setAuthError(''); setUser(signedUpUser); },
    logout: async () => { await api.logout(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
