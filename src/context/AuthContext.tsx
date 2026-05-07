import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

interface User {
  name: string;
  email: string;
  photo?: string;
  likes: string[];    // e-mails de quem curtiu este perfil
  dislikes: string[]; // e-mails de quem não curtiu
  ttsEnabled: boolean;
  darkMode: boolean;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, photo?: string) => Promise<void>;
  toggleTTS: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  handleProfileReaction: (
    targetEmail: string,
    type: "like" | "dislike"
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Carregar usuário salvo ──
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem("@App:user");
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao carregar usuário:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Persiste no estado e no storage ──
  const saveAndSetUser = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem("@App:user", JSON.stringify(userData));
    // Atualizar na lista global de usuários
    const all = await AsyncStorage.getItem("@App:users");
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const updated = users.map((u) =>
      u.email === userData.email ? { ...u, ...userData } : u
    );
    await AsyncStorage.setItem("@App:users", JSON.stringify(updated));
  };

  // ── Login ──
  async function signIn(email: string, password: string) {
    const all = await AsyncStorage.getItem("@App:users");
    const users: StoredUser[] = all ? JSON.parse(all) : [];
    const found = users.find((u) => u.email === email.toLowerCase().trim());
    if (!found) throw new Error("Usuário não encontrado.");
    // Em produção compare hashes; aqui aceitamos qualquer senha para o protótipo
    const { passwordHash, ...userData } = found;
    await saveAndSetUser(userData);
  }

  // ── Cadastro ──
  async function signUp(name: string, email: string, password: string) {
    const all = await AsyncStorage.getItem("@App:users");
    const users: StoredUser[] = all ? JSON.parse(all) : [];

    const alreadyExists = users.some(
      (u) => u.email === email.toLowerCase().trim()
    );
    if (alreadyExists) throw new Error("Este e-mail já está cadastrado.");

    const newUser: StoredUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      photo: "",
      likes: [],
      dislikes: [],
      ttsEnabled: false,
      darkMode: false,
      passwordHash: password, // em produção use bcrypt ou similar
    };
    users.push(newUser);
    await AsyncStorage.setItem("@App:users", JSON.stringify(users));
    const { passwordHash, ...userData } = newUser;
    await saveAndSetUser(userData);
  }

  // ── Logout ──
  async function signOut() {
    await AsyncStorage.removeItem("@App:user");
    setUser(null);
  }

  // ── Atualizar perfil ──
  async function updateProfile(name: string, photo?: string) {
    if (!user) return;
    const newPhoto = photo ?? user.photo;
    await saveAndSetUser({ ...user, name: name.trim(), photo: newPhoto });

    // Sincroniza foto e nome nos comentários do fórum
    try {
      const storedForum = await AsyncStorage.getItem("@Forum:rooms");
      if (storedForum) {
        const rooms = JSON.parse(storedForum);
        const updatedRooms = rooms.map((room: any) => ({
          ...room,
          comments: room.comments.map((comment: any) =>
            comment.userEmail === user.email
              ? { ...comment, userPhoto: newPhoto, userName: name.trim() }
              : comment
          ),
        }));
        await AsyncStorage.setItem("@Forum:rooms", JSON.stringify(updatedRooms));
      }
    } catch (e) {
      console.error("Erro ao sincronizar foto no fórum:", e);
    }
  }

  // ── TTS toggle ──
  const toggleTTS = async () => {
    if (user) await saveAndSetUser({ ...user, ttsEnabled: !user.ttsEnabled });
  };

  // ── Dark mode toggle ──
  const toggleTheme = async () => {
    if (user) await saveAndSetUser({ ...user, darkMode: !user.darkMode });
  };

  // ── Reações no perfil ──
  const handleProfileReaction = async (
    targetEmail: string,
    type: "like" | "dislike"
  ) => {
    if (!user) return;
    const all = await AsyncStorage.getItem("@App:users");
    const users: StoredUser[] = all ? JSON.parse(all) : [];

    let isAdding = false;

    const updated = users.map((u) => {
      if (u.email !== targetEmail) return u;
      const likeList = [...(u.likes ?? [])];
      const dislikeList = [...(u.dislikes ?? [])];

      if (type === "like") {
        const idx = likeList.indexOf(user.email);
        if (idx >= 0) {
          likeList.splice(idx, 1);
          isAdding = false;
        } else {
          likeList.push(user.email);
          isAdding = true;
          const di = dislikeList.indexOf(user.email);
          if (di >= 0) dislikeList.splice(di, 1);
        }
      } else {
        const idx = dislikeList.indexOf(user.email);
        if (idx >= 0) {
          dislikeList.splice(idx, 1);
          isAdding = false;
        } else {
          dislikeList.push(user.email);
          isAdding = true;
          const li = likeList.indexOf(user.email);
          if (li >= 0) likeList.splice(li, 1);
        }
      }
      return { ...u, likes: likeList, dislikes: dislikeList };
    });

    await AsyncStorage.setItem("@App:users", JSON.stringify(updated));

    // Notifica o dono do perfil (apenas ao adicionar reação, não ao remover,
    // e nunca quando o usuário reage ao próprio perfil)
    if (isAdding && targetEmail !== user.email) {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: type === "like"
                ? "👍 Novo like no seu perfil!"
                : "👎 Novo dislike no seu perfil",
              body: type === "like"
                ? `${user.name} curtiu o seu perfil.`
                : `${user.name} deu dislike no seu perfil.`,
              data: { type: `profile_${type}`, fromName: user.name },
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (e) {
        console.error("Erro ao notificar reação no perfil:", e);
      }
    }

    // Se o alvo é o próprio usuário logado, atualiza o estado local também
    if (targetEmail === user.email) {
      const current = updated.find((u) => u.email === user.email);
      if (current) {
        const { passwordHash, ...userData } = current;
        setUser(userData);
        await AsyncStorage.setItem("@App:user", JSON.stringify(userData));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        toggleTTS,
        toggleTheme,
        handleProfileReaction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
