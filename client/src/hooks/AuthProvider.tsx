import { ReactNode, createContext, useContext } from 'react';
import { useAuth as useAuthHook, User } from './useAuth';

// Create a context with default values
type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => void;
  logout: () => void;
  register: (credentials: { username: string; email: string; password: string; displayName?: string }) => void;
};

const defaultContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: () => {},
  logout: () => {},
  register: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultContext);

// Provider component that wraps app and provides auth context
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook();
  
  const value: AuthContextType = {
    user: auth.user || null,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: auth.login,
    logout: auth.logout,
    register: auth.register,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook that shorthands the context
export const useAuth = () => useContext(AuthContext);