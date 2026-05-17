import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export interface GalleryPhoto {
  id: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  imageUri: string;
  createdAt: string;
  expiresAt: string; // 24h após criação
  likes: string[];   // emails que curtiram
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

const STORAGE_KEY = "@Gallery:photos";
const FOLLOW_KEY = "@Follow:data";

const GalleryContext = createContext<GalleryContextData>({} as GalleryContextData);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isExpired(photo: GalleryPhoto): boolean {
  return new Date() > new Date(photo.expiresAt);
}

/** Retorna os e-mails de quem segue o usuário `authorEmail` */
async function getFollowersOf(authorEmail: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FOLLOW_KEY);
    if (!raw) return [];
    const map: Record<string, string[]> = JSON.parse(raw);
    return Object.entries(map)
      .filter(([, following]) => following.includes(authorEmail))
      .map(([follower]) => follower);
  } catch {
    return [];
  }
}

/** Dispara notificação para os seguidores quando o autor publica uma foto */
async function notifyFollowers(authorEmail: string, authorName: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const followers = await getFollowersOf(authorEmail);
    if (followers.length === 0) return;

    // Uma única notificação agrupada (push local não tem destino individual em AsyncStorage)
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

/** Dispara notificação para seguidores quando o autor comenta no fórum */
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

/** Dispara notificação para seguidores quando o autor cria uma sala de fórum */
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

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  // Carrega e limpa fotos expiradas
  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: GalleryPhoto[] = JSON.parse(stored);
          const valid = parsed.filter((p) => !isExpired(p));
          setPhotos(valid);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        }
      } catch (e) {
        console.error("Erro ao carregar galeria:", e);
      }
    }
    load();

    // Limpa expiradas a cada minuto
    const interval = setInterval(async () => {
      setPhotos((prev) => {
        const valid = prev.filter((p) => !isExpired(p));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid)).catch(() => {});
        return valid;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const persist = useCallback(async (updated: GalleryPhoto[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

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
        userPhoto,
        imageUri,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        likes: [],
      };
      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      await persist(updated);

      // ✅ Notifica seguidores
      await notifyFollowers(userEmail, userName);
    },
    [photos, persist]
  );

  const toggleLike = useCallback(
    async (photoId: string, userEmail: string) => {
      const updated = photos.map((p) => {
        if (p.id !== photoId) return p;
        const liked = p.likes.includes(userEmail);
        return {
          ...p,
          likes: liked
            ? p.likes.filter((e) => e !== userEmail)
            : [...p.likes, userEmail],
        };
      });
      setPhotos(updated);
      await persist(updated);
    },
    [photos, persist]
  );

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

  const getActivePhotos = useCallback(
    () =>
      photos
        .filter((p) => !isExpired(p))
        .sort((a, b) => b.likes.length - a.likes.length),
    [photos]
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      const updated = photos.filter((p) => p.id !== photoId);
      setPhotos(updated);
      await persist(updated);
    },
    [photos, persist]
  );

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
  if (!ctx) throw new Error("useGallery deve ser usado dentro de GalleryProvider");
  return ctx;
}
