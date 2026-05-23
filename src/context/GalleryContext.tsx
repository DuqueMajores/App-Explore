/**
 * GalleryContext.tsx — migrado para Firebase Firestore
 *
 * Coleção: "galleryPhotos"
 *   Documento: photo.id (gerado localmente)
 *   Campos:    id, userEmail, userName, userPhoto, imageUri,
 *              createdAt, expiresAt, likes[]
 *
 * Fotos expiradas (>24h) são filtradas no cliente e removidas do Firestore
 * em background. O listener em tempo real mantém todos os clientes sincronizados.
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
  updateDoc,
  deleteDoc,
  getDocs,
} from "../services/firebaseConfig";
import { onSnapshot } from "firebase/firestore";
import * as Notifications from "expo-notifications";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface GalleryPhoto {
  id: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  imageUri: string;
  createdAt: string;
  expiresAt: string;
  likes: string[];
}

interface GalleryContextData {
  photos: GalleryPhoto[];
  addPhoto: (
    userEmail: string,
    userName: string,
    userPhoto: string | undefined,
    imageUri: string
  ) => Promise<void>;
  toggleLike: (photoId: string, userEmail: string) => Promise<void>;
  getPhotosByUser: (userEmail: string) => GalleryPhoto[];
  getActivePhotos: () => GalleryPhoto[];
  deletePhoto: (photoId: string) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHOTOS_COLLECTION = "galleryPhotos";
const FOLLOW_COLLECTION = "follows"; // Coleção de follows no Firestore

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isExpired(photo: GalleryPhoto): boolean {
  return new Date() > new Date(photo.expiresAt);
}

const photoRef = (photoId: string) => doc(db, PHOTOS_COLLECTION, photoId);

/** Retorna os e-mails de quem segue o usuário authorEmail via Firestore */
async function getFollowersOf(authorEmail: string): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, FOLLOW_COLLECTION));
    const followers: string[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, string[]>;
      const following: string[] = data[d.id] ?? [];
      if (following.includes(authorEmail)) {
        followers.push(d.id);
      }
    });
    return followers;
  } catch (e) {
    console.error("Erro ao buscar seguidores:", e);
    return [];
  }
}

/** Dispara notificação local para seguidores quando o autor publica foto */
async function notifyFollowers(
  authorEmail: string,
  authorName: string
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const followers = await getFollowersOf(authorEmail);
    if (followers.length === 0) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📸 Nova foto no story!",
        body: `${authorName} publicou uma nova foto.`,
        data: { type: "new_story", fromEmail: authorEmail, fromName: authorName },
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error("Erro ao notificar seguidores (foto):", e);
  }
}

/** Notifica seguidores quando o autor comenta no fórum */
export async function notifyFollowersForumComment(
  authorEmail: string,
  authorName: string,
  roomId: string
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const followers = await getFollowersOf(authorEmail);
    if (followers.length === 0) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💬 Novo comentário de quem você segue!",
        body: `${authorName} comentou em um fórum.`,
        data: { type: "comment_reply", fromName: authorName, roomId },
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error("Erro ao notificar seguidores (comentário):", e);
  }
}

/** Notifica seguidores quando o autor cria uma sala de fórum */
export async function notifyFollowersForumRoom(
  authorEmail: string,
  authorName: string,
  roomId: string
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const followers = await getFollowersOf(authorEmail);
    if (followers.length === 0) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🗣️ Nova sala de fórum!",
        body: `${authorName} criou uma nova sala de discussão.`,
        data: { type: "comment_reply", fromName: authorName, roomId },
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error("Erro ao notificar seguidores (sala):", e);
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const GalleryContext = createContext<GalleryContextData>(
  {} as GalleryContextData
);

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  // ── Listener em tempo real + limpeza de expiradas ─────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, PHOTOS_COLLECTION),
      (snapshot) => {
        const fetched: GalleryPhoto[] = [];
        const toDelete: string[] = [];

        snapshot.docs.forEach((d) => {
          const photo = d.data() as GalleryPhoto;
          if (isExpired(photo)) {
            toDelete.push(photo.id);
          } else {
            fetched.push(photo);
          }
        });

        setPhotos(fetched);

        // Remove expiradas do Firestore em background
        toDelete.forEach((id) => {
          deleteDoc(photoRef(id)).catch((e) =>
            console.error("Erro ao remover foto expirada:", e)
          );
        });
      },
      (error) => {
        console.error("Erro ao ouvir galeria:", error);
      }
    );

    // Limpa expiradas a cada minuto também no estado local (antes do próximo snapshot)
    const interval = setInterval(() => {
      setPhotos((prev) => prev.filter((p) => !isExpired(p)));
    }, 60_000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // ── addPhoto ───────────────────────────────────────────────────────────────
  const addPhoto = useCallback(
    async (
      userEmail: string,
      userName: string,
      userPhoto: string | undefined,
      imageUri: string
    ) => {
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newPhoto: GalleryPhoto = {
        id: generateId(),
        userEmail,
        userName,
        userPhoto: userPhoto ?? "",
        imageUri,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        likes: [],
      };

      await setDoc(photoRef(newPhoto.id), newPhoto);
      await notifyFollowers(userEmail, userName);
    },
    []
  );

  // ── toggleLike ─────────────────────────────────────────────────────────────
  const toggleLike = useCallback(
    async (photoId: string, userEmail: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      const liked = photo.likes.includes(userEmail);
      const updatedLikes = liked
        ? photo.likes.filter((e) => e !== userEmail)
        : [...photo.likes, userEmail];

      await updateDoc(photoRef(photoId), { likes: updatedLikes });
    },
    [photos]
  );

  // ── getPhotosByUser ────────────────────────────────────────────────────────
  const getPhotosByUser = useCallback(
    (userEmail: string) =>
      photos
        .filter((p) => p.userEmail === userEmail && !isExpired(p))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [photos]
  );

  // ── getActivePhotos ────────────────────────────────────────────────────────
  const getActivePhotos = useCallback(
    () =>
      photos
        .filter((p) => !isExpired(p))
        .sort((a, b) => b.likes.length - a.likes.length),
    [photos]
  );

  // ── deletePhoto ────────────────────────────────────────────────────────────
  const deletePhoto = useCallback(async (photoId: string) => {
    await deleteDoc(photoRef(photoId));
  }, []);

  return (
    <GalleryContext.Provider
      value={{
        photos,
        addPhoto,
        toggleLike,
        getPhotosByUser,
        getActivePhotos,
        deletePhoto,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
};

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx)
    throw new Error("useGallery deve ser usado dentro de GalleryProvider");
  return ctx;
}
