import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { useGallery, GalleryPhoto } from "../src/context/GalleryContext";
import { useForum, ForumRoom, ForumComment } from "../src/context/ForumContext";
import { useFollow } from "../src/context/FollowContext";
import { useNotification } from "../src/context/NotificationContext";
import StoryRing from "../components/StoryRing";
import FollowersModal from "../components/FollowersModal";
import FloatingMenu from "../components/Floatingmenu";

const { width } = Dimensions.get("window");
const GALLERY_COL = 3;
const GALLERY_SIZE = (width - 40 - 20 - (GALLERY_COL - 1) * 4) / GALLERY_COL;

interface PublicUser {
  name: string;
  email: string;
  photo?: string;
  profession?: string;
  likes: string[];
  dislikes: string[];
}

// ── Slide viewer full-screen ───────────────────────────────────────────────────
interface SlideViewerProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  currentUserEmail?: string;
  onClose: () => void;
  onToggleLike: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  timeLeft: (photo: GalleryPhoto) => string;
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
  const { width: screenWidth } = Dimensions.get("window");

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
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }, []);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View style={slideStyles.root}>
      <TouchableOpacity style={slideStyles.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      {photos.length > 1 && (
        <View style={slideStyles.counter}>
          <Text style={slideStyles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatRef}
        data={photos}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={[slideStyles.slide, { width: screenWidth }]}>
            <Image
              source={{ uri: item.imageUri }}
              style={slideStyles.slideImage}
              resizeMode="contain"
            />
          </View>
        )}
      />

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
            <Text style={slideStyles.ownerName}>{ownerName ?? current?.userName}</Text>
            <Text style={slideStyles.expiry}>Expira em {timeLeft(current)}</Text>
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
                <Text style={slideStyles.likeCount}>{current?.likes?.length ?? 0}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  closeBtn: { position: "absolute", top: 50, right: 20, zIndex: 20, padding: 6 },
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
  slide: { flex: 1, justifyContent: "center", alignItems: "center" },
  slideImage: { width: "100%", height: "100%" },
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: "#FFF", width: 18 },
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

