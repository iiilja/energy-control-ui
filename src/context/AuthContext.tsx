import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const auth = localStorage.getItem('auth');
    const username = localStorage.getItem('username');
    if (auth && username) {
      setUser({ username });
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await authAPI.login(username, password);
      const token = btoa(`${username}:${password}`);
      localStorage.setItem('auth', `Basic ${token}`);
      localStorage.setItem('username', username);
      setUser({ username });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.status === 401 ? 'Invalid credentials' : 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
