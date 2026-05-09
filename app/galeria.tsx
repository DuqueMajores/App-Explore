/**
 * galerias.tsx
 * Tela pública de galerias — exibe todas as fotos ativas (24h),
 * agrupadas por usuário, ordenadas por curtidas.
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGallery, GalleryPhoto } from "../src/context/GalleryContex";
import { useAuth } from "../src/context/AuthContext";
import StoryRing from "../components/StoryRing";

const { width } = Dimensions.get("window");
const COL = 2;
const ITEM_SIZE = (width - 48) / COL;

// Agrupa fotos por usuário, cada grupo ordenado por likes
interface UserGroup {
  userEmail: string;
  userName: string;
  userPhoto?: string;
  photos: GalleryPhoto[];
  totalLikes: number;
}

export default function GaleriasScreen() {
  const { getActivePhotos, toggleLike } = useGallery();
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  const activePhotos = getActivePhotos();

  // Agrupa por usuário
  const groups: UserGroup[] = useMemo(() => {
    const map: Record<string, UserGroup> = {};
    for (const p of activePhotos) {
      if (!map[p.userEmail]) {
        map[p.userEmail] = {
          userEmail: p.userEmail,
          userName: p.userName,
          userPhoto: p.userPhoto,
          photos: [],
          totalLikes: 0,
        };
      }
      map[p.userEmail].photos.push(p);
      map[p.userEmail].totalLikes += p.likes.length;
    }
    // Ordena grupos por totalLikes desc
    return Object.values(map).sort((a, b) => b.totalLikes - a.totalLikes);
  }, [activePhotos]);

  const isEmpty = activePhotos.length === 0;

  const handleLike = (photo: GalleryPhoto) => {
    if (!user) return;
    toggleLike(photo.id, user.email);
  };

  const timeLeft = (photo: GalleryPhoto) => {
    const diff = new Date(photo.expiresAt).getTime() - Date.now();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212529" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Galerias</Text>
        <View style={{ width: 40 }} />
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="photo-library" size={70} color="#DDD" />
          <Text style={styles.emptyText}>Nenhuma foto publicada</Text>
          <Text style={styles.emptySubtext}>
            As fotos ficam visíveis por 24 horas.{"\n"}Publique no seu perfil!
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.userEmail}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: group }) => (
            <View style={styles.groupCard}>
              {/* Cabeçalho do grupo: story ring + nome */}
              <View style={styles.groupHeader}>
                <StoryRing
                  userEmail={group.userEmail}
                  userName={group.userName}
                  userPhoto={group.userPhoto}
                  size={48}
                  currentUserEmail={user?.email}
                />
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/perfil",
                      params: { viewUserEmail: group.userEmail },
                    })
                  }
                  style={styles.groupNameCol}
                >
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.userName}
                  </Text>
                  <Text style={styles.groupMeta}>
                    {group.photos.length}{" "}
                    {group.photos.length === 1 ? "foto" : "fotos"} ·{" "}
                    {group.totalLikes}{" "}
                    {group.totalLikes === 1 ? "curtida" : "curtidas"}
                  </Text>
                </TouchableOpacity>
                <MaterialIcons name="chevron-right" size={20} color="#CCC" />
              </View>

              {/* Grid de fotos do usuário */}
              <View style={styles.photoGrid}>
                {group.photos.map((photo) => {
                  const liked = user
                    ? photo.likes.includes(user.email)
                    : false;
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoItem}
                      activeOpacity={0.88}
                      onPress={() => setSelectedPhoto(photo)}
                    >
                      <Image
                        source={{ uri: photo.imageUri }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      {/* Overlay com likes e tempo */}
                      <View style={styles.photoOverlay}>
                        <View style={styles.photoMeta}>
                          <MaterialIcons
                            name={liked ? "favorite" : "favorite-border"}
                            size={14}
                            color={liked ? "#FF6B6B" : "#FFF"}
                          />
                          <Text style={styles.photoLikes}>
                            {photo.likes.length}
                          </Text>
                        </View>
                        <View style={styles.photoTime}>
                          <MaterialIcons
                            name="access-time"
                            size={11}
                            color="rgba(255,255,255,0.8)"
                          />
                          <Text style={styles.photoTimeText}>
                            {timeLeft(photo)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de foto ampliada */}
      {selectedPhoto && (
        <Modal
          visible={!!selectedPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.modalBg}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedPhoto(null)}
            >
              <MaterialIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

            <Image
              source={{ uri: selectedPhoto.imageUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            <View style={styles.modalFooter}>
              <View style={styles.modalUser}>
                {selectedPhoto.userPhoto ? (
                  <Image
                    source={{ uri: selectedPhoto.userPhoto }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarFallback}>
                    <Text style={styles.modalAvatarText}>
                      {selectedPhoto.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.modalUserName}>
                    {selectedPhoto.userName}
                  </Text>
                  <Text style={styles.modalExpiry}>
                    Expira em {timeLeft(selectedPhoto)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalLikeBtn}
                onPress={() => {
                  handleLike(selectedPhoto);
                  // Atualiza estado local
                  setSelectedPhoto((prev) => {
                    if (!prev || !user) return prev;
                    const liked = prev.likes.includes(user.email);
                    return {
                      ...prev,
                      likes: liked
                        ? prev.likes.filter((e) => e !== user.email)
                        : [...prev.likes, user.email],
                    };
                  });
                }}
                disabled={!user}
              >
                <MaterialIcons
                  name={
                    user && selectedPhoto.likes.includes(user.email)
                      ? "favorite"
                      : "favorite-border"
                  }
                  size={30}
                  color={
                    user && selectedPhoto.likes.includes(user.email)
                      ? "#FF6B6B"
                      : "#FFF"
                  }
                />
                <Text style={styles.modalLikeCount}>
                  {selectedPhoto.likes.length}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#212529" },
  listContent: { padding: 16, gap: 16 },

  groupCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  groupNameCol: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: "700", color: "#212529" },
  groupMeta: { fontSize: 12, color: "#999", marginTop: 2 },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    position: "relative",
  },
  photoImage: { width: "100%", height: "100%" },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  photoMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  photoLikes: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  photoTime: { flexDirection: "row", alignItems: "center", gap: 2 },
  photoTimeText: { color: "rgba(255,255,255,0.85)", fontSize: 10 },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#999",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 6,
  },
  modalImage: { width: "100%", height: "70%" },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalUser: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#FFF" },
  modalAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  modalUserName: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  modalExpiry: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  modalLikeBtn: { alignItems: "center", gap: 4 },
  modalLikeCount: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