// ── Mini-galeria no perfil ─────────────────────────────────────────────────────
function ProfileGallery({
  userEmail,
  currentUserEmail,
}: {
  userEmail: string;
  currentUserEmail?: string;
}) {
  const { getPhotosByUser, toggleLike, deletePhoto } = useGallery();
  const [slideIndex, setSlideIndex] = useState<number | null>(null);
  const photos = getPhotosByUser(userEmail);

  const timeLeft = (photo: GalleryPhoto) => {
    const diff = new Date(photo.expiresAt).getTime() - Date.now();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleToggleLike = useCallback((photoId: string) => {
    if (!currentUserEmail) return;
    toggleLike(photoId, currentUserEmail);
  }, [currentUserEmail, toggleLike]);

  const handleDelete = useCallback((photoId: string) => {
    deletePhoto(photoId);
  }, [deletePhoto]);

  return (
    <View style={galStyles.card}>
      <View style={galStyles.cardHeader}>
        <MaterialIcons name="photo-library" size={20} color="#4169E1" />
        <Text style={galStyles.cardTitle}>Galeria</Text>
        <Text style={galStyles.cardSub}>
          {photos.length === 0
            ? "Nenhuma foto ativa"
            : `${photos.length} foto${photos.length > 1 ? "s" : ""} · 24h`}
        </Text>
      </View>

      {photos.length === 0 ? (
        <View style={galStyles.empty}>
          <MaterialIcons name="add-photo-alternate" size={36} color="#DDD" />
          <Text style={galStyles.emptyText}>Publique fotos no seu story!</Text>
        </View>
      ) : (
        <View style={galStyles.grid}>
          {photos.slice(0, 9).map((photo, index) => {
            const liked = currentUserEmail
              ? photo.likes.includes(currentUserEmail)
              : false;
            const isNinthWithMore = index === 8 && photos.length > 9;
            return (
              <TouchableOpacity
                key={photo.id}
                style={galStyles.thumb}
                activeOpacity={0.85}
                onPress={() => setSlideIndex(index)}
              >
                <Image
                  source={{ uri: photo.imageUri }}
                  style={galStyles.thumbImg}
                  resizeMode="cover"
                />
                {photo.likes.length > 0 && !isNinthWithMore && (
                  <View style={galStyles.thumbBadge}>
                    <MaterialIcons name="favorite" size={10} color="#FF6B6B" />
                    <Text style={galStyles.thumbLikes}>{photo.likes.length}</Text>
                  </View>
                )}
                {isNinthWithMore && (
                  <View style={galStyles.moreOverlay}>
                    <Text style={galStyles.moreOverlayText}>+{photos.length - 9}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Modal
        visible={slideIndex !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSlideIndex(null)}
      >
        {slideIndex !== null && (
          <PhotoSlideViewer
            photos={photos}
            initialIndex={slideIndex}
            currentUserEmail={currentUserEmail}
            onClose={() => setSlideIndex(null)}
            onToggleLike={handleToggleLike}
            onDelete={currentUserEmail === userEmail ? handleDelete : undefined}
            timeLeft={timeLeft}
          />
        )}
      </Modal>
    </View>
  );
}

const galStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: "hidden",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#212529", flex: 1 },
  cardSub: { fontSize: 12, color: "#999" },
  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: "#BBB" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  thumb: {
    width: GALLERY_SIZE,
    height: GALLERY_SIZE,
    margin: 2,
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  thumbLikes: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  moreOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreOverlayText: { color: "#FFF", fontSize: 22, fontWeight: "800", letterSpacing: 0.5 },
});

// ── Card de comentários do fórum ───────────────────────────────────────────────
interface UserCommentEntry {
  comment: ForumComment;
  room: ForumRoom;
}

function UserCommentsCard({ userEmail }: { userEmail: string }) {
  const { rooms } = useForum();
  const [expanded, setExpanded] = useState(false);

  const entries: UserCommentEntry[] = React.useMemo(() => {
    const result: UserCommentEntry[] = [];
    for (const room of rooms) {
      for (const comment of room.comments) {
        if (comment.userEmail === userEmail) {
          result.push({ comment, room });
        }
      }
    }
    return result.sort(
      (a, b) =>
        new Date(b.comment.createdAt).getTime() -
        new Date(a.comment.createdAt).getTime()
    );
  }, [rooms, userEmail]);

  const count = entries.length;

  return (
    <>
      <TouchableOpacity
        style={cmtStyles.card}
        activeOpacity={0.75}
        onPress={() => setExpanded(true)}
      >
        <View style={cmtStyles.iconWrap}>
          <MaterialIcons name="forum" size={22} color="#4169E1" />
        </View>
        <View style={cmtStyles.textWrap}>
          <Text style={cmtStyles.title}>Comentários no Fórum</Text>
          <Text style={cmtStyles.sub}>
            {count === 0
              ? "Nenhum comentário ainda"
              : `${count} comentário${count !== 1 ? "s" : ""} em ${
                  new Set(entries.map((e) => e.room.id)).size
                } sala${new Set(entries.map((e) => e.room.id)).size !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color="#CCC" />
      </TouchableOpacity>

      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <View style={cmtStyles.modalRoot}>
          <View style={cmtStyles.modalHeader}>
            <TouchableOpacity onPress={() => setExpanded(false)} style={cmtStyles.modalBackBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#212529" />
            </TouchableOpacity>
            <Text style={cmtStyles.modalTitle}>Comentários no Fórum</Text>
            <View style={{ width: 40 }} />
          </View>

          {count === 0 ? (
            <View style={cmtStyles.empty}>
              <MaterialIcons name="chat-bubble-outline" size={52} color="#DDD" />
              <Text style={cmtStyles.emptyText}>Nenhum comentário ainda</Text>
              <Text style={cmtStyles.emptySub}>
                Participe de uma sala de fórum para ver seus comentários aqui.
              </Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(e) => e.comment.id}
              contentContainerStyle={cmtStyles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={cmtStyles.commentCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setExpanded(false);
                    router.push({ pathname: "/forum-room", params: { roomId: item.room.id } });
                  }}
                >
                  <View style={cmtStyles.roomRow}>
                    <MaterialIcons name="forum" size={13} color="#4169E1" />
                    <Text style={cmtStyles.roomTitle} numberOfLines={1}>
                      {item.room.articleTitle}
                    </Text>
                  </View>
                  <Text style={cmtStyles.commentText} numberOfLines={4}>
                    {item.comment.text}
                  </Text>
                  <View style={cmtStyles.commentFooter}>
                    <Text style={cmtStyles.commentDate}>
                      {new Date(item.comment.createdAt).toLocaleDateString("pt-BR")}{" "}
                      {new Date(item.comment.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {item.comment.likes.length > 0 && (
                      <View style={cmtStyles.likeRow}>
                        <MaterialIcons name="favorite" size={13} color="#E63946" />
                        <Text style={cmtStyles.likeCount}>{item.comment.likes.length}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const cmtStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    gap: 14,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center", alignItems: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#212529", marginBottom: 2 },
  sub: { fontSize: 12, color: "#999" },
  modalRoot: { flex: 1, backgroundColor: "#F8F9FA" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  modalBackBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center", alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#212529" },
  listContent: { padding: 16, gap: 12 },
  commentCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: "#4169E1",
  },
  roomRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  roomTitle: { fontSize: 12, color: "#4169E1", fontWeight: "600", flex: 1 },
  commentText: { fontSize: 14, lineHeight: 21, color: "#333", marginBottom: 10 },
  commentFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commentDate: { fontSize: 11, color: "#BBB" },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeCount: { fontSize: 12, fontWeight: "700", color: "#E63946" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#999" },
  emptySub: { fontSize: 13, color: "#BBB", textAlign: "center", lineHeight: 20 },
});

// ── Card de seguidores (abaixo do perfil, acima da galeria) ───────────────────
function FollowStatsCard({
  targetEmail,
  currentUserEmail,
}: {
  targetEmail: string;
  currentUserEmail?: string;
}) {
  const { getFollowers, getFollowing } = useFollow();
  const [modal, setModal] = useState<"followers" | "following" | null>(null);

  const followers = getFollowers(targetEmail);
  const following = getFollowing(targetEmail);

  return (
    <>
      <View style={followStatsStyles.card}>
        <TouchableOpacity
          style={followStatsStyles.stat}
          activeOpacity={0.75}
          onPress={() => setModal("followers")}
        >
          <Text style={followStatsStyles.statNum}>{followers.length}</Text>
          <Text style={followStatsStyles.statLabel}>Seguidores</Text>
        </TouchableOpacity>

        <View style={followStatsStyles.divider} />

        <TouchableOpacity
          style={followStatsStyles.stat}
          activeOpacity={0.75}
          onPress={() => setModal("following")}
        >
          <Text style={followStatsStyles.statNum}>{following.length}</Text>
          <Text style={followStatsStyles.statLabel}>Seguindo</Text>
        </TouchableOpacity>
      </View>

      {modal && (
        <FollowersModal
          visible={!!modal}
          onClose={() => setModal(null)}
          targetEmail={targetEmail}
          mode={modal}
        />
      )}
    </>
  );
}

const followStatsStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    elevation: 2,
    overflow: "hidden",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: "800", color: "#212529" },
  statLabel: { fontSize: 12, color: "#999", fontWeight: "600" },
  divider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
});

// ── Perfil de outro usuário ────────────────────────────────────────────────────
function OtherUserProfile({ targetEmail }: { targetEmail: string }) {
  const { user: loggedUser, handleProfileReaction } = useAuth();
  const { isFollowing, toggleFollow, followersCount } = useFollow();
  const { sendNotification } = useNotification();
  const [target, setTarget] = useState<PublicUser | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(true);
  // Animação da estrela de follow
  const starScale = useRef(new Animated.Value(1)).current;

  const following = loggedUser ? isFollowing(loggedUser.email, targetEmail) : false;

  const loadTarget = async () => {
    setLoadingTarget(true);
    try {
      const all = await AsyncStorage.getItem("@App:users");
      const users: any[] = all ? JSON.parse(all) : [];
      const found = users.find((u) => u.email === targetEmail);
      if (found) {
        const { passwordHash, ...pub } = found;
        setTarget(pub as PublicUser);
      }
    } catch (e) {
      console.error("Erro ao carregar usuário:", e);
    } finally {
      setLoadingTarget(false);
    }
  };

  useEffect(() => { loadTarget(); }, [targetEmail]);

  const handleReact = async (type: "like" | "dislike") => {
    if (!loggedUser) return;
    await handleProfileReaction(targetEmail, type);
    await loadTarget();
  };

  const handleFollow = async () => {
    if (!loggedUser || !target) return;

    // Animação de bounce na estrela
    Animated.sequence([
      Animated.spring(starScale, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(starScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();

    const nowFollowing = await toggleFollow(loggedUser.email, targetEmail);

    if (nowFollowing) {
      // Notifica o usuário alvo
      await sendNotification({
        type: "profile_like",
        fromName: loggedUser.name,
      });
    }
  };

  if (loadingTarget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!target) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="person-off" size={60} color="#DDD" />
        <Text style={styles.notLoggedText}>Usuário não encontrado.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.back()}>
          <Text style={styles.loginButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSelf = loggedUser?.email === target.email;
  const likedByMe = loggedUser ? (target.likes ?? []).includes(loggedUser.email) : false;
  const dislikedByMe = loggedUser ? (target.dislikes ?? []).includes(loggedUser.email) : false;
  const fCount = followersCount(targetEmail);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Perfil */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          <StoryRing
            userEmail={target.email}
            userName={target.name}
            userPhoto={target.photo}
            size={90}
            currentUserEmail={loggedUser?.email}
          />
        </View>

        {/* Estrela de seguir */}
        {!isSelf && loggedUser && (
          <Animated.View style={{ transform: [{ scale: starScale }], marginBottom: 6 }}>
            <TouchableOpacity
              style={[styles.followStarBtn, following && styles.followStarBtnActive]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={following ? "star" : "star-outline"}
                size={20}
                color={following ? "#FFD700" : "#4169E1"}
              />
              <Text style={[styles.followStarText, following && styles.followStarTextActive]}>
                {following ? "Seguindo" : "Seguir"}
              </Text>
              {fCount > 0 && (
                <View style={styles.followersPill}>
                  <Text style={styles.followersPillText}>{fCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <Text style={styles.userName}>{target.name}</Text>

        {!!target.profession && (
          <View style={styles.professionRow}>
            <MaterialIcons name="work-outline" size={14} color="#4169E1" />
            <Text style={styles.professionText}>{target.profession}</Text>
          </View>
        )}

        <Text style={styles.userEmail}>{target.email}</Text>

        <View style={styles.reactionContainer}>
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReact("dislike")}
            disabled={isSelf || !loggedUser}
          >
            <MaterialIcons
              name="thumb-down"
              size={26}
              color={dislikedByMe ? "#E63946" : "#CCC"}
            />
          </TouchableOpacity>
          <Text style={styles.reactionCount}>{target.dislikes?.length ?? 0}</Text>

          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReact("like")}
            disabled={isSelf || !loggedUser}
          >
            <MaterialIcons
              name="thumb-up"
              size={26}
              color={likedByMe ? "#4169E1" : "#CCC"}
            />
          </TouchableOpacity>
          <Text style={styles.reactionCount}>{target.likes?.length ?? 0}</Text>
        </View>

        {isSelf && <Text style={styles.selfNote}>Este é o seu próprio perfil</Text>}
        {!loggedUser && <Text style={styles.selfNote}>Faça login para reagir</Text>}
      </View>

      {/* Card de seguidores / seguindo */}
      <FollowStatsCard targetEmail={target.email} currentUserEmail={loggedUser?.email} />

      {/* Galeria pública */}
      <ProfileGallery userEmail={target.email} currentUserEmail={loggedUser?.email} />

      {/* Comentários no fórum */}
      <View style={styles.infoSection}>
        <UserCommentsCard userEmail={target.email} />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>Conta Ativa</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Perfil próprio ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { viewUserEmail } = useLocalSearchParams<{ viewUserEmail?: string }>();
  const { user, signOut, updateProfile, handleProfileReaction, loading } = useAuth();
  const { addPhoto, getPhotosByUser } = useGallery();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editProfession, setEditProfession] = useState("");
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (viewUserEmail && viewUserEmail !== user?.email) {
    return <OtherUserProfile targetEmail={viewUserEmail} />;
  }

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !user) {
        const timer = setTimeout(() => router.replace("/login"), 100);
        return () => clearTimeout(timer);
      }
    }, [user, loading])
  );

  const openEditModal = () => {
    setEditName(user?.name ?? "");
    setEditPhotoUrl(user?.photo ?? "");
    setEditProfession(user?.profession ?? "");
    setPhotoPreviewError(false);
    setEditModalVisible(true);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditPhotoUrl(result.assets[0].uri);
      setPhotoPreviewError(false);
    }
  };

  const handleAddStoryPhoto = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled) {
      await addPhoto(user.email, user.name, user.photo, result.assets[0].uri);
      Alert.alert("✅ Foto publicada!", "Sua foto ficará visível por 24 horas.");
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert("Nome inválido", "O nome deve ter no mínimo 2 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(editName.trim(), editPhotoUrl.trim() || undefined, editProfession.trim());
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoUrl("");
    setPhotoPreviewError(false);
  };

  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await signOut();
            router.replace("/login");
          } catch (error: any) {
            Alert.alert("Erro", error.message || "Erro ao fazer logout");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="lock" size={60} color="#DDD" />
        <Text style={styles.notLoggedText}>Você não está logado.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.replace("/login")}>
          <Text style={styles.loginButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const previewUrl = editPhotoUrl.trim();
  const showPreview = previewUrl.length > 0 && !photoPreviewError;
  const isDark = user.darkMode;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, isDark && styles.darkBg]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.darkText]}>Meu Perfil</Text>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <MaterialIcons name="edit" size={20} color="#4169E1" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de perfil */}
        <View style={[styles.profileSection, isDark && styles.darkCard]}>
          <View style={styles.avatarWrapper}>
            <StoryRing
              userEmail={user.email}
              userName={user.name}
              userPhoto={user.photo}
              size={90}
              isOwn
              onAddPhoto={handleAddStoryPhoto}
              currentUserEmail={user.email}
            />
          </View>

          <Text style={[styles.userName, isDark && styles.darkText]}>{user.name}</Text>

          {!!user.profession && (
            <View style={styles.professionRow}>
              <MaterialIcons name="work-outline" size={14} color="#4169E1" />
              <Text style={styles.professionText}>{user.profession}</Text>
            </View>
          )}

          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.reactionContainer}>
            <TouchableOpacity
              onPress={() => handleProfileReaction(user.email, "dislike")}
              style={styles.reactionButton}
            >
              <MaterialIcons
                name="thumb-down"
                size={24}
                color={(user.dislikes ?? []).includes(user.email) ? "#E63946" : "#999"}
              />
            </TouchableOpacity>
            <Text style={[styles.reactionCount, isDark && styles.darkText]}>
              {user.dislikes?.length ?? 0}
            </Text>

            <TouchableOpacity
              onPress={() => handleProfileReaction(user.email, "like")}
              style={styles.reactionButton}
            >
              <MaterialIcons
                name="thumb-up"
                size={24}
                color={(user.likes ?? []).includes(user.email) ? "#4169E1" : "#999"}
              />
            </TouchableOpacity>
            <Text style={[styles.reactionCount, isDark && styles.darkText]}>
              {user.likes?.length ?? 0}
            </Text>
          </View>

          <TouchableOpacity style={styles.addStoryBtn} onPress={handleAddStoryPhoto}>
            <MaterialIcons name="add-photo-alternate" size={18} color="#4169E1" />
            <Text style={styles.addStoryBtnText}>Publicar foto no story</Text>
          </TouchableOpacity>
        </View>

        {/* Card de seguidores / seguindo (próprio usuário) */}
        <FollowStatsCard targetEmail={user.email} currentUserEmail={user.email} />

        {/* Galeria */}
        <ProfileGallery userEmail={user.email} currentUserEmail={user.email} />

        {/* Comentários */}
        <View style={styles.infoSection}>
          <UserCommentsCard userEmail={user.email} />
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, isDark && styles.darkCard]}>
            <MaterialIcons name="verified-user" size={24} color="#4169E1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, isDark && styles.darkText]}>Conta Ativa</Text>
            </View>
          </View>
          <View style={[styles.infoCard, isDark && styles.darkCard]}>
            <MaterialIcons name="calendar-today" size={24} color="#4169E1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Membro desde</Text>
              <Text style={[styles.infoValue, isDark && styles.darkText]}>
                {new Date().toLocaleDateString("pt-BR")}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color="#E63946" size="small" />
          ) : (
            <MaterialIcons name="logout" size={22} color="#E63946" />
          )}
          <Text style={styles.logoutText}>
            {isLoggingOut ? "Saindo..." : "Sair da Conta"}
          </Text>
          {!isLoggingOut && <MaterialIcons name="chevron-right" size={22} color="#E63946" />}
        </TouchableOpacity>

        <Text style={styles.footerText}>Versão 1.0.0</Text>

        {/* Modal de edição */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => !isSaving && setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                <TouchableOpacity
                  onPress={() => !isSaving && setEditModalVisible(false)}
                  disabled={isSaving}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalAvatarArea}>
                  {showPreview ? (
                    <Image
                      source={{ uri: previewUrl }}
                      style={styles.modalAvatarImage}
                      onError={() => setPhotoPreviewError(true)}
                    />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarInitial}>
                        {(editName || user.name).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
                  <MaterialIcons name="photo-library" size={20} color="#FFF" />
                  <Text style={styles.galleryBtnText}>Escolher da Galeria</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Nome</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color="#999" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Seu nome"
                    placeholderTextColor="#CCC"
                    maxLength={50}
                    editable={!isSaving}
                  />
                </View>

                <Text style={styles.inputLabel}>Profissão / O que você faz</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="work-outline" size={20} color="#999" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    value={editProfession}
                    onChangeText={setEditProfession}
                    placeholder="Ex: Desenvolvedor, Designer, Estudante..."
                    placeholderTextColor="#CCC"
                    maxLength={60}
                    editable={!isSaving}
                  />
                </View>

                <Text style={styles.inputLabel}>Foto de perfil (URL)</Text>
                <View style={[styles.inputContainer, { alignItems: "flex-start", paddingTop: 14 }]}>
                  <MaterialIcons name="link" size={20} color="#999" style={{ marginRight: 10, marginTop: 2 }} />
                  <TextInput
                    style={[styles.textInput, { minHeight: 44 }]}
                    value={editPhotoUrl}
                    onChangeText={(v) => {
                      setEditPhotoUrl(v);
                      setPhotoPreviewError(false);
                    }}
                    placeholder="https://exemplo.com/foto.jpg"
                    placeholderTextColor="#CCC"
                    autoCapitalize="none"
                    keyboardType="url"
                    editable={!isSaving}
                    multiline
                  />
                </View>

                {photoPreviewError && editPhotoUrl.trim().length > 0 && (
                  <Text style={styles.photoErrorText}>URL inválida ou imagem não carregou.</Text>
                )}

                {editPhotoUrl.trim().length > 0 && (
                  <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
                    <MaterialIcons name="delete-outline" size={16} color="#E63946" />
                    <Text style={styles.removePhotoText}>Remover foto</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar alterações</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      <FloatingMenu currentRoute="perfil" />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { paddingBottom: 40 },
  darkBg: { backgroundColor: "#121212" },
  darkCard: { backgroundColor: "#1E1E1E" },
  darkText: { color: "#FFF" },
  containerCenter: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA",
  },
  loadingText: { fontSize: 16, color: "#666", marginTop: 10 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#212529" },
  backButton: { padding: 8 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  editButtonText: { color: "#4169E1", fontWeight: "700", fontSize: 14 },
  profileSection: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 20,
    elevation: 2,
  },
  avatarWrapper: { marginBottom: 12 },

  // ── Botão de seguir (estrela) ─────────────────────────────────────────────
  followStarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#4169E1",
    backgroundColor: "#EEF2FF",
    marginBottom: 10,
  },
  followStarBtnActive: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFD700",
  },
  followStarText: { fontSize: 14, fontWeight: "700", color: "#4169E1" },
  followStarTextActive: { color: "#B8860B" },
  followersPill: {
    backgroundColor: "#4169E1",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 2,
  },
  followersPillText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

  userName: { fontSize: 24, fontWeight: "800", color: "#212529", marginBottom: 6 },
  professionRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  professionText: { fontSize: 13, fontWeight: "600", color: "#4169E1" },
  userEmail: { color: "#666", fontSize: 14, marginBottom: 16 },
  reactionContainer: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
  },
  reactionButton: { padding: 6 },
  reactionCount: { fontWeight: "bold", color: "#333", fontSize: 15 },
  addStoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  addStoryBtnText: { color: "#4169E1", fontWeight: "700", fontSize: 13 },
  selfNote: { marginTop: 12, fontSize: 12, color: "#AAA", fontStyle: "italic" },
  notLoggedText: { fontSize: 16, color: "#666", marginTop: 15, marginBottom: 20 },
  loginButton: {
    backgroundColor: "#4169E1",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  infoSection: { paddingHorizontal: 20, marginTop: 0, gap: 12, marginBottom: 12 },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 1,
  },
  infoContent: { marginLeft: 16, flex: 1 },
  infoLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#212529" },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    elevation: 1,
  },
  logoutText: { marginLeft: 15, fontSize: 16, color: "#E63946", fontWeight: "bold", flex: 1 },
  footerText: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 24 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#212529" },
  modalAvatarArea: { alignItems: "center", marginBottom: 20 },
  modalAvatarImage: { width: 90, height: 90, borderRadius: 45 },
  modalAvatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#4169E1",
    justifyContent: "center", alignItems: "center",
  },
  modalAvatarInitial: { color: "#FFF", fontSize: 36, fontWeight: "bold" },
  galleryBtn: {
    flexDirection: "row",
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  galleryBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 16,
  },
  textInput: { flex: 1, fontSize: 15, color: "#333" },
  photoErrorText: { fontSize: 12, color: "#E63946", marginBottom: 10, marginLeft: 4 },
  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E63946",
  },
  removePhotoText: { color: "#E63946", fontSize: 13, fontWeight: "600" },
  saveButton: {
    backgroundColor: "#4169E1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
