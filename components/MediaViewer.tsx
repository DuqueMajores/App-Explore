/**
 * MediaViewer.tsx
 * Componente reutilizável para exibir imagens, vídeos diretos (.mp4 etc.)
 * e links de vídeo do YouTube/Vimeo.
 *
 * Props:
 *  - imageUrl   : URL da imagem de capa (fallback)
 *  - articleUrl : URL do artigo — usada para detectar plataformas de vídeo
 *  - style      : estilo do container externo (opcional)
 *  - height     : altura do player (padrão 220)
 *  - autoPlay   : inicia vídeo automaticamente (padrão false)
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";

// ── Tipos 

type MediaType = "image" | "video-direct" | "youtube" | "vimeo" | "unknown-video";

interface MediaInfo {
  type: MediaType;
  /** URL do vídeo direto ou thumbnail */
  url: string;
  /** ID do vídeo (YouTube/Vimeo) */
  videoId?: string;
  /** URL de embed iframe */
  embedUrl?: string;
}

// ── Detecção de mídia 

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|ogg|avi|mkv)(\?.*)?$/i;

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const VIMEO_REGEX =
  /vimeo\.com\/(?:video\/)?(\d+)/;

export function detectMedia(articleUrl?: string, imageUrl?: string): MediaInfo {
  const fallback: MediaInfo = {
    type: "image",
    url: imageUrl || "https://via.placeholder.com/400x220",
  };

  if (!articleUrl) return fallback;

  // YouTube
  const ytMatch = articleUrl.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = articleUrl.match(VIMEO_REGEX);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      type: "vimeo",
      url: imageUrl || `https://vumbnail.com/${videoId}.jpg`,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  // Vídeo direto
  if (VIDEO_EXTENSIONS.test(articleUrl)) {
    return {
      type: "video-direct",
      url: articleUrl,
    };
  }

  // imageUrl que seja vídeo direto (raro mas possível)
  if (imageUrl && VIDEO_EXTENSIONS.test(imageUrl)) {
    return {
      type: "video-direct",
      url: imageUrl,
    };
  }

  return fallback;
}

// ── Componente principal 

interface MediaViewerProps {
  imageUrl?: string;
  articleUrl?: string;
  /** URL de vídeo direto, quando já conhecido (ex: campo separado da API) */
  directVideoUrl?: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
  autoPlay?: boolean;
  /** Mostra badge informativo do tipo de mídia */
  showBadge?: boolean;
}

export default function MediaViewer({
  imageUrl,
  articleUrl,
  directVideoUrl,
  style,
  height = 220,
  autoPlay = false,
  showBadge = true,
}: MediaViewerProps) {
  const effectiveUrl = directVideoUrl || articleUrl;
  const media = directVideoUrl
    ? ({ type: "video-direct", url: directVideoUrl } as MediaInfo)
    : detectMedia(effectiveUrl, imageUrl);

  const [playing, setPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<Video>(null);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ((status as any).error) setError(true);
      return;
    }
    setLoading(false);
  }, []);

  // ── Vídeo direto 

  if (media.type === "video-direct") {
    return (
      <View style={[styles.container, { height }, style]}>
        {playing ? (
          <>
            <Video
              ref={videoRef}
              source={{ uri: media.url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              useNativeControls
              onPlaybackStatusUpdate={handlePlaybackStatus}
              onReadyForDisplay={() => setLoading(false)}
              onError={() => setError(true)}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            activeOpacity={0.85}
            onPress={() => {
              setPlaying(true);
              setLoading(true);
            }}
          >
            <Image
              source={{ uri: imageUrl || "https://via.placeholder.com/400x220" }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.playButton}>
              <MaterialIcons name="play-circle-filled" size={64} color="#FFF" />
            </View>
            {showBadge && <VideoBadge label="VÍDEO" />}
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorOverlay}>
            <MaterialIcons name="broken-image" size={40} color="#FFF" />
            <Text style={styles.errorText}>Erro ao carregar vídeo</Text>
          </View>
        )}
      </View>
    );
  }

  // ── YouTube 

  if (media.type === "youtube") {
    return (
      <View style={[styles.container, { height }, style]}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${media.videoId}`)}
        >
          <Image
            source={{ uri: media.url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
          {/* Barra inferior estilo YouTube */}
          <View style={styles.ytBar}>
            <MaterialIcons name="play-arrow" size={22} color="#FFF" />
            <Text style={styles.ytBarText} numberOfLines={1}>
              Abrir no YouTube
            </Text>
            <MaterialIcons name="open-in-new" size={16} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.playButton}>
            <View style={styles.ytPlayIcon}>
              <MaterialIcons name="play-arrow" size={38} color="#FFF" />
            </View>
          </View>
          {showBadge && <VideoBadge label="YOUTUBE" color="#FF0000" />}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Vimeo 

  if (media.type === "vimeo") {
    return (
      <View style={[styles.container, { height }, style]}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`https://vimeo.com/${media.videoId}`)}
        >
          <Image
            source={{ uri: media.url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
          <View style={styles.playButton}>
            <View style={[styles.ytPlayIcon, { backgroundColor: "#1AB7EA" }]}>
              <MaterialIcons name="play-arrow" size={38} color="#FFF" />
            </View>
          </View>
          <View style={styles.ytBar}>
            <MaterialIcons name="play-arrow" size={22} color="#FFF" />
            <Text style={styles.ytBarText}>Abrir no Vimeo</Text>
            <MaterialIcons name="open-in-new" size={16} color="rgba(255,255,255,0.7)" />
          </View>
          {showBadge && <VideoBadge label="VIMEO" color="#1AB7EA" />}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Imagem (padrão) 

  return (
    <View style={[{ height }, style]}>
      <Image
        source={{ uri: media.url }}
        style={{ width: "100%", height }}
        resizeMode="cover"
      />
    </View>
  );
}

// ── Badge de tipo de mídia 

function VideoBadge({ label, color = "#4169E1" }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <MaterialIcons name="videocam" size={11} color="#FFF" />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ── Estilos 

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  thumbnailContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  playButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  ytPlayIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF0000",
    justifyContent: "center",
    alignItems: "center",
  },
  ytBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ytBarText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});