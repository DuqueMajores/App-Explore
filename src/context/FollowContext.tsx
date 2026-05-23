/**
 * FollowContext.tsx — migrado para Firebase Firestore
 *
 * Coleção: "follows"
 *   Documento: followerEmail  (um doc por usuário que segue alguém)
 *   Campos:    following: string[]  (e-mails de quem ele segue)
 *
 * Listener em tempo real mantém todos os clientes sincronizados sem
 * precisar de AsyncStorage.
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
} from "../services/firebaseConfig";
import { onSnapshot } from "firebase/firestore";

const FOLLOW_COLLECTION = "follows";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FollowContextData {
  /** Retorna true se currentUser segue targetEmail */
  isFollowing: (currentUserEmail: string, targetEmail: string) => boolean;
  /** Segue ou deixa de seguir. Retorna true se agora está seguindo. */
  toggleFollow: (currentUserEmail: string, targetEmail: string) => Promise<boolean>;
  /** Emails que currentUserEmail segue */
  getFollowing: (currentUserEmail: string) => string[];
  /** Emails que seguem targetEmail */
  getFollowers: (targetEmail: string) => string[];
  /** Total de seguidores de targetEmail */
  followersCount: (targetEmail: string) => number;
  /** Carregado do Firestore? */
  ready: boolean;
}

const FollowContext = createContext<FollowContextData>({} as FollowContextData);

// ── Provider ──────────────────────────────────────────────────────────────────
export const FollowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // followMap[followerEmail] = string[] de quem ele segue
  const [followMap, setFollowMap] = useState<Record<string, string[]>>({});
  const [ready, setReady] = useState(false);

  // ── Listener em tempo real ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, FOLLOW_COLLECTION),
      (snapshot) => {
        const map: Record<string, string[]> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data() as { following?: string[] };
          map[d.id] = data.following ?? [];
        });
        setFollowMap(map);
        setReady(true);
      },
      (error) => {
        console.error("Erro ao ouvir follows:", error);
        setReady(true);
      }
    );

    return () => unsub();
  }, []);

  // ── isFollowing ────────────────────────────────────────────────────────────
  const isFollowing = useCallback(
    (currentUserEmail: string, targetEmail: string) =>
      (followMap[currentUserEmail] ?? []).includes(targetEmail),
    [followMap]
  );

  // ── toggleFollow ───────────────────────────────────────────────────────────
  const toggleFollow = useCallback(
    async (currentUserEmail: string, targetEmail: string): Promise<boolean> => {
      const current = followMap[currentUserEmail] ?? [];
      const alreadyFollowing = current.includes(targetEmail);
      const updated = alreadyFollowing
        ? current.filter((e) => e !== targetEmail)
        : [...current, targetEmail];

      // Atualiza otimisticamente no estado local
      setFollowMap((prev) => ({ ...prev, [currentUserEmail]: updated }));

      // Persiste no Firestore (merge para não sobrescrever outros campos)
      await setDoc(
        doc(db, FOLLOW_COLLECTION, currentUserEmail),
        { following: updated },
        { merge: true }
      );

      return !alreadyFollowing;
    },
    [followMap]
  );

  // ── getFollowing ───────────────────────────────────────────────────────────
  const getFollowing = useCallback(
    (currentUserEmail: string) => followMap[currentUserEmail] ?? [],
    [followMap]
  );

  // ── getFollowers ───────────────────────────────────────────────────────────
  const getFollowers = useCallback(
    (targetEmail: string) =>
      Object.entries(followMap)
        .filter(([, following]) => following.includes(targetEmail))
        .map(([follower]) => follower),
    [followMap]
  );

  // ── followersCount ─────────────────────────────────────────────────────────
  const followersCount = useCallback(
    (targetEmail: string) => getFollowers(targetEmail).length,
    [getFollowers]
  );

  return (
    <FollowContext.Provider
      value={{
        isFollowing,
        toggleFollow,
        getFollowing,
        getFollowers,
        followersCount,
        ready,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow deve ser usado dentro de FollowProvider");
  return ctx;
}
