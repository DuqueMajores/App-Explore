/**
 * FollowContext.tsx
 * Gerencia o sistema de seguidores (follow/unfollow).
 *
 * Estrutura de dados no AsyncStorage:
 *   @Follow:data  →  Record<followerEmail, followingEmail[]>
 *   (quem segue quem — "followerEmail segue followingEmail[]")
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@Follow:data";

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
  /** Carregado do storage? */
  ready: boolean;
}

const FollowContext = createContext<FollowContextData>({} as FollowContextData);

export const FollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // followMap[followerEmail] = string[] de quem ele segue
  const [followMap, setFollowMap] = useState<Record<string, string[]>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setFollowMap(JSON.parse(stored));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback(async (map: Record<string, string[]>) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, []);

  const isFollowing = useCallback(
    (currentUserEmail: string, targetEmail: string) => {
      return (followMap[currentUserEmail] ?? []).includes(targetEmail);
    },
    [followMap]
  );

  const toggleFollow = useCallback(
    async (currentUserEmail: string, targetEmail: string): Promise<boolean> => {
      const current = followMap[currentUserEmail] ?? [];
      const alreadyFollowing = current.includes(targetEmail);

      const updated: Record<string, string[]> = {
        ...followMap,
        [currentUserEmail]: alreadyFollowing
          ? current.filter((e) => e !== targetEmail)
          : [...current, targetEmail],
      };

      setFollowMap(updated);
      await persist(updated);
      return !alreadyFollowing; // true = agora está seguindo
    },
    [followMap, persist]
  );

  const getFollowing = useCallback(
    (currentUserEmail: string) => followMap[currentUserEmail] ?? [],
    [followMap]
  );

  const getFollowers = useCallback(
    (targetEmail: string) =>
      Object.entries(followMap)
        .filter(([, following]) => following.includes(targetEmail))
        .map(([follower]) => follower),
    [followMap]
  );

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
