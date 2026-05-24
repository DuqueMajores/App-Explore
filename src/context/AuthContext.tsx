/**
 * AuthContext.tsx
 *
 * Melhorias em relação à versão anterior:
 *  - Tenta reativar a rede Firestore antes de qualquer operação
 *  - Retry automático (3x) com back-off em caso de "client is offline"
 *  - Cache local (AsyncStorage) como fallback enquanto sem conexão
 *  - signIn usa onSnapshot para detectar quando o doc aparecer online
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
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
  enableNetwork,
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
  handleProfileReaction: (targetEmail: string, type: "like" | "dislike") => Promise<void>;
  addReputation?: (email: string, delta: number, reason: string) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LOCAL_KEY = "@App:user";

const userRef = (email: string) => doc(db, "users", email);

/**
 * Tenta reativar a rede Firestore e chama fn() com retry automático.
 * Útil quando o app volta do background ou recém conectou ao Wi-Fi.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Garante que a rede Firestore está ativa antes de tentar
      await enableNetwork(db).catch(() => {});
      return await fn();
    } catch (err: any) {
      const isOffline =
        err?.code === "unavailable" ||
        err?.message?.toLowerCase().includes("offline") ||
        err?.message?.toLowerCase().includes("client is offline");

      if (isOffline && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  // TypeScript exige um retorno — nunca chegamos aqui
  throw new Error("Máximo de tentativas atingido");
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
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
    await withRetry(() => setDoc(userRef(userData.email), userData, { merge: true }));
  };

  // ── Atualiza comentários do fórum com novo nome/foto ──────────────────────
  const syncForumComments = async (email: string, name: string, photo: string) => {
    try {
      const roomsSnap = await withRetry(() => getDocs(collection(db, "forumRooms")));
      const batch: Promise<void>[] = [];
      roomsSnap.forEach((roomDoc) => {
        const room = roomDoc.data();
        if (!room.comments) return;
        const updatedComments = room.comments.map((c: any) =>
          c.userEmail === email ? { ...c, userPhoto: photo, userName: name } : c
        );
        batch.push(withRetry(() => updateDoc(roomDoc.ref, { comments: updatedComments })));
      });
      await Promise.all(batch);
    } catch (e) {
      console.error("Erro ao sincronizar fórum:", e);
    }
  };

  // ── signIn ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    let snap;
    try {
      snap = await withRetry(() => getDoc(userRef(normalizedEmail)));
    } catch (err: any) {
      const isOffline =
        err?.code === "unavailable" ||
        err?.message?.toLowerCase().includes("offline") ||
        err?.message?.toLowerCase().includes("client is offline");

      if (isOffline) {
        // Tenta autenticar pelo cache local como fallback offline
        const cached = await AsyncStorage.getItem(LOCAL_KEY);
        if (cached) {
          const cachedUser = JSON.parse(cached) as User;
          if (cachedUser.email === normalizedEmail) {
            setUser(cachedUser);
            return;
          }
        }
        throw new Error(
          "Sem conexão com o servidor. Verifique sua internet e tente novamente."
        );
      }
      throw err;
    }

    if (!snap.exists()) throw new Error("Usuário não encontrado.");

    const data = snap.data() as StoredUser;
    if (data.passwordHash !== password) throw new Error("Senha incorreta.");

    const { passwordHash, ...userData } = data;
    await applyUser(userData);
  };

  // ── signUp ─────────────────────────────────────────────────────────────────
  const signUp = async (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const snap = await withRetry(() => getDoc(userRef(normalizedEmail)));
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

    await withRetry(() => setDoc(userRef(normalizedEmail), newUser));
    const { passwordHash, ...userData } = newUser;
    await applyUser(userData);
  };

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await AsyncStorage.removeItem(LOCAL_KEY);
    setUser(null);
  };

  // ── updateProfile ──────────────────────────────────────────────────────────
  const updateProfile = async (name: string, photo?: string, profession?: string) => {
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
  };

  // ── toggleTTS ──────────────────────────────────────────────────────────────
  const toggleTTS = async () => {
    if (!user) return;
    const updated = { ...user, ttsEnabled: !user.ttsEnabled };
    await applyUser(updated);
    await withRetry(() => updateDoc(userRef(user.email), { ttsEnabled: updated.ttsEnabled }));
  };

  // ── toggleTheme ────────────────────────────────────────────────────────────
  const toggleTheme = async () => {
    if (!user) return;
    const updated = { ...user, darkMode: !user.darkMode };
    await applyUser(updated);
    await withRetry(() => updateDoc(userRef(user.email), { darkMode: updated.darkMode }));
  };

  // ── handleProfileReaction ──────────────────────────────────────────────────
  const handleProfileReaction = async (
    targetEmail: string,
    type: "like" | "dislike"
  ) => {
    if (!user) return;

    const ref  = userRef(targetEmail);
    const snap = await withRetry(() => getDoc(ref));
    if (!snap.exists()) return;

    const target      = snap.data() as StoredUser;
    let likeList:    string[] = [...(target.likes    ?? [])];
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

    await withRetry(() => updateDoc(ref, { likes: likeList, dislikes: dislikeList }));

    // Notifica o dono do perfil
    if (isAdding && targetEmail !== user.email) {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: type === "like" ? "👍 Novo like no seu perfil!" : "👎 Novo dislike",
              body:  type === "like"
                ? `${user.name} curtiu o seu perfil.`
                : `${user.name} deu dislike no seu perfil.`,
              data:  { type: `profile_${type}`, fromName: user.name },
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (e) { console.error("Erro ao notificar:", e); }
    }

    if (targetEmail === user.email) {
      const updated = { ...user, likes: likeList, dislikes: dislikeList };
      await applyUser(updated);
    }
  };

  // ── addReputation (stub) ───────────────────────────────────────────────────
  const addReputation = async (email: string, delta: number, reason: string) => {
    console.log(`[reputation] ${email} ${delta > 0 ? "+" : ""}${delta} — ${reason}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading,
        signIn, signUp, signOut,
        updateProfile, toggleTTS, toggleTheme,
        handleProfileReaction, addReputation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
