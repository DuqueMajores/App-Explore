/**
 * StoryRing.tsx
 * Avatar com anel de story estilo Instagram.
 * Ao tocar, abre um viewer de tela cheia com as fotos do usuário.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GalleryPhoto, useGallery } from "../src/context/GalleryContex";

const { width, height } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5s por foto

interface StoryRingProps {
  userEmail: string;
  userName: string;
  userPhoto?: string;
  size?: number;
  isOwn?: boolean;
  onAddPhoto?: () => void;
  currentUserEmail?: string;
}

// ── Barra de progresso de cada story ──────────────────────────────────────────
function ProgressBar({
  active,
  done,
  duration,
}: {
  active: boolean;
  done: boolean;
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();
    } else if (done) {
      anim.setValue(1);
    } else {
      anim.setValue(0);
    }
  }, [active, done]);

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
});

// ── Viewer de stories em tela cheia ───────────────────────────────────────────
function StoryViewer({
  photos,
  userName,
  userPhoto,
  currentUserEmail,
  onClose,
}: {
  photos: GalleryPhoto[];
  userName: string;
  userPhoto?: string;
  currentUserEmail?: string;
  onClose: () => void;
}) {
  const { toggleLike, deletePhoto } = useGallery();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = photos[index];

  const goNext = () => {
    if (index < photos.length - 1) setIndex((i) => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(goNext, STORY_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused]);

  const handleLike = () => {
    if (!currentUserEmail || !current) return;
    toggleLike(current.id, currentUserEmail);
  };

  const handleDelete = () => {
    deletePhoto(current.id);
    if (photos.length <= 1) onClose();
    else if (index >= photos.length - 1) setIndex((i) => i - 1);
  };

  const isLiked = currentUserEmail
    ? (current?.likes ?? []).includes(currentUserEmail)
    : false;
  const isOwn = currentUserEmail === current?.userEmail;

  const timeLeft = () => {
    if (!current) return "";
    const exp = new Date(current.expiresAt);
    const diff = exp.getTime() - Date.now();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `Expira em ${h}h ${m}m`;
    return `Expira em ${m}m`;
  };

  return (
    <View style={viewerStyles.container}>
      <StatusBar hidden />

      {/* Barras de progresso */}
      <View style={viewerStyles.progressRow}>
        {photos.map((_, i) => (
          <ProgressBar
            key={i}
            active={i === index && !paused}
            done={i < index}
            duration={STORY_DURATION}
          />
        ))}
      </View>

      {/* Header */}
      <View style={viewerStyles.header}>
        <View style={viewerStyles.userInfo}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={viewerStyles.avatar} />
          ) : (
            <View style={viewerStyles.avatarFallback}>
              <Text style={viewerStyles.avatarFallbackText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={viewerStyles.userName}>{userName}</Text>
            <Text style={viewerStyles.timeLeft}>{timeLeft()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={viewerStyles.closeBtn}>
          <MaterialIcons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Imagem */}
      <Image
        source={{ uri: current?.imageUri }}
        style={viewerStyles.image}
        resizeMode="contain"
      />

      {/* Toque esquerda/direita */}
      <View style={viewerStyles.tapZones}>
        <TouchableWithoutFeedback onPress={goPrev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
          <View style={viewerStyles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
          <View style={viewerStyles.tapRight} />
        </TouchableWithoutFeedback>
      </View>

      {/* Ações */}
      <View style={viewerStyles.footer}>
        <View style={viewerStyles.footerLeft}>
          <MaterialIcons name="favorite" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={viewerStyles.likeCount}>{current?.likes?.length ?? 0}</Text>
        </View>
        <View style={viewerStyles.footerRight}>
          {isOwn ? (
            <TouchableOpacity onPress={handleDelete} style={viewerStyles.actionBtn}>
              <MaterialIcons name="delete-outline" size={26} color="#FF6B6B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleLike} style={viewerStyles.actionBtn}>
              <MaterialIcons
                name={isLiked ? "favorite" : "favorite-border"}
                size={28}
                color={isLiked ? "#FF6B6B" : "#FFF"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 36 : 54,
    paddingBottom: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 10,
  },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "#FFF" },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#4169E1",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#FFF",
  },
  avatarFallbackText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  userName: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  timeLeft: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 },
  closeBtn: { padding: 4 },
  image: { flex: 1 },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: "row", top: 100 },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  likeCount: { color: "rgba(255,255,255,0.8)", fontWeight: "700", fontSize: 14 },
  footerRight: {},
  actionBtn: { padding: 6 },
});

// ── Componente StoryRing principal ─────────────────────────────────────────────
export default function StoryRing({
  userEmail,
  userName,
  userPhoto,
  size = 64,
  isOwn = false,
  onAddPhoto,
  currentUserEmail,
}: StoryRingProps) {
  const { getPhotosByUser } = useGallery();
  const [viewerOpen, setViewerOpen] = useState(false);

  const userPhotos = getPhotosByUser(userEmail);
  const hasStories = userPhotos.length > 0;

  const ringSize = size + 6;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (hasStories) setViewerOpen(true);
          else if (isOwn && onAddPhoto) onAddPhoto();
        }}
        style={styles.wrapper}
      >
        {/* Anel degradê azul brilhante */}
        {hasStories ? (
          <LinearGradient
            colors={["#00C6FF", "#4169E1", "#7B2FF7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.ring,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
            ]}
          >
            <View
              style={[
                styles.ringInner,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            >
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  style={{ width: size, height: size, borderRadius: size / 2 }}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { width: size, height: size, borderRadius: size / 2 },
                  ]}
                >
                  <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          // Sem stories: anel cinza
          <View
            style={[
              styles.ringGray,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
            ]}
          >
            <View
              style={[
                styles.ringInner,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            >
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  style={{ width: size, height: size, borderRadius: size / 2 }}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { width: size, height: size, borderRadius: size / 2 },
                  ]}
                >
                  <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Botão "+" para o próprio usuário */}
        {isOwn && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={onAddPhoto}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <LinearGradient
              colors={["#4169E1", "#7B2FF7"]}
              style={styles.addBtnGrad}
            >
              <MaterialIcons name="add" size={13} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Modal do viewer */}
      <Modal visible={viewerOpen} animationType="fade" statusBarTranslucent>
        <StoryViewer
          photos={userPhotos}
          userName={userName}
          userPhoto={userPhoto}
          currentUserEmail={currentUserEmail}
          onClose={() => setViewerOpen(false)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center" },
  ring: {
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  ringGray: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#CCC",
    padding: 3,
  },
  ringInner: {
    borderWidth: 2,
    borderColor: "#FFF",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallback: {
    backgroundColor: "#4169E1",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: { color: "#FFF", fontWeight: "700" },
  addBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  addBtnGrad: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
