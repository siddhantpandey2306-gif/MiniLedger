import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/api';
import { StorageService } from '../services/storage.service';
import { getApiBaseUrl, setApiBaseUrl } from '../config/apiConfig';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  currentBaseUrl: string;
  updateBaseUrl: (newUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  currentBaseUrl: getApiBaseUrl(),
  updateBaseUrl: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentBaseUrl, setCurrentBaseUrlState] = useState<string>(getApiBaseUrl());

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Load custom base URL if saved previously
        const savedUrl = await StorageService.getCustomBaseUrl();
        if (savedUrl) {
          setApiBaseUrl(savedUrl);
          setCurrentBaseUrlState(savedUrl);
        }

        // Restore auth credentials
        const storedToken = await StorageService.getToken();
        const storedUser = await StorageService.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (err) {
        console.warn('[AuthContext] Bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await StorageService.saveToken(newToken);
    await StorageService.saveUser(newUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await StorageService.clearAll();
  };

  const updateBaseUrl = async (newUrl: string) => {
    setApiBaseUrl(newUrl);
    setCurrentBaseUrlState(getApiBaseUrl());
    await StorageService.saveCustomBaseUrl(getApiBaseUrl());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        currentBaseUrl,
        updateBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
