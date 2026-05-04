import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
}

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
}

interface AuthContextData {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Funções utilitárias de validação
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

// Simulação simples de hash (em produção, usar bcrypt)
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storageUser = await AsyncStorage.getItem('@App:user');
        if (storageUser) {
          const userData = JSON.parse(storageUser);
          setUser({ name: userData.name, email: userData.email });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStorageData();
  }, []);

  async function signIn(email: string, password: string) {
    // Validações
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios.');
    }

    if (!validateEmail(email)) {
      throw new Error('Por favor, insira um email válido.');
    }

    if (!validatePassword(password)) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    try {
      // Buscar usuário no armazenamento
      const allUsers = await AsyncStorage.getItem('@App:users');
      const users: StoredUser[] = allUsers ? JSON.parse(allUsers) : [];
      
      const foundUser = users.find(u => u.email === email);
      
      if (!foundUser) {
        throw new Error('Email ou senha incorretos.');
      }

      // Verificar senha
      if (!verifyPassword(password, foundUser.passwordHash)) {
        throw new Error('Email ou senha incorretos.');
      }

      // Salvar usuário logado
      const userData = { name: foundUser.name, email: foundUser.email };
      await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw error;
    }
  }

  async function signUp(name: string, email: string, password: string) {
    // Validações
    if (!name || !email || !password) {
      throw new Error('Todos os campos são obrigatórios.');
    }

    if (!validateName(name)) {
      throw new Error('O nome deve ter no mínimo 2 caracteres.');
    }

    if (!validateEmail(email)) {
      throw new Error('Por favor, insira um email válido.');
    }

    if (!validatePassword(password)) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    try {
      // Verificar se email já existe
      const allUsers = await AsyncStorage.getItem('@App:users');
      const users: StoredUser[] = allUsers ? JSON.parse(allUsers) : [];
      
      if (users.some(u => u.email === email)) {
        throw new Error('Este email já está cadastrado. Por favor, faça login ou use outro email.');
      }

      // Criar novo usuário
      const newUser: StoredUser = {
        name,
        email,
        passwordHash: hashPassword(password),
      };

      users.push(newUser);
      await AsyncStorage.setItem('@App:users', JSON.stringify(users));

      // Salvar usuário logado
      const userData = { name, email };
      await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw error;
    }
  }

  async function signOut() {
    try {
      await AsyncStorage.removeItem('@App:user');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
