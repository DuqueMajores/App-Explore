/**
 * galerias.tsx
 * Tela pública de galerias — exibe todas as fotos ativas (24h),
 * agrupadas por usuário, ordenadas por curtidas.
 */
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGallery, GalleryPhoto } from "../src/context/GalleryContex";
import { useAuth } from "../src/context/AuthContext";
import { useNotification } from "../src/context/NotificationContext";
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
  const { sendNotification } = useNotification();
  const [selectedPhotoList, setSelectedPhotoList] = useState<GalleryPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [userPhotosMap, setUserPhotosMap] = useState<Record<string, string>>({});
  const translateX = React.useRef(new Animated.Value(0)).current;

  const selectedPhoto = selectedIndex !== null ? selectedPhotoList[selectedIndex] : null;

  const goTo = (nextIndex: number, direction: "left" | "right") => {
    if (nextIndex < 0 || nextIndex >= selectedPhotoList.length) return;
    const outX = direction === "left" ? -width : width;
    Animated.timing(translateX, { toValue: outX, duration: 180, useNativeDriver: true }).start(() => {
      translateX.setValue(-outX);
      setSelectedIndex(nextIndex);
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    });
  };

  const openPhoto = (photos: GalleryPhoto[], idx: number) => {
    translateX.setValue(0);
    setSelectedPhotoList(photos);
    setSelectedIndex(idx);
  };

  const closePhoto = () => {
    setSelectedIndex(null);
    setSelectedPhotoList([]);
  };

  useEffect(() => {
    AsyncStorage.getItem("@App:users")
      .then((raw) => {
        if (!raw) return;
        const users: any[] = JSON.parse(raw);
        const map: Record<string, string> = {};
        for (const u of users) {
          if (u.email && u.photo) map[u.email] = u.photo;
        }
        setUserPhotosMap(map);
      })
      .catch(() => {});
  }, []);

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
    const wasLiked = photo.likes.includes(user.email);
    toggleLike(photo.id, user.email);
    if (!wasLiked && photo.userEmail !== user.email) {
      sendNotification({
        type: "photo_like",
        fromName: user.name,
        targetEmail: photo.userEmail,
      }).catch(() => {});
    }
    // Update local list so modal reflects change immediately
    setSelectedPhotoList((prev) =>
      prev.map((p) => {
        if (p.id !== photo.id) return p;
        const liked = p.likes.includes(user.email);
        return {
          ...p,
          likes: liked
            ? p.likes.filter((e) => e !== user.email)
            : [...p.likes, user.email],
        };
      })
    );
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
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="photo-library" size={56} color="#4169E1" />
          </View>
          <Text style={styles.emptyText}>Nenhuma foto publicada ainda</Text>
          <Text style={styles.emptySubtext}>
            As fotos ficam visíveis por 24 horas para todos os usuários.
          </Text>
          <View style={styles.emptySteps}>
            {[
              { icon: "account-circle" as const, label: "Acesse seu Perfil" },
              { icon: "add-photo-alternate" as const, label: 'Toque em "Publicar foto no story"' },
              { icon: "public" as const, label: "Sua foto aparece aqui!" },
            ].map((step, i) => (
              <View key={i} style={styles.emptyStep}>
                <View style={styles.emptyStepIcon}>
                  <MaterialIcons name={step.icon} size={22} color="#4169E1" />
                </View>
                <Text style={styles.emptyStepText}>{step.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/perfil")}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add-photo-alternate" size={20} color="#FFF" />
            <Text style={styles.emptyBtnText}>Publicar minha primeira foto</Text>
          </TouchableOpacity>
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
                  userPhoto={userPhotosMap[group.userEmail] ?? group.userPhoto}
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
                {group.photos.map((photo, idx) => {
                  const liked = user
                    ? photo.likes.includes(user.email)
                    : false;
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoItem}
                      activeOpacity={0.88}
                      onPress={() => openPhoto(group.photos, idx)}
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

      {/* Modal de foto ampliada com swipe */}
      {selectedPhoto && (
        <Modal
          visible={selectedIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={closePhoto}
        >
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalClose} onPress={closePhoto}>
              <MaterialIcons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* Dot indicators */}
            {selectedPhotoList.length > 1 && selectedIndex !== null && (
              <View style={styles.dotsRow}>
                {selectedPhotoList.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === selectedIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}

            <Animated.View
              style={[styles.swipeContainer, { transform: [{ translateX }] }]}
              {...(PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, g) =>
                  Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
                onPanResponderMove: (_, g) => { translateX.setValue(g.dx); },
                onPanResponderRelease: (_, g) => {
                  if (selectedIndex === null) return;
                  if (g.dx < -50) goTo(selectedIndex + 1, "left");
                  else if (g.dx > 50) goTo(selectedIndex - 1, "right");
                  else Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                },
              }).panHandlers)}
            >
              <Image
                source={{ uri: selectedPhoto.imageUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Prev / Next arrows */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <TouchableOpacity
                style={styles.arrowLeft}
                onPress={() => goTo(selectedIndex - 1, "right")}
              >
                <MaterialIcons name="chevron-left" size={36} color="#FFF" />
              </TouchableOpacity>
            )}
            {selectedIndex !== null && selectedIndex < selectedPhotoList.length - 1 && (
              <TouchableOpacity
                style={styles.arrowRight}
                onPress={() => goTo(selectedIndex + 1, "left")}
              >
                <MaterialIcons name="chevron-right" size={36} color="#FFF" />
              </TouchableOpacity>
            )}

            <View style={styles.modalFooter}>
              <View style={styles.modalUser}>
                {(userPhotosMap[selectedPhoto.userEmail] ?? selectedPhoto.userPhoto) ? (
                  <Image
                    source={{ uri: userPhotosMap[selectedPhoto.userEmail] ?? selectedPhoto.userPhoto }}
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
                  <Text style={styles.modalUserName}>{selectedPhoto.userName}</Text>
                  <Text style={styles.modalExpiry}>
                    Expira em {timeLeft(selectedPhoto)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalLikeBtn}
                onPress={() => handleLike(selectedPhoto)}
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
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA",
    maxHeight: "auto", 
  },
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
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#212529",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptySteps: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  emptyStep: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    gap: 14,
    elevation: 2,
  },
  emptyStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4169E1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 3,
  },
  emptyBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 6,
  },
  swipeContainer: {
    width: "100%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: { width: "100%", height: "100%" },
  dotsRow: {
    position: "absolute",
    top: 110,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#FFF",
    width: 18,
  },
  arrowLeft: {
    position: "absolute",
    left: 12,
    top: "50%",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 4,
  },
  arrowRight: {
    position: "absolute",
    right: 12,
    top: "50%",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 4,
  },
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
