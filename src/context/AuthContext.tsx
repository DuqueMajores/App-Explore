import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReputationEvent {
  points: number;
  reason: string;
  createdAt: string;
}

interface User {
  name: string;
  email: string;
  reputation: number;
  reputationHistory: ReputationEvent[];
}

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
  reputation: number;
  reputationHistory: ReputationEvent[];
}

interface AuthContextData {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  addReputation: (targetEmail: string, points: number, reason: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;
const validateName = (name: string) => name.trim().length >= 2;

const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const verifyPassword = (password: string, hash: string) => hashPassword(password) === hash;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storageUser = await AsyncStorage.getItem('@App:user');
        if (storageUser) {
          const userData = JSON.parse(storageUser);
          setUser({
            name: userData.name,
            email: userData.email,
            reputation: userData.reputation ?? 0,
            reputationHistory: userData.reputationHistory ?? [],
          });
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
    if (!email || !password) throw new Error('Email e senha são obrigatórios.');
    if (!validateEmail(email)) throw new Error('Por favor, insira um email válido.');
    if (!validatePassword(password)) throw new Error('A senha deve ter no mínimo 6 caracteres.');

    const allUsers = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = allUsers ? JSON.parse(allUsers) : [];
    const foundUser = users.find(u => u.email === email);
    if (!foundUser) throw new Error('Email ou senha incorretos.');
    if (!verifyPassword(password, foundUser.passwordHash)) throw new Error('Email ou senha incorretos.');

    const userData: User = {
      name: foundUser.name,
      email: foundUser.email,
      reputation: foundUser.reputation ?? 0,
      reputationHistory: foundUser.reputationHistory ?? [],
    };
    await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
    setUser(userData);
  }

  async function signUp(name: string, email: string, password: string) {
    if (!name || !email || !password) throw new Error('Todos os campos são obrigatórios.');
    if (!validateName(name)) throw new Error('O nome deve ter no mínimo 2 caracteres.');
    if (!validateEmail(email)) throw new Error('Por favor, insira um email válido.');
    if (!validatePassword(password)) throw new Error('A senha deve ter no mínimo 6 caracteres.');

    const allUsers = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = allUsers ? JSON.parse(allUsers) : [];
    if (users.some(u => u.email === email)) throw new Error('Este email já está cadastrado.');

    const newUser: StoredUser = {
      name, email,
      passwordHash: hashPassword(password),
      reputation: 0,
      reputationHistory: [],
    };
    users.push(newUser);
    await AsyncStorage.setItem('@App:users', JSON.stringify(users));

    const userData: User = { name, email, reputation: 0, reputationHistory: [] };
    await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
    setUser(userData);
  }

  async function signOut() {
    await AsyncStorage.removeItem('@App:user');
    setUser(null);
  }

  // Adiciona reputação a QUALQUER usuário pelo email (quem recebeu a curtida, por exemplo)
  async function addReputation(targetEmail: string, points: number, reason: string) {
    const event: ReputationEvent = { points, reason, createdAt: new Date().toISOString() };

    // Atualiza na lista global de usuários
    const allUsers = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = allUsers ? JSON.parse(allUsers) : [];
    const updatedUsers = users.map(u => {
      if (u.email !== targetEmail) return u;
      return {
        ...u,
        reputation: (u.reputation ?? 0) + points,
        reputationHistory: [...(u.reputationHistory ?? []), event],
      };
    });
    await AsyncStorage.setItem('@App:users', JSON.stringify(updatedUsers));

    // Se for o usuário logado, atualiza o estado também
    if (user && user.email === targetEmail) {
      const updatedUser: User = {
        ...user,
        reputation: user.reputation + points,
        reputationHistory: [...user.reputationHistory, event],
      };
      await AsyncStorage.setItem('@App:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, addReputation, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}
