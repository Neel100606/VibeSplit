import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL as API_BASE_URL } from '../config.js';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = 'splitwise_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(user && token);

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
  };

  const login = (nextToken, userData) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(userData);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const hydrateUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to fetch profile');
        }

        const data = await response.json();
        setToken(storedToken);
        setUser(data.user);
      } catch (error) {
        if (error.name !== 'AbortError') {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    hydrateUser();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
