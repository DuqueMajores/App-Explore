/**
 * ForumContext.tsx — migrado para Firebase Firestore
 *
 * Coleção: "forumRooms"
 *   Documento: room.id (gerado localmente)
 *   Campos:    id, articleTitle, articleUrl, articleImage, articleDesc,
 *              createdBy, createdAt, comments[]
 *
 * Os comentários são armazenados como array dentro do documento da sala.
 * Para salas com muitos comentários, considere uma sub-coleção futuramente.
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
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "../services/firebaseConfig";
import { onSnapshot } from "firebase/firestore";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface ForumComment {
  id: string;
  text: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  createdAt: string;
  parentId: string | null;
  likes: string[];
}

export interface ForumRoom {
  id: string;
  articleTitle: string;
  articleUrl: string;
  articleImage?: string;
  articleDesc?: string;
  createdBy: string;
  createdAt: string;
  comments: ForumComment[];
}

interface ForumContextData {
  rooms: ForumRoom[];
  getRoomByArticleUrl: (url: string) => ForumRoom | undefined;
  createRoom: (
    articleTitle: string,
    articleUrl: string,
    createdByEmail: string,
    articleImage?: string,
    articleDesc?: string
  ) => Promise<ForumRoom>;
  addComment: (
    roomId: string,
    text: string,
    userName: string,
    userEmail: string,
    userPhoto: string | undefined,
    parentId: string | null
  ) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  toggleLike: (
    roomId: string,
    commentId: string,
    userEmail: string
  ) => Promise<{ wasLiked: boolean; commentOwnerEmail: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROOMS_COLLECTION = "forumRooms";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const roomRef = (roomId: string) => doc(db, ROOMS_COLLECTION, roomId);

// ── Context ───────────────────────────────────────────────────────────────────
const ForumContext = createContext<ForumContextData>({} as ForumContextData);

export const ForumProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rooms, setRooms] = useState<ForumRoom[]>([]);

  // ── Listener em tempo real ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, ROOMS_COLLECTION),
      (snapshot) => {
        const fetched: ForumRoom[] = snapshot.docs.map((d) => {
          const data = d.data() as ForumRoom;
          // Garante migração de comentários antigos sem likes
          return {
            ...data,
            comments: (data.comments ?? []).map((c) => ({
              ...c,
              likes: (c as ForumComment).likes ?? [],
            })),
          };
        });
        // Ordena por data de criação (mais recente primeiro)
        fetched.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRooms(fetched);
      },
      (error) => {
        console.error("Erro ao ouvir salas do fórum:", error);
      }
    );

    return () => unsub();
  }, []);

  // ── getRoomByArticleUrl ────────────────────────────────────────────────────
  const getRoomByArticleUrl = useCallback(
    (url: string) => rooms.find((r) => r.articleUrl === url),
    [rooms]
  );

  // ── createRoom ─────────────────────────────────────────────────────────────
  const createRoom = useCallback(
    async (
      articleTitle: string,
      articleUrl: string,
      createdByEmail: string,
      articleImage?: string,
      articleDesc?: string
    ): Promise<ForumRoom> => {
      const newRoom: ForumRoom = {
        id: generateId(),
        articleTitle,
        articleUrl,
        articleImage: articleImage ?? "",
        articleDesc: articleDesc ?? "",
        createdBy: createdByEmail,
        createdAt: new Date().toISOString(),
        comments: [],
      };

      await setDoc(roomRef(newRoom.id), newRoom);
      return newRoom;
    },
    []
  );

  // ── addComment ─────────────────────────────────────────────────────────────
  const addComment = useCallback(
    async (
      roomId: string,
      text: string,
      userName: string,
      userEmail: string,
      userPhoto: string | undefined,
      parentId: string | null
    ): Promise<void> => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) throw new Error("Sala não encontrada.");

      const newComment: ForumComment = {
        id: generateId(),
        text,
        userName,
        userEmail,
        userPhoto: userPhoto ?? "",
        createdAt: new Date().toISOString(),
        parentId,
        likes: [],
      };

      const updatedComments = [...room.comments, newComment];
      await updateDoc(roomRef(roomId), { comments: updatedComments });
    },
    [rooms]
  );

  // ── deleteRoom ─────────────────────────────────────────────────────────────
  const deleteRoom = useCallback(async (roomId: string): Promise<void> => {
    await deleteDoc(roomRef(roomId));
  }, []);

  // ── toggleLike ─────────────────────────────────────────────────────────────
  const toggleLike = useCallback(
    async (
      roomId: string,
      commentId: string,
      userEmail: string
    ): Promise<{ wasLiked: boolean; commentOwnerEmail: string }> => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) throw new Error("Sala não encontrada.");

      let wasLiked = false;
      let commentOwnerEmail = "";

      const updatedComments = room.comments.map((comment) => {
        if (comment.id !== commentId) return comment;
        commentOwnerEmail = comment.userEmail;
        const alreadyLiked = comment.likes.includes(userEmail);
        wasLiked = alreadyLiked;
        return {
          ...comment,
          likes: alreadyLiked
            ? comment.likes.filter((e) => e !== userEmail)
            : [...comment.likes, userEmail],
        };
      });

      await updateDoc(roomRef(roomId), { comments: updatedComments });
      return { wasLiked, commentOwnerEmail };
    },
    [rooms]
  );

  return (
    <ForumContext.Provider
      value={{
        rooms,
        getRoomByArticleUrl,
        createRoom,
        addComment,
        deleteRoom,
        toggleLike,
      }}
    >
      {children}
    </ForumContext.Provider>
  );
};

export function useForum() {
  const context = useContext(ForumContext);
  if (!context)
    throw new Error("useForum deve ser usado dentro de um ForumProvider");
  return context;
}
