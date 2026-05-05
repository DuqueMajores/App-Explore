import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ForumComment {
  id: string;
  text: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  parentId: string | null;
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
    parentId: string | null
  ) => Promise<void>;
}

const STORAGE_KEY = '@Forum:rooms';

const ForumContext = createContext<ForumContextData>({} as ForumContextData);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const ForumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<ForumRoom[]>([]);

  useEffect(() => {
    async function loadRooms() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setRooms(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Erro ao carregar salas do forum:', error);
      }
    }
    loadRooms();
  }, []);

  const persistRooms = useCallback(async (updatedRooms: ForumRoom[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRooms));
    } catch (error) {
      console.error('Erro ao salvar salas do forum:', error);
    }
  }, []);

  const getRoomByArticleUrl = useCallback((url: string): ForumRoom | undefined => {
    return rooms.find(r => r.articleUrl === url);
  }, [rooms]);

  const createRoom = useCallback(async (
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
  }, [rooms, persistRooms]);

  const addComment = useCallback(async (
    roomId: string,
    text: string,
    userName: string,
    userEmail: string,
    parentId: string | null
  ): Promise<void> => {
    const newComment: ForumComment = {
      id: generateId(),
      text,
      userName,
      userEmail,
      createdAt: new Date().toISOString(),
      parentId,
    };
    const updatedRooms = rooms.map(room => {
      if (room.id === roomId) {
        return { ...room, comments: [...room.comments, newComment] };
      }
      return room;
    });
    setRooms(updatedRooms);
    await persistRooms(updatedRooms);
  }, [rooms, persistRooms]);

  return (
    <ForumContext.Provider value={{ rooms, getRoomByArticleUrl, createRoom, addComment }}>
      {children}
    </ForumContext.Provider>
  );
};

export function useForum() {
  const context = useContext(ForumContext);
  if (!context) {
    throw new Error('useForum deve ser usado dentro de um ForumProvider');
  }
  return context;
}
