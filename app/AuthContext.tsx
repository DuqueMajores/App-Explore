import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storageUser = await AsyncStorage.getItem('@App:user');
      if (storageUser) {
        setUser(JSON.parse(storageUser));
      }
      setLoading(false);
    }
    loadStorageData();
  }, []);

  async function signIn(email: string, password: string) {
    // Simulação de login - Em um app real, aqui haveria uma chamada de API
    const mockUser = { name: 'Usuário Teste', email };
    await AsyncStorage.setItem('@App:user', JSON.stringify(mockUser));
    setUser(mockUser);
  }

  async function signUp(name: string, email: string, password: string) {
    // Simulação de cadastro
    const mockUser = { name, email };
    await AsyncStorage.setItem('@App:user', JSON.stringify(mockUser));
    setUser(mockUser);
  }

  async function signOut() {
    await AsyncStorage.removeItem('@App:user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
