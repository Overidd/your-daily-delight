import { useState, useEffect, createContext, useContext } from 'react';
import { authService, ILoginDTO } from '@/service';
import { ErrorCustom } from '@/lib';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (data: ILoginDTO) => Promise<{ error: Error | null }>;
  signIn: (data: Omit<ILoginDTO, 'name'>) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const user = await authService.verify(token);
        setUser(user);
      } catch (error) {
        authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const signUp = async (data: ILoginDTO) => {
    try {
      await authService.register(data);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (data: Omit<ILoginDTO, 'name'>) => {
    try {
      const resp = await authService.login(data);

      // guardar token
      localStorage.setItem('token', resp.token);

      setUser(resp.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used dentro de AuthProvider');
  }
  return context;
};
