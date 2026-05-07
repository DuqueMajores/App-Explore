import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ForumComment {
  id: string;
  text: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;   // foto de perfil do autor
  createdAt: string;
  parentId: string | null;
  likes: string[]; // array de emails que curtiram
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

const STORAGE_KEY = "@Forum:rooms";
const ForumContext = createContext<ForumContextData>({} as ForumContextData);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const ForumProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rooms, setRooms] = useState<ForumRoom[]>([]);

  useEffect(() => {
    async function loadRooms() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: ForumRoom[] = JSON.parse(stored);
          // migração: garantir que comentários antigos tenham likes
          const migrated = parsed.map((room) => ({
            ...room,
            comments: room.comments.map((c) => ({ likes: [], ...c })),
          }));
          setRooms(migrated);
        }
      } catch (error) {
        console.error("Erro ao carregar salas do forum:", error);
      }
    }
    loadRooms();
  }, []);

  const persistRooms = useCallback(async (updatedRooms: ForumRoom[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRooms));
    } catch (error) {
      console.error("Erro ao salvar salas do forum:", error);
    }
  }, []);

  const getRoomByArticleUrl = useCallback(
    (url: string) => rooms.find((r) => r.articleUrl === url),
    [rooms]
  );

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
        articleImage,
        articleDesc,
        createdBy: createdByEmail,
        createdAt: new Date().toISOString(),
        comments: [],
      };
      const updatedRooms = [...rooms, newRoom];
      setRooms(updatedRooms);
      await persistRooms(updatedRooms);
      return newRoom;
    },
    [rooms, persistRooms]
  );

  const addComment = useCallback(
    async (
      roomId: string,
      text: string,
      userName: string,
      userEmail: string,
      userPhoto: string | undefined,
      parentId: string | null
    ): Promise<void> => {
      const newComment: ForumComment = {
        id: generateId(),
        text,
        userName,
        userEmail,
        userPhoto,
        createdAt: new Date().toISOString(),
        parentId,
        likes: [],
      };
      const updatedRooms = rooms.map((room) =>
        room.id === roomId
          ? { ...room, comments: [...room.comments, newComment] }
          : room
      );
      setRooms(updatedRooms);
      await persistRooms(updatedRooms);
    },
    [rooms, persistRooms]
  );

  const deleteRoom = useCallback(
    async (roomId: string): Promise<void> => {
      const updatedRooms = rooms.filter((room) => room.id !== roomId);
      setRooms(updatedRooms);
      await persistRooms(updatedRooms);
    },
    [rooms, persistRooms]
  );

  const toggleLike = useCallback(
    async (
      roomId: string,
      commentId: string,
      userEmail: string
    ): Promise<{ wasLiked: boolean; commentOwnerEmail: string }> => {
      let wasLiked = false;
      let commentOwnerEmail = "";

      const updatedRooms = rooms.map((room) => {
        if (room.id !== roomId) return room;
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
        return { ...room, comments: updatedComments };
      });

      setRooms(updatedRooms);
      await persistRooms(updatedRooms);
      return { wasLiked, commentOwnerEmail };
    },
    [rooms, persistRooms]
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
