import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
  photo?: string;
  likes: string[]; // Lista de e-mails de quem curtiu este perfil
  dislikes: string[];
  ttsEnabled: boolean;
  darkMode: boolean;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthContextData {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, photo?: string) => Promise<void>;
  toggleTTS: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  handleProfileReaction: (targetEmail: string, type: 'like' | 'dislike') => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const storageUser = await AsyncStorage.getItem('@App:user');
      if (storageUser) setUser(JSON.parse(storageUser));
      setLoading(false);
    }
    loadData();
  }, []);

  const saveAndSetUser = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
    // Atualizar na lista global de usuários
    const all = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const updated = users.map(u => u.email === userData.email ? { ...u, ...userData } : u);
    await AsyncStorage.setItem('@App:users', JSON.stringify(updated));
  };

  async function signIn(email: string, password: string) {
    const all = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const found = users.find(u => u.email === email);
    if (!found) throw new Error('Usuário não encontrado');
    const userData = { ...found };
    // @ts-ignore (removendo passwordHash antes de salvar no estado)
    delete userData.passwordHash;
    await saveAndSetUser(userData);
  }

  async function signUp(name: string, email: string, password: string) {
    const newUser: StoredUser = {
      name, email, photo: '', likes: [], dislikes: [], 
      ttsEnabled: false, darkMode: false, passwordHash: 'hash_ficticio'
    };
    const all = await AsyncStorage.getItem('@App:users');
    const users = all ? JSON.parse(all) : [];
    users.push(newUser);
    await AsyncStorage.setItem('@App:users', JSON.stringify(users));
    await saveAndSetUser(newUser);
  }

  const toggleTTS = async () => { if (user) await saveAndSetUser({ ...user, ttsEnabled: !user.ttsEnabled }); };
  const toggleTheme = async () => { if (user) await saveAndSetUser({ ...user, darkMode: !user.darkMode }); };

  const handleProfileReaction = async (targetEmail: string, type: 'like' | 'dislike') => {
    const all = await AsyncStorage.getItem('@App:users');
    let users: StoredUser[] = all ? JSON.parse(all) : [];
    const updated = users.map(u => {
      if (u.email !== targetEmail) return u;
      const list = type === 'like' ? u.likes : u.dislikes;
      const filtered = list.includes(user!.email) ? list.filter(e => e !== user!.email) : [...list, user!.email];
      return type === 'like' ? { ...u, likes: filtered } : { ...u, dislikes: filtered };
    });
    await AsyncStorage.setItem('@App:users', JSON.stringify(updated));
    if (targetEmail === user?.email) {
      const currentUpdate = updated.find(u => u.email === user.email);
      if (currentUpdate) setUser(currentUpdate);
    }
  };

  async function updateProfile(name: string, photo?: string) {
    if (user) await saveAndSetUser({ ...user, name, photo: photo ?? user.photo });
  }

  async function signOut() { await AsyncStorage.removeItem('@App:user'); setUser(null); }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, updateProfile, toggleTTS, toggleTheme, handleProfileReaction, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
  photo?: string;
  likes: string[]; // Lista de e-mails de quem curtiu este perfil
  dislikes: string[];
  ttsEnabled: boolean;
  darkMode: boolean;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthContextData {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, photo?: string) => Promise<void>;
  toggleTTS: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  handleProfileReaction: (targetEmail: string, type: 'like' | 'dislike') => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const storageUser = await AsyncStorage.getItem('@App:user');
      if (storageUser) setUser(JSON.parse(storageUser));
      setLoading(false);
    }
    loadData();
  }, []);

  const saveAndSetUser = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('@App:user', JSON.stringify(userData));
    // Atualizar na lista global de usuários
    const all = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const updated = users.map(u => u.email === userData.email ? { ...u, ...userData } : u);
    await AsyncStorage.setItem('@App:users', JSON.stringify(updated));
  };

  async function signIn(email: string, password: string) {
    const all = await AsyncStorage.getItem('@App:users');
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const found = users.find(u => u.email === email);
    if (!found) throw new Error('Usuário não encontrado');
    const userData = { ...found };
    // @ts-ignore (removendo passwordHash antes de salvar no estado)
    delete userData.passwordHash;
    await saveAndSetUser(userData);
  }

  async function signUp(name: string, email: string, password: string) {
    const newUser: StoredUser = {
      name, email, photo: '', likes: [], dislikes: [], 
      ttsEnabled: false, darkMode: false, passwordHash: 'hash_ficticio'
    };
    const all = await AsyncStorage.getItem('@App:users');
    const users = all ? JSON.parse(all) : [];
    users.push(newUser);
    await AsyncStorage.setItem('@App:users', JSON.stringify(users));
    await saveAndSetUser(newUser);
  }

  const toggleTTS = async () => { if (user) await saveAndSetUser({ ...user, ttsEnabled: !user.ttsEnabled }); };
  const toggleTheme = async () => { if (user) await saveAndSetUser({ ...user, darkMode: !user.darkMode }); };

  const handleProfileReaction = async (targetEmail: string, type: 'like' | 'dislike') => {
    const all = await AsyncStorage.getItem('@App:users');
    let users: StoredUser[] = all ? JSON.parse(all) : [];
    const updated = users.map(u => {
      if (u.email !== targetEmail) return u;
      const list = type === 'like' ? u.likes : u.dislikes;
      const filtered = list.includes(user!.email) ? list.filter(e => e !== user!.email) : [...list, user!.email];
      return type === 'like' ? { ...u, likes: filtered } : { ...u, dislikes: filtered };
    });
    await AsyncStorage.setItem('@App:users', JSON.stringify(updated));
    if (targetEmail === user?.email) {
      const currentUpdate = updated.find(u => u.email === user.email);
      if (currentUpdate) setUser(currentUpdate);
    }
  };

  async function updateProfile(name: string, photo?: string) {
    if (user) await saveAndSetUser({ ...user, name, photo: photo ?? user.photo });
  }

  async function signOut() { await AsyncStorage.removeItem('@App:user'); setUser(null); }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, updateProfile, toggleTTS, toggleTheme, handleProfileReaction, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
