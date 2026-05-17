import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGallery, GalleryPhoto } from "../src/context/GalleryContext";
import { useAuth } from "../src/context/AuthContext";
import StoryRing from "../components/StoryRing";
import FloatingMenu from "../components/Floatingmenu";

const { width } = Dimensions.get("window");

// Tamanho de cada foto no carrossel horizontal: mostra exatamente 3 fotos visíveis
const PHOTO_MARGIN = 6;
const PHOTO_SIZE = (width - 32 - PHOTO_MARGIN * 2) / 3; // 3 fotos visíveis com padding do card

// ── Slide viewer full-screen ──────────────────────────────────────────────────
interface SlideViewerProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  currentUserEmail?: string;
  onClose: () => void;
  onToggleLike: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  timeLeft: (photo: GalleryPhoto) => string;
  /** Avatar/nome do dono (para galeria.tsx, onde há múltiplos usuários) */
  ownerName?: string;
  ownerPhoto?: string;
}

function PhotoSlideViewer({
  photos,
  initialIndex,
  currentUserEmail,
  onClose,
  onToggleLike,
  onDelete,
  timeLeft,
  ownerName,
  ownerPhoto,
}: SlideViewerProps) {
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Scroll para o índice inicial sem animação
  useEffect(() => {
    if (photos.length > 1) {
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, []);

  const current = photos[currentIndex];
  const liked = currentUserEmail ? (current?.likes ?? []).includes(currentUserEmail) : false;
  const isOwn = currentUserEmail === current?.userEmail;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View style={slideStyles.root}>
      {/* Botão fechar */}
      <TouchableOpacity style={slideStyles.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Contador */}
      {photos.length > 1 && (
        <View style={slideStyles.counter}>
          <Text style={slideStyles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}

      {/* FlatList paginada horizontal */}
      <FlatList
        ref={flatRef}
        data={photos}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={[slideStyles.slide, { width }]}>
            <Image
              source={{ uri: item.imageUri }}
              style={slideStyles.slideImage}
              resizeMode="contain"
            />
          </View>
        )}
      />

      {/* Dots */}
      {photos.length > 1 && (
        <View style={slideStyles.dots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[slideStyles.dot, i === currentIndex && slideStyles.dotActive]}
            />
          ))}
        </View>
      )}

      {/* Footer: dono + ações */}
      <View style={slideStyles.footer}>
        <View style={slideStyles.userRow}>
          {(ownerPhoto ?? current?.userPhoto) ? (
            <Image
              source={{ uri: ownerPhoto ?? current?.userPhoto }}
              style={slideStyles.avatar}
            />
          ) : (
            <View style={slideStyles.avatarFallback}>
              <Text style={slideStyles.avatarInitial}>
                {(ownerName ?? current?.userName ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={slideStyles.ownerName}>
              {ownerName ?? current?.userName}
            </Text>
            <Text style={slideStyles.expiry}>
              Expira em {timeLeft(current)}
            </Text>
          </View>
        </View>

        <View style={slideStyles.actions}>
          {isOwn && onDelete ? (
            <TouchableOpacity
              style={slideStyles.actionBtn}
              onPress={() => {
                onDelete(current.id);
                if (photos.length <= 1) {
                  onClose();
                } else {
                  const newIdx = currentIndex > 0 ? currentIndex - 1 : 0;
                  setCurrentIndex(newIdx);
                  flatRef.current?.scrollToIndex({ index: newIdx, animated: true });
                }
              }}
            >
              <MaterialIcons name="delete-outline" size={28} color="#FF6B6B" />
            </TouchableOpacity>
          ) : (
            currentUserEmail && (
              <TouchableOpacity
                style={slideStyles.actionBtn}
                onPress={() => onToggleLike(current.id)}
              >
                <MaterialIcons
                  name={liked ? "favorite" : "favorite-border"}
                  size={28}
                  color={liked ? "#FF6B6B" : "#FFF"}
                />
                <Text style={slideStyles.likeCount}>
                  {current?.likes?.length ?? 0}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    padding: 6,
  },
  counter: {
    position: "absolute",
    top: 54,
    left: 20,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  counterText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  dots: {
    position: "absolute",
    bottom: 120,
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
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#FFF",
    width: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 44,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 10,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#FFF" },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  ownerName: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  expiry: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 16 },
  actionBtn: { alignItems: "center", gap: 4 },
  likeCount: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});

// ── Carrossel de fotos por grupo ──────────────────────────────────────────────
function PhotoCarousel({
  photos,
  userEmail,
  currentUserEmail,
  onSelect,
  timeLeft,
}: {
  photos: GalleryPhoto[];
  userEmail: string;
  currentUserEmail?: string;
  onSelect: (photo: GalleryPhoto, index: number) => void;
  timeLeft: (photo: GalleryPhoto) => string;
}) {
  const [atStart, setAtStart] = useState(true);
  const hasMore = photos.length > 3;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={hasMore}
      contentContainerStyle={styles.photoRow}
      style={styles.photoScrollView}
      onScroll={(e) => {
        setAtStart(e.nativeEvent.contentOffset.x < 10);
      }}
      scrollEventThrottle={16}
    >
      {photos.map((photo, index) => {
        const liked = currentUserEmail
          ? photo.likes.includes(currentUserEmail)
          : false;
        const isThirdAndAtStart = hasMore && index === 2 && atStart;

        return (
          <TouchableOpacity
            key={photo.id}
            style={styles.photoItem}
            activeOpacity={0.88}
            onPress={() => onSelect(photo, index)}
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
                <Text style={styles.photoLikes}>{photo.likes.length}</Text>
              </View>
              <View style={styles.photoTime}>
                <MaterialIcons
                  name="access-time"
                  size={11}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.photoTimeText}>{timeLeft(photo)}</Text>
              </View>
            </View>
            {/* Indicador "+N" apenas na 3ª foto quando está no início */}
            {isThirdAndAtStart && (
              <View style={styles.moreIndicator}>
                <Text style={styles.moreIndicatorText}>
                  +{photos.length - 3}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

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
  const [slideState, setSlideState] = useState<{
    photos: GalleryPhoto[];
    index: number;
    ownerName: string;
    ownerPhoto?: string;
  } | null>(null);
  const [userPhotosMap, setUserPhotosMap] = useState<Record<string, string>>({});

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

  const handleToggleLike = useCallback((photoId: string) => {
    if (!user) return;
    toggleLike(photoId, user.email);
  }, [user, toggleLike]);

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

              {/* Carrossel horizontal de fotos */}
              <PhotoCarousel
                photos={group.photos}
                userEmail={group.userEmail}
                currentUserEmail={user?.email}
                onSelect={(photo, index) =>
                  setSlideState({
                    photos: group.photos,
                    index,
                    ownerName: group.userName,
                    ownerPhoto: userPhotosMap[group.userEmail] ?? group.userPhoto,
                  })
                }
                timeLeft={timeLeft}
              />
            </View>
          )}
        />
      )}

      {/* Slide viewer */}
      <Modal
        visible={!!slideState}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSlideState(null)}
      >
        {slideState && (
          <PhotoSlideViewer
            photos={slideState.photos}
            initialIndex={slideState.index}
            currentUserEmail={user?.email}
            onClose={() => setSlideState(null)}
            onToggleLike={handleToggleLike}
            timeLeft={timeLeft}
            ownerName={slideState.ownerName}
            ownerPhoto={slideState.ownerPhoto}
          />
        )}
      </Modal>
      <FloatingMenu currentRoute="galeria" />
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

  photoScrollView: {
    // sem overflow clip para não cortar sombras
  },
  photoRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: PHOTO_MARGIN,
    flexDirection: "row",
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: "hidden",
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


  // Indicador "+N fotos" na 3ª foto quando há mais de 3
  moreIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreIndicatorText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
