import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading, null = signed out

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  const value = {
    user,
    login: async (b) => setUser(await api.login(b)),
    signup: async (b) => setUser(await api.signup(b)),
    logout: async () => { await api.logout(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
