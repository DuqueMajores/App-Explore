import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from "../services/firebaseConfig";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface User {
  name: string;
  email: string;
  photo?: string;
  profession?: string;
  likes: string[];
  dislikes: string[];
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
  updateProfile: (name: string, photo?: string, profession?: string) => Promise<void>;
  toggleTTS: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  handleProfileReaction: (
    targetEmail: string,
    type: "like" | "dislike"
  ) => Promise<void>;
  addReputation?: (email: string, delta: number, reason: string) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LOCAL_KEY = "@App:user";

/** Referência ao documento do usuário no Firestore */
const userRef = (email: string) => doc(db, "users", email);

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Carrega cache local ao iniciar ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(LOCAL_KEY);
        if (cached) setUser(JSON.parse(cached));
      } catch (e) {
        console.error("Erro ao carregar cache local:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Persiste localmente e atualiza estado ──────────────────────────────────
  const applyUser = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(userData));
  };

  // ── Sincroniza campos públicos no Firestore ────────────────────────────────
  const syncToFirestore = async (userData: Partial<StoredUser> & { email: string }) => {
    const ref = userRef(userData.email);
    await setDoc(ref, userData, { merge: true });
  };

  // ── Atualiza o comentários de fórum com nova foto/nome (Firestore) ─────────
  const syncForumComments = async (email: string, name: string, photo: string) => {
    try {
      const roomsSnap = await getDocs(collection(db, "forumRooms"));
      const batch: Promise<void>[] = [];
      roomsSnap.forEach((roomDoc) => {
        const room = roomDoc.data();
        if (!room.comments) return;
        const updatedComments = room.comments.map((c: any) =>
          c.userEmail === email
            ? { ...c, userPhoto: photo, userName: name }
            : c
        );
        batch.push(updateDoc(roomDoc.ref, { comments: updatedComments }));
      });
      await Promise.all(batch);
    } catch (e) {
      console.error("Erro ao sincronizar fórum:", e);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const snap = await getDoc(userRef(normalizedEmail));
    if (!snap.exists()) throw new Error("Usuário não encontrado.");

    const data = snap.data() as StoredUser;
    // ⚠️  Em produção use Firebase Auth ou compare hash com bcrypt
    if (data.passwordHash !== password)
      throw new Error("Senha incorreta.");

    const { passwordHash, ...userData } = data;
    await applyUser(userData);
  }

  // ── Cadastro ───────────────────────────────────────────────────────────────
  async function signUp(name: string, email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const snap = await getDoc(userRef(normalizedEmail));
    if (snap.exists()) throw new Error("Este e-mail já está cadastrado.");

    const newUser: StoredUser = {
      name: name.trim(),
      email: normalizedEmail,
      photo: "",
      profession: "",
      likes: [],
      dislikes: [],
      ttsEnabled: false,
      darkMode: false,
      passwordHash: password,
    };

    await setDoc(userRef(normalizedEmail), newUser);
    const { passwordHash, ...userData } = newUser;
    await applyUser(userData);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function signOut() {
    await AsyncStorage.removeItem(LOCAL_KEY);
    setUser(null);
  }

  // ── Atualizar perfil ───────────────────────────────────────────────────────
  async function updateProfile(name: string, photo?: string, profession?: string) {
    if (!user) return;
    const updated: User = {
      ...user,
      name: name.trim(),
      photo: photo ?? user.photo,
      profession: profession !== undefined ? profession : user.profession,
    };
    await applyUser(updated);
    await syncToFirestore({ ...updated });
    await syncForumComments(user.email, updated.name, updated.photo ?? "");
  }

  // ── TTS ────────────────────────────────────────────────────────────────────
  const toggleTTS = async () => {
    if (!user) return;
    const updated = { ...user, ttsEnabled: !user.ttsEnabled };
    await applyUser(updated);
    await updateDoc(userRef(user.email), { ttsEnabled: updated.ttsEnabled });
  };

  // ── Dark mode ──────────────────────────────────────────────────────────────
  const toggleTheme = async () => {
    if (!user) return;
    const updated = { ...user, darkMode: !user.darkMode };
    await applyUser(updated);
    await updateDoc(userRef(user.email), { darkMode: updated.darkMode });
  };

  // ── Reações no perfil ──────────────────────────────────────────────────────
  const handleProfileReaction = async (
    targetEmail: string,
    type: "like" | "dislike"
  ) => {
    if (!user) return;

    const ref = userRef(targetEmail);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const target = snap.data() as StoredUser;
    let likeList: string[] = [...(target.likes ?? [])];
    let dislikeList: string[] = [...(target.dislikes ?? [])];
    let isAdding = false;

    if (type === "like") {
      const idx = likeList.indexOf(user.email);
      if (idx >= 0) { likeList.splice(idx, 1); isAdding = false; }
      else {
        likeList.push(user.email); isAdding = true;
        const di = dislikeList.indexOf(user.email);
        if (di >= 0) dislikeList.splice(di, 1);
      }
    } else {
      const idx = dislikeList.indexOf(user.email);
      if (idx >= 0) { dislikeList.splice(idx, 1); isAdding = false; }
      else {
        dislikeList.push(user.email); isAdding = true;
        const li = likeList.indexOf(user.email);
        if (li >= 0) likeList.splice(li, 1);
      }
    }

    await updateDoc(ref, { likes: likeList, dislikes: dislikeList });

    // Notifica o dono do perfil
    if (isAdding && targetEmail !== user.email) {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: type === "like" ? "👍 Novo like no seu perfil!" : "👎 Novo dislike",
              body: type === "like"
                ? `${user.name} curtiu o seu perfil.`
                : `${user.name} deu dislike no seu perfil.`,
              data: { type: `profile_${type}`, fromName: user.name },
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (e) { console.error("Erro ao notificar:", e); }
    }

    // Se o alvo é o próprio usuário logado, atualiza estado local
    if (targetEmail === user.email) {
      const updated = { ...user, likes: likeList, dislikes: dislikeList };
      await applyUser(updated);
    }
  };

  // ── addReputation (stub compatível com ForumContext) ───────────────────────
  const addReputation = async (email: string, delta: number, reason: string) => {
    // Implementação futura: campo "reputation" no Firestore
    console.log(`[reputation] ${email} ${delta > 0 ? "+" : ""}${delta} — ${reason}`);
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
        addReputation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
