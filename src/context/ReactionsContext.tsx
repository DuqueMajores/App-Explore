/**
 * ReactionsContext.tsx — NOVO — migra @App:articleReactions para Firestore
 *
 * Coleção: "articleReactions"
 *   Documento: urlBase64  (URL da notícia em base64 — evita chars inválidos no docId)
 *   Campos:    articleKey, likes[], dislikes[], title?, category?, accessCount
 *
 * Coleção: "userCategories"
 *   Documento: userEmail
 *   Campos:    categories: Category[]
 *
 * Usada por: index.tsx, explore.tsx, infodashboard.tsx
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
import { onSnapshot, getDoc, updateDoc } from "firebase/firestore";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type ArticleReactions = {
  articleKey: string;
  likes: string[];
  dislikes: string[];
  title?: string;
  category?: string;
  accessCount: number;
};

export type Category = {
  label: string;
  query: string;
  icon: string;
  isDefault: boolean;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { label: "Brasil",         query: "Brasil",         icon: "🇧🇷", isDefault: true },
  { label: "Tecnologia",     query: "tecnologia",     icon: "💻", isDefault: true },
  { label: "Economia",       query: "economia",       icon: "📈", isDefault: true },
  { label: "Esportes",       query: "esportes",       icon: "⚽", isDefault: true },
  { label: "Saúde",          query: "saúde",          icon: "❤️", isDefault: true },
  { label: "Política",       query: "política",       icon: "🏛️", isDefault: true },
  { label: "Ciência",        query: "ciência",        icon: "🔬", isDefault: true },
  { label: "Entretenimento", query: "entretenimento", icon: "🎬", isDefault: true },
  { label: "Mundo",          query: "mundo",          icon: "🌍", isDefault: true },
];

interface ReactionsContextData {
  // ── Reações ────────────────────────────────────────────────────────────────
  reactions: Record<string, ArticleReactions>;
  handleReaction: (
    articleKey: string,
    userEmail: string,
    type: "like" | "dislike",
    meta?: { title?: string; category?: string }
  ) => Promise<void>;
  trackAccess: (
    articleKey: string,
    meta: { title?: string; category?: string }
  ) => Promise<void>;
  // ── Categorias ─────────────────────────────────────────────────────────────
  categories: Category[];
  loadCategories: (userEmail: string) => Promise<void>;
  saveCategories: (userEmail: string, cats: Category[]) => Promise<void>;
}

const ReactionsContext = createContext<ReactionsContextData>(
  {} as ReactionsContextData
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const REACTIONS_COLLECTION = "articleReactions";
const USER_CATS_COLLECTION  = "userCategories";

/** Converte a URL/key em um ID de documento Firestore válido (sem / e curto) */
function toDocId(key: string): string {
  return btoa(unescape(encodeURIComponent(key)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "")
    .slice(0, 200);
}

function safeReaction(raw: any, key: string): ArticleReactions {
  return {
    articleKey:  raw?.articleKey  ?? key,
    likes:       Array.isArray(raw?.likes)    ? raw.likes    : [],
    dislikes:    Array.isArray(raw?.dislikes) ? raw.dislikes : [],
    title:       raw?.title    ?? undefined,
    category:    raw?.category ?? undefined,
    accessCount: typeof raw?.accessCount === "number" ? raw.accessCount : 0,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const ReactionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [reactions, setReactions] = useState<Record<string, ArticleReactions>>({});
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // ── Listener em tempo real para reações ───────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, REACTIONS_COLLECTION),
      (snapshot) => {
        const map: Record<string, ArticleReactions> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const key = data.articleKey ?? d.id;
          map[key] = safeReaction(data, key);
        });
        setReactions(map);
      },
      (error) => {
        console.error("Erro ao ouvir reações:", error);
      }
    );
    return () => unsub();
  }, []);

  // ── handleReaction ─────────────────────────────────────────────────────────
  const handleReaction = useCallback(
    async (
      articleKey: string,
      userEmail: string,
      type: "like" | "dislike",
      meta?: { title?: string; category?: string }
    ) => {
      const current = safeReaction(reactions[articleKey], articleKey);
      let likes    = [...current.likes];
      let dislikes = [...current.dislikes];

      if (type === "like") {
        if (likes.includes(userEmail)) {
          likes = likes.filter((e) => e !== userEmail);
        } else {
          likes.push(userEmail);
          dislikes = dislikes.filter((e) => e !== userEmail);
        }
      } else {
        if (dislikes.includes(userEmail)) {
          dislikes = dislikes.filter((e) => e !== userEmail);
        } else {
          dislikes.push(userEmail);
          likes = likes.filter((e) => e !== userEmail);
        }
      }

      const updated: ArticleReactions = {
        ...current,
        likes,
        dislikes,
        title:    meta?.title    ?? current.title,
        category: meta?.category ?? current.category,
      };

      // Atualização otimista local
      setReactions((prev) => ({ ...prev, [articleKey]: updated }));

      await setDoc(
        doc(db, REACTIONS_COLLECTION, toDocId(articleKey)),
        { ...updated, articleKey },
        { merge: true }
      );
    },
    [reactions]
  );

  // ── trackAccess ────────────────────────────────────────────────────────────
  const trackAccess = useCallback(
    async (
      articleKey: string,
      meta: { title?: string; category?: string }
    ) => {
      const current = safeReaction(reactions[articleKey], articleKey);
      const updated: ArticleReactions = {
        ...current,
        title:       meta.title    ?? current.title,
        category:    meta.category ?? current.category,
        accessCount: (current.accessCount ?? 0) + 1,
      };

      setReactions((prev) => ({ ...prev, [articleKey]: updated }));

      await setDoc(
        doc(db, REACTIONS_COLLECTION, toDocId(articleKey)),
        { ...updated, articleKey },
        { merge: true }
      );
    },
    [reactions]
  );

  // ── loadCategories ─────────────────────────────────────────────────────────
  const loadCategories = useCallback(async (userEmail: string) => {
    try {
      const snap = await getDoc(doc(db, USER_CATS_COLLECTION, userEmail));
      if (snap.exists()) {
        const data = snap.data() as { categories?: Category[] };
        setCategories(data.categories ?? DEFAULT_CATEGORIES);
      } else {
        // Primeira vez: persiste os defaults
        await setDoc(doc(db, USER_CATS_COLLECTION, userEmail), {
          categories: DEFAULT_CATEGORIES,
        });
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  // ── saveCategories ─────────────────────────────────────────────────────────
  const saveCategories = useCallback(
    async (userEmail: string, cats: Category[]) => {
      setCategories(cats);
      await setDoc(
        doc(db, USER_CATS_COLLECTION, userEmail),
        { categories: cats },
        { merge: true }
      );
    },
    []
  );

  return (
    <ReactionsContext.Provider
      value={{
        reactions,
        handleReaction,
        trackAccess,
        categories,
        loadCategories,
        saveCategories,
      }}
    >
      {children}
    </ReactionsContext.Provider>
  );
};

export function useReactions() {
  const ctx = useContext(ReactionsContext);
  if (!ctx)
    throw new Error("useReactions deve ser usado dentro de ReactionsProvider");
  return ctx;
}
